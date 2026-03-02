/**
 * Agent Trading Engine
 * The autonomous loop: fetch markets → analyze via LLM → place bids
 * Runs for all connected agents on each market cycle
 */

const db = require('../db');
const { analyzeMarket } = require('./llm');
const { buyShares, getActiveMarkets } = require('./market');

/**
 * Run the trading loop for all active agents
 */
async function runTradingCycle(wsManager) {
  const agents = await db.query(
    `SELECT a.*, w.balance_usdc, w.locked_amount
     FROM agents a
     JOIN wallets w ON w.agent_id = a.id
     WHERE a.status = 'active'
     AND a.last_ping > NOW() - INTERVAL '5 minutes'`
  );

  if (agents.rows.length === 0) return;

  const markets = await getActiveMarkets();
  if (markets.length === 0) return;

  console.log(`[Trading] Cycle: ${agents.rows.length} agents × ${markets.length} markets`);

  for (const agent of agents.rows) {
    if (!agent.skills || agent.skills.length === 0) continue;

    const available = parseFloat(agent.balance_usdc) - parseFloat(agent.locked_amount);
    if (available < 1) continue; // Min $1 balance

    for (const market of markets) {
      try {
        await analyzeAndBid(agent, market, available, wsManager);
      } catch (err) {
        console.error(`[Agent ${agent.agent_id}] Error on market ${market.id}:`, err.message);
      }
    }
  }
}

async function analyzeAndBid(agent, market, availableBalance, wsManager) {
  // Check if agent already has position in this market
  const existing = await db.query(
    `SELECT id FROM positions WHERE agent_id=$1 AND market_id=$2 AND settled=FALSE`,
    [agent.id, market.id]
  );
  if (existing.rows.length > 0) return; // Already positioned

  // Get price history
  const priceHistory = await db.query(
    `SELECT price, ts FROM price_feeds
     WHERE asset = $1 AND ts > NOW() - INTERVAL '2 hours'
     ORDER BY ts DESC LIMIT 20`,
    [market.asset]
  );

  // Get best skill for this asset
  const skill = getBestSkill(agent.skills, market.asset, market.timeframe);
  if (!skill) return;

  // Analyze via Bankr LLM Gateway
  const analysis = await analyzeMarket({
    skill: skill.content,
    market,
    priceHistory: priceHistory.rows,
    agentId: agent.id,
    model: agent.llm_model || 'claude-sonnet-4-6',
  });

  if (analysis.decision === 'skip' || analysis.confidence < 0.55) return;

  // Size the position
  const maxBet = availableBalance * (analysis.amount_pct || 0.03);
  const betAmount = Math.min(maxBet, availableBalance * 0.05, 500); // Hard cap $500
  if (betAmount < 0.5) return;

  // Place the bid
  const position = await buyShares({
    agentId: agent.id,
    marketId: market.id,
    direction: analysis.decision,
    amountUsdc: betAmount,
  });

  // Broadcast to WebSocket for live dashboard update
  if (wsManager) {
    wsManager.broadcastToAgent(agent.id, {
      type: 'NEW_POSITION',
      position: {
        ...position,
        market_asset: market.asset,
        market_question: market.question,
        market_timeframe: market.timeframe,
        analysis_confidence: analysis.confidence,
        llm_model: analysis.model_used,
      }
    });
  }

  // Send Telegram notification
  if (agent.telegram_chat_id) {
    const TelegramService = require('./telegram');
    await TelegramService.notifyTrade(agent.telegram_chat_id, {
      asset: market.asset,
      direction: analysis.decision.toUpperCase(),
      amount: betAmount,
      confidence: (analysis.confidence * 100).toFixed(0),
      timeframe: market.timeframe,
      reasoning: analysis.reasoning,
    });
  }

  return position;
}

/**
 * Pick the best skill for the given asset/timeframe
 * Skills are stored as [{name, content, assets, timeframes}]
 */
function getBestSkill(skills, asset, timeframe) {
  if (!Array.isArray(skills) || skills.length === 0) return null;

  // Try exact match first
  const exact = skills.find(s =>
    s.assets?.includes(asset) && s.timeframes?.includes(timeframe)
  );
  if (exact) return exact;

  // Asset match
  const assetMatch = skills.find(s => s.assets?.includes(asset));
  if (assetMatch) return assetMatch;

  // Use first available skill as fallback
  return skills[0];
}

module.exports = { runTradingCycle };
