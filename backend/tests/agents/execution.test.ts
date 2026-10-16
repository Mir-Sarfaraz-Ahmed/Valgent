import { ExecutionOrchestrator } from '../../src/agents/execution';
import { ProjectMapper, ProjectMap } from '../../src/analyzers/mapper';
import { EvidenceEngine } from '../../src/evidence/engine';
import { DockerSandbox } from '../../src/sandbox/docker';
import { RepositoryDescriptor } from '../../src/shared/types';

jest.mock('../../src/sandbox/docker');

describe('Execution Orchestrator V0.4', () => {
  let engine: EvidenceEngine;
  let descriptor: RepositoryDescriptor;

  beforeEach(() => {
    engine = new EvidenceEngine();
    descriptor = {
      repository_url: 'http://test',
      local_path: '/tmp/test',
      branch: 'main',
      fetched_at: new Date().toISOString()
    };
    (DockerSandbox as jest.Mock).mockClear();
    (DockerSandbox.prototype.runCommand as jest.Mock) = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '1.0', stderr: '', duration_ms: 10, timed_out: false });
  });

  const createMockMap = (overrides: Partial<ProjectMap>): ProjectMap => ({
    languages: ['TypeScript'],
    frameworks: [],
    packageManagers: ['npm'],
    entryPoints: [],
    dependencies: {},
    directories: [],
    scripts: { build: 'tsc', test: 'jest' },
    ...overrides
  });

  it('1. Should detect npm from package-lock.json', async () => {
    const map = createMockMap({ packageManagers: ['npm'] });
    const orchestrator = new ExecutionOrchestrator({ allowDependencyInstall: false, allowBuild: false, allowTests: false });
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    expect(res.telemetry?.package_manager.name).toBe('npm');
    expect(res.telemetry?.package_manager.detected_from).toBe('package-lock.json');
  });

  it('2. Should detect pnpm from pnpm-lock.yaml', async () => {
    const map = createMockMap({ packageManagers: ['pnpm'] });
    const orchestrator = new ExecutionOrchestrator({ allowDependencyInstall: false, allowBuild: false, allowTests: false });
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    expect(res.telemetry?.package_manager.name).toBe('pnpm');
    expect(res.telemetry?.package_manager.detected_from).toBe('pnpm-lock.yaml');
  });

  it('3. Should detect yarn from yarn.lock', async () => {
    const map = createMockMap({ packageManagers: ['yarn'] });
    const orchestrator = new ExecutionOrchestrator({ allowDependencyInstall: false, allowBuild: false, allowTests: false });
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    expect(res.telemetry?.package_manager.name).toBe('yarn');
    expect(res.telemetry?.package_manager.detected_from).toBe('yarn.lock');
  });

  it('4. Should detect bun from bun.lock', async () => {
    const map = createMockMap({ packageManagers: ['bun'] });
    const orchestrator = new ExecutionOrchestrator({ allowDependencyInstall: false, allowBuild: false, allowTests: false });
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    expect(res.telemetry?.package_manager.name).toBe('bun');
    expect(res.telemetry?.package_manager.detected_from).toBe('bun.lock');
  });

  it('5. Should handle missing build script by skipping build', async () => {
    const map = createMockMap({ scripts: { test: 'jest' } }); // No build script
    
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, duration_ms: 100, stdout: '', stderr: '', timed_out: false });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;
    
    const orchestrator = new ExecutionOrchestrator();
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    
    const buildPhase = res.telemetry?.phases.find(p => p.phase === 'BUILD');
    expect(buildPhase?.status).toBe('NOT_SUPPORTED');
    expect(buildPhase?.skip_reason).toBe('No build script defined in package.json');
  });

  it('6. Should handle missing test script', async () => {
    const map = createMockMap({ scripts: { build: 'tsc' } });
    
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, duration_ms: 100, stdout: '', stderr: '', timed_out: false });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;
    
    const orchestrator = new ExecutionOrchestrator();
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    
    const testPhase = res.telemetry?.phases.find(p => p.phase === 'TEST');
    expect(testPhase?.status).toBe('NOT_SUPPORTED');
  });

  it('7. Should skip build and test if install fails', async () => {
    const map = createMockMap({});
    const mockRunCommand = jest.fn().mockImplementation((cmd) => {
      if (cmd.includes('--version')) return Promise.resolve({ exit_code: 0, duration_ms: 10, stdout: '1.0.0', stderr: '', timed_out: false });
      return Promise.resolve({ exit_code: 1, duration_ms: 100, stdout: '', stderr: 'error', timed_out: false });
    });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;
    
    const orchestrator = new ExecutionOrchestrator();
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    
    const installPhase = res.telemetry?.phases.find(p => p.phase === 'INSTALL');
    const buildPhase = res.telemetry?.phases.find(p => p.phase === 'BUILD');
    const testPhase = res.telemetry?.phases.find(p => p.phase === 'TEST');
    
    expect(installPhase?.status).toBe('FAILED');
    expect(buildPhase?.status).toBe('SKIPPED');
    expect(testPhase?.status).toBe('SKIPPED');
  });

  it('8. Should execute successfully and generate evidence', async () => {
    const map = createMockMap({});
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, duration_ms: 100, stdout: 'success', stderr: '', timed_out: false });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;
    
    const orchestrator = new ExecutionOrchestrator();
    const res = await orchestrator.orchestrate(descriptor, map, engine);
    
    const phases = res.telemetry?.phases!;
    expect(phases.find(p => p.phase === 'INSTALL')?.status).toBe('PASSED');
    expect(phases.find(p => p.phase === 'BUILD')?.status).toBe('PASSED');
    expect(phases.find(p => p.phase === 'TEST')?.status).toBe('PASSED');

    const evidence = engine.getEvidence();
    expect(evidence.some(e => e.type === 'COMMAND_OUTPUT' && e.metadata?.phase === 'TEST')).toBe(true);
  });
});
