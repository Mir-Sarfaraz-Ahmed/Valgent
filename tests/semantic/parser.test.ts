import path from 'path';
import { SemanticParser } from '../../src/analyzers/semantic/parser';

describe('SemanticParser V0.6', () => {
  const projectDir = path.join(__dirname, '../fixtures/semantic-project');
  const files = [
    'src/backend/routes/reports.ts',
    'src/backend/middleware/auth.ts',
    'src/backend/services/reportService.ts',
    'src/frontend/components/ReportForm.tsx'
  ];

  let parser: SemanticParser;
  let model: any;

  beforeAll(() => {
    parser = new SemanticParser(projectDir, files);
    model = parser.parse();
  });

  it('1. Should extract AST symbols deterministically', () => {
    const reportServiceSym = model.symbols.find((s: any) => s.name === 'createReport');
    expect(reportServiceSym).toBeDefined();
    expect(reportServiceSym.kind).toBe('function');
    expect(reportServiceSym.exported).toBe(true);
    expect(reportServiceSym.file).toBe('src/backend/services/reportService.ts');
    expect(reportServiceSym.symbol_id).toMatch(/^SYM-[0-9a-f]{12}$/);
    
    // Check unused function is extracted
    const unused = model.symbols.find((s: any) => s.name === 'intentionallyUnusedFunction');
    expect(unused).toBeDefined();
  });

  it('2. Should extract imports and exports', () => {
    const routeImports = model.imports.filter((i: any) => i.importer === 'src/backend/routes/reports.ts');
    expect(routeImports.length).toBeGreaterThan(0);
    
    const authImport = routeImports.find((i: any) => i.source === '../middleware/auth');
    expect(authImport.symbols.some((s: any) => s.localName === 'authenticateToken')).toBe(true);
  });

  it('3. Should extract Express routes and middleware', () => {
    const postReport = model.routes.find((r: any) => r.method === 'POST' && r.path === '/api/reports');
    expect(postReport).toBeDefined();
    expect(postReport.file).toBe('src/backend/routes/reports.ts');
    expect(postReport.middleware).toContain('authenticateToken');
    expect(postReport.route_id).toMatch(/^ROUTE-[0-9a-f]{12}$/);
    
    const getReport = model.routes.find((r: any) => r.method === 'GET' && r.path === '/api/reports/:id');
    expect(getReport).toBeDefined();
  });

  it('4. Should extract resolvable calls', () => {
    const createReportCall = model.calls.find((c: any) => c.target_name === 'createReport');
    expect(createReportCall).toBeDefined();
    expect(createReportCall.caller_file).toBe('src/backend/routes/reports.ts');
    expect(createReportCall.resolution).toBe('UNRESOLVED');
  });

  it('5. Should extract database operations', () => {
    const dbInsert = model.databaseOperations.find((op: any) => op.type === 'INSERT');
    expect(dbInsert).toBeDefined();
    expect(dbInsert.file).toBe('src/backend/services/reportService.ts');
    expect(dbInsert.operation_id).toMatch(/^DB-[0-9a-f]{12}$/);
  });

  it('6. Should extract React components and hooks', () => {
    const formComp = model.components.find((c: any) => c.component === 'ReportForm');
    expect(formComp).toBeDefined();
    expect(formComp.file).toBe('src/frontend/components/ReportForm.tsx');
    expect(formComp.hooks).toContain('useState');

    const unusedComp = model.components.find((c: any) => c.component === 'UnusedComponent');
    expect(unusedComp).toBeDefined();
  });

  it('7. Should be deterministic on subsequent runs', () => {
    const parser2 = new SemanticParser(projectDir, files);
    const model2 = parser2.parse();
    
    expect(model.symbols[0].symbol_id).toBe(model2.symbols[0].symbol_id);
    expect(model.routes[0].route_id).toBe(model2.routes[0].route_id);
    expect(model.databaseOperations[0].operation_id).toBe(model2.databaseOperations[0].operation_id);
  });
});
