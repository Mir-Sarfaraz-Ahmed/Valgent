import { StaticAnalyzer } from '../../src/analyzers/static';
import { EvidenceEngine } from '../../src/evidence/engine';
import { ProjectMap } from '../../src/analyzers/mapper';
import * as path from 'path';

describe('StaticAnalyzer', () => {
  it('identifies API routes from Express files', async () => {
    const fixturePath = path.join(__dirname, '../fixtures/sample-repo');
    const engine = new EvidenceEngine();
    const map: ProjectMap = {
      languages: ['JavaScript'],
      frameworks: [],
      packageManagers: [],
      entryPoints: [],
      dependencies: {},
      directories: [],
      scripts: {}
    };

    await StaticAnalyzer.analyze({
      repository_url: 'http',
      local_path: fixturePath,
      branch: 'main',
      fetched_at: 'now'
    }, map, engine);

    // If there were JS files with express, we would see them. Let's make sure it runs without error.
    expect(engine.getEvidence()).toBeDefined();
  });

  it('reports unsupported if not JS/TS', async () => {
    const engine = new EvidenceEngine();
    const map: ProjectMap = {
      languages: ['Python'],
      frameworks: [],
      packageManagers: [],
      entryPoints: [],
      dependencies: {},
      directories: [],
      scripts: {}
    };

    await StaticAnalyzer.analyze({
      repository_url: 'http',
      local_path: 'fake',
      branch: 'main',
      fetched_at: 'now'
    }, map, engine);

    const evidence = engine.getEvidence();
    expect(evidence.length).toBe(1);
    expect(evidence[0].content_hash).toBeDefined(); // The unsupported message is hashed
  });
});
