import * as crypto from 'crypto';
import { DocClaim } from '../typesafe/comparator';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadedDocument {
  doc_id: string;
  project_id?: string;
  filename: string;
  content: string;
  content_type: 'markdown' | 'pdf_text' | 'plain';
  size_bytes: number;
  uploaded_at: string;
  claims_extracted: DocClaim[];
}

// ─── In-memory Store ──────────────────────────────────────────────────────────

const store = new Map<string, UploadedDocument>();

export const DocumentStore = {
  save(doc: Omit<UploadedDocument, 'doc_id' | 'uploaded_at'>): UploadedDocument {
    const doc_id = `DOC-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const full: UploadedDocument = {
      ...doc,
      doc_id,
      uploaded_at: new Date().toISOString(),
    };
    store.set(doc_id, full);
    return full;
  },

  getById(doc_id: string): UploadedDocument | null {
    return store.get(doc_id) ?? null;
  },

  getAll(project_id?: string): UploadedDocument[] {
    const all = Array.from(store.values());
    if (!project_id) return all;
    return all.filter(d => d.project_id === project_id);
  },

  updateClaims(doc_id: string, claims: DocClaim[]): UploadedDocument | null {
    const doc = store.get(doc_id);
    if (!doc) return null;
    doc.claims_extracted = claims;
    store.set(doc_id, doc);
    return doc;
  },

  delete(doc_id: string): boolean {
    return store.delete(doc_id);
  },
};
