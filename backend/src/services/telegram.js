/**
 * Telegram Bot Service - @ClawBidBot
 * Commands: /connect, /pnl, /balance, /deposit, /withdraw, /pause, /resume
 */

const { Telegraf, Markup } = require('telegraf');
const db = require('../db');

let bot;

function init() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.warn('[Telegram] No BOT_TOKEN set, Telegram disabled');
    return;
  }

  bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

  // /start
  bot.start((ctx) => {
    ctx.reply(
      `🦀 *Welcome to ClawBidBot!*\n\n` +
      `I'm your AI agent's dashboard on Telegram.\n\n` +
      `To connect your agent, run:\n` +
      `\`/connect YOUR_WEBHOOK_ID\`\n\n` +
      `Get your webhook ID from: clawbid.io/dashboard`,
      { parse_mode: 'Markdown' }
    );
  });

  // /connect <webhook_id>
  bot.command('connect', async (ctx) => {
    const parts = ctx.message.text.split(' ');
    const webhookId = parts[1];

    if (!webhookId) {
      return ctx.reply('Usage: /connect YOUR_WEBHOOK_ID\n\nFind it at clawbid.io/dashboard');
    }

    try {
      const agent = await db.query(
        `SELECT a.*, w.balance_usdc FROM agents a
         JOIN wallets w ON w.agent_id = a.id
         WHERE a.webhook_id = $1`,
        [webhookId]
      );

      if (agent.rows.length === 0) {
        return ctx.reply('❌ Webhook ID not found. Check clawbid.io/dashboard');
      }

      const ag = agent.rows[0];

      // Save telegram chat id to agent
      await db.query(
        `UPDATE agents SET telegram_chat_id = $1 WHERE webhook_id = $2`,
        [ctx.chat.id, webhookId]
      );

      ctx.reply(
        `✅ *Agent Connected!*\n\n` +
        `🤖 Agent: \`${ag.agent_id}\`\n` +
        `💰 Wallet: \`${ag.wallet_address}\`\n` +
        `💵 Balance: $${parseFloat(ag.balance_usdc).toFixed(2)} USDC\n` +
        `📊 Status: ${ag.status}\n\n` +
        `You'll now receive live trade alerts here!`,
        { parse_mode: 'Markdown', ...Markup.keyboard([
          ['📊 PNL', '💰 Balance'],
          ['⏸ Pause Agent', '▶️ Resume Agent'],
          ['📈 Open Positions', '📋 Trade History']
        ]).resize() }
      );
    } catch (err) {
      ctx.reply('❌ Error connecting agent: ' + err.message);
    }
  });

  // /pnl
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

    ctx.reply(
      `📊 *PNL Report — ${agent.agent_id}*\n\n` +
      `Today:     ${fmt(s.today)}\n` +
      `This Week: ${fmt(s.week)}\n` +
      `All Time:  ${fmt(s.total)}\n\n` +
      `Trades: ${s.trades} · Win Rate: ${winRate}%`,
      { parse_mode: 'Markdown' }
    );
  });

  // /balance
  bot.hears(['💰 Balance', '/balance'], async (ctx) => {
    const agent = await getAgentByChat(ctx.chat.id);
    if (!agent) return ctx.reply('Connect your agent first');

    const wallet = await db.query('SELECT * FROM wallets WHERE agent_id=$1', [agent.id]);
    const w = wallet.rows[0];

    ctx.reply(
      `💰 *Wallet — ${agent.agent_id}*\n\n` +
      `Address: \`${agent.wallet_address}\`\n\n` +
      `Balance:  $${parseFloat(w.balance_usdc).toFixed(2)} USDC\n` +
      `Locked:   $${parseFloat(w.locked_amount).toFixed(2)} USDC\n` +
      `Free:     $${(parseFloat(w.balance_usdc) - parseFloat(w.locked_amount)).toFixed(2)} USDC\n\n` +
      `To deposit: send USDC to your wallet address on Base`,
      { parse_mode: 'Markdown' }
    );
  });

  // Pause / Resume
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

  // Open positions
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

    ctx.reply(`📈 *Open Positions*\n\n${lines}`, { parse_mode: 'Markdown' });
  });

  bot.launch();
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
