import { supabase } from './supabase';

/**
 * Supported Supabase storage buckets.
 * Defaults to 'app-files' as requested by the user, with fallback to 'valgent'.
 */
export const PRIMARY_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'app-files';
export const FALLBACK_BUCKET = 'valgent';

const CANDIDATE_BUCKETS = [PRIMARY_BUCKET, FALLBACK_BUCKET].filter(
  (b, idx, arr) => arr.indexOf(b) === idx
);

// Cached working bucket to avoid repeated fallback probes
let workingBucket: string | null = null;

/**
 * Generate a strict, organized file path in Supabase Storage.
 * Folder rule: ${auth.uid()}/${featureName}/${itemId}/${uuid}.${extension}
 */
export function generateStoragePath(params: {
  userId: string;
  featureName: string;
  itemId: string;
  originalFileName: string;
}): string {
  const { userId, featureName, itemId, originalFileName } = params;
  
  // Extract and clean extension
  const rawExt = originalFileName.includes('.') ? originalFileName.split('.').pop() || '' : '';
  const extension = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  
  // Safe UUID generation
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  // Sanitize path segments
  const cleanFeature = featureName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanItemId = itemId.replace(/[^a-zA-Z0-9_-]/g, '_');

  return `${userId}/${cleanFeature}/${cleanItemId}/${uuid}.${extension}`;
}

export interface UploadOptions {
  file: File | Blob;
  userId: string;
  featureName: string; // e.g. 'requirements', 'avatars', 'attachments'
  itemId: string;      // e.g. project.id or user.id
  originalFileName?: string;
  contentType?: string;
}

export interface UploadResult {
  path: string;
  bucket: string;
  fullPath: string;
  signedUrl: string | null;
}

/**
 * Upload a file to Supabase Storage adhering strictly to the user-isolated path scheme.
 */
export async function uploadFileToStorage(options: UploadOptions): Promise<UploadResult> {
  const { file, userId, featureName, itemId } = options;
  const originalFileName =
    options.originalFileName || (file instanceof File ? file.name : 'upload.bin');
  const contentType =
    options.contentType || (file instanceof File ? file.type : 'application/octet-stream');

  const filePath = generateStoragePath({
    userId,
    featureName,
    itemId,
    originalFileName,
  });

  const bucketsToTry = workingBucket
    ? [workingBucket, ...CANDIDATE_BUCKETS.filter((b) => b !== workingBucket)]
    : CANDIDATE_BUCKETS;

  let lastError: any = null;

  for (const bucket of bucketsToTry) {
    try {
      const { data, error } = await supabase.storage.from(bucket).upload(filePath, file, {
        contentType,
        cacheControl: '3600',
        upsert: false,
      });

      if (!error && data) {
        workingBucket = bucket;
        // Generate signed URL immediately for display
        const signedUrl = await getSignedFileUrl(filePath, 3600, bucket);
        return {
          path: filePath,
          bucket,
          fullPath: data.fullPath || `${bucket}/${filePath}`,
          signedUrl,
        };
      }

      lastError = error;
      // If error is bucket not found or invalid bucket, try next candidate
      if (error && (error.message?.includes('Bucket not found') || (error as any).statusCode === '404')) {
        continue;
      }
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError || new Error(`Failed to upload file ${originalFileName} to storage`);
}

/**
 * Generate a temporary signed URL for a private file in Supabase Storage.
 * Default expiration is 1 hour (3600 seconds).
 */
export async function getSignedFileUrl(
  path: string,
  expiresInSeconds: number = 3600,
  preferredBucket?: string
): Promise<string | null> {
  if (!path) return null;

  const bucketsToTry = preferredBucket
    ? [preferredBucket, ...CANDIDATE_BUCKETS.filter((b) => b !== preferredBucket)]
    : workingBucket
    ? [workingBucket, ...CANDIDATE_BUCKETS.filter((b) => b !== workingBucket)]
    : CANDIDATE_BUCKETS;

  for (const bucket of bucketsToTry) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expiresInSeconds);

      if (!error && data?.signedUrl) {
        workingBucket = bucket;
        return data.signedUrl;
      }
    } catch {
      // try fallback bucket
    }
  }

  return null;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFileFromStorage(
  path: string,
  preferredBucket?: string
): Promise<boolean> {
  if (!path) return false;

  const bucketsToTry = preferredBucket
    ? [preferredBucket, ...CANDIDATE_BUCKETS.filter((b) => b !== preferredBucket)]
    : workingBucket
    ? [workingBucket, ...CANDIDATE_BUCKETS.filter((b) => b !== workingBucket)]
    : CANDIDATE_BUCKETS;

  for (const bucket of bucketsToTry) {
    try {
      const { error } = await supabase.storage.from(bucket).remove([path]);
      if (!error) {
        return true;
      }
    } catch {
      // try fallback bucket
    }
  }

  return false;
}

