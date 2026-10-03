import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import apiRoutes from './api/routes';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'valgent-agent' });
});

// API Routes
app.use('/api/v1', apiRoutes);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Valgent backend is running on port ${PORT}`);
});
