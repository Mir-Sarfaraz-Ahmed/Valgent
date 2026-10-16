import request from 'supertest';
import express from 'express';
import apiRoutes from '../../src/api/routes';
import { ProjectStore } from '../../src/api/project-store';

describe('Project Management API & Store', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/v1', apiRoutes);

  it('1. GET /api/v1/health returns ok status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('valgent-agent');
  });

  it('2. GET /api/v1/projects returns project list', async () => {
    const res = await request(app).get('/api/v1/projects');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  it('3. POST /api/v1/projects validates payload and creates project', async () => {
    // Missing repositoryUrl should fail
    const invalidRes = await request(app)
      .post('/api/v1/projects')
      .send({ name: 'Incomplete' });
    expect(invalidRes.status).toBe(400);

    // Valid project creation
    const res = await request(app)
      .post('/api/v1/projects')
      .send({
        name: 'Test Project E2E',
        repositoryUrl: 'https://github.com/example/test-repo',
        branch: 'main',
        description: 'E2E test project description'
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.name).toBe('Test Project E2E');
    expect(res.body.status).toBe('in_progress');

    const createdId = res.body.id;

    // 4. GET /api/v1/projects/:id returns created project
    const getRes = await request(app).get(`/api/v1/projects/${createdId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.name).toBe('Test Project E2E');

    // 5. PATCH /api/v1/projects/:id updates project
    const patchRes = await request(app)
      .patch(`/api/v1/projects/${createdId}`)
      .send({ description: 'Updated description', status: 'completed' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.description).toBe('Updated description');
    expect(patchRes.body.status).toBe('completed');

    // 6. Attach report and query GET /api/v1/projects/:id/reports
    const mockReport = {
      schema_version: '1.0',
      analysis_run_id: 'ANALYSIS-MOCK-999',
      project: { id: createdId, repository_url: 'https://github.com/example/test-repo' },
      analysis: { completed_at: new Date().toISOString() },
      summary: { total_claims: 2, verified: 2, not_verified: 0 },
      claims: []
    };
    ProjectStore.attachReport(createdId, mockReport);

    const reportsRes = await request(app).get(`/api/v1/projects/${createdId}/reports`);
    expect(reportsRes.status).toBe(200);
    expect(reportsRes.body.reports.length).toBeGreaterThan(0);

    // 7. GET /api/v1/analyses/:id
    const analysisRes = await request(app).get('/api/v1/analyses/ANALYSIS-MOCK-999');
    expect(analysisRes.status).toBe(200);
    expect(analysisRes.body.analysis_id).toBe('ANALYSIS-MOCK-999');
    expect(analysisRes.body.status).toBe('COMPLETED');

    // 8. DELETE /api/v1/projects/:id deletes project
    const delRes = await request(app).delete(`/api/v1/projects/${createdId}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.success).toBe(true);

    // Confirm 404
    const notFoundRes = await request(app).get(`/api/v1/projects/${createdId}`);
    expect(notFoundRes.status).toBe(404);
  });

  it('4. Enforces per-user project isolation via x-user-id header', async () => {
    const runNonce = Date.now();
    const aliceId = `user-alice-test-${runNonce}`;
    const bobId = `user-bob-test-${runNonce}`;

    // 1. Alice starts with 0 projects
    const aliceInitial = await request(app)
      .get('/api/v1/projects')
      .set('x-user-id', aliceId);
    expect(aliceInitial.status).toBe(200);
    expect(aliceInitial.body.projects).toEqual([]);

    // 2. Alice creates a project
    const createRes = await request(app)
      .post('/api/v1/projects')
      .set('x-user-id', aliceId)
      .send({
        name: "Alice Private App",
        repositoryUrl: "https://github.com/alice/private-app",
        branch: "main",
        description: "Alice personal verification"
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.ownerId).toBe(aliceId);
    const aliceProjectId = createRes.body.id;

    // 3. Alice lists projects - sees her project
    const aliceList = await request(app)
      .get('/api/v1/projects')
      .set('x-user-id', aliceId);
    expect(aliceList.status).toBe(200);
    expect(aliceList.body.projects.length).toBe(1);
    expect(aliceList.body.projects[0].id).toBe(aliceProjectId);

    // 4. Bob lists projects - sees 0 projects (isolated from Alice)
    const bobList = await request(app)
      .get('/api/v1/projects')
      .set('x-user-id', bobId);
    expect(bobList.status).toBe(200);
    expect(bobList.body.projects).toEqual([]);

    // 5. Bob tries to access Alice's project - receives 404
    const bobAccess = await request(app)
      .get(`/api/v1/projects/${aliceProjectId}`)
      .set('x-user-id', bobId);
    expect(bobAccess.status).toBe(404);

    // 6. Cleanup: Alice deletes her project
    const delRes = await request(app)
      .delete(`/api/v1/projects/${aliceProjectId}`)
      .set('x-user-id', aliceId);
    expect(delRes.status).toBe(200);
  });
});

