export interface AstSymbol {
  symbol_id: string;
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type';
  file: string;
  line_start: number;
  line_end: number;
  exported: boolean;
}

export interface ImportedSymbol {
  localName: string;
  importedName: string;
}

export interface AstImport {
  source: string;
  importer: string;
  symbols: ImportedSymbol[];
}

export interface AstExport {
  file: string;
  symbol: string;
  isDefault: boolean;
}

export interface AstCall {
  caller_symbol?: string; // symbol name doing the calling (if inside a function)
  caller_file: string;
  line: number;
  target_name: string; // The function being called (e.g. 'router.post')
  resolution: 'RESOLVED' | 'UNRESOLVED';
  arguments: string[]; // stringified arguments if literal
}

export interface ApiRoute {
  route_id: string;
  method: string;
  path: string;
  file: string;
  line: number;
  handler?: string;
  middleware: string[];
}

export interface DbOperation {
  operation_id: string;
  type: 'INSERT' | 'SELECT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
  file: string;
  line: number;
  target?: string;
}

export interface ReactComponent {
  component: string;
  file: string;
  hooks: string[];
}

export interface SemanticProject {
  files: string[];
  symbols: AstSymbol[];
  imports: AstImport[];
  exports: AstExport[];
  calls: AstCall[];
  routes: ApiRoute[];
  databaseOperations: DbOperation[];
  components: ReactComponent[];
  dependencies: string[];
}
