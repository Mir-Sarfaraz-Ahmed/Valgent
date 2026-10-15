import * as fs from 'fs/promises';
import * as path from 'path';
import { EvidenceEngine } from '../evidence/engine';
import { RepositoryDescriptor } from '../shared/types';

export class DocumentAnalyzer {
  static async analyze(descriptor: RepositoryDescriptor, engine: EvidenceEngine): Promise<void> {
    const rootPath = descriptor.local_path;
    
    // Look for README.md
    try {
      const readmePath = path.join(rootPath, 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      
      engine.addEvidence(
        'DOCUMENT',
        'README.md',
        content.substring(0, 5000), // Trim to avoid huge payloads
        'Project README file containing BUILDER_ASSERTIONs',
        'repository'
      );
    } catch (e) {
      // README doesn't exist, ignore
    }
  }
}
