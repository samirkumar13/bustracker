require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ── Secret hygiene check ──────────────────────────────────────────────────────
// A missing or default JWT secret lets anyone forge auth tokens. Refuse to start
// in production; warn loudly in development.
const WEAK_SECRETS = [undefined, '', 'your-super-secret-jwt-key-change-this', 'change-this-in-production'];
if (WEAK_SECRETS.includes(process.env.JWT_SECRET)) {
  const msg = 'JWT_SECRET is missing or set to a default value. Set a strong, unique secret in .env';
  if (process.env.NODE_ENV === 'production') {
    console.error(`[FATAL] ${msg}`);
    process.exit(1);
  }
  console.warn(`[WARNING] ${msg} (allowed in development only)`);
}

const authRoutes = require('./routes/auth');
const busRoutes = require('./routes/buses');
const routeRoutes = require('./routes/routes');
const userRoutes = require('./routes/users');
const studentRoutes = require('./routes/students');
const stopRoutes = require('./routes/stops');
const attendanceRoutes = require('./routes/attendance');
const { setupSocketHandlers } = require('./services/socketService');
const { startGpsCleanupJob } = require('./jobs/cleanupGpsData');
const auditLogRoutes = require('./routes/auditLogs');

// ── CORS allowlist ────────────────────────────────────────────────────────────
// CLIENT_URL can be comma-separated for multiple origins, e.g.:
//   CLIENT_URL="http://localhost:5173,http://172.20.197.199:5173"
// Requests with no Origin header (React Native app, curl, Postman) are always
// allowed — they're not browser cross-origin requests.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // native apps / server-to-server
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not in allowlist`));
  },
  credentials: true,
};

// ── Auth rate limiter ─────────────────────────────────────────────────────────
// 20 attempts per IP per 15-minute window — stops credential brute-force.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,   // Disable X-RateLimit-* headers
  message: { error: 'Too many attempts from this IP, please try again in 15 minutes.' },
});

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'] },
});

// ── Global middleware ─────────────────────────────────────────────────────────
app.use(helmet());                   // security headers (CSP, HSTS, X-Frame-Options, …)
app.use(cors(corsOptions));
app.use(express.json());

// Attach io to every request so routes can emit events
app.use((req, _res, next) => { req.io = io; next(); });

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/stops', stopRoutes);
app.use('/api/attendance', attendanceRoutes);

app.use('/api/audit-logs', auditLogRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

setupSocketHandlers(io);
startGpsCleanupJob();

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
