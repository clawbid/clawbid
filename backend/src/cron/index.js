/**
 * Cron Jobs
 * - Every 30s:  Fetch price feeds from Binance
 * - Every 30m:  Create new markets
 * - Every 1m:   Check and resolve expired markets
 * - Every 2m:   Run agent trading cycle
 */

const cron = require('node-cron');
const db = require('./db');
const axios = require('axios');
const { createMarkets, resolveMarket } = require('./services/market');
const { runTradingCycle } = require('./services/agent');
const TelegramService = require('./services/telegram');

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ADA', 'MATIC', 'LINK'];

async function fetchPrices(wsManager) {
  try {
    const symbols = ASSETS.map(a => `${a}USDT`).join(',');
    const res = await axios.get(
      `https://api.binance.com/api/v3/ticker/price?symbols=["${ASSETS.map(a => `${a}USDT`).join('","')}"]`,
      { timeout: 5000 }
    );

    const inserts = [];
    const priceMap = {};
    for (const item of res.data) {
      const asset = item.symbol.replace('USDT', '');
      if (!ASSETS.includes(asset)) continue;
      inserts.push(`('${asset}', ${parseFloat(item.price)}, 'binance', NOW())`);
      priceMap[asset] = parseFloat(item.price);
    }

    if (inserts.length > 0) {
      await db.query(`INSERT INTO price_feeds (asset, price, source, ts) VALUES ${inserts.join(',')}`);
      // Prune old price data (keep 48h)
      await db.query(`DELETE FROM price_feeds WHERE ts < NOW() - INTERVAL '48 hours'`);
    }

    // Broadcast prices to all WS clients
    if (wsManager) {
      wsManager.broadcast({ type: 'PRICES', data: priceMap });
    }
  } catch (err) {
    console.error('[Cron] Price fetch error:', err.message);
  }
}

async function checkAndResolveMarkets(wsManager) {
  try {
    const expired = await db.query(
      `SELECT id, asset FROM markets WHERE resolved=FALSE AND closes_at <= NOW()`
    );

    for (const market of expired.rows) {
      try {
        const result = await resolveMarket(market.id);
        if (!result) continue;

        console.log(`[Cron] Resolved market ${market.id}: ${market.asset} → ${result.outcome}`);

        // Broadcast market resolution
        if (wsManager) {
          wsManager.broadcast({
            type: 'MARKET_RESOLVED',
            marketId: market.id,
            outcome: result.outcome,
            finalPrice: result.finalPrice,
          });
        }

        // Notify affected agents via Telegram
        const agents = await db.query(
          `SELECT DISTINCT a.telegram_chat_id, p.direction, p.pnl
           FROM positions p JOIN agents a ON a.id = p.agent_id
           WHERE p.market_id = $1 AND p.settled = TRUE AND a.telegram_chat_id IS NOT NULL`,
          [market.id]
        );

        for (const ag of agents.rows) {
          await TelegramService.notifySettlement(ag.telegram_chat_id, {
            asset: market.asset,
            direction: ag.direction,
            pnl: ag.pnl,
            outcome: result.outcome,
          });
        }

      } catch (err) {
        console.error(`[Cron] Resolve error for ${market.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Cron] Resolution check error:', err.message);
  }
}

function start(wsManager) {
  // Price feeds: every 30 seconds
  cron.schedule('*/30 * * * * *', () => fetchPrices(wsManager));

  // Create new markets: every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    try {
      const created = await createMarkets();
      if (created.length > 0) {
        console.log(`[Cron] Created ${created.length} new markets`);
        if (wsManager) wsManager.broadcast({ type: 'MARKETS_CREATED', count: created.length });
      }
    } catch (err) {
      console.error('[Cron] Market creation error:', err.message);
    }
  });

  // Resolve expired markets: every minute
  cron.schedule('* * * * *', () => checkAndResolveMarkets(wsManager));

  // Agent trading cycle: every 2 minutes
  cron.schedule('*/2 * * * *', () => runTradingCycle(wsManager));

  // Init: run immediately on startup
  setTimeout(() => {
    fetchPrices(wsManager);
    createMarkets().then(c => c.length > 0 && console.log(`[Init] Created ${c.length} markets`));
  }, 3000);

  // Init Telegram
  TelegramService.init();
}

module.exports = { start };
