const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { getAgentLLMStats } = require('../services/llm');

// POST /api/agents/register - create agent record & generate webhook
// Called when user visits dashboard for first time
router.post('/register', async (req, res) => {
  try {
    const webhookId = crypto.randomBytes(16).toString('hex');
    const openapiKey = req.headers['x-openclaw-key'] || req.body.openclaw_key;
    if (!openapiKey) return res.status(400).json({ error: 'openclaw_key required' });

    // Get or create user
    let user = await db.query(`SELECT * FROM users WHERE openclaw_key = $1`, [openapiKey]);
    if (user.rows.length === 0) {
      user = await db.query(
        `INSERT INTO users (openclaw_key) VALUES ($1) RETURNING *`,
        [openapiKey]
      );
    }
    const userId = user.rows[0].id;

    // Create agent with pending wallet (will be filled by SDK on AGENT_INIT)
    const agent = await db.query(
      `INSERT INTO agents (user_id, agent_id, wallet_address, webhook_id, status)
       VALUES ($1, $2, $3, $4, 'idle')
       RETURNING *`,
      [userId, `pending-${uuidv4().slice(0,8)}`, '0x0000000000000000000000000000000000000000', webhookId]
    );

    res.json({
      webhook_id: webhookId,
      webhook_url: `${process.env.BACKEND_URL || 'https://api.clawbid.site'}/wh/${webhookId}`,
      agent_db_id: agent.rows[0].id,
      message: 'Copy webhook_url into your openclaw.config.js and run clawbid init'
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/me - get agent by webhook_id
router.get('/me', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  if (!webhookId) return res.status(400).json({ error: 'x-webhook-id header required' });

  try {
    const result = await db.query(
      `SELECT a.*, w.balance_usdc, w.locked_amount, w.total_deposited, w.total_withdrawn
       FROM agents a
       LEFT JOIN wallets w ON w.agent_id = a.id
       WHERE a.webhook_id = $1`,
      [webhookId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/me/pnl
router.get('/me/pnl', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  try {
    const agent = await db.query(`SELECT id FROM agents WHERE webhook_id=$1`, [webhookId]);
    if (!agent.rows[0]) return res.status(404).json({ error: 'Not found' });
    const agentId = agent.rows[0].id;

    const result = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN DATE(settled_at) = CURRENT_DATE THEN pnl END), 0) as today,
         COALESCE(SUM(CASE WHEN settled_at > NOW()-INTERVAL '7 days' THEN pnl END), 0) as week,
         COALESCE(SUM(pnl), 0) as total,
         COUNT(*) FILTER (WHERE settled=TRUE) as trades,
         COUNT(*) FILTER (WHERE pnl > 0 AND settled=TRUE) as wins,
         COUNT(*) FILTER (WHERE settled=FALSE) as open
       FROM positions WHERE agent_id = $1`,
      [agentId]
    );

    const daily = await db.query(
      `SELECT DATE(settled_at) as date, SUM(pnl) as pnl, COUNT(*) as trades
       FROM positions WHERE agent_id=$1 AND settled=TRUE AND settled_at > NOW()-INTERVAL '30 days'
       GROUP BY DATE(settled_at) ORDER BY date`,
      [agentId]
    );

    res.json({ ...result.rows[0], daily: daily.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/me/positions
router.get('/me/positions', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  const { settled, limit = 20 } = req.query;
  try {
    const agent = await db.query(`SELECT id FROM agents WHERE webhook_id=$1`, [webhookId]);
    if (!agent.rows[0]) return res.status(404).json({ error: 'Not found' });

    const result = await db.query(
      `SELECT p.*, m.asset, m.timeframe, m.question, m.closes_at, m.outcome
       FROM positions p JOIN markets m ON m.id = p.market_id
       WHERE p.agent_id=$1 ${settled !== undefined ? `AND p.settled=${settled}` : ''}
       ORDER BY p.created_at DESC LIMIT $2`,
      [agent.rows[0].id, parseInt(limit)]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/me/llm-stats
router.get('/me/llm-stats', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  try {
    const agent = await db.query(`SELECT id FROM agents WHERE webhook_id=$1`, [webhookId]);
    if (!agent.rows[0]) return res.status(404).json({ error: 'Not found' });
    const stats = await getAgentLLMStats(agent.rows[0].id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents/leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.agent_id, a.wallet_address,
         SUM(p.pnl) as total_pnl,
         COUNT(*) FILTER (WHERE p.pnl > 0) as wins,
         COUNT(*) as total_trades,
         ROUND(COUNT(*) FILTER (WHERE p.pnl > 0)::decimal / NULLIF(COUNT(*),0) * 100, 1) as win_rate
       FROM agents a
       JOIN positions p ON p.agent_id = a.id AND p.settled=TRUE
       GROUP BY a.id
       ORDER BY total_pnl DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
