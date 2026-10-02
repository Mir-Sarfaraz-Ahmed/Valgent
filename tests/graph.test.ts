import { EvidenceGraphBuilder } from '../src/evidence/graph-builder';
import { SemanticProject } from '../src/analyzers/semantic/types';
import { ReportAuditor } from '../src/validation/auditor';

describe('EvidenceGraph V0.7 Core Tests', () => {
  let semanticProject: SemanticProject;

  beforeEach(() => {
    semanticProject = {
      files: ['routes.ts', 'controller.ts', 'service.ts', 'db.ts', 'aliased.ts', 'duplicate1.ts', 'duplicate2.ts', 'importDuplicate.ts'],
      symbols: [
        // db.ts
        { symbol_id: 'SYM-DB1', name: 'db', kind: 'variable', file: 'db.ts', line_start: 1, line_end: 1, exported: true },
        // service.ts
        { symbol_id: 'SYM-SRV1', name: 'saveReport', kind: 'function', file: 'service.ts', line_start: 2, line_end: 5, exported: true },
        // controller.ts
        { symbol_id: 'SYM-CTRL1', name: 'createReport', kind: 'function', file: 'controller.ts', line_start: 2, line_end: 5, exported: true },
        // routes.ts
        { symbol_id: 'SYM-RT1', name: 'app', kind: 'variable', file: 'routes.ts', line_start: 2, line_end: 2, exported: false },
        
        // Aliased test
        { symbol_id: 'SYM-ALIAS1', name: 'actualFunction', kind: 'function', file: 'aliased.ts', line_start: 1, line_end: 2, exported: true },
        
        // Duplicate exports test
        { symbol_id: 'SYM-DUP1', name: 'processData', kind: 'function', file: 'duplicate1.ts', line_start: 1, line_end: 2, exported: true },
        { symbol_id: 'SYM-DUP2', name: 'processData', kind: 'function', file: 'duplicate2.ts', line_start: 1, line_end: 2, exported: true },
        // Caller for duplicate test
        { symbol_id: 'SYM-IMPDUP', name: 'callDup', kind: 'function', file: 'importDuplicate.ts', line_start: 1, line_end: 5, exported: false },
      ],
      imports: [
        // service imports db
        { source: './db', importer: 'service.ts', symbols: [{ localName: 'db', importedName: 'db' }] },
        // controller imports service
        { source: './service', importer: 'controller.ts', symbols: [{ localName: 'saveReport', importedName: 'saveReport' }] },
        // routes imports controller
        { source: './controller', importer: 'routes.ts', symbols: [{ localName: 'createReport', importedName: 'createReport' }] },
        // alias import
        { source: './aliased', importer: 'controller.ts', symbols: [{ localName: 'myAlias', importedName: 'actualFunction' }] },
        // import duplicate
        { source: './duplicate2', importer: 'importDuplicate.ts', symbols: [{ localName: 'processData', importedName: 'processData' }] }
      ],
      exports: [],
      calls: [
        // service calls db.insert
        { caller_file: 'service.ts', line: 3, target_name: 'db.insert', resolution: 'UNRESOLVED', arguments: [] },
        // controller calls saveReport
        { caller_file: 'controller.ts', line: 3, target_name: 'saveReport', resolution: 'UNRESOLVED', arguments: [] },
        // controller calls alias
        { caller_file: 'controller.ts', line: 4, target_name: 'myAlias', resolution: 'UNRESOLVED', arguments: [] },
        // duplicate call
        { caller_file: 'importDuplicate.ts', line: 2, target_name: 'processData', resolution: 'UNRESOLVED', arguments: [] },
      ],
      routes: [
        { route_id: 'RT1', method: 'POST', path: '/report', file: 'routes.ts', line: 3, handler: 'createReport', middleware: [] }
      ],
      databaseOperations: [
        { operation_id: 'DBOP1', type: 'INSERT', file: 'service.ts', line: 3, target: 'database' }
      ],
      components: [],
      dependencies: []
    };
  });

  test('TEST 1 & 4 — Cross-file route handler & Full Chain', () => {
    const builder = new EvidenceGraphBuilder();
    const graph = builder.build([], [], semanticProject, []);
    
    // Check ROUTE_HANDLES
    const routeEdge = graph.serialize().edges.find(e => e.type === 'ROUTE_HANDLES');
    expect(routeEdge).toBeDefined();
    expect(routeEdge?.from).toBe('RT1');
    expect(routeEdge?.to).toBe('SYM-CTRL1');

    // Check Controller to Service
    const call1 = graph.serialize().edges.find(e => e.from === 'SYM-CTRL1' && e.to === 'SYM-SRV1');
    expect(call1).toBeDefined();

    // Check Service to DB symbol
    const call2 = graph.serialize().edges.find(e => e.from === 'SYM-SRV1' && e.to === 'SYM-DB1');
    expect(call2).toBeDefined();

    // Check Service to DB Operation
    const dbEdge = graph.serialize().edges.find(e => e.from === 'SYM-SRV1' && e.to === 'DBOP1');
    expect(dbEdge).toBeDefined();
  });

  test('TEST 5 — Duplicate symbol names resolve correctly', () => {
    // Controller calls 'processData', imported from duplicate2.ts
    const builder = new EvidenceGraphBuilder();
    const graph = builder.build([], [], semanticProject, []);
    
    const callEdges = graph.serialize().edges.filter(e => e.type === 'SYMBOL_CALLS');
    const dupCall = callEdges.find(e => e.to === 'SYM-DUP2');
    expect(dupCall).toBeDefined();
    const wrongCall = callEdges.find(e => e.to === 'SYM-DUP1');
    expect(wrongCall).toBeUndefined(); // It correctly avoided the duplicate in duplicate1.ts
  });

  test('TEST 6 — Aliased import', () => {
    const builder = new EvidenceGraphBuilder();
    const graph = builder.build([], [], semanticProject, []);
    const callEdge = graph.serialize().edges.find(e => e.from === 'SYM-CTRL1' && e.to === 'SYM-ALIAS1');
    expect(callEdge).toBeDefined(); // Resolves through 'myAlias' to 'actualFunction'
  });

  test('TEST 7 — Missing import target yields UNRESOLVED', () => {
    semanticProject.calls.push({ caller_file: 'controller.ts', line: 10, target_name: 'doesNotExist', resolution: 'UNRESOLVED', arguments: [] });
    const builder = new EvidenceGraphBuilder();
    const graph = builder.build([], [], semanticProject, []);
    const allEdges = graph.serialize().edges.filter(e => e.from === 'SYM-CTRL1');
    expect(allEdges.length).toBe(2); // saveReport and myAlias, but not doesNotExist
  });

  test('TEST 8 & 9 — Determinism and stability', () => {
    const builder1 = new EvidenceGraphBuilder();
    const graph1 = builder1.build([], [], semanticProject, []);
    const builder2 = new EvidenceGraphBuilder();
    const graph2 = builder2.build([], [], semanticProject, []);

    expect(graph1.serialize().nodes).toEqual(graph2.serialize().nodes);
    expect(graph1.serialize().edges).toEqual(graph2.serialize().edges);
  });

  test('TEST 11 — Invalid graph reference', () => {
    const validations = [{
      claim_id: 'C1',
      text: 'Test',
      status: 'VERIFIED' as any,
      conclusion: 'Found stuff',
      evidence_refs: ['NODE-FAKE-999'],
      graph_refs: [],
      limitations: [],
      missing_evidence: [],
      requirement_refs: [],
      checks: []
    }];
    const audited = ReportAuditor.audit(validations, [], [], [{ claim_id: 'C1', text: 'Test' }], { nodes: [], edges: [] });
    expect(audited.validations[0].status).toBe('INSUFFICIENT_EVIDENCE');
    expect(audited.validations[0].evidence_refs.length).toBe(0);
  });

  test('TEST 12 — Failed execution', () => {
    const execs: any[] = [{
      execution_id: 'E1',
      started_at: '2024-01-01T00:00:00Z',
      duration_ms: 100,
      package_manager: { name: 'npm', confidence: 'HIGH', detected_from: 'package.json', warnings: [] },
      container: { image: 'node:18', network_mode: 'none' },
      phases: [{ phase: 'TEST', status: 'FAILED', logs: 'failed', duration_ms: 10 }]
    }];
    const builder = new EvidenceGraphBuilder();
    const graph = builder.build([], [], semanticProject, execs);
    expect(graph.serialize().nodes.find(n => n.type === 'executionResult')).toBeUndefined();
  });
});
