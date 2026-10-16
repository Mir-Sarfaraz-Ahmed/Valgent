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
       const targetId = evd.metadata?.route_id || evd.metadata?.operation_id || evd.metadata?.symbol_id || evd.metadata?.evidence_id || evd.evidence_id;
       if (targetId && this.graph.hasNode(targetId) && targetId !== evd.evidence_id) {
          this.graph.addEdge({
            edge_id: `EDGE-EVD-${evd.evidence_id}-${targetId}`,
            from: evd.evidence_id,
            to: targetId,
            type: 'EVIDENCE_LOCATES',
            confidence: 1.0,
            evidence_refs: [evd.evidence_id]
          });
       }
    }

    // 6. Claim -> Semantic Node & Evidence resolution heuristic
    const STOPWORDS = new Set([
      'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'for', 'of', 'in', 'to', 'by',
      'from', 'that', 'this', 'with', 'be', 'are', 'can', 'will', 'should', 'must', 'have',
      'has', 'been', 'each', 'all', 'any', 'into', 'help', 'helps', 'used', 'uses', 'using',
      'app', 'application', 'feature', 'system', 'project', 'repo', 'repository', 'intended',
      'written', 'code', 'support', 'supports', 'based', 'module', 'built', 'build', 'entirely',
      'user', 'users', 'various', 'includes', 'including', 'implemented', 'works', 'working',
      'provides', 'provided', 'handling', 'handles', 'managed', 'manages', 'management'
    ]);

    function extractTokens(text: string): string[] {
      const tokens = new Set<string>();
      const rawWords = text.toLowerCase().split(/[^a-z0-9_/-]+/);
      for (const w of rawWords) {
        if (!w || STOPWORDS.has(w)) continue;
        if (w.length >= 3) tokens.add(w);
        const subParts = w.split(/[/_-]/);
        if (subParts.length > 1) {
          for (const sp of subParts) {
            if (sp.length >= 3 && !STOPWORDS.has(sp)) tokens.add(sp);
          }
        }
      }
      return Array.from(tokens);
    }

    // Index evidence by location/filename for fast file matching
    const evidenceByFile = new Map<string, Evidence[]>();
    for (const ev of evidenceList) {
       if (ev.location) {
          const locLower = ev.location.toLowerCase();
          if (!evidenceByFile.has(locLower)) evidenceByFile.set(locLower, []);
          evidenceByFile.get(locLower)!.push(ev);
       }
    }

    const allGraphNodes = this.graph.serialize().nodes;
    const hasExecution = this.graph.getNodesByType('executionResult').length > 0;

    for (const claim of claims) {
       const reqNode = this.graph.getNodesByType('requirement').find(r => r.metadata?.claim_id === claim.claim_id);
       if (!reqNode) continue;

       const claimTokens = extractTokens(claim.text);
       const lowerClaimText = claim.text.toLowerCase();

       // Match candidates with scoring
       interface ScoredMatch {
         nodeId: string;
         score: number;
         evidenceRefs: string[];
       }
       const matches: ScoredMatch[] = [];

       for (const node of allGraphNodes) {
          if (node.id === claim.claim_id || node.id === reqNode.id) continue;
          let score = 0;
          let matchedTokensCount = 0;
          const nodeLabel = (node.label || '').toLowerCase();
          const nodeSource = (node.source || '').toLowerCase();

          for (const token of claimTokens) {
             let matched = false;
             const escapedToken = token.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
             const tokenRe = new RegExp(`\\b${escapedToken}\\b`, 'i');
             if (tokenRe.test(nodeLabel)) {
                score += token.length > 5 ? 4 : 2;
                matched = true;
             } else if (nodeSource.includes(token)) {
                score += token.length > 5 ? 3 : 1;
                matched = true;
             }
             if (matched) matchedTokensCount++;
          }

          // Exact endpoint or file matching bonuses
          if (node.type === 'route') {
             const pathPart = (node.metadata?.path || '').toLowerCase();
             if (pathPart && pathPart !== '/' && lowerClaimText.includes(pathPart)) {
                score += 10;
                matchedTokensCount += 2;
             }
          }
          if (node.type === 'symbol') {
             const symName = (node.label || '').toLowerCase();
             if (symName && symName.length > 3) {
                const escaped = symName.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
                if (new RegExp(`\\b${escaped}\\b`, 'i').test(lowerClaimText)) {
                   score += 8;
                   matchedTokensCount += 2;
                }
             }
          }

          // Strict threshold: Require at least 2 distinct tokens AND score >= 6
          if (score >= 6 && matchedTokensCount >= 2) {
             const evRefs: string[] = [];
             if (node.type === 'evidence') {
                evRefs.push(node.id);
             } else if (node.metadata?.evidence_id) {
                evRefs.push(node.metadata.evidence_id);
             }
             // Also look up any direct evidence matching this node's source file
             if (node.source && evidenceByFile.has(node.source.toLowerCase())) {
                const fileEvs = evidenceByFile.get(node.source.toLowerCase())!;
                fileEvs.slice(0, 3).forEach(fe => evRefs.push(fe.evidence_id));
             }

             matches.push({
               nodeId: node.id,
               score,
               evidenceRefs: Array.from(new Set(evRefs))
             });
          }
       }

       // Sort by score descending and take top 8 matches
       matches.sort((a, b) => b.score - a.score);
       const topMatches = matches.slice(0, 8);

       const connectedNodes: string[] = [];
       const connectedEdges: string[] = [];

       for (const m of topMatches) {
          const edgeId = `EDGE-${reqNode.id}-${m.nodeId}`;
          this.graph.addEdge({
            edge_id: edgeId,
            from: reqNode.id,
            to: m.nodeId,
            type: 'REQUIREMENT_SUPPORTED_BY',
            confidence: Math.min(1.0, 0.4 + m.score * 0.05),
            evidence_refs: m.evidenceRefs
          });
          connectedNodes.push(m.nodeId);
          connectedEdges.push(edgeId);

          // If there are associated evidence refs not in the graph edge targets, connect them directly
          for (const evRef of m.evidenceRefs) {
             if (this.graph.hasNode(evRef) && evRef !== m.nodeId) {
                const evEdgeId = `EDGE-${reqNode.id}-${evRef}`;
                this.graph.addEdge({
                  edge_id: evEdgeId,
                  from: reqNode.id,
                  to: evRef,
                  type: 'REQUIREMENT_SUPPORTED_BY',
                  confidence: Math.min(1.0, 0.4 + m.score * 0.05),
                  evidence_refs: [evRef]
                });
                connectedNodes.push(evRef);
                connectedEdges.push(evEdgeId);
             }
          }
       }

       let completeness: CompletenessStatus = 'UNRESOLVED';
       if (topMatches.length >= 2 && hasExecution) {
          completeness = 'COMPLETE';
       } else if (topMatches.length > 0) {
          completeness = 'PARTIAL';
       }

       this.graph.addClaimChain({
          claim_id: claim.claim_id,
          requirement_id: reqNode.id,
          completeness,
          nodes: Array.from(new Set(connectedNodes)),
          edges: Array.from(new Set(connectedEdges))
       });
    }

    return this.graph;
  }
}
