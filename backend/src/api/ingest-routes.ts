import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GitIngestService } from '../gitingest/service';

const router = Router();

const IngestSchema = z.object({
  repository_url: z.string().url('A valid GitHub repository URL is required'),
  commit_sha: z.string().optional(),
});

/**
 * POST /api/v1/ingest
 * Fetch a gitingest digest for a GitHub repository.
 */
router.post('/', async (req: Request, res: Response) => {
  let parsed;
  try {
    parsed = IngestSchema.parse(req.body);
  } catch (err: any) {
    const messages = err?.errors?.map((e: any) => e.message) ?? [String(err)];
    return res.status(400).json({ error: 'Invalid request', details: messages });
  }

  try {
    const result = await GitIngestService.ingest(parsed.repository_url);

    return res.status(200).json({
      ingest_id:      result.ingest_id,
      repository_url: result.repository_url,
      file_tree:      result.file_tree,
      // return only a preview of the full digest to keep response size manageable
      digest_preview: result.digest_text.slice(0, 2000),
      estimated_tokens: result.estimated_tokens,
      fetched_at:     result.fetched_at,
    });
  } catch (err: any) {
    console.error('[IngestRoutes] ingest failed:', err?.message);
    return res.status(502).json({ error: 'GitIngest fetch failed', details: err?.message });
  }
});

/**
 * POST /api/v1/ingest/full
 * Returns the complete digest text (can be large — use with caution).
 */
router.post('/full', async (req: Request, res: Response) => {
  let parsed;
  try {
    parsed = IngestSchema.parse(req.body);
  } catch (err: any) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const result = await GitIngestService.ingest(parsed.repository_url);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(502).json({ error: 'GitIngest fetch failed', details: err?.message });
  }
});

/**
 * GET /api/v1/ingest/:id
 * Retrieve a cached ingest result by ingest_id.
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = GitIngestService.getById(id);
  if (!result) {
    return res.status(404).json({ error: 'Ingest result not found or expired' });
  }
  return res.status(200).json({
    ingest_id:      result.ingest_id,
    repository_url: result.repository_url,
    file_tree:      result.file_tree,
    estimated_tokens: result.estimated_tokens,
    fetched_at:     result.fetched_at,
  });
});

export default router;
