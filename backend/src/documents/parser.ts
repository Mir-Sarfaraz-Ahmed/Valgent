import * as path from 'path';

export type ContentType = 'markdown' | 'pdf_text' | 'plain';

/**
 * Detect the content type of an uploaded file based on its name and mimetype.
 */
export function detectContentType(filename: string, mimetype?: string): ContentType {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.md' || ext === '.mdx') return 'markdown';
  if (ext === '.pdf' || mimetype === 'application/pdf') return 'pdf_text';
  return 'plain';
}

/**
 * Extract text from a Markdown buffer.
 * Returns the raw UTF-8 string (Markdown is already text).
 */
export function parseMarkdown(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/**
 * Extract text from a PDF buffer using pdf-parse.
 * Falls back to an error message if the package is unavailable.
 */
export async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // Dynamic import so the build doesn't hard-fail if pdf-parse is absent
    const pdfParse = (await import('pdf-parse')).default;
    const result = await pdfParse(buffer);
    return result.text ?? '';
  } catch (err: any) {
    if (err.code === 'MODULE_NOT_FOUND') {
      throw new Error(
        'pdf-parse is not installed. Run: npm install pdf-parse in the backend directory.'
      );
    }
    throw err;
  }
}

/**
 * Parse plain text from buffer.
 */
export function parsePlain(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

/**
 * Main entry point: parse a file buffer to text given filename + mimetype.
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimetype?: string
): Promise<{ text: string; contentType: ContentType }> {
  const contentType = detectContentType(filename, mimetype);

  let text: string;
  switch (contentType) {
    case 'markdown':
      text = parseMarkdown(buffer);
      break;
    case 'pdf_text':
      text = await parsePdf(buffer);
      break;
    default:
      text = parsePlain(buffer);
  }

  return { text, contentType };
}

/**
 * Validate file size against environment limit (default 10 MB).
 */
export function validateFileSize(sizeBytes: number): void {
  const maxMb = Number(process.env.DOC_MAX_SIZE_MB) || 10;
  const maxBytes = maxMb * 1024 * 1024;
  if (sizeBytes > maxBytes) {
    throw new Error(`File exceeds maximum allowed size of ${maxMb} MB.`);
  }
}
