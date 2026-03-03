const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// In-memory token store (use Redis in production)
// token -> { status: 'pending'|'confirmed'|'expired', openclaw_key, webhook_id, webhook_url, telegram_username, created_at }
const loginTokens = new Map();

// Cleanup expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of loginTokens.entries()) {
    if (now - data.created_at > 120_000) {
      loginTokens.set(token, { ...data, status: 'expired' });
      // Delete fully after 5 min
      if (now - data.created_at > 300_000) loginTokens.delete(token);
    }
  }
}, 60_000);

/**
 * POST /api/auth/telegram-login-token
 * Called by CLI: clawbid login
 * Returns a short-lived token the user must send to @ClawBidBot
 */
router.post('/telegram-login-token', (req, res) => {
  // Generate short human-readable token: e.g. CB-A3F9-X7KL
  const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
  const token = `CB-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

  loginTokens.set(token, {
    status: 'pending',
    created_at: Date.now(),
    openclaw_key: null,
    webhook_id: null,
    webhook_url: null,
    telegram_username: null,
  });

  console.log(`[Auth] Login token generated: ${token}`);

  res.json({
    token,
    expires_in: 120,
    instruction: `Send to @ClawBidBot on Telegram: /login ${token}`,
  });
});

/**
 * GET /api/auth/telegram-login-poll/:token
 * CLI polls this every 3s waiting for Telegram confirmation
 */
router.get('/telegram-login-poll/:token', (req, res) => {
  const { token } = req.params;
  const data = loginTokens.get(token);

  if (!data) {
    return res.status(404).json({ error: 'Token not found' });
  }

  if (data.status === 'expired') {
    return res.json({ status: 'expired' });
  }

  if (data.status === 'confirmed') {
    // Return credentials — delete token after serving
    loginTokens.delete(token);
    return res.json({
      status: 'confirmed',
      openclaw_key: data.openclaw_key,
      webhook_id: data.webhook_id,
      webhook_url: data.webhook_url,
      telegram_username: data.telegram_username,
    });
  }

  // Still pending
  const elapsed = Math.floor((Date.now() - data.created_at) / 1000);
  res.json({ status: 'pending', elapsed });
});

/**
 * POST /api/auth/telegram-confirm
 * Called internally by Telegram bot when user sends /login <token>
 * NOT exposed publicly — only called by telegram.js service
 */
router.post('/telegram-confirm', async (req, res) => {
  const { token, telegram_chat_id, telegram_username } = req.body;

  const data = loginTokens.get(token);
  if (!data) return res.status(404).json({ error: 'Token not found or expired' });
  if (data.status !== 'pending') return res.status(400).json({ error: `Token already ${data.status}` });

  try {
    // Generate OpenClaw key for this user
    const openclawKey = `ocl_${crypto.randomBytes(24).toString('hex')}`;

    // Get or create user record
    let user = await db.query(`SELECT * FROM users WHERE telegram_chat_id = $1`, [telegram_chat_id]);
    if (user.rows.length === 0) {
      user = await db.query(
        `INSERT INTO users (openclaw_key, telegram_chat_id, telegram_username)
         VALUES ($1, $2, $3) RETURNING *`,
        [openclawKey, telegram_chat_id, telegram_username]
      );
    } else {
      // Update existing user's openclaw key
      await db.query(
        `UPDATE users SET openclaw_key=$1, telegram_username=$2 WHERE telegram_chat_id=$3`,
        [openclawKey, telegram_username, telegram_chat_id]
      );
    }

    const userId = user.rows[0].id;

    // Generate webhook for this user
    const webhookId = crypto.randomBytes(16).toString('hex');
    const webhookUrl = `${process.env.BACKEND_URL || 'https://api.clawbid.site'}/wh/${webhookId}`;

    // Create pending agent
    await db.query(
      `INSERT INTO agents (user_id, agent_id, wallet_address, webhook_id, status)
       VALUES ($1, $2, $3, $4, 'idle')
       ON CONFLICT DO NOTHING`,
      [userId, `pending-${uuidv4().slice(0, 8)}`, '0x0000000000000000000000000000000000000000', webhookId]
    );

    // Confirm the login token
    loginTokens.set(token, {
      ...data,
      status: 'confirmed',
      openclaw_key: openclawKey,
      webhook_id: webhookId,
      webhook_url: webhookUrl,
      telegram_username,
      confirmed_at: Date.now(),
    });

    console.log(`[Auth] Login confirmed for @${telegram_username}, webhook: ${webhookId}`);
    res.json({ ok: true, openclaw_key: openclawKey, webhook_id: webhookId, webhook_url: webhookUrl });

  } catch (err) {
    console.error('[Auth] telegram-confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/verify
 * Verify OpenClaw API key is valid
 */
router.post('/verify', async (req, res) => {
  const { openclaw_key } = req.body;
  if (!openclaw_key || openclaw_key.length < 8) {
    return res.status(400).json({ valid: false, error: 'Invalid key format' });
  }

  try {
    const result = await db.query(`SELECT id FROM users WHERE openclaw_key = $1`, [openclaw_key]);
    res.json({ valid: result.rows.length > 0 });
  } catch {
    res.json({ valid: true }); // fallback
  }
});

// Export loginTokens so telegram.js can call telegram-confirm internally
module.exports = router;
module.exports.loginTokens = loginTokens;
