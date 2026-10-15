import { EvidenceGraph } from './graph';
import { EvidenceGraphData, GraphNode, EvidenceEdge, ClaimChain, CompletenessStatus, GraphNodeType, EvidenceEdgeType } from './graph-types';
import { Evidence, ValidationResult, Claim, ExecutionResult, ExecutionPhaseResult } from '../shared/types';
import { SemanticProject, AstSymbol, ApiRoute, DbOperation, AstCall } from '../analyzers/semantic/types';
import crypto from 'crypto';
import path from 'path';

export class EvidenceGraphBuilder {
  private graph: EvidenceGraph;

  constructor() {
    this.graph = new EvidenceGraph();
  }

  private resolveModulePath(baseFile: string, importPath: string, files: string[]): string | undefined {
    if (!importPath.startsWith('.')) return undefined; // Ignore node_modules
    
    // Normalize path separators to POSIX style as parser stores them that way
    const dir = path.posix.dirname(baseFile);
    let targetBase = path.posix.join(dir, importPath);
    if (targetBase.startsWith('./')) targetBase = targetBase.slice(2);
    
    const candidates = [
      targetBase,
      `${targetBase}.ts`,
      `${targetBase}.tsx`,
      `${targetBase}.js`,
      `${targetBase}.jsx`,
      `${targetBase}/index.ts`,
      `${targetBase}/index.js`
    ];

    for (const cand of candidates) {
      if (files.includes(cand)) {
        return cand;
      }
    }
    return undefined;
  }

