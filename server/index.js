import { config } from 'dotenv';
config();
import express from 'express';
import helmet from 'helmet';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './router.js';
import { buildStale } from './buildCheck.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT, 10) || 3004;

// Network exposure guards (project-standards § Network Exposure). The API has no
// authentication; its only intended client is this app's own page on this Mac.
const allowedHosts = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);
const allowedOrigins = new Set([`http://localhost:${PORT}`, `http://127.0.0.1:${PORT}`]);

const app = express();
app.disable('x-powered-by');

// Host check: stops DNS rebinding, where a website re-resolves its own domain to
// 127.0.0.1 and reads this API through the user's browser.
app.use((req, res, next) => {
  if (!allowedHosts.has(req.headers.host ?? '')) {
    return res.status(403).json({ error: 'Invalid host' });
  }
  next();
});

// Cross-site write guard: CORS stops other sites reading responses, not sending
// requests. Browsers always send Origin cross-site, so a foreign one is refused.
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    return res.status(403).json({ error: 'Cross-site request refused' });
  }
  next();
});

// Security headers. The UI loads nothing external; AI calls go through /api/ai.
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    // Plain-http loopback app: HSTS would pin localhost to https for the browser.
    strictTransportSecurity: false,
  }),
);

app.get('/api/build-status', (_req, res) => {
  res.json({ stale: buildStale });
});

// API routes
app.use(createApp());

// Serve built frontend
const distPath = join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// SPA fallback
app.get('/{*path}', (_req, res) => {
  res.sendFile(join(distPath, 'index.html'));
});

// Loopback only: no host would listen on every interface (the whole LAN).
app.listen(PORT, '127.0.0.1', () => {
  console.log(`PM Tools running on http://127.0.0.1:${PORT}`);
});
