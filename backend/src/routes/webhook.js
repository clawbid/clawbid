/**
 * Webhook Routes
 * Handles: agent events, bot /confirm command dari user bot mereka
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');
const db = require('../db');

// Import loginTokens dari auth
let loginTokens = null;
try {
  const authRoute = require('./auth');
  loginTokens = authRoute.loginTokens;
} catch {}

/**
 * POST /wh/:webhookId
 * Main agent webhook — terima events dari SDK
 */
router.post('/:webhookId', async (req, res) => {
  const { webhookId } = req.params;
  const { event } = req.body;

  // Handle Telegram bot webhook (untuk /confirm dari bot user)
  // Format: POST /wh/tgbot-<bot_id>
  if (webhookId.startsWith('tgbot-')) {
    return handleTelegramWebhook(req, res, webhookId);
  }

  try {
    const agent = await db.query(
      `SELECT a.*, u.openclaw_key FROM agents a
       JOIN users u ON u.id = a.user_id
       WHERE a.webhook_id = $1`,
      [webhookId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const ag = agent.rows[0];

    switch (event) {
      case 'AGENT_INIT':
        await handleAgentInit(req.body, ag, webhookId);
        break;
      case 'HEARTBEAT':
        await db.query(`UPDATE agents SET last_ping=NOW() WHERE webhook_id=$1`, [webhookId]);
        break;
      case 'SKILLS_UPDATE':
        await db.query(
          `UPDATE agents SET skills=$1 WHERE webhook_id=$2`,
          [JSON.stringify(req.body.skills || []), webhookId]
        );
        break;
      case 'LLM_CONFIG':
        await db.query(
          `UPDATE agents SET llm_model=$1 WHERE webhook_id=$2`,
          [req.body.model, webhookId]
        );
        break;
      default:
        console.log(`[Webhook] Unknown event: ${event} for ${webhookId}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

async function handleAgentInit(body, ag, webhookId) {
  const { agent_id, wallet_address, llm_model } = body;
  await db.query(
    `UPDATE agents SET agent_id=$1, wallet_address=$2, llm_model=$3, status='idle', last_ping=NOW()
     WHERE webhook_id=$4`,
    [agent_id, wallet_address, llm_model || 'claude-sonnet-4-6', webhookId]
  );

  // Create wallet record if not exists
  await db.query(
    `INSERT INTO wallets (agent_id, wallet_address, balance_usdc)
     SELECT id, $1, 0 FROM agents WHERE webhook_id=$2
     ON CONFLICT DO NOTHING`,
    [wallet_address, webhookId]
  );
}

/**
 * Handle Telegram webhook dari bot user
 * Ini dipanggil ketika user ketik /confirm <token> di bot mereka sendiri
 */
async function handleTelegramWebhook(req, res, webhookId) {
  const update = req.body;
  res.json({ ok: true }); // Selalu reply 200 ke Telegram

  const message = update.message;
  if (!message?.text) return;

  const text = message.text.trim();
  const chatId = message.chat.id;

  // Handle /confirm <token>
  if (text.startsWith('/confirm ') || text.startsWith('/confirm@')) {
    const parts = text.split(' ');
    const token = parts[1]?.toUpperCase().trim();

    if (!token || !loginTokens) return;

    const data = loginTokens.get(token);
    if (!data) {
      // Token tidak ditemukan
      const botToken = webhookId.replace('tgbot-', '').replace(/-/g, ':');
      await sendTelegramMsg(botToken, chatId, '❌ Token tidak ditemukan atau sudah expired.\n\nJalankan `clawbid login` lagi di terminal.');
      return;
    }

    // Konfirmasi via internal API
    try {
      await axios.post(`${process.env.BACKEND_URL || 'http://localhost:4000'}/api/auth/bot-confirm`, {
        token,
        bot_token: data.bot_token,
        chat_id: chatId,
      }, { timeout: 10000 });
    } catch (err) {
      console.error('[TgWebhook] confirm error:', err.message);
    }
    return;
  }

  // Handle /deny
  if (text.startsWith('/deny')) {
    const parts = text.split(' ');
    const token = parts[1]?.toUpperCase().trim();
    if (token && loginTokens?.has(token)) {
      loginTokens.set(token, { ...loginTokens.get(token), status: 'expired' });
      const botToken = webhookId.replace('tgbot-', '').replace(/-/g, ':');
      await sendTelegramMsg(botToken, chatId, '🚫 Login request ditolak.');
    }
    return;
  }
}

async function sendTelegramMsg(botToken, chatId, text) {
  try {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown'
    }, { timeout: 5000 });
  } catch {}
}

module.exports = router;
