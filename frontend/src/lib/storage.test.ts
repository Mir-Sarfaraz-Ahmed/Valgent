import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateStoragePath,
  uploadFileToStorage,
  getSignedFileUrl,
  deleteFileFromStorage,
  PRIMARY_BUCKET,
  FALLBACK_BUCKET,
} from './storage';
import { supabase } from './supabase';

vi.mock('./supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

describe('Supabase Storage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStoragePath', () => {
    it('generates a path strictly adhering to ${userId}/${featureName}/${itemId}/${uuid}.${extension}', () => {
      const userId = '11111111-2222-3333-4444-555555555555';
      const featureName = 'requirements';
      const itemId = 'proj-valgent-99';
      const originalFileName = 'Product_Requirements_Document.md';

      const path = generateStoragePath({
        userId,
        featureName,
        itemId,
        originalFileName,
      });

      // 1. Must start with userId/
      expect(path.startsWith(`${userId}/`)).toBe(true);

      // 2. Segments check: [userId, featureName, itemId, filename]
      const parts = path.split('/');
      expect(parts.length).toBe(4);
      expect(parts[0]).toBe(userId);
      expect(parts[1]).toBe('requirements');
      expect(parts[2]).toBe('proj-valgent-99');

      // 3. Filename ends with .md
      expect(parts[3].endsWith('.md')).toBe(true);
    });

    it('handles filenames with multiple dots and sanitizes characters', () => {
      const userId = 'user-abc';
      const path = generateStoragePath({
        userId,
        featureName: 'avatars',
        itemId: 'user-abc',
        originalFileName: 'my.photo.2026.PNG',
      });

      expect(path.startsWith('user-abc/avatars/user-abc/')).toBe(true);
      expect(path.endsWith('.png')).toBe(true);
    });
  });

  describe('uploadFileToStorage', () => {
    it('uploads file and returns signed URL on success', async () => {
      const mockUpload = vi.fn().mockResolvedValue({
        data: { fullPath: 'app-files/path/file.md' },
        error: null,
      });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/app-files/path/file.md?token=abc' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const fakeFile = new File(['content'], 'spec.md', { type: 'text/markdown' });
      const result = await uploadFileToStorage({
        file: fakeFile,
        userId: 'u1',
        featureName: 'requirements',
        itemId: 'p1',
      });

      expect(result.path.startsWith('u1/requirements/p1/')).toBe(true);
      expect(result.signedUrl).toContain('token=abc');
    });

    it('falls back to secondary bucket if first bucket returns not found', async () => {
      const mockUpload = vi
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Bucket not found', statusCode: '404' },
        })
        .mockResolvedValueOnce({
          data: { fullPath: 'valgent/path/file.md' },
          error: null,
        });

      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://supabase.co/signed-url' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const fakeFile = new File(['content'], 'spec.md', { type: 'text/markdown' });
      const result = await uploadFileToStorage({
        file: fakeFile,
        userId: 'u2',
        featureName: 'requirements',
        itemId: 'p2',
      });

      expect(result.signedUrl).toBe('https://supabase.co/signed-url');
      expect(supabase.storage.from).toHaveBeenCalledTimes(3); // 2 uploads (primary + fallback) + 1 signedUrl
    });
  });

  describe('deleteFileFromStorage', () => {
    it('removes the object from bucket', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      const success = await deleteFileFromStorage('u1/requirements/p1/file.md');
      expect(success).toBe(true);
      expect(mockRemove).toHaveBeenCalledWith(['u1/requirements/p1/file.md']);
    });
  });
});
