import express from 'express';
import dotenv from 'dotenv';
import apiRoutes from './api/routes';

// Load environment variables
dotenv.config();

const app = express();

// Enable CORS for frontend clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

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
