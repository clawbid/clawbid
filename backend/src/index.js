require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const WebSocketManager = require('./ws/manager');
const db = require('./db');
const cron = require('./cron');

const agentRoutes = require('./routes/agents');
const marketRoutes = require('./routes/markets');
const webhookRoutes = require('./routes/webhook');
const walletRoutes = require('./routes/wallet');
const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');

const app = express();
const httpServer = createServer(app);

// Trust Railway proxy
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow all Railway domains + any configured frontend
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow all railway.app domains and configured frontend
    if (
      origin.includes('railway.app') ||
      origin === process.env.FRONTEND_URL ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true); // Allow all for now
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-webhook-id', 'x-openclaw-key']
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiter with Railway proxy support
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  // Fix for Railway's X-Forwarded-For
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.ip || 
           'unknown';
  },
  skip: (req) => req.path === '/health'
});
app.use('/api/', limiter);

app.use('/api/auth',    authRoutes);
app.use('/api/agents',  agentRoutes);
app.use('/api/markets', marketRoutes);
app.use('/api/wallet',  walletRoutes);
app.use('/api/prices',  priceRoutes);
app.use('/wh',          webhookRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

const wsManager = new WebSocketManager(httpServer);
app.set('ws', wsManager);

const PORT = process.env.PORT || 4000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🦀 ClawBid backend running on port ${PORT}`);
});

db.connect()
  .then(() => console.log('✓ Database connected'))
  .catch(err => console.error('⚠ DB error:', err.message));

try {
  cron.start(wsManager);
  console.log('✓ Cron jobs started');
} catch(err) {
  console.error('⚠ Cron error:', err.message);
}

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)));
