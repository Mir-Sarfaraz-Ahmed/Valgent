import * as ts from 'typescript';
import crypto from 'crypto';
import { 
  SemanticProject, AstSymbol, AstImport, AstExport, AstCall, 
  ApiRoute, DbOperation, ReactComponent 
} from './types';
import fs from 'fs';
import path from 'path';

export class SemanticParser {
  private projectDir: string;
  private program: ts.Program;
  private checker: ts.TypeChecker;

  private files: string[] = [];
  private symbols: AstSymbol[] = [];
  private imports: AstImport[] = [];
  private exports: AstExport[] = [];
  private calls: AstCall[] = [];
  private routes: ApiRoute[] = [];
  private databaseOperations: DbOperation[] = [];
  private components: ReactComponent[] = [];
  
  constructor(projectDir: string, files: string[]) {
    this.projectDir = projectDir;
    
    const tsFiles = files.filter(f => f.endsWith('.ts') || f.endsWith('.tsx') || f.endsWith('.js') || f.endsWith('.jsx'));
    
    // Convert to absolute paths
    const absoluteFiles = tsFiles.map(f => path.join(this.projectDir, f));

    this.program = ts.createProgram(absoluteFiles, {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      allowJs: true,
      jsx: ts.JsxEmit.React
    });
    
    this.checker = this.program.getTypeChecker();
  }

  public parse(): SemanticProject {
    for (const sourceFile of this.program.getSourceFiles()) {
      // Ignore node_modules
      if (!sourceFile.isDeclarationFile && !sourceFile.fileName.includes('node_modules')) {
        const relativePath = path.relative(this.projectDir, sourceFile.fileName).replace(/\\/g, '/');
        this.files.push(relativePath);
        this.visitNode(sourceFile, sourceFile, relativePath);
      }
    }

    return {
      files: this.files,
      symbols: this.symbols,
      imports: this.imports,
      exports: this.exports,
      calls: this.calls,
      routes: this.routes,
      databaseOperations: this.databaseOperations,
      components: this.components,
      dependencies: []
    };
  }

  private visitNode(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    this.extractImports(node, sourceFile, relativePath);
    this.extractSymbols(node, sourceFile, relativePath);
    this.extractCallsAndRoutes(node, sourceFile, relativePath);
    this.extractReactComponents(node, sourceFile, relativePath);
    this.extractDbOperations(node, sourceFile, relativePath);

    ts.forEachChild(node, child => this.visitNode(child, sourceFile, relativePath));
  }

  private getLineInfo(node: ts.Node, sourceFile: ts.SourceFile) {
    const start = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
    return { line_start: start.line + 1, line_end: end.line + 1 };
  }

  private generateId(type: string, file: string, line: number, name: string): string {
    const hash = crypto.createHash('sha256').update(`${type}:${file}:${line}:${name}`).digest('hex');
    return `${type}-${hash.substring(0, 12)}`;
  }

