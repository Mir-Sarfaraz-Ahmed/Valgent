import { ProjectMapper } from '../../src/analyzers/mapper';
import * as path from 'path';

describe('ProjectMapper', () => {
  it('detects package.json, dependencies, and frameworks', async () => {
    const fixturePath = path.join(__dirname, '../fixtures/sample-repo');
    const map = await ProjectMapper.map({
      repository_url: 'http://test',
      local_path: fixturePath,
      branch: 'main',
      fetched_at: 'now'
    });

    expect(map.directories).not.toContain('node_modules');
    expect(map.dependencies).toHaveProperty('express');
    expect(map.dependencies).toHaveProperty('react');
    expect(map.frameworks).toContain('Express');
    expect(map.frameworks).toContain('React');
  });
});