/**
 * Helper to upload project requirement specification file:
 * 1. Uploads file to Supabase Storage at: ${userId}/requirements/${projectId}/${uuid}.${ext}
 * 2. Inserts metadata row into public.requirement_files
 * 3. Returns the saved database record with a valid signedUrl
 */
export async function uploadProjectRequirementFile(params: {
  project: { id: string };
  user: { id: string };
  file: File;
}): Promise<{
  id: string;
  name: string;
  sizeBytes: number;
  filePath: string;
  signedUrl: string | null;
}> {
  const { project, user, file } = params;

  // 1. Upload to Supabase Storage
  const uploadResult = await uploadFileToStorage({
    file,
    userId: user.id,
    featureName: 'requirements',
    itemId: project.id,
    originalFileName: file.name,
    contentType: file.type || 'text/markdown',
  });

  // 2. Persist in requirement_files database table
  const { data, error } = await supabase
    .from('requirement_files')
    .insert([
      {
        project_id: project.id,
        owner_id: user.id,
        name: file.name,
        size_bytes: file.size,
        file_type: file.type || 'text/markdown',
        file_url: uploadResult.path,
        status: 'parsed',
      },
    ])
    .select()
    .single();

  if (error) {
    // If DB insert fails, clean up the orphaned file in Storage
    await deleteFileFromStorage(uploadResult.path, uploadResult.bucket);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    sizeBytes: Number(data.size_bytes),
    filePath: uploadResult.path,
    signedUrl: uploadResult.signedUrl,
  };
}

/**
 * Helper to delete a requirement file:
 * 1. Removes the file from Supabase Storage
 * 2. Deletes row reference from public.requirement_files
 */
export async function deleteProjectRequirementFile(fileId: string, filePath?: string): Promise<void> {
  // 1. Remove from Storage if path exists
  if (filePath) {
    await deleteFileFromStorage(filePath);
  }

  // 2. Remove row reference from database
  if (fileId) {
    const { error } = await supabase.from('requirement_files').delete().eq('id', fileId);
    if (error) {
      console.warn('Failed to delete requirement_file row from database:', error);
      throw error;
    }
  }
}

/**
 * Helper to fetch all requirement files for a project and populate their signed URLs.
 */
export async function fetchProjectRequirementFilesWithSignedUrls(projectId: string): Promise<
  Array<{
    id: string;
    name: string;
    size: string;
    status: 'Ready' | 'Parsing';
    path?: string;
    signedUrl?: string;
  }>
> {
  const { data, error } = await supabase
    .from('requirement_files')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  const results = await Promise.all(
    data.map(async (row: any) => {
      const signedUrl = row.file_url ? await getSignedFileUrl(row.file_url, 3600) : undefined;
      return {
        id: row.id,
        name: row.name,
        size: (Number(row.size_bytes || 0) / 1024).toFixed(1) + ' KB',
        status: (row.status === 'parsed' ? 'Ready' : 'Parsing') as 'Ready' | 'Parsing',
        path: row.file_url,
        signedUrl: signedUrl || undefined,
      };
    })
  );

  return results;
}

/**
 * Helper to upload user avatar image:
 * 1. Uploads to ${userId}/avatars/${userId}/${uuid}.${ext}
 * 2. Updates public.profiles (avatar_url = filePath)
 * 3. Returns new signedUrl
 */
export async function uploadUserAvatar(params: {
  userId: string;
  file: File;
  currentAvatarPath?: string;
}): Promise<{ path: string; signedUrl: string | null }> {
  const { userId, file, currentAvatarPath } = params;

  // 1. Upload new avatar
  const result = await uploadFileToStorage({
    file,
    userId,
    featureName: 'avatars',
    itemId: userId,
    originalFileName: file.name,
    contentType: file.type || 'image/png',
  });

  // 2. Update profiles table
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ avatar_url: result.path })
    .eq('id', userId);

  if (profileErr) {
    console.warn('Failed to update profile avatar_url in DB:', profileErr);
  }

  // 3. Update auth user metadata
  try {
    await supabase.auth.updateUser({
      data: { avatar_url: result.path },
    });
  } catch {
    // ignore
  }

  // 4. Clean up previous avatar in Storage if it was a storage path
  if (currentAvatarPath && currentAvatarPath.startsWith(`${userId}/`)) {
    await deleteFileFromStorage(currentAvatarPath);
  }

  return {
    path: result.path,
    signedUrl: result.signedUrl,
  };
}

/**
 * Resolves a raw avatar storage path or external URL to a displayable URL.
 * If the path is in private Supabase Storage, generates a signed URL.
 */
export async function resolveAvatarDisplayUrl(rawPathOrUrl?: string | null): Promise<string | undefined> {
  if (!rawPathOrUrl) return undefined;
  if (rawPathOrUrl.startsWith('http://') || rawPathOrUrl.startsWith('https://')) {
    return rawPathOrUrl;
  }
  const signed = await getSignedFileUrl(rawPathOrUrl, 7200);
  return signed || undefined;
}
