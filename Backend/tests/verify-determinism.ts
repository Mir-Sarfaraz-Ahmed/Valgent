import { SemanticParser } from '../src/analyzers/semantic/parser';
import { EvidenceGraphBuilder } from '../src/evidence/graph-builder';
import * as path from 'path';

const fixtureDir = path.join(__dirname, 'fixtures', 'cross-file-test');

const parser1 = new SemanticParser(fixtureDir, ['routes.ts', 'controller.ts', 'service.ts', 'db.ts']);
const semanticModel1 = parser1.parse();
const builder1 = new EvidenceGraphBuilder();
const graph1 = builder1.build([{ claim_id: 'C1', text: 'Users can submit reports' }], [], semanticModel1, []);

const parser2 = new SemanticParser(fixtureDir, ['routes.ts', 'controller.ts', 'service.ts', 'db.ts']);
const semanticModel2 = parser2.parse();
const builder2 = new EvidenceGraphBuilder();
const graph2 = builder2.build([{ claim_id: 'C1', text: 'Users can submit reports' }], [], semanticModel2, []);

console.log("Nodes 1:", graph1.serialize().nodes.length);
console.log("Edges 1:", graph1.serialize().edges.length);
console.log("Nodes 2:", graph2.serialize().nodes.length);
console.log("Edges 2:", graph2.serialize().edges.length);

const nodesMatch = JSON.stringify(graph1.serialize().nodes) === JSON.stringify(graph2.serialize().nodes);
const edgesMatch = JSON.stringify(graph1.serialize().edges) === JSON.stringify(graph2.serialize().edges);

console.log("Determinism nodes match:", nodesMatch);
console.log("Determinism edges match:", edgesMatch);
