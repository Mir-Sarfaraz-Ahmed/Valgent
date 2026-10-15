/**
 * V1.0-A — Analysis Pipeline Tracker
 * 
 * Provides deterministic analysis IDs, pipeline stage tracking,
 * and timing metadata for reproducibility.
 */

import * as crypto from 'crypto';
import { AnalysisStage } from './types';
import { redactSecrets, AnalysisError } from './errors';

/**
 * Extended pipeline stages for V1.0-A.
 * Preserves existing AnalysisStage values and adds new ones.
 */
export type PipelineStage =
  | 'INITIALIZED'
  | 'INGESTING'
  | 'PROJECT_MAPPED'
  | 'CLAIMS_EXTRACTED'
  | 'ENVIRONMENT_RESOLVED'
  | 'STATIC_ANALYSIS'
  | 'EXECUTION_PLANNING'
  | 'DYNAMIC_ANALYSIS'
  | 'EVIDENCE_BUILT'
  | 'AUTONOMOUS_VALIDATION'
  | 'CLAIMS_VALIDATED'
  | 'GAPS_IDENTIFIED'
  | 'ROADMAP_GENERATED'
  | 'REPORT_AUDITED'
  | 'LLM_SYNTHESIS'
  | 'REPORT_GENERATED'
  | 'CLEANUP'
  | 'COMPLETED'
  | 'ANALYSIS_FAILED';

export interface StageRecord {
  stage: PipelineStage;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';
  error?: string;
}

export interface AnalysisMetadata {
  analysis_id: string;
  repository_url: string;
  commit_ref?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  stages: StageRecord[];
  execution_ids: string[];
  evidence_ids: string[];
  validation_action_ids: string[];
  llm_provider?: string;
  llm_model?: string;
  final_status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

/**
 * Generates a deterministic evidence ID based on content.
 * 
 * Same content at the same location with the same type produces the same ID.
 * This satisfies requirement 3: deterministic IDs for deterministic artifacts.
 */
export function deterministicEvidenceId(
  type: string,
  location: string,
  contentHash: string
): string {
  const input = `${type}:${location}:${contentHash}`;
  const hash = crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  return `EVD-${hash}`;
}

export const VALID_TRANSITIONS: Record<PipelineStage, PipelineStage[]> = {
  INITIALIZED: ['INGESTING', 'ANALYSIS_FAILED'],
  INGESTING: ['PROJECT_MAPPED', 'ANALYSIS_FAILED'],
  PROJECT_MAPPED: ['CLAIMS_EXTRACTED', 'STATIC_ANALYSIS', 'ANALYSIS_FAILED'],
  CLAIMS_EXTRACTED: ['STATIC_ANALYSIS', 'ANALYSIS_FAILED'],
  ENVIRONMENT_RESOLVED: ['STATIC_ANALYSIS', 'ANALYSIS_FAILED'],
  STATIC_ANALYSIS: ['DYNAMIC_ANALYSIS', 'EVIDENCE_BUILT', 'EXECUTION_PLANNING', 'ANALYSIS_FAILED'],
  EXECUTION_PLANNING: ['DYNAMIC_ANALYSIS', 'ANALYSIS_FAILED'],
  DYNAMIC_ANALYSIS: ['EVIDENCE_BUILT', 'ANALYSIS_FAILED'],
  EVIDENCE_BUILT: ['LLM_SYNTHESIS', 'AUTONOMOUS_VALIDATION', 'CLAIMS_VALIDATED', 'REPORT_AUDITED', 'ANALYSIS_FAILED'],
  LLM_SYNTHESIS: ['AUTONOMOUS_VALIDATION', 'REPORT_AUDITED', 'ANALYSIS_FAILED'],
  AUTONOMOUS_VALIDATION: ['CLAIMS_VALIDATED', 'GAPS_IDENTIFIED', 'ROADMAP_GENERATED', 'REPORT_AUDITED', 'ANALYSIS_FAILED'],
  CLAIMS_VALIDATED: ['GAPS_IDENTIFIED', 'AUTONOMOUS_VALIDATION', 'ROADMAP_GENERATED', 'REPORT_AUDITED', 'COMPLETED', 'ANALYSIS_FAILED'],
  GAPS_IDENTIFIED: ['AUTONOMOUS_VALIDATION', 'ROADMAP_GENERATED', 'REPORT_AUDITED', 'ANALYSIS_FAILED'],
  ROADMAP_GENERATED: ['REPORT_AUDITED', 'ANALYSIS_FAILED'],
  REPORT_AUDITED: ['COMPLETED', 'REPORT_GENERATED', 'ANALYSIS_FAILED'],
  REPORT_GENERATED: ['CLEANUP', 'COMPLETED', 'ANALYSIS_FAILED'],
  CLEANUP: ['COMPLETED', 'ANALYSIS_FAILED'],
  COMPLETED: [],
  ANALYSIS_FAILED: []
};

/**
 * Tracks pipeline state progression.
 * Enforces that stages cannot regress and records timing.
 */
export class PipelineTracker {
  private metadata: AnalysisMetadata;
  private currentStageIndex: number = -1;

