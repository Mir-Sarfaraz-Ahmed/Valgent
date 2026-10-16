import { ContextSelector } from '../../src/context/selector';
import { ContextDigest } from '../../src/context/types';

describe('ContextSelector', () => {
  const mockDigest: ContextDigest = {
    summary: { totalFiles: 10, eligibleFiles: 10, totalDirectories: 2, estimatedTokens: 5000 },
    tree: '',
    files: [
      { path: 'backend/routes.js', content: 'routes', size: 10, tokens: 100 },
      { path: 'backend/controller.js', content: 'controller', size: 10, tokens: 200 },
      { path: 'backend/service.js', content: 'service', size: 10, tokens: 300 },
      { path: 'backend/db.js', content: 'db', size: 10, tokens: 400 },
      { path: 'frontend/ui.tsx', content: 'ui', size: 10, tokens: 500 },
      { path: 'docs/readme.md', content: 'docs', size: 10, tokens: 600 }
    ]
  };

  const mockEvidence: any[] = [
    { type: 'API_ROUTE', location: 'backend/routes.js' }
  ];

  const mockSubgraph: any = {
    nodes: [
      { id: '1', type: 'symbol', metadata: { file_path: 'backend/controller.js' } },
      { id: '2', type: 'symbol', metadata: { file_path: 'backend/service.js' } }
    ],
    edges: []
  };

  it('E & F & G. Claim-aware and Evidence-linked selection with Import expansion (graph-based)', () => {
    const result = ContextSelector.select(mockDigest, mockEvidence, mockSubgraph, { tokenBudget: 10000 });

    const paths = result.selectedFiles.map(f => f.path);
    // Evidence directly references routes.js
    expect(paths).toContain('backend/routes.js');
    // Subgraph nodes reference controller.js and service.js
    expect(paths).toContain('backend/controller.js');
    expect(paths).toContain('backend/service.js');
  });

  it('H. Token budget is respected', () => {
    // Only allow enough tokens for routes.js (100) and controller.js (200) = 300
    // The budget will stop at 300.
    const result = ContextSelector.select(mockDigest, mockEvidence, mockSubgraph, { tokenBudget: 350 });

    // total size in result should not exceed budget
    expect(result.summary.estimatedTokens).toBeLessThanOrEqual(350);
    // we should see truncation
    expect(result.summary.truncated).toBe(true);

    const paths = result.selectedFiles.map(f => f.path);
    expect(paths).toContain('backend/routes.js');
    expect(paths).toContain('backend/controller.js');
    // service.js is 300 tokens, adding it would be 600, so it gets truncated
    expect(paths).not.toContain('backend/service.js');
  });
});
