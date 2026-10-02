import { SemanticParser } from '../src/analyzers/semantic/parser';
import { EvidenceGraphBuilder } from '../src/evidence/graph-builder';
import * as path from 'path';
import * as fs from 'fs';

const fixtureDir = path.join(__dirname, 'fixtures', 'cross-file-test');

// Create fixture files
fs.mkdirSync(fixtureDir, { recursive: true });

fs.writeFileSync(path.join(fixtureDir, 'routes.ts'), `
import { createReport } from './controller';
const app = require('express')();
app.post('/report', createReport);
`);

fs.writeFileSync(path.join(fixtureDir, 'controller.ts'), `
import { saveReport } from './service';
export function createReport(req, res) {
  saveReport(req.body);
  res.send('ok');
}
`);

fs.writeFileSync(path.join(fixtureDir, 'service.ts'), `
import { db } from './db';
export function saveReport(data) {
  db.insert('reports', data);
}
`);

fs.writeFileSync(path.join(fixtureDir, 'db.ts'), `
export const db = { insert: (table, data) => {} };
`);

const parser = new SemanticParser(fixtureDir, ['routes.ts', 'controller.ts', 'service.ts', 'db.ts']);
const semanticModel = parser.parse();

const builder = new EvidenceGraphBuilder();
const graph = builder.build([{ claim_id: 'C1', text: 'Users can submit reports' }], [], semanticModel, []);

console.log(JSON.stringify(graph.serialize(), null, 2));
