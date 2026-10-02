import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { RepositoryDescriptor } from '../shared/types';

const execAsync = promisify(exec);

export class GithubFetcher {
  /**
   * Validates a GitHub repository URL.
   */
  static isValidUrl(url: string): boolean {
    const regex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/;
    return regex.test(url);
  }

  /**
   * Fetches the repository to a temporary directory.
   */
  static async fetch(repository_url: string, commit_sha?: string): Promise<RepositoryDescriptor> {
    if (!this.isValidUrl(repository_url)) {
      throw new Error(`Invalid GitHub URL: ${repository_url}`);
    }

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'valgent-'));
    
    try {
      // Clone the repository
      // depth 1 unless commit_sha is provided
      if (commit_sha) {
        await execAsync(`git clone ${repository_url} .`, { cwd: tempDir });
        await execAsync(`git checkout ${commit_sha}`, { cwd: tempDir });
      } else {
        await execAsync(`git clone --depth 1 ${repository_url} .`, { cwd: tempDir });
      }

      // Determine actual commit and branch
      const { stdout: actualCommit } = await execAsync('git rev-parse HEAD', { cwd: tempDir });
      
      let branch = 'main';
      try {
        const { stdout: actualBranch } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: tempDir });
        branch = actualBranch.trim();
      } catch (e) {
        // Detached HEAD or similar
        branch = 'detached';
      }

      return {
        repository_url,
        commit_sha: actualCommit.trim(),
        local_path: tempDir,
        branch,
        fetched_at: new Date().toISOString()
      };
    } catch (error) {
      // Attempt cleanup on failure
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        // Ignore cleanup errors
      }
      throw error;
    }
  }

  /**
   * Cleans up the temporary directory.
   */
  static async cleanup(descriptor: RepositoryDescriptor): Promise<void> {
    if (descriptor.local_path && descriptor.local_path.startsWith(os.tmpdir())) {
      try {
        await fs.rm(descriptor.local_path, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to clean up workspace at ${descriptor.local_path}`, error);
      }
    }
  }
}
