import request from 'supertest';
import express from 'express';
// Note: apiRoutes export might be default or named depending on src/api/routes.ts
import { Router } from 'express';
const apiRoutes = require('../src/api/routes').default || require('../src/api/routes');
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(express.json());
// Since the export in routes.ts is `export default router;`
app.use('/api', apiRoutes);

async function run() {
  console.log('=== V0.9 End-to-End Integration Trace ===');
  console.log('Target: CivicPulse');
  console.log('Starting full analysis via Valgent route pipeline...');

  const startTime = Date.now();
  
  const response = await request(app)
    .post('/api/analyze')
    .send({
      repository_url: 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git',
      claims: [
        { claim_id: 'C1', text: 'Users can view AI summarized local government meetings.' },
        { claim_id: 'C2', text: 'Users can submit feedback on council meetings.' }
      ]
    })
    .timeout(120000); // 2 minutes timeout

  const endTime = Date.now();
  
  if (response.status !== 200) {
    console.error('Integration Failed:', response.status, response.body);
    return;
  }

  const report = response.body.report;

  console.log(`\nAnalysis completed in ${(endTime - startTime) / 1000}s`);
  console.log('\n--- V0.9 ORCHESTRATION RESULTS ---');
  
  console.log(`\nClaims Validated: ${report.claims?.length}`);
  report.claims?.forEach((c: any) => {
    console.log(`- [${c.claim_id}] ${c.status} : ${c.conclusion}`);
  });

  console.log(`\nAudit Trail (Validation Actions Taken): ${report.validation_actions?.length}`);
  report.validation_actions?.forEach((action: any) => {
    const act = action.selected_action;
    console.log(`- [${action.claim_id}] ${act ? act.type : 'NONE'} on ${act ? act.target_id : 'N/A'} -> ${action.result?.status || 'N/A'}`);
  });
  
  console.log(`\nRoadmap Tasks Generated: ${report.roadmap?.length}`);
  report.roadmap?.forEach((task: any) => {
    console.log(`- [${task.claim_id}] ${task.title}`);
  });

  console.log('\n--- CIVICPULSE GRAPH STATS ---');
  const graph = report.evidence_graph;
  if (graph) {
    console.log('Nodes:', graph.nodes?.length);
    console.log('Edges:', graph.edges?.length);
  }

  console.log('\nIntegration verified successfully.');
}

run().catch(console.error);