  public build(
    claims: Claim[],
    evidenceList: Evidence[],
    semanticProject?: SemanticProject,
    executionResults?: ExecutionResult[]
  ): EvidenceGraph {
    
    // 1. Add Evidence Nodes
    for (const evd of evidenceList) {
      this.graph.addNode({
        id: evd.evidence_id,
        type: 'evidence',
        label: evd.description || `Evidence ${evd.type}`,
        source: evd.location,
        metadata: evd
      });
    }

    // 2. Add Claim & Requirement Nodes
    for (const claim of claims) {
      this.graph.addNode({
        id: claim.claim_id,
        type: 'claim',
        label: claim.text,
      });

      const reqId = `REQ-${crypto.createHash('sha256').update(claim.text).digest('hex').substring(0, 8)}`;
      this.graph.addNode({
        id: reqId,
        type: 'requirement',
        label: claim.text,
        metadata: { claim_id: claim.claim_id, statement: claim.text, status: 'UNVALIDATED' }
      });

      this.graph.addEdge({
        edge_id: `EDGE-${claim.claim_id}-${reqId}`,
        from: claim.claim_id,
        to: reqId,
        type: 'CLAIM_REQUIRES',
        confidence: 1.0,
        evidence_refs: []
      });
    }

    // 3. Add Semantic Project Nodes and Edges
    if (semanticProject) {
      // Build Symbol Indexes
      const fileExports = new Map<string, Map<string, AstSymbol>>();
      for (const sym of semanticProject.symbols) {
        if (!fileExports.has(sym.file)) fileExports.set(sym.file, new Map());
        fileExports.get(sym.file)!.set(sym.name, sym);
        if (sym.exported && !fileExports.get(sym.file)!.has('default')) {
           fileExports.get(sym.file)!.set('default', sym);
        }
      }

      const fileImports = new Map<string, Map<string, AstSymbol>>();
      for (const imp of semanticProject.imports) {
        const resolvedPath = this.resolveModulePath(imp.importer, imp.source, semanticProject.files);
        if (resolvedPath) {
          if (!fileImports.has(imp.importer)) fileImports.set(imp.importer, new Map());
          const targetExports = fileExports.get(resolvedPath);
          if (targetExports) {
            for (const symRef of imp.symbols) {
               let targetSym: AstSymbol | undefined;
               if (symRef.importedName === '*') {
                  targetSym = Array.from(targetExports.values())[0];
               } else {
                  targetSym = targetExports.get(symRef.importedName);
               }
               if (targetSym) {
                 fileImports.get(imp.importer)!.set(symRef.localName, targetSym);
               }
            }
          }
        }
      }

      // Symbols
      for (const sym of semanticProject.symbols) {
        this.graph.addNode({
          id: sym.symbol_id,
          type: 'symbol',
          label: sym.name,
          source: sym.file,
          metadata: sym
        });
      }

      // Routes
      for (const route of semanticProject.routes) {
        this.graph.addNode({
          id: route.route_id,
          type: 'route',
          label: `${route.method} ${route.path}`,
          source: route.file,
          metadata: route
        });

        if (route.handler) {
          let handlerSym = semanticProject.symbols.find(s => s.name === route.handler && s.file === route.file);
          if (!handlerSym) {
             handlerSym = fileImports.get(route.file)?.get(route.handler);
          }
          if (handlerSym) {
             this.graph.addEdge({
               edge_id: `EDGE-${route.route_id}-${handlerSym.symbol_id}`,
               from: route.route_id,
               to: handlerSym.symbol_id,
               type: 'ROUTE_HANDLES',
               confidence: 1.0,
               evidence_refs: []
             });
          }
        }
      }

      // Database Operations
      for (const db of semanticProject.databaseOperations) {
        this.graph.addNode({
          id: db.operation_id,
          type: 'databaseOperation',
          label: `${db.type} operation`,
          source: db.file,
          metadata: db
        });
      }
      
      for (const db of semanticProject.databaseOperations) {
        const parentSym = semanticProject.symbols.find(s => 
          s.file === db.file && s.line_start !== undefined && s.line_end !== undefined && 
          db.line >= s.line_start && db.line <= s.line_end
        );
        if (parentSym) {
           this.graph.addEdge({
             edge_id: `EDGE-${parentSym.symbol_id}-${db.operation_id}`,
             from: parentSym.symbol_id,
             to: db.operation_id,
             type: 'SYMBOL_PERSISTS',
             confidence: 1.0,
             evidence_refs: []
           });
        }
      }

      for (const call of semanticProject.calls) {
         const callerSym = semanticProject.symbols.find(s => 
           s.file === call.caller_file && s.line_start !== undefined && s.line_end !== undefined && 
           call.line >= s.line_start && call.line <= s.line_end
         );
         if (callerSym) {
            let targetSym = semanticProject.symbols.find(s => s.name === call.target_name && s.file === call.caller_file);
            if (!targetSym) targetSym = fileImports.get(call.caller_file)?.get(call.target_name);
            
            if (!targetSym && call.target_name.includes('.')) {
               const baseName = call.target_name.split('.')[0];
               targetSym = semanticProject.symbols.find(s => s.name === baseName && s.file === call.caller_file);
               if (!targetSym) targetSym = fileImports.get(call.caller_file)?.get(baseName);
            }

            if (targetSym) {
               this.graph.addEdge({
                 edge_id: `EDGE-${callerSym.symbol_id}-${targetSym.symbol_id}`,
                 from: callerSym.symbol_id,
                 to: targetSym.symbol_id,
                 type: 'SYMBOL_CALLS',
                 confidence: 1.0,
                 evidence_refs: []
               });
            }
         }
      }
    }

    // 4. Execution Evidence
    if (executionResults) {
      for (const exec of executionResults) {
        for (const phase of exec.phases) {
           if (phase.phase === 'TEST' && phase.status === 'PASSED') {
              const testNodeId = `TEST-${exec.execution_id}-${phase.phase}`;
              this.graph.addNode({
                id: testNodeId,
                type: 'test',
                label: `Test Execution`,
                metadata: phase
              });

              const exeNodeId = `EXE-${exec.execution_id}-${phase.phase}`;
              this.graph.addNode({
                id: exeNodeId,
                type: 'executionResult',
                label: `Execution Passed`,
                metadata: phase
              });

              this.graph.addEdge({
                edge_id: `EDGE-${testNodeId}-${exeNodeId}`,
                from: testNodeId,
                to: exeNodeId,
                type: 'EXECUTION_VALIDATES',
                confidence: 1.0,
                evidence_refs: []
              });
           }
        }
      }
    }

    // 5. Connect Evidence to Nodes
    for (const evd of evidenceList) {
       if (evd.type === 'API_ROUTE') {
          // Attempt to link to route node
          if (evd.metadata && evd.metadata.route_id) {
             this.graph.addEdge({
               edge_id: `EDGE-EVD-${evd.evidence_id}-${evd.metadata.route_id}`,
               from: evd.evidence_id,
               to: evd.metadata.route_id,
               type: 'EVIDENCE_LOCATES',
               confidence: 1.0,
               evidence_refs: [evd.evidence_id]
             });
          }
       }
       if (evd.type === 'DATABASE_OPERATION') {
          if (evd.metadata && evd.metadata.operation_id) {
             this.graph.addEdge({
               edge_id: `EDGE-EVD-${evd.evidence_id}-${evd.metadata.operation_id}`,
               from: evd.evidence_id,
               to: evd.metadata.operation_id,
               type: 'EVIDENCE_LOCATES',
               confidence: 1.0,
               evidence_refs: [evd.evidence_id]
             });
          }
       }
    }

    // 6. Claim -> Semantic Node resolution heuristic
    // For V0.7 we do a basic keyword match to link requirements to semantic nodes as a starting point.
    // Real implementation would use the AST analysis from V0.6 and LLM extraction to form exact edges.
    for (const claim of claims) {
       const reqNode = this.graph.getNodesByType('requirement').find(r => r.metadata?.claim_id === claim.claim_id);
       if (reqNode) {
          const keywords = claim.text.toLowerCase().split(' ').filter(k => k.length > 3);
          let foundConnection = false;
          let hasExecution = false;

          for (const route of this.graph.getNodesByType('route')) {
             if (keywords.some(k => route.label.toLowerCase().includes(k))) {
                this.graph.addEdge({
                  edge_id: `EDGE-${reqNode.id}-${route.id}`,
                  from: reqNode.id,
                  to: route.id,
                  type: 'REQUIREMENT_SUPPORTED_BY',
                  confidence: 0.5,
                  evidence_refs: []
                });
                foundConnection = true;
             }
          }

          // Check if there's test execution
          if (this.graph.getNodesByType('executionResult').length > 0) {
             hasExecution = true;
          }

          let completeness: CompletenessStatus = 'UNRESOLVED';
          if (foundConnection && hasExecution) {
             completeness = 'COMPLETE';
          } else if (foundConnection) {
             completeness = 'PARTIAL';
          }

          this.graph.addClaimChain({
             claim_id: claim.claim_id,
             requirement_id: reqNode.id,
             completeness,
             nodes: [],
             edges: []
          });
       }
    }

    return this.graph;
  }
}
