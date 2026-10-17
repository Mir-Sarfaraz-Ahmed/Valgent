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

// HTML bridge for non-API web routes to safely preserve URL hash fragments and query params across origins
const createRedirectBridge = (frontendUrl: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Authenticating with Valgent...</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #09090b;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(225, 29, 72, 0.2);
      border-top-color: #f43f5e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .title { font-size: 16px; font-weight: 600; margin-bottom: 6px; }
    .subtitle { font-size: 13px; color: #a1a1aa; }
  </style>
  <script>
    (function() {
      var frontendBase = "${frontendUrl}".replace(/\/+$/, '');
      var hash = window.location.hash || '';
      var search = window.location.search || '';
      var pathname = window.location.pathname || '';

      // Prevent redirect loops if backend and frontend are configured with the same origin
      if (window.location.origin === frontendBase) {
        return;
      }

      // If auth tokens (hash) or OAuth PKCE code (search) exist on generic routes, route to /auth/callback
      var hasAuth = hash.indexOf('access_token=') !== -1 || search.indexOf('code=') !== -1;
      var targetPath = pathname;
      if (hasAuth && (pathname === '/' || pathname === '/login' || pathname === '/signup')) {
        targetPath = '/auth/callback';
      }

      window.location.replace(frontendBase + targetPath + search + hash);
    })();
  </script>
</head>
<body>
  <div class="spinner"></div>
  <div class="title">Authenticating with Valgent...</div>
  <div class="subtitle">Redirecting to your workspace...</div>
</body>
</html>`;

// Root & web routes: Serve bridge to frontend preserving hash fragments & search params
app.get(['/', '/auth/callback', '/projects', '/projects/*', '/login', '/signup'], (req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(createRedirectBridge(frontendUrl));
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
