const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../db');

// In-memory token store
// token -> { status, bot_token, bot_info, created_at, ... }
const loginTokens = new Map();

// Cleanup expired tokens every 60s
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of loginTokens.entries()) {
    if (now - data.created_at > 120_000) {
      loginTokens.set(token, { ...data, status: 'expired' });
      if (now - data.created_at > 300_000) loginTokens.delete(token);
    }
  }
}, 60_000);

/**
 * POST /api/auth/telegram-login-token
 * Step 1: CLI minta token login
 * Body: { bot_token: "123456:ABC..." }
 * Flow baru: user input bot token mereka → kita verifikasi ke Telegram API
 *            → kirim pesan konfirmasi ke bot mereka sendiri
 */
router.post('/telegram-login-token', async (req, res) => {
  const { bot_token } = req.body;

  if (!bot_token || !bot_token.includes(':')) {
    return res.status(400).json({ error: 'Bot token required. Format: 123456:ABC...' });
  }

  try {
    // 1. Verifikasi bot token ke Telegram API
    const tgRes = await axios.get(`https://api.telegram.org/bot${bot_token}/getMe`, {
      timeout: 8000
    });

    if (!tgRes.data.ok) {
      return res.status(401).json({ error: 'Invalid bot token. Check your Telegram bot token.' });
    }

    const botInfo = tgRes.data.result;

    // 2. Cek apakah bot ini sudah terdaftar di platform
    const existing = await db.query(
      `SELECT u.*, a.agent_id, a.wallet_address, a.webhook_id 
       FROM users u 
       LEFT JOIN agents a ON a.user_id = u.id AND a.status != 'deleted'
       WHERE u.bot_username = $1 LIMIT 1`,
      [botInfo.username]
    );

    // 3. Generate login token
    const raw = crypto.randomBytes(4).toString('hex').toUpperCase();
    const token = `CB-${raw.slice(0, 4)}-${raw.slice(4, 8)}`;

    // 4. Generate openclaw_key (baru atau reuse yang lama)
    let openclawKey, webhookId, webhookUrl, isNewUser;

    if (existing.rows.length > 0) {
      // User sudah ada — reuse credentials
      const user = existing.rows[0];
      openclawKey = user.openclaw_key;
      webhookId = user.webhook_id || crypto.randomBytes(16).toString('hex');
      webhookUrl = `${process.env.BACKEND_URL || 'https://api.clawbid.site'}/wh/${webhookId}`;
      isNewUser = false;
    } else {
      // User baru
      openclawKey = `ocl_${crypto.randomBytes(24).toString('hex')}`;
      webhookId = crypto.randomBytes(16).toString('hex');
      webhookUrl = `${process.env.BACKEND_URL || 'https://api.clawbid.site'}/wh/${webhookId}`;
      isNewUser = true;
    }

    // 5. Simpan token ke memory
    loginTokens.set(token, {
      status: 'pending',
      created_at: Date.now(),
      bot_token,
      bot_username: botInfo.username,
      bot_id: botInfo.id,
      bot_first_name: botInfo.first_name,
      openclaw_key: openclawKey,
      webhook_id: webhookId,
      webhook_url: webhookUrl,
      is_new_user: isNewUser,
    });

    // 6. Kirim pesan konfirmasi ke bot milik user itu sendiri
    //    Caranya: kirim via getUpdates dulu untuk dapat chat_id owner
    //    ATAU user harus /start bot mereka sendiri dulu
    //    Kita pakai pendekatan: kirim ke bot mereka, mereka konfirmasi lewat bot mereka
    
    // Coba kirim ke owner bot (dari update terakhir)
    let ownerChatId = null;
    try {
      const updates = await axios.get(`https://api.telegram.org/bot${bot_token}/getUpdates?limit=1`, {
        timeout: 5000
      });
      if (updates.data.ok && updates.data.result.length > 0) {
        ownerChatId = updates.data.result[0].message?.chat?.id || 
                      updates.data.result[0].callback_query?.from?.id;
      }
    } catch {}

    if (ownerChatId) {
      // Kirim pesan konfirmasi ke bot mereka sendiri
      await axios.post(`https://api.telegram.org/bot${bot_token}/sendMessage`, {
        chat_id: ownerChatId,
        text: 
          `🦀 *ClawBid Login Request*\n\n` +
          `Token: \`${token}\`\n\n` +
          `${isNewUser ? '✨ Akun baru akan dibuat untuk bot ini.' : '♻️ Menggunakan akun yang sudah ada.'}\n\n` +
          `Ketik /confirm ${token} untuk konfirmasi login\n` +
          `Atau /deny untuk tolak`,
        parse_mode: 'Markdown'
      }, { timeout: 5000 });

      loginTokens.set(token, { ...loginTokens.get(token), owner_chat_id: ownerChatId });
    }

    console.log(`[Auth] Login token ${token} for bot @${botInfo.username} (new: ${isNewUser})`);

    res.json({
      token,
      expires_in: 120,
      bot_username: botInfo.username,
      bot_name: botInfo.first_name,
      is_new_user: isNewUser,
      message_sent: !!ownerChatId,
      instruction: ownerChatId
        ? `Cek bot @${botInfo.username} kamu di Telegram dan ketik /confirm ${token}`
        : `Buka bot @${botInfo.username} kamu di Telegram, lalu ketik /confirm ${token}`,
    });

  } catch (err) {
    if (err.response?.status === 401 || err.response?.data?.error_code === 401) {
      return res.status(401).json({ error: 'Invalid bot token' });
    }
    console.error('[Auth] login-token error:', err.message);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

/**
 * GET /api/auth/telegram-login-poll/:token
 * CLI polling setiap 3s
 */
router.get('/telegram-login-poll/:token', (req, res) => {
  const { token } = req.params;
  const data = loginTokens.get(token);

  if (!data) return res.status(404).json({ error: 'Token not found' });
  if (data.status === 'expired') return res.json({ status: 'expired' });

  if (data.status === 'confirmed') {
    loginTokens.delete(token);
    return res.json({
      status: 'confirmed',
      openclaw_key: data.openclaw_key,
      webhook_id: data.webhook_id,
      webhook_url: data.webhook_url,
      bot_username: data.bot_username,
      is_new_user: data.is_new_user,
    });
  }

  const elapsed = Math.floor((Date.now() - data.created_at) / 1000);
  res.json({ status: 'pending', elapsed, bot_username: data.bot_username });
});

/**
 * POST /api/auth/bot-confirm
 * Dipanggil oleh bot user ketika mereka ketik /confirm <token>
 * Bot mereka kirim request ke endpoint ini via webhook atau kita handle di bot service
 */
router.post('/bot-confirm', async (req, res) => {
  const { token, bot_token, chat_id } = req.body;

  const data = loginTokens.get(token);
  if (!data) return res.status(404).json({ error: 'Token not found or expired' });
  if (data.status !== 'pending') return res.status(400).json({ error: `Token already ${data.status}` });

  // Verifikasi bahwa bot_token cocok
  if (data.bot_token !== bot_token) {
    return res.status(401).json({ error: 'Bot token mismatch' });
  }

  try {
    // Simpan atau update user di database
    let userId;
    const existing = await db.query(
      `SELECT id FROM users WHERE bot_username = $1`,
      [data.bot_username]
    );

    if (existing.rows.length === 0) {
      // User baru — insert
      const newUser = await db.query(
        `INSERT INTO users (openclaw_key, bot_token, bot_username, bot_id, telegram_chat_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [data.openclaw_key, data.bot_token, data.bot_username, data.bot_id, chat_id]
      );
      userId = newUser.rows[0].id;
    } else {
      // Update existing
      userId = existing.rows[0].id;
      await db.query(
        `UPDATE users SET openclaw_key=$1, bot_token=$2, telegram_chat_id=$3 WHERE id=$4`,
        [data.openclaw_key, data.bot_token, chat_id, userId]
      );
    }

    // Create/update agent record
    await db.query(
      `INSERT INTO agents (user_id, agent_id, wallet_address, webhook_id, status)
       VALUES ($1, $2, $3, $4, 'idle')
       ON CONFLICT (webhook_id) DO UPDATE SET user_id=$1`,
      [userId, `agent-${data.bot_username}`, '0x0000000000000000000000000000000000000000', data.webhook_id]
    );

    // Konfirmasi token
    loginTokens.set(token, { ...data, status: 'confirmed', confirmed_at: Date.now(), owner_chat_id: chat_id });

    // Kirim pesan sukses ke bot mereka
    await axios.post(`https://api.telegram.org/bot${data.bot_token}/sendMessage`, {
      chat_id,
      text:
        `✅ *Login Berhasil!*\n\n` +
        `Terminal kamu sudah terautentikasi.\n\n` +
        `🔑 OpenClaw Key:\n\`${data.openclaw_key}\`\n\n` +
        `🔗 Webhook ID:\n\`${data.webhook_id}\`\n\n` +
        `*Lanjutkan di terminal:*\n` +
        `\`\`\`\nclawbid init my-agent\n\`\`\``,
      parse_mode: 'Markdown'
    }, { timeout: 5000 }).catch(() => {});

    console.log(`[Auth] Login confirmed for bot @${data.bot_username}`);
    res.json({ ok: true });

  } catch (err) {
    console.error('[Auth] bot-confirm error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/auth/verify
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
    res.json({ valid: true });
  }
});

module.exports = router;
module.exports.loginTokens = loginTokens;
