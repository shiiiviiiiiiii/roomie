const path = require('path');
// Load the repo-root .env so a single file serves server + client
// (dotenv's default would only look in the current working directory).
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

// Firebase Admin SDK (Auth / Firestore / Storage). Boots without credentials
// too — enough for the emulator suite; real calls fail loudly without them.
require('./firebase');

const app = express();
const PORT = process.env.PORT || 4000;
const IS_PROD = process.env.NODE_ENV === 'production';

// Don't advertise the framework — minor fingerprinting reduction.
app.disable('x-powered-by');

// ---------------------------------------------------------------------------
// Security headers (helmet)
// CSP notes / deliberate choices:
// - script-src 'self' only: the Vite production build emits external JS
//   bundles with no inline <script> tags, so 'unsafe-inline' is not needed
//   for scripts. (During `vite dev`, React fast-refresh injects inline
//   scripts — dev only; CSP is enforced by this server in production.)
// - style-src allows 'unsafe-inline': React sets element styles through the
//   `style` attribute at runtime, which CSP blocks without it; Google Fonts
//   CSS is also loaded from fonts.googleapis.com.
// - img-src allows Leaflet's OpenStreetMap tile hosts, data:/blob: for
//   inline/pasted images, and Firebase Storage hosts (listing photos now
//   live in Cloud Storage, not on local disk).
// - connect-src allows the Firebase/Google endpoints used by the Firebase
//   web SDK (Auth; Firestore/Storage are server-side only here), plus the
//   local Firebase Emulator Suite ports for development.
// ---------------------------------------------------------------------------
const EMULATOR_HOSTS = [
  'http://127.0.0.1:9099', // Auth emulator
  'http://127.0.0.1:8080', // Firestore emulator
  'http://127.0.0.1:9199', // Storage emulator
];
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: [
        "'self'", 'data:', 'blob:', 'https://*.tile.openstreetmap.org',
        'https://storage.googleapis.com', 'https://firebasestorage.googleapis.com',
        // Seeded demo listings use picsum.photos placeholder images.
        'https://picsum.photos',
        'http://127.0.0.1:9199',
      ],
      connectSrc: [
        "'self'",
        'https://*.googleapis.com',
        'https://*.firebaseio.com',
        'https://*.firebaseapp.com',
        ...EMULATOR_HOSTS,
      ],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
}));

// CORS allowlist from env (comma-separated). Same-origin requests carry no
// Origin header and are always allowed.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS origin not allowed'));
  },
}));

app.use(express.json({ limit: '2mb' }));

// ---------------------------------------------------------------------------
// Rate limiting
// - General API limiter: 100 requests / 15 min per IP.
// - Auth limiter: 10 requests / 15 min per IP on /api/auth/* — sign-in itself
//   happens client-side via Firebase, but profile reads/writes stay throttled.
// ---------------------------------------------------------------------------
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again later' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts — please try again later' },
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/conversations', require('./routes/conversations'));
app.use('/api/visits', require('./routes/visits'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (_req, res) => res.json({ ok: true, app: 'roomie', time: new Date().toISOString() }));

// serve the built frontend in production
const CLIENT_DIST = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (_req, res) => res.sendFile(path.join(CLIENT_DIST, 'index.html')));
} else {
  app.get('/', (_req, res) => res.json({
    app: 'roomie',
    note: 'API is running. Build the client (npm run build) to serve the web UI from here, or run the Vite dev server.',
  }));
}

// 404 + error handlers
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Log the full error server-side for debugging, but NEVER leak stack
  // traces or internals to clients — in production and development alike,
  // API consumers only ever see a generic message.
  console.error(err);
  if (err && err.message === 'CORS origin not allowed') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  res.status(500).json({ error: 'Something went wrong' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Roomie server listening on http://localhost:${PORT}${IS_PROD ? ' (production)' : ''}`);
  });
}

module.exports = app;
