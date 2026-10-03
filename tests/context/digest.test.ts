import * as fs from 'fs';
import * as path from 'path';
import { ContextDigester } from '../../src/context/digest';

describe('ContextDigester', () => {
  const fixturesPath = path.join(__dirname, '..', 'fixtures', 'context-project');

  beforeAll(() => {
    // Create a mock repository for testing
    if (!fs.existsSync(fixturesPath)) {
      fs.mkdirSync(fixturesPath, { recursive: true });
    }

    // Normal file
    fs.writeFileSync(path.join(fixturesPath, 'index.js'), 'console.log("hello");');

    // Gitignore
    fs.writeFileSync(path.join(fixturesPath, '.gitignore'), 'ignored.txt');

    // Ignored file
    fs.writeFileSync(path.join(fixturesPath, 'ignored.txt'), 'this should be ignored');

    // Secret file
    fs.writeFileSync(path.join(fixturesPath, 'config.js'), 'const API_KEY = "1234567890abcdef1234567890abcdef";');

    // Binary file (dummy content with .png extension)
    fs.writeFileSync(path.join(fixturesPath, 'image.png'), 'fake binary data');

    // Subdir
    fs.mkdirSync(path.join(fixturesPath, 'src'), { recursive: true });
    fs.writeFileSync(path.join(fixturesPath, 'src', 'app.ts'), 'export const app = {};');
  });

  afterAll(() => {
    fs.rmSync(fixturesPath, { recursive: true, force: true });
  });

  it('A. Generates deterministic digest and tree', () => {
    const digest = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    expect(digest.summary.totalFiles).toBeGreaterThan(0);
    expect(digest.tree).toContain('index.js');
    expect(digest.tree).toContain('src/');
    expect(digest.tree).toContain('app.ts');
  });

  it('B. Excludes binary files', () => {
    const digest = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    const hasImage = digest.files.find(f => f.path === 'image.png');
    expect(hasImage).toBeUndefined();
  });

  it('C. Redacts secrets in content', () => {
    const digest = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    const config = digest.files.find(f => f.path === 'config.js');
    expect(config).toBeDefined();
    expect(config?.content).toContain('REDACTED');
    expect(config?.content).not.toContain('1234567890abcdef');
  });

  it('D. Respects .gitignore', () => {
    const digest = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    const ignored = digest.files.find(f => f.path === 'ignored.txt');
    expect(ignored).toBeUndefined();
  });

  it('I. Is deterministic (same input produces same result)', () => {
    const digest1 = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    const digest2 = ContextDigester.generate({
      repoPath: fixturesPath,
      maxFileSize: 10000,
      ignorePatterns: []
    });

    expect(digest1).toEqual(digest2);
  });
});
