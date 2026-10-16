import * as fs from 'fs/promises';
import * as path from 'path';
import { EvidenceEngine } from '../evidence/engine';
import { RepositoryDescriptor } from '../shared/types';
import { ProjectMap } from './mapper';

export class StaticAnalyzer {
  static async analyze(descriptor: RepositoryDescriptor, map: ProjectMap, engine: EvidenceEngine): Promise<any> {
    const rootPath = descriptor.local_path;

    if (!map.languages.includes('JavaScript') && !map.languages.includes('TypeScript')) {
      engine.addEvidence(
        'COMMAND_OUTPUT',
        'static_analyzer',
        'unsupported_for_static_analysis',
        'Static analysis is only fully supported for JS/TS in V0.6',
        'analyzer'
      );
      return null;
    }

    // 1. Gather files
    const allFiles = await this.getAllFiles(rootPath, rootPath);
    
    // 2. Parse using semantic parser
    const { SemanticParser } = require('./semantic/parser');
    const parser = new SemanticParser(rootPath, allFiles);
    const semanticModel = parser.parse();

    // 3. Populate Evidence Engine with deterministic semantic evidence
    semanticModel.symbols.forEach((sym: any) => {
      engine.addEvidence('AST_SYMBOL', sym.file, JSON.stringify(sym), `Symbol: ${sym.name}`, 'semantic_parser', sym.line_start, sym.line_end, {
         evidence_id: sym.symbol_id,
         kind: sym.kind,
         exported: sym.exported
      });
    });

    semanticModel.imports.forEach((imp: any) => {
      // Imports may not have lines in our simple model
      engine.addEvidence('AST_IMPORT', imp.importer, JSON.stringify(imp), `Import from ${imp.source}`, 'semantic_parser', undefined, undefined, {
         source: imp.source,
         symbols: imp.symbols
      });
    });

    semanticModel.routes.forEach((route: any) => {
      engine.addEvidence('API_ROUTE', route.file, JSON.stringify(route), `Route: ${route.method} ${route.path}`, 'semantic_parser', route.line, route.line, {
         evidence_id: route.route_id,
         method: route.method,
         path: route.path,
         handler: route.handler,
         middleware: route.middleware
      });
    });

    semanticModel.calls.forEach((call: any) => {
      engine.addEvidence('AST_CALL', call.caller_file, JSON.stringify(call), `Call to ${call.target_name}`, 'semantic_parser', call.line, call.line, {
         target_name: call.target_name,
         resolution: call.resolution
      });
    });

    semanticModel.databaseOperations.forEach((db: any) => {
      engine.addEvidence('DATABASE_OPERATION', db.file, JSON.stringify(db), `DB ${db.type} operation`, 'semantic_parser', db.line, db.line, {
         evidence_id: db.operation_id,
         type: db.type
      });
    });

    semanticModel.components.forEach((comp: any) => {
      engine.addEvidence('REACT_COMPONENT', comp.file, JSON.stringify(comp), `React Component: ${comp.component}`, 'semantic_parser', undefined, undefined, {
         component: comp.component,
         hooks: comp.hooks
      });
    });

    return semanticModel;
  }

  private static async getAllFiles(currentPath: string, rootPath: string): Promise<string[]> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
          continue;
        }
        const subFiles = await this.getAllFiles(path.join(currentPath, entry.name), rootPath);
        files = files.concat(subFiles);
      } else {
        files.push(path.relative(rootPath, path.join(currentPath, entry.name)));
      }
    }
    return files;
  }
}
