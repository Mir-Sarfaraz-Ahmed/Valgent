import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { GitDiagramService } from '../gitdiagram/service';

const router = Router();

const DiagramSchema = z.object({
  repository_url: z.string().url('A valid GitHub repository URL is required'),
});

/**
 * POST /api/v1/diagram
 * Generate a Mermaid architecture diagram for a GitHub repository.
 * Tries gitdiagram.com first, falls back to Gemini self-generation.
 */
router.post('/', async (req: Request, res: Response) => {
  let parsed;
  try {
    parsed = DiagramSchema.parse(req.body);
  } catch (err: any) {
    const messages = err?.errors?.map((e: any) => e.message) ?? [String(err)];
    return res.status(400).json({ error: 'Invalid request', details: messages });
  }

  try {
    const result = await GitDiagramService.generate(parsed.repository_url);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[DiagramRoutes] diagram generation failed:', err?.message);
    return res.status(502).json({ error: 'Diagram generation failed', details: err?.message });
  }
});

/**
 * GET /api/v1/diagram/:id
 * Retrieve a cached diagram result by diagram_id.
 */
router.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = GitDiagramService.getById(id);
  if (!result) {
    return res.status(404).json({ error: 'Diagram not found or expired from cache' });
  }
  return res.status(200).json(result);
});

export default router;
