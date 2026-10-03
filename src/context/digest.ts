import * as fs from 'fs';
import * as path from 'path';
import ignore from 'ignore';
import { ContextDigestConfig, ContextDigest, ContextFile } from './types';

export class ContextDigester {
  private static readonly SECRET_PATTERNS = [
    /API_KEY/i, /SECRET/i, /PASSWORD/i, /TOKEN/i, /CREDENTIAL/i,
    /PRIVATE_KEY/i, /BEARER/i, /AWS_ACCESS/i
  ];

  private static readonly BINARY_EXTENSIONS = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.zip', '.tar', '.gz',
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3', '.wav', '.exe', '.dll', '.so', '.dylib', '.sqlite', '.db'
  ];

  public static generate(config: ContextDigestConfig): ContextDigest {
    const ig = ignore().add(config.ignorePatterns);

    const gitignorePath = path.join(config.repoPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      ig.add(fs.readFileSync(gitignorePath, 'utf8'));
    }

    // Default ignores
    ig.add(['.git', 'node_modules', 'dist', 'build', '.env', 'package-lock.json', 'yarn.lock']);

    const files: ContextFile[] = [];
    let totalDirectories = 0;

    const treeLines: string[] = [];

    const walk = (dir: string, prefix: string = '') => {
      const items = fs.readdirSync(dir);

      const filtered = items.filter(item => {
        const relPath = path.relative(config.repoPath, path.join(dir, item));
        return !ig.ignores(relPath.replace(/\\/g, '/'));
      });

      filtered.forEach((item, index) => {
        const isLast = index === filtered.length - 1;
        const absPath = path.join(dir, item);
        const relPath = path.relative(config.repoPath, absPath).replace(/\\/g, '/');
        const stat = fs.statSync(absPath);

        if (stat.isDirectory()) {
          totalDirectories++;
          treeLines.push(`${prefix}${isLast ? '└── ' : '├── '}${item}/`);
          walk(absPath, prefix + (isLast ? '    ' : '│   '));
        } else {
          treeLines.push(`${prefix}${isLast ? '└── ' : '├── '}${item}`);

          if (!this.isBinary(item) && stat.size <= config.maxFileSize) {
            let content = fs.readFileSync(absPath, 'utf8');
            if (this.containsSecrets(content)) {
               content = '/* CONTENT REDACTED DUE TO SECRET-LIKE PATTERNS */';
            }
            files.push({
              path: relPath,
              content,
              size: stat.size,
              tokens: Math.ceil(content.length / 4) // simple estimation
            });
          }
        }
      });
    };

    if (fs.existsSync(config.repoPath)) {
      walk(config.repoPath);
    }

    const estimatedTokens = files.reduce((acc, f) => acc + f.tokens, 0);

    return {
      summary: {
        totalFiles: files.length, // All parsed text files
        eligibleFiles: files.length,
        totalDirectories,
        estimatedTokens
      },
      tree: treeLines.join('\n'),
      files
    };
  }

  private static isBinary(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return this.BINARY_EXTENSIONS.includes(ext);
  }

  private static containsSecrets(content: string): boolean {
    // Basic heuristic to avoid passing hardcoded keys
    // It's a simplistic check that looks for typical env variable shapes.
    // To prevent false positives in normal code like `const apiKey = req.body.api_key;`,
    // we only redact if it looks like an assignment to a long random string.
    const secretAssignmentPattern = /(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CREDENTIAL|BEARER).*?['"][a-zA-Z0-9_\-\+\/=]{16,}['"]/i;
    return secretAssignmentPattern.test(content) || content.includes('-----BEGIN PRIVATE KEY-----');
  }
}
