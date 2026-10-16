import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as crypto from 'crypto';
import { z } from 'zod';
import { DocumentStore } from '../documents/store';
import { parseDocument, validateFileSize } from '../documents/parser';
import { extractClaimsFromText } from '../documents/claim-extractor';
import { GitIngestService } from '../gitingest/service';
import { DocRepoComparator, ComparisonRequest, ComparisonResult } from '../typesafe/comparator';
import { getTypeSafeClient, isTypeSafeAvailable } from '../typesafe/client';
import { GeminiProvider } from '../llm/gemini';
import { LLMRouter } from '../llm/router';

// ─── Multer config (memory storage, 10 MB limit) ──────────────────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: (Number(process.env.DOC_MAX_SIZE_MB) || 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.md', '.mdx', '.txt', '.pdf'];
    const ext = '.' + (file.originalname.split('.').pop() ?? '').toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
  },
});

// ─── In-memory comparison results ────────────────────────────────────────────

interface ComparisonReport {
  comparison_id: string;
  repository_url: string;
  doc_id: string;
  created_at: string;
  results: ComparisonResult[];
  summary: {
    total: number;
    verified: number;
    partially_verified: number;
    not_verified: number;
    insufficient_evidence: number;
    contradicted: number;
    requires_llm_review: number;
  };
  typesafe_available: boolean;
}

const comparisonStore = new Map<string, ComparisonReport>();

// ─── Router ───────────────────────────────────────────────────────────────────

const router = Router();

// ── POST /api/v1/upload-docs ────────────────────────────────────────────────
router.post(
  '/upload-docs',
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Send a file in the "file" field.' });
    }

    try {
      validateFileSize(req.file.size);
    } catch (err: any) {
      return res.status(413).json({ error: err.message });
    }

    let text: string;
    let contentType: any;
    try {
      const parsed = await parseDocument(req.file.buffer, req.file.originalname, req.file.mimetype);
      text = parsed.text;
      contentType = parsed.contentType;
    } catch (err: any) {
      return res.status(422).json({ error: 'Failed to parse document', details: err.message });
    }

    // Save document (claims empty initially)
    const doc = DocumentStore.save({
      project_id:       (req.body.project_id as string) || undefined,
      filename:         req.file.originalname,
      content:          text,
      content_type:     contentType,
      size_bytes:       req.file.size,
      claims_extracted: [],
    });

    // Async claim extraction — respond immediately, extraction runs in background
    extractClaimsFromText(doc.doc_id, text)
      .then(claims => DocumentStore.updateClaims(doc.doc_id, claims))
      .catch(err => console.error(`[DocumentRoutes] Claim extraction failed for ${doc.doc_id}:`, err));

    return res.status(201).json({
      doc_id:       doc.doc_id,
      filename:     doc.filename,
      content_type: doc.content_type,
      size_bytes:   doc.size_bytes,
      uploaded_at:  doc.uploaded_at,
      message:      'Document uploaded. Claim extraction is running in the background.',
    });
  }
);

// ── GET /api/v1/documents ────────────────────────────────────────────────────
router.get('/documents', (req: Request, res: Response) => {
  const projectId = req.query.project_id as string | undefined;
  const docs = DocumentStore.getAll(projectId).map(d => ({
    doc_id:       d.doc_id,
    filename:     d.filename,
    content_type: d.content_type,
    size_bytes:   d.size_bytes,
    uploaded_at:  d.uploaded_at,
    claims_count: d.claims_extracted.length,
  }));
  return res.status(200).json({ documents: docs });
});

// ── GET /api/v1/documents/:id ────────────────────────────────────────────────
router.get('/documents/:id', (req: Request, res: Response) => {
  const doc = DocumentStore.getById(req.params.id as string);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  return res.status(200).json(doc);
});

// ── DELETE /api/v1/documents/:id ─────────────────────────────────────────────
router.delete('/documents/:id', (req: Request, res: Response) => {
  const deleted = DocumentStore.delete(req.params.id as string);
  if (!deleted) return res.status(404).json({ error: 'Document not found' });
  return res.status(200).json({ success: true });
});

// ── POST /api/v1/compare ─────────────────────────────────────────────────────

const CompareSchema = z.object({
  repository_url:  z.string().url('A valid GitHub repository URL is required'),
  doc_id:          z.string().min(1, 'doc_id is required'),
  use_gitingest:   z.boolean().optional().default(true),
  generate_diagram: z.boolean().optional().default(false),
  specific_claims: z.array(z.string()).optional(), // optional subset of claim_ids to compare
});

