import { GithubFetcher } from '../src/github/fetcher';
import { ProjectMapper } from '../src/analyzers/mapper';
import { StaticAnalyzer } from '../src/analyzers/static';
import { EvidenceEngine } from '../src/evidence/engine';
import { EvidenceGraphBuilder } from '../src/evidence/graph-builder';

async function run() {
  const repoUrl = 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git';
  const descriptor = await GithubFetcher.fetch(repoUrl, undefined);
  const map = await ProjectMapper.map(descriptor);
  const engine = new EvidenceEngine();
  const semanticModel = await StaticAnalyzer.analyze(descriptor, map, engine);
  
  const claims = [
    { claim_id: 'C1', text: 'Users can view AI summarized local government meetings.' },
    { claim_id: 'C2', text: 'Users can submit feedback on council meetings.' }
  ];

  const builder = new EvidenceGraphBuilder();
  const graph = builder.build(claims, engine.getEvidence(), semanticModel, []);

  const data = graph.serialize();
  console.log('Nodes count:', data.nodes.length);
  console.log('Edges count:', data.edges.length);
  
  console.log('Symbols:', data.nodes.filter(n => n.type === 'symbol').length);
  console.log('Routes:', data.nodes.filter(n => n.type === 'route').length);
  console.log('DB Ops:', data.nodes.filter(n => n.type === 'databaseOperation').length);
  
  const chains = data.claim_chains.map(c => ({
    claim: c.claim_id,
    completeness: c.completeness,
  }));
  console.log('Chains:', JSON.stringify(chains, null, 2));

  await GithubFetcher.cleanup(descriptor);
}
run().catch(console.error);
