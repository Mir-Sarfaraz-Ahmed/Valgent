import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import express from 'express';
import apiRoutes from './src/api/routes';

const app = express();
app.use(express.json());
app.use('/api/v1', apiRoutes);

async function run() {
  console.log('Starting Smoke Test on CivicPulse-AI...');
  const res = await request(app)
    .post('/api/v1/analyze')
    .send({
      repository_url: 'https://github.com/Mir-Sarfaraz-Ahmed/civicpulse-ai.git',
      claims: [
        { claim_id: 'CLM-001', text: 'Citizens can submit civic issue reports.' },
        { claim_id: 'CLM-002', text: 'The system calculates a deterministic priority score.' },
        { claim_id: 'CLM-003', text: 'The application provides an authority/admin workflow for handling incidents.' },
        { claim_id: 'CLM-004', text: 'The system groups duplicate incidents based on geographic proximity.' },
        { claim_id: 'CLM-005', text: 'Users can authenticate through the implemented authentication system.' }
      ]
    });
    
  console.log('Status Code:', res.status);
  console.log(JSON.stringify(res.body, null, 2));
}

run().catch(console.error);
