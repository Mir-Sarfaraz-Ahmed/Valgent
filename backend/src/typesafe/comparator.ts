import { TypeSafeClient, choice, noul, score } from '@typesafe-ai/sdk';
import { ValidationStatus } from '../shared/types';
import { GitIngestResult, GitIngestService } from '../gitingest/service';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface DocClaim {
  claim_id: string;
  doc_id: string;
  text: string;
  section?: string;
  line_number?: number;
}

export interface ComparisonRequest {
  doc_claim: DocClaim;
  gitingest_digest: GitIngestResult;
  evidence_summary?: string;
  project_id?: string;
}

export interface ComparisonResult {
  claim_id: string;
  doc_id: string;
  claim_text: string;

  /** Raw TypeSafe Jev verdict */
  typesafe_verdict: 'fully_implemented' | 'partially_implemented' | 'not_implemented' | 'contradicted';
  implementation_confidence: number;   // 0–1, from TypeSafe Choice confidence
  evidence_sufficiency: string;        // from TypeSafe Score level label
  evidence_sufficiency_score: number;  // 0–3 mapped from level index
  is_verifiable: number;               // 0–1 noul probability
  structural_match: number;            // 0–1 noul probability

  /** Whether this result should be escalated to Gemini for deeper review */
  requires_llm_review: boolean;

  /** Mapped to Valgent's existing ValidationStatus enum */
  valgent_status: ValidationStatus;

  /** Which method resolved this verdict */
  method: 'typesafe_high_confidence' | 'typesafe_medium_confidence' | 'typesafe_escalate_llm';
}

// ─── Verdict Mapper ───────────────────────────────────────────────────────────

const VERDICT_TO_STATUS: Record<string, ValidationStatus> = {
  fully_implemented:    'VERIFIED',
  partially_implemented: 'PARTIALLY_VERIFIED',
  not_implemented:      'INSUFFICIENT_EVIDENCE',
  contradicted:         'NOT_VERIFIED',
};

function mapToValidationStatus(
  verdict: string,
  confidence: number,
  evidenceSufficiencyScore: number
): ValidationStatus {
  if (confidence < 0.5) return 'INSUFFICIENT_EVIDENCE';
  if (verdict === 'contradicted') return 'NOT_VERIFIED';
  if (verdict === 'fully_implemented' && evidenceSufficiencyScore >= 2) return 'VERIFIED';
  if (verdict === 'fully_implemented') return 'PARTIALLY_VERIFIED';
  return (VERDICT_TO_STATUS[verdict] as ValidationStatus) ?? 'INSUFFICIENT_EVIDENCE';
}

const SCORE_LEVELS = ['insufficient', 'partial', 'sufficient', 'comprehensive'];

// ─── DocRepoComparator ────────────────────────────────────────────────────────

export class DocRepoComparator {
  private client: TypeSafeClient;

  constructor(client: TypeSafeClient) {
    this.client = client;
  }

  /**
   * Compare a single documentation claim against gitingest code reality.
   * Sends ONE TypeSafe request with 4 parallel questions.
   */
  async compare(request: ComparisonRequest): Promise<ComparisonResult> {
    const { doc_claim, gitingest_digest, evidence_summary } = request;

    const relevantCode = GitIngestService.extractRelevantSection(
      doc_claim.text,
      gitingest_digest.digest_text,
      6000
    );

    const state = {
      doc_claim: doc_claim.text,
      code_digest: relevantCode,
      file_tree: gitingest_digest.file_tree.slice(0, 2000), // cap tree size
      evidence_summary: evidence_summary || 'No additional evidence.'
    };

    const response = await this.client.systemOne({
      state,
      questions: {
        implementation_match: choice(
          'Does the code implement what this documentation claim states? ' +
          'Review the code_digest and file_tree to determine whether the claimed feature or behaviour is actually present in the codebase.',
          {
            fully_implemented:    null,
            partially_implemented: null,
            not_implemented:      null,
            contradicted:         null,
          }
        ),

        evidence_sufficiency: score(
          'How sufficient is the available code evidence (code_digest + file_tree) to evaluate this claim? ' +
          'Consider whether the right files are present and readable.',
          ['insufficient', 'partial', 'sufficient', 'comprehensive']
        ),

        is_verifiable: noul(
          'Can this claim be definitively verified through static code inspection alone, ' +
          'without needing to run or build the software?'
        ),

        structural_match: noul(
          'Does the overall repository file structure shown in file_tree support the existence ' +
          'of what this documentation claim describes?'
        ),
      }
    });

    const { implementation_match, evidence_sufficiency, is_verifiable, structural_match } =
      response.answers;

    const verdictKey = implementation_match.choice as string;
    const confidence = implementation_match.confidence ?? 0;
    const scoreLevel = (evidence_sufficiency.score as unknown) as string;
    const scoreLevelIndex = SCORE_LEVELS.indexOf(scoreLevel);
    const isVerifiableProb = is_verifiable.noul ?? 0;
    const structuralMatchProb = structural_match.noul ?? 0;

    // Escalation logic
    let method: ComparisonResult['method'];
    let requiresLlmReview = false;

    if (confidence >= 0.8) {
      method = 'typesafe_high_confidence';
    } else if (confidence >= 0.5) {
      method = 'typesafe_medium_confidence';
    } else {
      method = 'typesafe_escalate_llm';
      requiresLlmReview = true;
    }

    return {
      claim_id:                  doc_claim.claim_id,
      doc_id:                    doc_claim.doc_id,
      claim_text:                doc_claim.text,
      typesafe_verdict:          verdictKey as ComparisonResult['typesafe_verdict'],
      implementation_confidence: confidence,
      evidence_sufficiency:      scoreLevel,
      evidence_sufficiency_score: scoreLevelIndex,
      is_verifiable:             isVerifiableProb,
      structural_match:          structuralMatchProb,
      requires_llm_review:       requiresLlmReview,
      valgent_status:            mapToValidationStatus(verdictKey, confidence, scoreLevelIndex),
      method,
    };
  }

  /**
   * Compare multiple claims in parallel (Promise.all).
   */
  async compareBatch(requests: ComparisonRequest[]): Promise<ComparisonResult[]> {
    return Promise.all(requests.map(r => this.compare(r)));
  }
}
