export interface ContextDigestConfig {
  repoPath: string;
  maxFileSize: number; // bytes
  ignorePatterns: string[];
}

export interface ContextFile {
  path: string;
  content: string;
  size: number;
  tokens: number;
}

export interface ContextDigest {
  summary: {
    totalFiles: number;
    eligibleFiles: number;
    totalDirectories: number;
    estimatedTokens: number;
  };
  tree: string;
  files: ContextFile[];
}

export interface SelectionConfig {
  tokenBudget: number;
}

export interface SelectionResult {
  selectedFiles: ContextFile[];
  summary: {
    totalFiles: number;
    eligibleFiles: number;
    selectedFiles: number;
    estimatedTokens: number;
    budget: number;
    truncated: boolean;
    digestHash: string;
  };
}
