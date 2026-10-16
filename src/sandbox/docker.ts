import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';

const execAsync = promisify(exec);

export interface SandboxOptions {
  networkEnabled?: boolean;
  timeoutMs?: number;
  memoryLimitMb?: number;
  cpus?: number;
  pidsLimit?: number;
}

export interface RawExecutionResult {
  exit_code: number;
  duration_ms: number;
  stdout: string;
  stderr: string;
  timed_out: boolean;
  image: string;
  network_enabled: boolean;
  error?: string;
}

export class DockerSandbox {
  private localPath: string;
  private image: string;

  constructor(localPath: string, image: string = 'node:20-slim') {
    this.localPath = localPath;
    this.image = image;
  }

  public async runCommand(commandStr: string, options: SandboxOptions = {}): Promise<RawExecutionResult> {
    const containerName = `valgent-sandbox-${crypto.randomUUID()}`;
    
    const timeoutMs = options.timeoutMs || 30000;
    const memoryLimit = options.memoryLimitMb || 512;
    const cpus = options.cpus || 1.0;
    const pidsLimit = options.pidsLimit || 64;
    const networkMode = options.networkEnabled ? 'bridge' : 'none';

    // Safe command splitting
    const cmdArgs = ['sh', '-c', commandStr];

    const dockerArgs = [
      'run',
      '--name', containerName,
      '-i',
      `--network=${networkMode}`,
      `--memory=${memoryLimit}m`,
      `--cpus=${cpus}`,
      `--pids-limit=${pidsLimit}`,
      '--security-opt', 'no-new-privileges',
      '--cap-drop=ALL',
      '--read-only',
      '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m',
      '--tmpfs', '/home/node:rw,size=200m',
      '-v', `${this.localPath}:/workspace:rw`,
      '-w', '/workspace',
      '--user', '1000:1000',
      this.image,
      ...cmdArgs
    ];

    const startTime = Date.now();
    let stdout = '';
    let stderr = '';
    const MAX_OUTPUT = 100 * 1024; // 100 KB

    return new Promise((resolve) => {
      const sanitizedEnv = { ...process.env };
      delete sanitizedEnv.GEMINI_API_KEY;
      delete sanitizedEnv.TINYFISH_API_KEY;
      delete sanitizedEnv.OPENROUTER_API_KEY;

      const child = spawn('docker', dockerArgs, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: sanitizedEnv
      });

      let timeoutTimer: NodeJS.Timeout;
      let timedOut = false;

      timeoutTimer = setTimeout(async () => {
        timedOut = true;
        try {
          await execAsync(`docker rm -f ${containerName}`);
        } catch (e) {}
      }, timeoutMs);

      child.stdout.on('data', (chunk) => {
        if (stdout.length < MAX_OUTPUT) stdout += chunk.toString();
      });

      child.stderr.on('data', (chunk) => {
        if (stderr.length < MAX_OUTPUT) stderr += chunk.toString();
      });

      child.on('close', async (code) => {
        clearTimeout(timeoutTimer);
        const duration_ms = Date.now() - startTime;
        
        try {
           await execAsync(`docker rm -f ${containerName}`);
        } catch (e) {}

        resolve({
          exit_code: code === null ? 1 : code,
          duration_ms,
          stdout,
          stderr,
          timed_out: timedOut,
          image: this.image,
          network_enabled: !!options.networkEnabled
        });
      });

      child.on('error', async (err) => {
        clearTimeout(timeoutTimer);
        try {
           await execAsync(`docker rm -f ${containerName}`);
        } catch (e) {}
        
        resolve({
          exit_code: 1,
          duration_ms: Date.now() - startTime,
          stdout: '',
          stderr: err.message,
          timed_out: false,
          image: this.image,
          network_enabled: !!options.networkEnabled,
          error: err.message
        });
      });
    });
  }
}