  constructor(analysisId: string, repositoryUrl: string, commitRef?: string) {
    this.metadata = {
      analysis_id: analysisId,
      repository_url: repositoryUrl,
      commit_ref: commitRef,
      started_at: new Date().toISOString(),
      stages: [],
      execution_ids: [],
      evidence_ids: [],
      validation_action_ids: [],
      final_status: 'IN_PROGRESS'
    };
  }

  get analysisId(): string {
    return this.metadata.analysis_id;
  }

  get currentStage(): PipelineStage | undefined {
    if (this.metadata.stages.length === 0) return undefined;
    return this.metadata.stages[this.metadata.stages.length - 1].stage;
  }

  /**
   * Transitions to a new pipeline stage.
   * Completes the current stage if one is active.
   */
  enterStage(stage: PipelineStage): void {
    const current = this.currentStage;
    if (current) {
      if (current === 'COMPLETED' || current === 'ANALYSIS_FAILED') {
        throw {
          code: 'INTERNAL_ERROR',
          message: `Invalid pipeline transition from ${current} to ${stage}`,
          stage: current,
          retryable: false
        } as AnalysisError;
      }
      const allowed = VALID_TRANSITIONS[current] || [];
      if (!allowed.includes(stage) && stage !== 'ANALYSIS_FAILED') {
        throw {
          code: 'INTERNAL_ERROR',
          message: `Invalid pipeline transition from ${current} to ${stage}`,
          stage: current,
          retryable: false
        } as AnalysisError;
      }
    }

    // Complete the current stage if in progress
    this.completeCurrentStage('COMPLETED');

    this.metadata.stages.push({
      stage,
      started_at: new Date().toISOString(),
      status: 'IN_PROGRESS'
    });
  }

  /**
   * Marks the current stage as completed or failed.
   */
  completeCurrentStage(status: 'COMPLETED' | 'FAILED' | 'SKIPPED', error?: string): void {
    const current = this.metadata.stages[this.metadata.stages.length - 1];
    if (current && current.status === 'IN_PROGRESS') {
      current.completed_at = new Date().toISOString();
      current.duration_ms = new Date(current.completed_at).getTime() - new Date(current.started_at).getTime();
      current.status = status;
      if (error) {
        current.error = redactSecrets(error);
      }
    }
  }

  /**
   * Marks a stage as failed with an error message.
   */
  failStage(error: string): void {
    this.completeCurrentStage('FAILED', error);
    this.metadata.final_status = 'FAILED';
  }

  /**
   * Records an execution ID generated during analysis.
   */
  addExecutionId(id: string): void {
    this.metadata.execution_ids.push(id);
  }

  /**
   * Records an evidence ID generated during analysis.
   */
  addEvidenceId(id: string): void {
    this.metadata.evidence_ids.push(id);
  }

  /**
   * Records a validation action decision ID.
   */
  addValidationActionId(id: string): void {
    this.metadata.validation_action_ids.push(id);
  }

  /**
   * Records the LLM provider/model used for synthesis.
   */
  setLlmInfo(provider: string, model?: string): void {
    this.metadata.llm_provider = provider;
    if (model) this.metadata.llm_model = model;
  }

  /**
   * Completes the analysis and returns the full metadata.
   */
  complete(): AnalysisMetadata {
    this.completeCurrentStage('COMPLETED');
    this.metadata.completed_at = new Date().toISOString();
    this.metadata.duration_ms = new Date(this.metadata.completed_at).getTime() - new Date(this.metadata.started_at).getTime();
    if (this.metadata.final_status !== 'FAILED') {
      this.metadata.final_status = 'COMPLETED';
    }
    return { ...this.metadata };
  }

  /**
   * Returns the current metadata snapshot.
   */
  getMetadata(): AnalysisMetadata {
    return { ...this.metadata };
  }

  /**
   * Returns just the stage names for backwards compatibility with AnalysisStage[].
   */
  getCompletedStageNames(): string[] {
    return this.metadata.stages
      .filter(s => s.status === 'COMPLETED')
      .map(s => s.stage);
  }
}
