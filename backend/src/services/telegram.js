/**
 * Telegram Bot Service - @ClawBidBot
 * Commands: /login, /connect, /pnl, /balance, /deposit, /withdraw, /pause, /resume
 *
 * NEW: /login <token> — authenticate CLI via Telegram
 *      User runs `clawbid login` in terminal, gets a token,
 *      sends /login <token> here → CLI gets openclaw_key + webhook_id automatically
 */

const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const db = require('../db');

let bot;

// Reference to the auth router's loginTokens map (set during init)
let loginTokens = null;

function init(app) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] No BOT_TOKEN set, Telegram disabled');
    return;
  }

  // Get loginTokens from auth route
  try {
    const authRoute = require('../routes/auth');
    loginTokens = authRoute.loginTokens;
  } catch (err) {
    console.warn('[Telegram] Could not load loginTokens from auth route:', err.message);
  }

  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';

  // /start
  bot.start((ctx) => {
    ctx.replyWithMarkdown(
      `🦀 *Welcome to ClawBidBot!*\n\n` +
      `I'm your AI agent's dashboard on Telegram.\n\n` +
      `*Quick Start — 2 ways to connect:*\n\n` +
      `*Option 1 — Login from terminal (recommended):*\n` +
      `\`\`\`\nnpm install -g clawbid-agent\nclawbid login\n\`\`\`\n` +
      `Then send the token here: \`/login CB-XXXX-XXXX\`\n\n` +
      `*Option 2 — Manual:*\n` +
      `Get webhook at clawbid.site/dashboard, then:\n` +
      `\`/connect YOUR_WEBHOOK_ID\``
    );
  });

  // ── /login <token> ───────────────────────────────────────────────────────
  // Core new feature: CLI sends token, user confirms here
  bot.command('login', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const token = parts[1]?.toUpperCase().trim();

    if (!token) {
      return ctx.replyWithMarkdown(
        `*Usage:* \`/login CB-XXXX-XXXX\`\n\n` +
        `Get your token by running:\n` +
        `\`\`\`\nclawbid login\n\`\`\`\n` +
        `in your terminal.`
      );
    }

    // Validate token format
    if (!/^CB-[A-F0-9]{4}-[A-F0-9]{4}$/.test(token)) {
      return ctx.reply('❌ Invalid token format. Expected: CB-XXXX-XXXX');
    }

    const spinner = await ctx.reply('⏳ Verifying token...');

    try {
      // Call auth confirm endpoint internally
      const res = await axios.post(`${BACKEND_URL}/api/auth/telegram-confirm`, {
        token,
        telegram_chat_id: ctx.chat.id,
        telegram_username: ctx.from.username || ctx.from.first_name,
      }, { timeout: 10000 });

      const { openclaw_key, webhook_id, webhook_url } = res.data;

      // Edit the spinner message
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        spinner.message_id,
        null,
        `✅ *Login Confirmed!*\n\n` +
        `Your terminal should auto-complete now.\n\n` +
        `🔑 *OpenClaw Key:*\n\`${openclaw_key}\`\n\n` +
        `🔗 *Webhook ID:*\n\`${webhook_id}\`\n\n` +
        `📋 *Webhook URL:*\n\`${webhook_url}\`\n\n` +
        `_These are also saved automatically in your terminal._\n\n` +
        `*Next step in terminal:*\n` +
        `\`\`\`\nclawbid init my-agent\n\`\`\``,
        { parse_mode: 'Markdown' }
      );

    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || err.message;

      let userMsg = '❌ ';
      if (status === 404) userMsg += 'Token not found or expired. Run `clawbid login` again.';
      else if (status === 400) userMsg += msg;
      else userMsg += 'Server error. Try again in a moment.';

      await ctx.telegram.editMessageText(ctx.chat.id, spinner.message_id, null, userMsg);
    }
  });

  // ── /connect <webhook_id> ────────────────────────────────────────────────
  bot.command('connect', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const webhookId = parts[1];

    if (!webhookId) {
      return ctx.reply('Usage: /connect YOUR_WEBHOOK_ID\n\nFind it at clawbid.site/dashboard or run: clawbid login');
    }

    try {
      const agent = await db.query(
        `SELECT a.*, w.balance_usdc FROM agents a
         LEFT JOIN wallets w ON w.agent_id = a.id
         WHERE a.webhook_id = $1`,
        [webhookId]
      );

      if (agent.rows.length === 0) {
        return ctx.reply('❌ Webhook ID not found.\n\nRun `clawbid login` in your terminal to get one automatically.');
      }

      const ag = agent.rows[0];

      await db.query(
        `UPDATE agents SET telegram_chat_id = $1 WHERE webhook_id = $2`,
        [ctx.chat.id, webhookId]
      );

      ctx.replyWithMarkdown(
        `✅ *Agent Connected!*\n\n` +
        `🤖 Agent: \`${ag.agent_id}\`\n` +
        `💰 Wallet: \`${ag.wallet_address}\`\n` +
        `💵 Balance: $${parseFloat(ag.balance_usdc || 0).toFixed(2)} USDC\n` +
        `📊 Status: ${ag.status}\n\n` +
        `You'll now receive live trade alerts here!`,
        Markup.keyboard([
          ['📊 PNL', '💰 Balance'],
          ['⏸ Pause Agent', '▶️ Resume Agent'],
          ['📈 Open Positions', '📋 Trade History']
        ]).resize()
      );
    } catch (err) {
      ctx.reply('❌ Error connecting agent: ' + err.message);
    }
  });

  // ── /pnl ─────────────────────────────────────────────────────────────────
  bot.hears(['📊 PNL', '/pnl'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first with /connect WEBHOOK_ID');

    const stats = await db.query(
      `SELECT
         COALESCE(SUM(CASE WHEN DATE(settled_at) = CURRENT_DATE THEN pnl END), 0) as today,
         COALESCE(SUM(CASE WHEN settled_at > NOW()-INTERVAL '7 days' THEN pnl END), 0) as week,
         COALESCE(SUM(pnl), 0) as total,
         COUNT(*) FILTER (WHERE settled=TRUE) as trades,
         COUNT(*) FILTER (WHERE pnl > 0 AND settled=TRUE) as wins
       FROM positions WHERE agent_id = $1`,
      [agent.id]
    );
    const s = stats.rows[0];
    const winRate = s.trades > 0 ? ((s.wins / s.trades) * 100).toFixed(0) : '0';

    ctx.replyWithMarkdown(
      `📊 *PNL Report — ${agent.agent_id}*\n\n` +
      `Today:     ${fmt(s.today)}\n` +
      `This Week: ${fmt(s.week)}\n` +
      `All Time:  ${fmt(s.total)}\n\n` +
      `Trades: ${s.trades} · Win Rate: ${winRate}%`
    );
  });

  // ── /balance ──────────────────────────────────────────────────────────────
  bot.hears(['💰 Balance', '/balance'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first');

    const wallet = await db.query('SELECT * FROM wallets WHERE agent_id=$1', [agent.id]);
    const w = wallet.rows[0];
    if (!w) return ctx.reply('Wallet not yet initialized. Run: clawbid init');

    ctx.replyWithMarkdown(
      `💰 *Wallet — ${agent.agent_id}*\n\n` +
      `Address: \`${agent.wallet_address}\`\n\n` +
      `Balance:  $${parseFloat(w.balance_usdc || 0).toFixed(2)} USDC\n` +
      `Locked:   $${parseFloat(w.locked_amount || 0).toFixed(2)} USDC\n` +
      `Free:     $${(parseFloat(w.balance_usdc || 0) - parseFloat(w.locked_amount || 0)).toFixed(2)} USDC\n\n` +
      `To deposit: send USDC on Base network to your wallet address`
    );
  });

  // ── Pause / Resume ────────────────────────────────────────────────────────
  bot.hears(['⏸ Pause Agent', '/pause'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first');
    await db.query(`UPDATE agents SET status='idle' WHERE id=$1`, [agent.id]);
    ctx.reply('⏸ Agent paused. No new positions will be opened.');
  });

  bot.hears(['▶️ Resume Agent', '/resume'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first');
    await db.query(`UPDATE agents SET status='active' WHERE id=$1`, [agent.id]);
    ctx.reply('▶️ Agent resumed. Trading autonomously again.');
  });

  // ── Open Positions ────────────────────────────────────────────────────────
  bot.hears(['📈 Open Positions', '/positions'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first');

    const pos = await db.query(
      `SELECT p.*, m.asset, m.timeframe, m.closes_at
       FROM positions p JOIN markets m ON m.id = p.market_id
       WHERE p.agent_id=$1 AND p.settled=FALSE
       ORDER BY p.created_at DESC LIMIT 5`,
      [agent.id]
    );

    if (pos.rows.length === 0) return ctx.reply('No open positions');

    const lines = pos.rows.map(p =>
      `${p.asset}/${p.timeframe} · ${p.direction.toUpperCase()} · $${parseFloat(p.amount_usdc).toFixed(2)}`
    ).join('\n');

    ctx.replyWithMarkdown(`📈 *Open Positions*\n\n${lines}`);
  });

  // ── Help ──────────────────────────────────────────────────────────────────
  bot.command('help', (ctx) => {
    ctx.replyWithMarkdown(
      `🦀 *ClawBidBot Commands*\n\n` +
      `*Authentication:*\n` +
      `\`/login CB-XXXX-XXXX\` — Login from terminal\n` +
      `\`/connect WEBHOOK_ID\` — Connect existing agent\n\n` +
      `*Agent Info:*\n` +
      `\`/pnl\` — P&L report\n` +
      `\`/balance\` — Wallet balance\n` +
      `\`/positions\` — Open positions\n\n` +
      `*Control:*\n` +
      `\`/pause\` — Pause agent\n` +
      `\`/resume\` — Resume agent\n\n` +
      `*Terminal commands:*\n` +
      `\`\`\`\nclawbid login       # login via Telegram\nclawbid init        # setup agent\nclawbid start       # start trading\nclawbid status      # check status\nclawbid whoami      # show credentials\n\`\`\``
    );
  });

  // Launch bot with conflict retry
  const launchBot = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        await bot.launch({ dropPendingUpdates: true });
        console.log('[Telegram] Bot launched successfully');
        return;
      } catch (err) {
        if (err.message?.includes('409')) {
          console.warn(`[Telegram] 409 conflict, retry ${i + 1}/${retries} in 15s...`);
          await new Promise(r => setTimeout(r, 15000));
        } else {
          console.error('[Telegram] Launch error:', err.message);
          return;
        }
      }
    }
    console.warn('[Telegram] Could not launch after retries, bot disabled');
  };

  launchBot();

  process.once('SIGINT', () => { try { bot.stop('SIGINT'); } catch (e) {} });
  process.once('SIGTERM', () => { try { bot.stop('SIGTERM'); } catch (e) {} });

  console.log('✓ Telegram bot started');
}

