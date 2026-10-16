import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './api/routes';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoints (supports /, /health, /api/v1/health)
app.get(['/', '/health', '/api/v1/health'], (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'valgent-agent',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Start server
const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Valgent backend is running on port ${PORT} (0.0.0.0)`);
});
