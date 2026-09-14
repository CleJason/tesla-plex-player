import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config.js';
import cookieParser from 'cookie-parser';
import apiRouter from './routes/api.js';
import authRouter from './routes/auth.js';
import { requireApiAuth, requirePageAuth, redirectIfAuthenticated } from './middleware/authMiddleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();

// Trust reverse proxy headers (X-Forwarded-For, X-Forwarded-Proto, etc.)
app.set('trust proxy', true);

// Enable CORS for all origins
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Parse signed cookies
app.use(cookieParser(config.sessionSecret));

// Public auth endpoints
app.use('/api/auth', authRouter);

// Protected API routes
app.use('/api', requireApiAuth, apiRouter);

const publicDir = path.join(__dirname, '..', 'public');

// Login page route (redirects to / if already logged in)
app.get('/login', redirectIfAuthenticated, (req, res) => {
  res.sendFile(path.join(publicDir, 'login.html'));
});

// Serve static frontend assets (css, js, etc.) without automatic index.html serving
app.use(express.static(publicDir, { index: false }));

// Main SPA routes (protected by session gate)
app.get('*', requirePageAuth, (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[Error]', err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err.message || 'Internal Server Error'
    });
  }
});

// Start server only when executed directly (not when imported in tests)
const isDirectRun = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) || 
  process.argv[1].endsWith('server.js')
);

let serverInstance = null;
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  serverInstance = app.listen(config.port, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(` Tesla Plex Music Player listening on port ${config.port}`);
    console.log(` Mode: ${config.useMockPlex ? 'MOCK (Sample Data & Streams)' : 'LIVE PLEX'}`);
    if (!config.useMockPlex) {
      console.log(` Plex Server: ${config.plexServerUrl}`);
    }
    console.log(` Reverse Proxy: Supported (trust proxy enabled)`);
    console.log(`====================================================`);
  });
}

export { serverInstance };