async function notifyTrade(chatId, { asset, direction, amount, confidence, timeframe, reasoning }) {
  if (!bot || !chatId) return;
  const emoji = direction === 'YES' ? '🟢' : '🔴';
  try {
    await bot.telegram.sendMessage(chatId,
      `${emoji} *New Trade*\n\n` +
      `${asset}/${timeframe} → ${direction}\n` +
      `Amount: $${parseFloat(amount).toFixed(2)} USDC\n` +
      `Confidence: ${confidence}%\n` +
      `\n_${reasoning}_`,
      { parse_mode: 'Markdown' }
    );
  } catch {}
}

async function notifySettlement(chatId, { asset, direction, pnl, outcome }) {
  if (!bot || !chatId) return;
  const won = direction === outcome;
  const emoji = won ? '✅' : '❌';
  try {
    await bot.telegram.sendMessage(chatId,
      `${emoji} *Market Settled*\n\n` +
      `${asset} · Your call: ${direction.toUpperCase()}\n` +
      `Outcome: ${outcome.toUpperCase()}\n` +
      `PNL: ${fmt(pnl)}`,
      { parse_mode: 'Markdown' }
    );
  } catch {}
}

async function getAgentByChat(chatId) {
  const result = await db.query(
    `SELECT a.* FROM agents a WHERE a.telegram_chat_id = $1`,
    [chatId]
  );
  return result.rows[0] || null;
}

function fmt(val) {
  const n = parseFloat(val);
  return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);
}

module.exports = { init, notifyTrade, notifySettlement };
