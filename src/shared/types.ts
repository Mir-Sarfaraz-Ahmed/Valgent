export interface RepositoryDescriptor {
  repository_url: string;
  commit_sha?: string;
  local_path: string;
  branch: string;
  fetched_at: string;
}

export interface AnalysisRequest {
  repository_url: string;
  commit_sha?: string;
}

export type EvidenceClassification = 'IMPLEMENTATION' | 'EXECUTION' | 'TEST' | 'CONFIGURATION' | 'DOCUMENTATION' | 'DEPENDENCY' | 'RUNTIME' | 'UNCLASSIFIED';

export type EvidenceType =
  | 'SOURCE_CODE'
  | 'DOCUMENT'
  | 'DEPENDENCY'
  | 'API_ROUTE'
  | 'DATABASE_SCHEMA'
  | 'CONFIGURATION'
  | 'TEST'
  | 'BUILD_RESULT'
  | 'COMMAND_OUTPUT'
  | 'RUNTIME_TRACE'
  | 'COMMIT'
  | 'ENVIRONMENT'
  | 'AST_SYMBOL'
  | 'AST_IMPORT'
  | 'AST_EXPORT'
  | 'AST_CALL'
  | 'DATABASE_OPERATION'
  | 'REACT_COMPONENT'
  | 'SEMANTIC_RELATIONSHIP';

export type SandboxOperation = 'INSTALL_DEPENDENCIES' | 'BUILD' | 'TEST' | 'CUSTOM_VALIDATION';

export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';

export interface PackageManagerDetection {
  name: PackageManager;
  confidence: 'HIGH' | 'LOW';
  detected_from: string;
  warnings: string[];
}

export type ExecutionPhaseName = 'DISCOVERY' | 'INSTALL' | 'BUILD' | 'TEST';
export type ExecutionPhaseStatus = 'PASSED' | 'FAILED' | 'SKIPPED' | 'NOT_SUPPORTED' | 'TIMED_OUT' | 'ENVIRONMENT_FAILED' | 'NOT_ATTEMPTED';

export interface DeterministicEvaluation {
  implementation_status: 'PRESENT' | 'PARTIAL' | 'ABSENT';
  execution_status: 'PASSED' | 'FAILED' | 'NOT_ATTEMPTED' | 'ABSENT';
  test_status: 'PASSED' | 'FAILED' | 'NOT_ATTEMPTED' | 'ABSENT';
  contradiction_status: 'CONTRADICTED' | 'NONE';
  evidence_sufficiency: 'SUFFICIENT' | 'PARTIAL' | 'INSUFFICIENT';
  deterministic_constraints: string[];
}

export interface ExecutionPhaseResult {
  phase: ExecutionPhaseName;
  status: ExecutionPhaseStatus;
  command?: string;
  exit_code?: number;
  duration_ms: number;
  stdout?: string;
  stderr?: string;
  timed_out?: boolean;
  skip_reason?: string;
  network_enabled: boolean;
}

export interface ContainerTelemetry {
  image: string;
  network_mode: string;
  cpu_limit?: string;
  memory_limit?: string;
  pid_limit?: string;
}

export interface EnvironmentTelemetry {
  runtime: string;
  runtime_version: string;
  package_manager: string;
  package_manager_version: string;
  image: string;
  resolution_status: 'RESOLVED' | 'FAILED';
  source: string;
}

export interface ExecutionResult {
  execution_id: string;
  started_at: string;
  duration_ms: number;
  package_manager: PackageManagerDetection;
  environment?: EnvironmentTelemetry;
  phases: ExecutionPhaseResult[];
  container: ContainerTelemetry;
}

export interface Evidence {
  evidence_id: string;
  type: EvidenceType;
  location: string;
  line_start?: number;
  line_end?: number;
  content_hash: string;
  description: string;
  source: string;
  classification?: EvidenceClassification;
  metadata?: Record<string, any>;
}

export interface ExecutionReportOperation {
  operation: SandboxOperation;
  status: string;
}

