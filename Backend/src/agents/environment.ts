import { ProjectMap } from '../analyzers/mapper';
import { RepositoryDescriptor, PackageManagerDetection, EnvironmentTelemetry } from '../shared/types';
import * as path from 'path';
import * as fs from 'fs';
import { DockerSandbox } from '../sandbox/docker';
import { EvidenceEngine } from '../evidence/engine';

export interface ResolvedEnvironment {
  telemetry: EnvironmentTelemetry;
  image: string;
}

export class EnvironmentResolver {
  private static readonly DEFAULT_NODE_VERSION = '20';
  private static readonly DEFAULT_BUN_VERSION = '1';

  public static async resolve(
    descriptor: RepositoryDescriptor,
    map: ProjectMap,
    packageManager: PackageManagerDetection,
    evidenceEngine: EvidenceEngine
  ): Promise<ResolvedEnvironment> {
    const { runtime, runtimeVersion, versionSource } = this.detectRuntime(descriptor.local_path, packageManager);

    let image = 'node:20-slim'; // Safe fallback
    if (runtime === 'bun') {
      image = `oven/bun:${runtimeVersion}`;
    } else {
      image = `node:${runtimeVersion}-slim`;
    }

    // Verify Environment using a temporary DockerSandbox
    const sandbox = new DockerSandbox(descriptor.local_path, image);
    
    let pmVersion = 'unknown';
    let resolutionStatus: 'RESOLVED' | 'FAILED' = 'FAILED';

    try {
      if (packageManager.name === 'bun') {
        const res = await sandbox.runCommand('bun --version', { timeoutMs: 10000 });
        if (res.exit_code === 0) {
          pmVersion = res.stdout.trim();
          resolutionStatus = 'RESOLVED';
        }
      } else if (packageManager.name === 'pnpm') {
        // Need to enable corepack first
        await sandbox.runCommand('corepack enable pnpm');
        const res = await sandbox.runCommand('corepack pnpm --version', { timeoutMs: 10000 });
        if (res.exit_code === 0) {
          pmVersion = res.stdout.trim();
          resolutionStatus = 'RESOLVED';
        }
      } else if (packageManager.name === 'yarn') {
        await sandbox.runCommand('corepack enable yarn');
        const res = await sandbox.runCommand('corepack yarn --version', { timeoutMs: 10000 });
        if (res.exit_code === 0) {
          pmVersion = res.stdout.trim();
          resolutionStatus = 'RESOLVED';
        }
      } else { // npm or unknown
        const res = await sandbox.runCommand('npm --version', { timeoutMs: 10000 });
        if (res.exit_code === 0) {
          pmVersion = res.stdout.trim();
          resolutionStatus = 'RESOLVED';
        }
      }
    } catch (err) {
      // Failed to execute verification command
    }

    const telemetry: EnvironmentTelemetry = {
      runtime,
      runtime_version: runtimeVersion,
      package_manager: packageManager.name,
      package_manager_version: pmVersion,
      image,
      resolution_status: resolutionStatus,
      source: versionSource
    };

    evidenceEngine.addEvidence(
      'ENVIRONMENT',
      versionSource,
      JSON.stringify(telemetry),
      `Resolved environment using ${versionSource}`,
      'repository',
      undefined,
      undefined,
      telemetry
    );

    return { telemetry, image };
  }

  private static detectRuntime(localPath: string, packageManager: PackageManagerDetection): { runtime: string, runtimeVersion: string, versionSource: string } {
    const isBun = packageManager.name === 'bun';
    const defaultRuntime = isBun ? 'bun' : 'node';
    const defaultVersion = isBun ? this.DEFAULT_BUN_VERSION : this.DEFAULT_NODE_VERSION;

    try {
      // 1. package.json engines or packageManager
      const pkgPath = path.join(localPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.engines && pkg.engines.node && !isBun) {
          const match = pkg.engines.node.match(/(\d+)/);
          if (match) {
            return { runtime: 'node', runtimeVersion: match[1], versionSource: 'package.json#engines.node' };
          }
        }
        if (pkg.engines && pkg.engines.bun && isBun) {
          const match = pkg.engines.bun.match(/(\d+)/);
          if (match) {
             return { runtime: 'bun', runtimeVersion: match[1], versionSource: 'package.json#engines.bun' };
          }
        }
        if (pkg.packageManager) {
          // e.g. "yarn@3.1.1", "pnpm@6.22.2" -> we can't easily get the node version from this, 
          // but if it's "bun@1.0.0", we could.
        }
      }

      // 2. .nvmrc
      const nvmrcPath = path.join(localPath, '.nvmrc');
      if (fs.existsSync(nvmrcPath) && !isBun) {
        const content = fs.readFileSync(nvmrcPath, 'utf8').trim();
        const match = content.match(/v?(\d+)/);
        if (match) {
          return { runtime: 'node', runtimeVersion: match[1], versionSource: '.nvmrc' };
        }
      }

      // 3. .node-version
      const nodeVersionPath = path.join(localPath, '.node-version');
      if (fs.existsSync(nodeVersionPath) && !isBun) {
        const content = fs.readFileSync(nodeVersionPath, 'utf8').trim();
        const match = content.match(/v?(\d+)/);
        if (match) {
          return { runtime: 'node', runtimeVersion: match[1], versionSource: '.node-version' };
        }
      }

      // 4. volta
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        if (pkg.volta && pkg.volta.node && !isBun) {
           const match = pkg.volta.node.match(/(\d+)/);
           if (match) {
              return { runtime: 'node', runtimeVersion: match[1], versionSource: 'package.json#volta.node' };
           }
        }
      }
    } catch (err) {
      // ignore parsing errors
    }

    return { runtime: defaultRuntime, runtimeVersion: defaultVersion, versionSource: 'DEFAULT' };
  }
}
