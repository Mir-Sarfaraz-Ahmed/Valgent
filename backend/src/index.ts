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

// Root route: Redirect to frontend (preserves auth tokens and hash fragments)
app.get('/', (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.redirect(302, frontendUrl);
});

// API Routes
app.use('/api/v1', apiRoutes);

// Start server
const PORT = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Valgent backend is running on port ${PORT}`);
  });
}

export default app;
export { app };