export type AnalysisStage = 
  | 'INITIALIZED'
  | 'INGESTING'
  | 'PROJECT_MAPPED'
  | 'ENVIRONMENT_RESOLVED'
  | 'STATIC_ANALYSIS'
  | 'EXECUTION_PLANNING'
  | 'DYNAMIC_ANALYSIS'
  | 'EVIDENCE_BUILT'
  | 'AUTONOMOUS_VALIDATION'
  | 'LLM_SYNTHESIS'
  | 'REPORT_GENERATED'
  | 'CLEANUP'
  | 'COMPLETED';

export type ValidationStatus = 'VERIFIED' | 'PARTIALLY_VERIFIED' | 'NOT_VERIFIED' | 'INSUFFICIENT_EVIDENCE';

export interface Claim {
  claim_id: string;
  text: string;
}

export interface ValidationResult {
  claim_id: string;
  text: string;
  status: ValidationStatus;
  conclusion: string;
  evidence_refs: string[];
  graph_refs: string[];
  requirement_refs: string[];
  checks: string[];
  limitations: string[];
  missing_evidence: string[];
}

export interface RemediationTask {
  task_id: string;
  claim_id: string;
  requirement_id?: string;
  title: string;
  problem: string;
  evidence_refs: string[];
  recommended_actions: string[];
  acceptance_criteria: string[];
}

export type LLMProviderName = 'gemini' | 'openrouter' | 'none';

export interface LlmStatus {
  status: 'SUCCESS' | 'UNAVAILABLE';
  provider: LLMProviderName;
  stage: AnalysisStage;
  error_code?: 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INVALID_RESPONSE' | 'AUTHENTICATION_FAILED' | 'UNKNOWN';
  retryable?: boolean;
}

export interface ProjectReport {
  schema_version: string;
  analysis_run_id: string;

  project: {
    id: string;
    name: string;
    repository_url?: string;
    repository_commit?: string;
    package_manager?: string;
    runtime?: string;
    architecture?: {
      components: string[];
      entry_points: string[];
      api_routes: string[];
      databases: string[];
      dependencies: string[];
    };
    features?: string[];
  };

  analysis: {
    started_at: string;
    completed_at: string;
    duration_ms: number;
    status: string;
    stages?: AnalysisStage[];
  };

  summary: {
    overall_status: string;
    claims_total: number;
    verified: number;
    partially_verified: number;
    not_verified: number;
    insufficient_evidence: number;
  };

  requirements: ValidationResult[];

  evidence: Evidence[];
  
  evidence_graph?: {
    graph_version: string;
    nodes: any[];
    edges: any[];
    claim_chains: any[];
  };

  validation_actions: ActionDecisionRecord[];

  roadmap: RemediationTask[];

  diagnostics: {
    warnings: string[];
    errors: string[];
    execution_failures: string[];
    provider_failures: string[];
    unsupported_features: string[];
  };

  // Legacy fields for backward compatibility
  llm?: LlmStatus;
  execution?: {
    supported: boolean;
    telemetry?: ExecutionResult;
  };
}

// V0.9 Autonomous Validation Orchestration Types

export type ValidationActionType = 'STATIC_INSPECTION' | 'BUILD' | 'TEST' | 'TARGETED_TEST' | 'HEALTH_CHECK' | 'NONE';

export interface ValidationAction {
  action_id: string;
  claim_id: string;
  type: ValidationActionType;
  target?: string;
  rationale: string;
  required_evidence: string[];
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  estimated_cost: 'LOW' | 'MEDIUM' | 'HIGH';
  prerequisites: string[];
}

export type ActionExecutionStatus = 
  | 'ACTION_NOT_SELECTED'
  | 'ACTION_NOT_ATTEMPTED'
  | 'ACTION_REJECTED'
  | 'ACTION_FAILED'
  | 'ACTION_SUCCEEDED'
  | 'ACTION_SKIPPED_CACHED';

export interface ActionDecisionRecord {
  decision_id: string;
  claim_id: string;
  candidate_actions: ValidationAction[];
  selected_action?: ValidationAction;
  selection_reason: string;
  safety_decision: 'ALLOWED' | 'REJECTED';
  execution_id?: string;
  result: ActionExecutionStatus;
  new_evidence: string[];
  re_evaluation_result?: ValidationStatus;
}
