import { EnvironmentResolver } from '../../src/agents/environment';
import { EvidenceEngine } from '../../src/evidence/engine';
import { ProjectMap } from '../../src/analyzers/mapper';
import { RepositoryDescriptor, PackageManagerDetection } from '../../src/shared/types';
import { DockerSandbox } from '../../src/sandbox/docker';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

jest.mock('../../src/sandbox/docker');

describe('EnvironmentResolver V0.5', () => {
  let engine: EvidenceEngine;
  let descriptor: RepositoryDescriptor;
  let tempDir: string;

  beforeEach(() => {
    engine = new EvidenceEngine();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-test-'));
    descriptor = {
      repository_url: 'http://test',
      local_path: tempDir,
      branch: 'main',
      fetched_at: new Date().toISOString()
    };
    (DockerSandbox as jest.Mock).mockClear();
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createMockMap = (): ProjectMap => ({
    languages: ['TypeScript'],
    frameworks: [],
    packageManagers: [],
    entryPoints: [],
    dependencies: {},
    directories: [],
    scripts: {}
  });

  it('1. Should resolve npm environment', async () => {
    const pm: PackageManagerDetection = { name: 'npm', confidence: 'HIGH', detected_from: 'package-lock.json', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '10.2.3' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.image).toBe('node:20-slim');
    expect(res.telemetry.runtime).toBe('node');
    expect(res.telemetry.resolution_status).toBe('RESOLVED');
    expect(mockRunCommand).toHaveBeenCalledWith('npm --version', expect.any(Object));
  });

  it('2. Should resolve pnpm with corepack', async () => {
    const pm: PackageManagerDetection = { name: 'pnpm', confidence: 'HIGH', detected_from: 'pnpm-lock.yaml', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '8.6.0' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.image).toBe('node:20-slim');
    expect(res.telemetry.resolution_status).toBe('RESOLVED');
    expect(mockRunCommand).toHaveBeenCalledWith('corepack pnpm --version', expect.any(Object));
  });

  it('3. Should resolve yarn with corepack', async () => {
    const pm: PackageManagerDetection = { name: 'yarn', confidence: 'HIGH', detected_from: 'yarn.lock', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '3.6.1' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.image).toBe('node:20-slim');
    expect(res.telemetry.resolution_status).toBe('RESOLVED');
    expect(mockRunCommand).toHaveBeenCalledWith('corepack yarn --version', expect.any(Object));
  });

  it('4. Should resolve bun environment', async () => {
    const pm: PackageManagerDetection = { name: 'bun', confidence: 'HIGH', detected_from: 'bun.lock', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '1.0.22' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.image).toBe('oven/bun:1');
    expect(res.telemetry.resolution_status).toBe('RESOLVED');
    expect(mockRunCommand).toHaveBeenCalledWith('bun --version', expect.any(Object));
  });

  it('5. Should detect runtime from .nvmrc', async () => {
    fs.writeFileSync(path.join(tempDir, '.nvmrc'), 'v18.16.0');
    const pm: PackageManagerDetection = { name: 'npm', confidence: 'HIGH', detected_from: 'package-lock.json', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '9.5.1' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.telemetry.runtime_version).toBe('18');
    expect(res.telemetry.source).toBe('.nvmrc');
    expect(res.image).toBe('node:18-slim');
  });

  it('6. Should detect runtime from package.json engines', async () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({ engines: { node: '>=16.0.0' } }));
    const pm: PackageManagerDetection = { name: 'npm', confidence: 'HIGH', detected_from: 'package-lock.json', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '8.19.4' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.telemetry.runtime_version).toBe('16');
    expect(res.telemetry.source).toBe('package.json#engines.node');
    expect(res.image).toBe('node:16-slim');
  });

  it('7. Should handle environment resolution failure', async () => {
    const pm: PackageManagerDetection = { name: 'bun', confidence: 'HIGH', detected_from: 'bun.lock', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 1, stdout: '' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    const res = await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    expect(res.telemetry.resolution_status).toBe('FAILED');
    expect(res.telemetry.package_manager_version).toBe('unknown');
  });

  it('8. Should generate ENVIRONMENT evidence', async () => {
    const pm: PackageManagerDetection = { name: 'npm', confidence: 'HIGH', detected_from: 'package-lock.json', warnings: [] };
    const mockRunCommand = jest.fn().mockResolvedValue({ exit_code: 0, stdout: '10.0.0' });
    (DockerSandbox.prototype.runCommand as jest.Mock) = mockRunCommand;

    await EnvironmentResolver.resolve(descriptor, createMockMap(), pm, engine);
    
    const evidence = engine.getEvidence();
    expect(evidence.some(e => e.type === 'ENVIRONMENT')).toBe(true);
  });
});
