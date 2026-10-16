import { ProjectReport } from './report';

export type ProjectStatus = 'in_progress' | 'needs_review' | 'completed';

export interface Project {
  id: string;
  name: string;
  description: string;
  repositoryUrl: string;
  branch: string;
  commitSha: string;
  status: ProjectStatus;
  lastAnalyzedAt: string;
  createdAt: string;
  ownerId: string;
  latestReport?: ProjectReport;
}

export interface UploadedRequirementFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
  status: 'parsed' | 'uploading' | 'failed';
}