  private isExported(node: ts.Node): boolean {
    return (
      (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0 ||
      (node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
    );
  }

  private extractImports(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    if (ts.isImportDeclaration(node)) {
      if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const source = node.moduleSpecifier.text;
        const importedSymbols: any[] = [];

        if (node.importClause) {
          if (node.importClause.name) {
            importedSymbols.push({ localName: node.importClause.name.text, importedName: 'default' });
          }
          if (node.importClause.namedBindings) {
            if (ts.isNamedImports(node.importClause.namedBindings)) {
              node.importClause.namedBindings.elements.forEach(el => {
                if (el.propertyName) {
                   importedSymbols.push({ localName: el.name.text, importedName: el.propertyName.text });
                } else {
                   importedSymbols.push({ localName: el.name.text, importedName: el.name.text });
                }
              });
            } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
              importedSymbols.push({ localName: node.importClause.namedBindings.name.text, importedName: '*' });
            }
          }
        }

        this.imports.push({
          source,
          importer: relativePath,
          symbols: importedSymbols
        });
      }
    }

    if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(dec => {
        if (dec.initializer && ts.isCallExpression(dec.initializer) && ts.isIdentifier(dec.initializer.expression) && dec.initializer.expression.text === 'require') {
          const args = dec.initializer.arguments;
          if (args.length > 0 && ts.isStringLiteral(args[0])) {
            const source = args[0].text;
            const importedSymbols: any[] = [];
            
            if (ts.isIdentifier(dec.name)) {
               importedSymbols.push({ localName: dec.name.text, importedName: '*' });
            } else if (ts.isObjectBindingPattern(dec.name)) {
               dec.name.elements.forEach(el => {
                  if (ts.isIdentifier(el.name)) {
                     const localName = el.name.text;
                     const importedName = el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName.text : localName;
                     importedSymbols.push({ localName, importedName });
                  }
               });
            }
            
            if (importedSymbols.length > 0) {
               this.imports.push({
                 source,
                 importer: relativePath,
                 symbols: importedSymbols
               });
            }
          }
        }
      });
    }
  }

  private extractSymbols(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    let name = '';
    let kind: AstSymbol['kind'] | null = null;

    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.text;
      kind = 'function';
    } else if (ts.isClassDeclaration(node) && node.name) {
      name = node.name.text;
      kind = 'class';
    } else if (ts.isVariableStatement(node)) {
      node.declarationList.declarations.forEach(dec => {
        if (ts.isIdentifier(dec.name)) {
          const { line_start, line_end } = this.getLineInfo(node, sourceFile);
          const isExp = this.isExported(node);
          
          let subKind: AstSymbol['kind'] = 'variable';
          if (dec.initializer && (ts.isArrowFunction(dec.initializer) || ts.isFunctionExpression(dec.initializer))) {
             subKind = 'function';
          }

          this.symbols.push({
            symbol_id: this.generateId('SYM', relativePath, line_start, dec.name.text),
            name: dec.name.text,
            kind: subKind,
            file: relativePath,
            line_start,
            line_end,
            exported: isExp
          });
        }
      });
      return; // Handled
    }

    if (kind && name) {
      const { line_start, line_end } = this.getLineInfo(node, sourceFile);
      this.symbols.push({
        symbol_id: this.generateId('SYM', relativePath, line_start, name),
        name,
        kind,
        file: relativePath,
        line_start,
        line_end,
        exported: this.isExported(node)
      });
    }
  }

  private extractCallsAndRoutes(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    if (ts.isCallExpression(node)) {
      const { line_start } = this.getLineInfo(node, sourceFile);
      let targetName = '';
      
      if (ts.isIdentifier(node.expression)) {
        targetName = node.expression.text;
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        if (ts.isIdentifier(node.expression.expression)) {
           targetName = `${node.expression.expression.text}.${node.expression.name.text}`;
        } else {
           targetName = node.expression.name.text;
        }
      }

      if (targetName) {
        this.calls.push({
          caller_file: relativePath,
          line: line_start,
          target_name: targetName,
          resolution: 'UNRESOLVED', // Simple parser doesn't do deep cross-file inference
          arguments: node.arguments.map(a => a.getText(sourceFile))
        });

        // Express Route Detection
        const routeMethods = ['get', 'post', 'put', 'patch', 'delete'];
        const parts = targetName.split('.');
        if (parts.length === 2 && routeMethods.includes(parts[1])) {
          const method = parts[1].toUpperCase();
          const args = node.arguments;
          if (args.length >= 2 && ts.isStringLiteral(args[0])) {
            const pathUrl = args[0].text;
            const middleware: string[] = [];
            let handlerName: string | undefined;

            for (let i = 1; i < args.length; i++) {
              const arg = args[i];
              if (ts.isIdentifier(arg)) {
                if (i === args.length - 1) handlerName = arg.text;
                else middleware.push(arg.text);
              }
            }

            this.routes.push({
              route_id: this.generateId('ROUTE', relativePath, line_start, `${method}:${pathUrl}`),
              method,
              path: pathUrl,
              file: relativePath,
              line: line_start,
              middleware,
              handler: handlerName
            });
          }
        }
      }
    }
  }

  private extractDbOperations(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    if (ts.isCallExpression(node)) {
       let targetName = '';
       if (ts.isPropertyAccessExpression(node.expression)) {
         targetName = node.expression.name.text;
       } else if (ts.isIdentifier(node.expression)) {
         targetName = node.expression.text;
       }
       
       const dbMethods = ['insert', 'update', 'delete', 'select', 'find', 'save', 'query', 'execute', 'run', 'get', 'all'];
       if (targetName && dbMethods.includes(targetName.toLowerCase())) {
          // Verify if it looks like a DB op (e.g. `db.insert`, `pool.query`)
          let isDbOp = false;
          if (ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression)) {
             const caller = node.expression.expression.text.toLowerCase();
             if (['db', 'database', 'pool', 'client', 'sql', 'firestore', 'collection', 'query'].includes(caller)) {
                isDbOp = true;
             }
          }
          
          // Or string literal contains SQL
          if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
             const query = node.arguments[0].text.toLowerCase();
             if (query.includes('insert into') || query.includes('select ') || query.includes('update ') || query.includes('delete from')) {
                isDbOp = true;
             }
          }

          if (isDbOp) {
             const { line_start } = this.getLineInfo(node, sourceFile);
             let type: DbOperation['type'] = 'UNKNOWN';
             if (targetName.toLowerCase() === 'insert' || targetName.toLowerCase() === 'save' || targetName.toLowerCase() === 'add') type = 'INSERT';
             if (targetName.toLowerCase() === 'select' || targetName.toLowerCase() === 'find') type = 'SELECT';
             if (targetName.toLowerCase() === 'update') type = 'UPDATE';
             if (targetName.toLowerCase() === 'delete') type = 'DELETE';
             
             if (type === 'UNKNOWN') {
                if (node.arguments.length > 0 && ts.isStringLiteral(node.arguments[0])) {
                   const query = node.arguments[0].text.toLowerCase();
                   if (query.includes('insert into')) type = 'INSERT';
                   else if (query.includes('select ')) type = 'SELECT';
                   else if (query.includes('update ')) type = 'UPDATE';
                   else if (query.includes('delete from')) type = 'DELETE';
                }
             }

             this.databaseOperations.push({
               operation_id: this.generateId('DB', relativePath, line_start, type),
               type,
               file: relativePath,
               line: line_start,
               target: 'database'
             });
          }
       }
    }
  }

  private extractReactComponents(node: ts.Node, sourceFile: ts.SourceFile, relativePath: string) {
    if (ts.isFunctionDeclaration(node) && node.name) {
       this.checkFunctionForReact(node, node.name.text, sourceFile, relativePath);
    } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
       if (node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
          this.checkFunctionForReact(node.initializer, node.name.text, sourceFile, relativePath);
       }
    }
  }

  private checkFunctionForReact(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression, name: string, sourceFile: ts.SourceFile, relativePath: string) {
    // If it returns JSX, it's a React component
    if (name.match(/^[A-Z]/)) { // React components typically start with uppercase
       let returnsJsx = false;
       const hooks: string[] = [];

       const visit = (n: ts.Node) => {
         if (ts.isJsxElement(n) || ts.isJsxSelfClosingElement(n) || ts.isJsxFragment(n)) {
            returnsJsx = true;
         }
         if (ts.isCallExpression(n) && ts.isIdentifier(n.expression)) {
            if (n.expression.text.startsWith('use')) {
               hooks.push(n.expression.text);
            }
         }
         ts.forEachChild(n, visit);
       };

       visit(node);

       if (returnsJsx || relativePath.endsWith('.jsx') || relativePath.endsWith('.tsx')) {
         if (!this.components.find(c => c.component === name)) {
           this.components.push({
             component: name,
             file: relativePath,
             hooks: [...new Set(hooks)]
           });
         }
       }
    }
  }
}
