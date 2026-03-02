require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const WebSocketManager = require('./ws/manager');
const db = require('./db');
const cron = require('./cron');

// Routes
const agentRoutes = require('./routes/agents');
const marketRoutes = require('./routes/markets');
const webhookRoutes = require('./routes/webhook');
const walletRoutes = require('./routes/wallet');
const authRoutes = require('./routes/auth');
const priceRoutes = require('./routes/prices');

const app = express();
const httpServer = createServer(app);

// ── Middleware ──────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true
});
app.use('/api/', limiter);

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/agents',   agentRoutes);
app.use('/api/markets',  marketRoutes);
app.use('/api/wallet',   walletRoutes);
app.use('/api/prices',   priceRoutes);
app.use('/wh',           webhookRoutes);   // webhook receiver (no /api prefix)

app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── WebSocket ───────────────────────────────────────────
const wsManager = new WebSocketManager(httpServer);
app.set('ws', wsManager);

// ── Start ───────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await db.connect();
    console.log('✓ Database connected');

    cron.start(wsManager);
    console.log('✓ Cron jobs started');

    httpServer.listen(PORT, () => {
      console.log(`\n🦀 ClawBid backend running on port ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   WS:     ws://localhost:${PORT}/ws\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start();
