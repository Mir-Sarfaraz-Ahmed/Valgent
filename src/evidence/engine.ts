import { Evidence, EvidenceType } from '../shared/types';
import * as crypto from 'crypto';

export class EvidenceEngine {
  private evidenceStore: Evidence[] = [];

  public addEvidence(
    type: EvidenceType,
    location: string,
    content: string,
    description: string,
    source: string,
    lineStart?: number,
    lineEnd?: number,
    metadata?: Record<string, any>
  ): Evidence {
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');
    
    // Deterministic classification
    let classification: import('../shared/types').EvidenceClassification = 'UNCLASSIFIED';
    if (['AST_NODE', 'AST_ROUTE', 'API_ROUTE', 'SOURCE_CODE', 'DATABASE_OPERATION', 'DATABASE_SCHEMA', 'AST_SYMBOL', 'AST_IMPORT', 'AST_EXPORT', 'AST_CALL', 'REACT_COMPONENT'].includes(type)) classification = 'IMPLEMENTATION';
    else if (['BUILD_RESULT', 'COMMAND_OUTPUT'].includes(type)) classification = 'EXECUTION';
    else if (['TEST', 'TEST_RESULT'].includes(type)) classification = 'TEST'; // 'TEST' maps to TEST
    else if (['RUNTIME_TRACE'].includes(type)) classification = 'RUNTIME';
    else if (['DOCUMENTATION', 'DOCUMENT', 'README'].includes(type)) classification = 'DOCUMENTATION'; // DOCUMENT
    else if (['CONFIGURATION'].includes(type)) classification = 'CONFIGURATION';
    else if (['DEPENDENCY'].includes(type)) classification = 'DEPENDENCY';
    
    const evidence: Evidence = {
      evidence_id: metadata && metadata.evidence_id ? metadata.evidence_id : `EVD-${crypto.randomUUID()}`,
      type,
      location,
      content_hash: contentHash,
      description,
      source,
      line_start: lineStart,
      line_end: lineEnd,
      classification,
      metadata
    };

    this.evidenceStore.push(evidence);
    return evidence;
  }

  public getEvidence(): Evidence[] {
    return [...this.evidenceStore];
  }

  public clear(): void {
    this.evidenceStore = [];
  }
}
