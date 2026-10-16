import { GithubFetcher } from '../src/github/fetcher';
import { ProjectMapper } from '../src/analyzers/mapper';
import { StaticAnalyzer } from '../src/analyzers/static';
import { EvidenceEngine } from '../src/evidence/engine';
import fs from 'fs';
import path from 'path';

async function run() {
  console.log('Fetching CivicPulse...');
  const repoUrl = 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git';
  const commit = 'main'; // or left undefined
  const descriptor = await GithubFetcher.fetch(repoUrl, commit);
  
  console.log('Mapping...');
  const map = await ProjectMapper.map(descriptor);
  
  console.log('Static / Semantic Analysis...');
  const engine = new EvidenceEngine();
  await StaticAnalyzer.analyze(descriptor, map, engine);
  
  const evidence = engine.getEvidence();
  
  const astSymbols = evidence.filter(e => e.type === 'AST_SYMBOL').length;
  const astImports = evidence.filter(e => e.type === 'AST_IMPORT').length;
  const routes = evidence.filter(e => e.type === 'API_ROUTE').length;
  const dbOps = evidence.filter(e => e.type === 'DATABASE_OPERATION').length;
  const components = evidence.filter(e => e.type === 'REACT_COMPONENT').length;
  
  console.log(`\nSemantic Evidence Results for CivicPulse:`);
  console.log(`- AST Symbols: ${astSymbols}`);
  console.log(`- AST Imports: ${astImports}`);
  console.log(`- API Routes: ${routes}`);
  console.log(`- DB Operations: ${dbOps}`);
  console.log(`- React Components: ${components}`);

  const output = {
    astSymbols,
    astImports,
    routes,
    dbOps,
    components,
    evidence
  };

  fs.writeFileSync('civicpulse-semantic.json', JSON.stringify(output, null, 2));
  console.log('\nWrote full evidence to civicpulse-semantic.json');
}

run().catch(console.error);
