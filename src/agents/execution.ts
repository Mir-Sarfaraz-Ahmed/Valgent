import { ProjectMap } from '../analyzers/mapper';
import { 
  RepositoryDescriptor, 
  ExecutionResult, 
  ExecutionPhaseResult,
  ExecutionPhaseName,
  ExecutionPhaseStatus,
  PackageManagerDetection,
  PackageManager,
  ContainerTelemetry
} from '../shared/types';
import { EvidenceEngine } from '../evidence/engine';
import { DockerSandbox, RawExecutionResult } from '../sandbox/docker';
import { EnvironmentResolver, ResolvedEnvironment } from './environment';
import * as crypto from 'crypto';

export interface ExecutionPolicy {
  allowDependencyInstall: boolean;
  allowBuild: boolean;
  allowTests: boolean;
  timeoutMs: number;
  memoryLimit: number;
  cpuLimit: number;
}

export class ExecutionOrchestrator {
  private policy: ExecutionPolicy;

  constructor(policy?: Partial<ExecutionPolicy>) {
    this.policy = {
      allowDependencyInstall: true,
      allowBuild: true,
      allowTests: true,
      timeoutMs: 120000,
      memoryLimit: 1024,
      cpuLimit: 2,
      ...policy
    };
  }

  public async orchestrate(descriptor: RepositoryDescriptor, map: ProjectMap, engine: EvidenceEngine): Promise<{ supported: boolean, telemetry?: ExecutionResult }> {
    if (!this.isSupported(map)) {
      return { supported: false };
    }

    const executionId = `EXE-${crypto.randomUUID()}`;
    const startedAt = new Date().toISOString();

    const pmDetection = this.detectPackageManager(map);
    
    // Environment Resolution
    const resolvedEnv = await EnvironmentResolver.resolve(descriptor, map, pmDetection, engine);
    const sandbox = new DockerSandbox(descriptor.local_path, resolvedEnv.image);

    const phases: ExecutionPhaseResult[] = [];
    
    // Phase 1: DISCOVERY
    phases.push({
      phase: 'DISCOVERY',
      status: 'PASSED',
      duration_ms: 0,
      network_enabled: false
    });

    let installFailed = false;
    let buildFailed = false;
    let envFailed = resolvedEnv.telemetry.resolution_status === 'FAILED';

    // Phase 2: INSTALL
    if (this.policy.allowDependencyInstall) {
      if (pmDetection.name === 'unknown') {
         phases.push({ phase: 'INSTALL', status: 'NOT_SUPPORTED', duration_ms: 0, network_enabled: true, skip_reason: 'No supported package manager detected' });
         installFailed = true;
      } else if (envFailed) {
         phases.push({ phase: 'INSTALL', status: 'SKIPPED', duration_ms: 0, network_enabled: true, skip_reason: 'Environment resolution failed' });
         installFailed = true;
      } else {
         const installCmd = this.getInstallCommand(pmDetection.name);
         // For pnpm and yarn, corepack must be enabled before install if it's node based
         let actualCmd = installCmd;
         if (pmDetection.name === 'pnpm' || pmDetection.name === 'yarn') {
             actualCmd = `corepack enable && corepack ${installCmd}`;
         }
         const res = await this.runPhase(sandbox, 'INSTALL', actualCmd, engine, true, executionId);
         phases.push(res);
         if (res.status !== 'PASSED') {
           installFailed = true;
         }
      }
    } else {
      phases.push({ phase: 'INSTALL', status: 'SKIPPED', duration_ms: 0, network_enabled: true, skip_reason: 'Policy disabled' });
    }

    // Phase 3: BUILD
    if (this.policy.allowBuild) {
      if (installFailed) {
         phases.push({ phase: 'BUILD', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Prerequisite INSTALL failed or skipped' });
         buildFailed = true;
      } else if (!map.scripts || !map.scripts['build']) {
         phases.push({ phase: 'BUILD', status: 'NOT_SUPPORTED', duration_ms: 0, network_enabled: false, skip_reason: 'No build script defined in package.json' });
      } else if (envFailed) {
         phases.push({ phase: 'BUILD', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Environment resolution failed' });
         buildFailed = true;
      } else {
         let buildCmd = `${pmDetection.name} run build`;
         if (pmDetection.name === 'pnpm' || pmDetection.name === 'yarn') {
             buildCmd = `corepack ${pmDetection.name} run build`;
         }
         const res = await this.runPhase(sandbox, 'BUILD', buildCmd, engine, false, executionId); // network disabled for build
         phases.push(res);
         if (res.status !== 'PASSED') {
           buildFailed = true;
         }
      }
    } else {
      phases.push({ phase: 'BUILD', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Policy disabled' });
    }

    // Phase 4: TEST
    if (this.policy.allowTests) {
      if (installFailed || buildFailed) {
         phases.push({ phase: 'TEST', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Prerequisite INSTALL or BUILD failed' });
      } else if (!map.scripts || !map.scripts['test'] || map.scripts['test'].includes('no test specified')) {
         phases.push({ phase: 'TEST', status: 'NOT_SUPPORTED', duration_ms: 0, network_enabled: false, skip_reason: 'No test script defined in package.json' });
      } else if (envFailed) {
         phases.push({ phase: 'TEST', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Environment resolution failed' });
      } else {
         let testCmd = `${pmDetection.name} run test`;
         if (pmDetection.name === 'pnpm' || pmDetection.name === 'yarn') {
             testCmd = `corepack ${pmDetection.name} run test`;
         }
         const res = await this.runPhase(sandbox, 'TEST', testCmd, engine, false, executionId);
         phases.push(res);
      }
    } else {
      phases.push({ phase: 'TEST', status: 'SKIPPED', duration_ms: 0, network_enabled: false, skip_reason: 'Policy disabled' });
    }

    const durationMs = phases.reduce((acc, p) => acc + (p.duration_ms || 0), 0);
    const usesNetwork = phases.some(p => p.network_enabled);
    
    const containerTelemetry: ContainerTelemetry = {
      image: resolvedEnv.image,
      network_mode: usesNetwork ? 'mixed' : 'none',
      cpu_limit: this.policy.cpuLimit.toString(),
      memory_limit: this.policy.memoryLimit.toString(),
      pid_limit: '64'
    };

    const telemetry: ExecutionResult = {
      execution_id: executionId,
      started_at: startedAt,
      duration_ms: durationMs,
      package_manager: pmDetection,
      environment: resolvedEnv.telemetry,
      phases,
      container: containerTelemetry
    };

    return { supported: true, telemetry };
  }

  private isSupported(map: ProjectMap): boolean {
    return map.languages.includes('JavaScript') || map.languages.includes('TypeScript');
  }

  private detectPackageManager(map: ProjectMap): PackageManagerDetection {
    let warnings: string[] = [];
    let detected: PackageManager = 'unknown';
    let confidence: 'HIGH' | 'LOW' = 'LOW';
    let detectedFrom = 'heuristic';

    const pms = map.packageManagers.filter(pm => pm !== 'npm' || map.directories.includes('node_modules') || true); // Wait, mapping has duplicates?
    
    // Lockfile based exact match
    const hasYarnLock = map.packageManagers.includes('yarn');
    const hasPnpmLock = map.packageManagers.includes('pnpm');
    const hasBunLock = map.packageManagers.includes('bun');
    const hasNpmLock = map.packageManagers.includes('npm');

    let countLocks = (hasYarnLock ? 1 : 0) + (hasPnpmLock ? 1 : 0) + (hasBunLock ? 1 : 0) + (hasNpmLock ? 1 : 0);

    if (countLocks > 1) {
      warnings.push('PACKAGE_MANAGER_CONFLICT');
      // deterministic fallback order: pnpm > yarn > bun > npm
      if (hasPnpmLock) { detected = 'pnpm'; detectedFrom = 'pnpm-lock.yaml (conflict fallback)'; }
      else if (hasYarnLock) { detected = 'yarn'; detectedFrom = 'yarn.lock (conflict fallback)'; }
      else if (hasBunLock) { detected = 'bun'; detectedFrom = 'bun.lock (conflict fallback)'; }
      else { detected = 'npm'; detectedFrom = 'package-lock.json (conflict fallback)'; }
    } else if (countLocks === 1) {
      confidence = 'HIGH';
      if (hasPnpmLock) { detected = 'pnpm'; detectedFrom = 'pnpm-lock.yaml'; }
      else if (hasYarnLock) { detected = 'yarn'; detectedFrom = 'yarn.lock'; }
      else if (hasBunLock) { detected = 'bun'; detectedFrom = 'bun.lock'; }
      else { detected = 'npm'; detectedFrom = 'package-lock.json'; }
    } else {
      // fallback if package.json exists
      if (map.dependencies || map.scripts) {
        detected = 'npm';
        detectedFrom = 'package.json fallback';
      }
    }

    return {
      name: detected,
      confidence,
      detected_from: detectedFrom,
      warnings
    };
  }

  private getInstallCommand(pm: PackageManager): string {
    switch (pm) {
      case 'npm': return 'npm install --ignore-scripts';
      case 'yarn': return 'yarn install --ignore-scripts';
      case 'pnpm': return 'pnpm install --ignore-scripts';
      case 'bun': return 'bun install --ignore-scripts';
      default: return 'npm install --ignore-scripts';
    }
  }

  private async runPhase(sandbox: DockerSandbox, phase: ExecutionPhaseName, command: string, engine: EvidenceEngine, networkEnabled: boolean, executionId: string): Promise<ExecutionPhaseResult> {
    const options = {
      networkEnabled,
      timeoutMs: this.policy.timeoutMs,
      memoryLimitMb: this.policy.memoryLimit,
      cpus: this.policy.cpuLimit
    };

    const res = await sandbox.runCommand(command, options);
    
    let status: ExecutionPhaseStatus = 'PASSED';
    if (res.timed_out) {
      status = 'TIMED_OUT';
    } else if (res.exit_code !== 0) {
      status = 'FAILED';
    }

    // Generate evidence
    engine.addEvidence(
      'COMMAND_OUTPUT',
      `execution:${executionId}:${phase}`,
      `STDOUT:\n${res.stdout}\nSTDERR:\n${res.stderr}`.substring(0, 10000),
      `Execution of ${phase} completed with status ${status}`,
      'sandbox',
      undefined,
      undefined,
      {
        phase,
        command,
        exit_code: res.exit_code,
        duration_ms: res.duration_ms,
        timed_out: res.timed_out,
        network_enabled: res.network_enabled
      }
    );

    return {
      phase,
      status,
      command,
      exit_code: res.exit_code,
      duration_ms: res.duration_ms,
      stdout: res.stdout,
      stderr: res.stderr,
      timed_out: res.timed_out,
      network_enabled: res.network_enabled
    };
  }
}
