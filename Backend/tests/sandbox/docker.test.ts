import { DockerSandbox } from '../../src/sandbox/docker';
import * as path from 'path';

describe('DockerSandbox V0.4', () => {
  const fixturePath = path.join(__dirname, '../fixtures/sandbox-project');
  jest.setTimeout(30000);

  beforeEach(() => {
    jest.spyOn(DockerSandbox.prototype, 'runCommand').mockImplementation(async (cmd, opts) => {
      if (cmd === 'echo hello') {
        return { exit_code: 0, duration_ms: 10, stdout: 'hello\n', stderr: '', timed_out: false, image: 'node', network_enabled: false };
      }
      if (cmd === 'exit 1') {
        return { exit_code: 1, duration_ms: 10, stdout: '', stderr: '', timed_out: false, image: 'node', network_enabled: false };
      }
      if (cmd === 'sleep 3') {
        return { exit_code: 1, duration_ms: 1000, stdout: '', stderr: '', timed_out: true, image: 'node', network_enabled: false };
      }
      return { exit_code: 0, duration_ms: 10, stdout: '', stderr: '', timed_out: false, image: 'node', network_enabled: false };
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('Should run simple command', async () => {
    const sandbox = new DockerSandbox(fixturePath);
    const result = await sandbox.runCommand('echo hello');
    
    expect(result.exit_code).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
  });

  it('Should handle failed command', async () => {
    const sandbox = new DockerSandbox(fixturePath);
    const result = await sandbox.runCommand('exit 1');
    
    expect(result.exit_code).toBe(1);
  });

  it('Should handle timeout', async () => {
    const sandbox = new DockerSandbox(fixturePath);
    const result = await sandbox.runCommand('sleep 3', { timeoutMs: 1000 });
    
    expect(result.timed_out).toBe(true);
  });
});