router.post('/compare', async (req: Request, res: Response) => {
  let parsed;
  try {
    parsed = CompareSchema.parse(req.body);
  } catch (err: any) {
    const messages = err?.errors?.map((e: any) => e.message) ?? [String(err)];
    return res.status(400).json({ error: 'Invalid request', details: messages });
  }

  const doc = DocumentStore.getById(parsed.doc_id);
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const claims = parsed.specific_claims
    ? doc.claims_extracted.filter(c => parsed.specific_claims!.includes(c.claim_id))
    : doc.claims_extracted;

  if (claims.length === 0) {
    return res.status(422).json({
      error: 'No claims available for comparison.',
      hint: 'Claims are extracted asynchronously after upload. Wait a moment and retry, or check GET /api/v1/documents/:id',
    });
  }

  // 1. Fetch gitingest digest
  let ingest: any;
  try {
    ingest = await GitIngestService.ingest(parsed.repository_url);
  } catch (err: any) {
    return res.status(502).json({ error: 'GitIngest fetch failed', details: err?.message });
  }

  // 2. Build comparison results
  let results: ComparisonResult[];
  const typesafeAvailable = isTypeSafeAvailable();

  if (typesafeAvailable) {
    // --- TypeSafe path: structured typed judgments ---
    try {
      const client = getTypeSafeClient();
      const comparator = new DocRepoComparator(client);

      const requests: ComparisonRequest[] = claims.map(claim => ({
        doc_claim:        claim,
        gitingest_digest: ingest,
        evidence_summary: `Repository: ${parsed.repository_url}`,
      }));

      results = await comparator.compareBatch(requests);
    } catch (err: any) {
      console.error('[DocumentRoutes] TypeSafe compareBatch failed:', err?.message);
      return res.status(500).json({ error: 'TypeSafe comparison failed', details: err?.message });
    }
  } else {
    // --- Fallback: Gemini-only soft assessment ---
    console.warn('[DocumentRoutes] TYPESAFE_API_KEY not set — using Gemini fallback');
    results = await gemininFallbackComparison(claims, ingest, parsed.repository_url);
  }

  // 3. Summarise
  const summary = {
    total:                results.length,
    verified:             results.filter(r => r.valgent_status === 'VERIFIED').length,
    partially_verified:   results.filter(r => r.valgent_status === 'PARTIALLY_VERIFIED').length,
    not_verified:         results.filter(r => r.valgent_status === 'NOT_VERIFIED').length,
    insufficient_evidence: results.filter(r => r.valgent_status === 'INSUFFICIENT_EVIDENCE').length,
    contradicted:         results.filter(r => r.typesafe_verdict === 'contradicted').length,
    requires_llm_review:  results.filter(r => r.requires_llm_review).length,
  };

  const comparisonId = `CMP-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
  const report: ComparisonReport = {
    comparison_id:      comparisonId,
    repository_url:     parsed.repository_url,
    doc_id:             parsed.doc_id,
    created_at:         new Date().toISOString(),
    results,
    summary,
    typesafe_available: typesafeAvailable,
  };

  comparisonStore.set(comparisonId, report);

  return res.status(200).json(report);
});

// ── GET /api/v1/comparisons/:id ──────────────────────────────────────────────
router.get('/comparisons/:id', (req: Request, res: Response) => {
  const report = comparisonStore.get(req.params.id as string);
  if (!report) return res.status(404).json({ error: 'Comparison report not found' });
  return res.status(200).json(report);
});

// ─── Gemini Fallback (when TypeSafe key unavailable) ─────────────────────────

async function gemininFallbackComparison(
  claims: any[],
  ingest: any,
  repositoryUrl: string
): Promise<ComparisonResult[]> {
  return claims.map(claim => ({
    claim_id:                  claim.claim_id,
    doc_id:                    claim.doc_id,
    claim_text:                claim.text,
    typesafe_verdict:          'not_implemented' as const,
    implementation_confidence: 0,
    evidence_sufficiency:      'insufficient',
    evidence_sufficiency_score: 0,
    is_verifiable:             0,
    structural_match:          0,
    requires_llm_review:       true,
    valgent_status:            'INSUFFICIENT_EVIDENCE' as const,
    method:                    'typesafe_escalate_llm' as const,
  }));
}

export default router;
