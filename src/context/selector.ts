import * as crypto from 'crypto';
import { ContextDigest, ContextFile, SelectionConfig, SelectionResult } from './types';
import { Evidence } from '../shared/types';
import { EvidenceGraphData } from '../evidence/graph-types';

export class ContextSelector {
  public static select(
    digest: ContextDigest,
    evidence: Evidence[],
    subgraph: EvidenceGraphData,
    config: SelectionConfig
  ): SelectionResult {
    const selectedFiles: ContextFile[] = [];
    let currentTokens = 0;

    // Priority lists of paths
    const directlyReferenced = new Set<string>();
    const routeHandlers = new Set<string>();
    const databaseOps = new Set<string>();
    const tests = new Set<string>();
    const others = new Set<string>();

    // Process evidence to find directly referenced files
    for (const ev of evidence) {
      if (ev.location) {
         // Some locations have line numbers like "src/file.ts#L10", so clean it up
         const filePath = ev.location.split('#')[0];
         directlyReferenced.add(filePath);

         if (ev.type === 'API_ROUTE') routeHandlers.add(filePath);
         if (ev.type === 'DATABASE_OPERATION' || ev.type === 'DATABASE_SCHEMA') databaseOps.add(filePath);
         if (ev.type === 'TEST') tests.add(filePath);
      }
    }

    // Process subgraph to find other mentioned files in graph nodes
    for (const node of subgraph.nodes) {
       if (node.metadata?.file_path) {
          others.add(node.metadata.file_path);
       }
    }

    // Find all files in digest
    const fileMap = new Map<string, ContextFile>();
    for (const f of digest.files) {
      fileMap.set(f.path, f);
    }

    const tryAddFile = (pathStr: string) => {
       const f = fileMap.get(pathStr);
       if (f && !selectedFiles.find(sf => sf.path === f.path)) {
          if (currentTokens + f.tokens <= config.tokenBudget) {
             selectedFiles.push(f);
             currentTokens += f.tokens;
             return true;
          }
       }
       return false;
    };

    // 1. Directly referenced by evidence
    for (const p of directlyReferenced) tryAddFile(p);

    // 2-6. Route handlers, database ops, tests
    for (const p of routeHandlers) tryAddFile(p);
    for (const p of databaseOps) tryAddFile(p);
    for (const p of tests) tryAddFile(p);

    // 7. Graph-referenced files (imports, services)
    for (const p of others) tryAddFile(p);

    // 8. Add remaining implementation files (heuristic: .ts, .js, .go, .py)
    // 9. Add documentation
    for (const f of digest.files) {
       if (f.path.endsWith('.ts') || f.path.endsWith('.js') || f.path.endsWith('.py') || f.path.endsWith('.go')) {
          tryAddFile(f.path);
       }
    }
    for (const f of digest.files) {
       if (f.path.endsWith('.md')) {
          tryAddFile(f.path);
       }
    }

    const digestHash = crypto.createHash('sha256').update(selectedFiles.map(f => f.path).join(',')).digest('hex').substring(0, 16);

    return {
      selectedFiles,
      summary: {
        totalFiles: digest.summary.totalFiles,
        eligibleFiles: digest.summary.eligibleFiles,
        selectedFiles: selectedFiles.length,
        estimatedTokens: currentTokens,
        budget: config.tokenBudget,
        truncated: selectedFiles.length < digest.files.length,
        digestHash
      }
    };
  }
}
