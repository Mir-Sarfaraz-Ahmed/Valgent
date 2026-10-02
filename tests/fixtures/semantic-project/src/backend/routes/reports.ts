import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { createReport, getReport, intentionallyUnusedFunction } from '../services/reportService';

const router = express.Router();

// fake documentation claim: GET /api/reports/all returns all reports

router.post('/api/reports', authenticateToken, async (req, res) => {
  const result = await createReport(req.body);
  res.json(result);
});

router.get('/api/reports/:id', authenticateToken, async (req, res) => {
  const result = await getReport(req.params.id);
  res.json(result);
});

export default router;
