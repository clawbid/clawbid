/**
 * Market Service
 * Handles: AMM pricing, market creation, resolution via Pyth oracle
 */

const db = require('../db');
const axios = require('axios');

const ASSETS = ['BTC', 'ETH', 'SOL', 'BNB', 'AVAX', 'ADA', 'MATIC', 'LINK'];
const TIMEFRAMES = ['30m', '1h', '6h', '12h'];

// Timeframe → milliseconds
const TF_MS = { '30m': 30*60*1000, '1h': 60*60*1000, '6h': 6*60*60*1000, '12h': 12*60*60*1000 };

/**
 * LMSR Automated Market Maker
 * Cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 */
function lmsrPrice(yesShares, noShares, b = 100) {
  const eY = Math.exp(yesShares / b);
  const eN = Math.exp(noShares / b);
  return eY / (eY + eN);
}

function lmsrCost(yesShares, noShares, b = 100) {
  return b * Math.log(Math.exp(yesShares / b) + Math.exp(noShares / b));
}

/**
 * Get current price for an asset from Binance
 */
async function getCurrentPrice(asset) {
  try {
    const symbol = `${asset}USDT`;
    const res = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, { timeout: 5000 });
    return parseFloat(res.data.price);
  } catch {
    // Fallback to CoinGecko
    const ids = { BTC:'bitcoin', ETH:'ethereum', SOL:'solana', BNB:'binancecoin', AVAX:'avalanche-2', ADA:'cardano' };
    const id = ids[asset];
    if (!id) return null;
    const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, { timeout: 5000 });
    return res.data[id]?.usd || null;
  }
}

/**
 * Create markets for all assets × timeframes
 * Called by cron job every 30 minutes
 */
async function createMarkets() {
  const created = [];
  for (const asset of ASSETS) {
    const price = await getCurrentPrice(asset);
    if (!price) continue;

    for (const tf of TIMEFRAMES) {
      const closesAt = new Date(Date.now() + TF_MS[tf]);

      // Check if market already exists for this asset+timeframe window
      const existing = await db.query(
        `SELECT id FROM markets WHERE asset=$1 AND timeframe=$2 AND closes_at > NOW() AND resolved=FALSE LIMIT 1`,
        [asset, tf]
      );
      if (existing.rows.length > 0) continue;

      // Target price: current price (question is "will it be higher?")
      const question = `Will ${asset} be above $${price.toLocaleString('en-US', { maximumFractionDigits: 2 })} in ${tf}?`;

      const result = await db.query(
        `INSERT INTO markets (asset, question, timeframe, target_price, closes_at)
         VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [asset, question, tf, price, closesAt]
      );
      created.push({ id: result.rows[0].id, asset, tf });
    }
  }
  return created;
}

/**
 * Buy shares in a market (AMM)
 */
async function buyShares({ agentId, marketId, direction, amountUsdc }) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Get market
    const mkt = await client.query('SELECT * FROM markets WHERE id=$1 FOR UPDATE', [marketId]);
    const market = mkt.rows[0];
    if (!market || market.resolved) throw new Error('Market closed or not found');
    if (new Date(market.closes_at) < new Date()) throw new Error('Market expired');

    // Get wallet
    const wal = await client.query(
      'SELECT * FROM wallets WHERE agent_id=$1 FOR UPDATE',
      [agentId]
    );
    const wallet = wal.rows[0];
    if (!wallet) throw new Error('Wallet not found');

    const available = parseFloat(wallet.balance_usdc) - parseFloat(wallet.locked_amount);
    if (available < amountUsdc) throw new Error(`Insufficient balance: $${available.toFixed(2)} available`);

    // Calculate shares via LMSR
    const yesShares = parseFloat(market.yes_pool);
    const noShares = parseFloat(market.no_pool);

    const beforeCost = lmsrCost(yesShares, noShares);
    let newYes = yesShares, newNo = noShares;

    // Binary search for shares
    let lo = 0, hi = amountUsdc * 10;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (direction === 'yes') newYes = yesShares + mid;
      else newNo = noShares + mid;
      const cost = lmsrCost(newYes, newNo) - beforeCost;
      if (Math.abs(cost - amountUsdc) < 0.0001) break;
      if (cost < amountUsdc) lo = mid; else hi = mid;
    }

    const shares = direction === 'yes' ? newYes - yesShares : newNo - noShares;
    const entryPrice = lmsrPrice(
      direction === 'yes' ? newYes : yesShares,
      direction === 'yes' ? noShares : newNo
    );

    // Update market pools
    await client.query(
      `UPDATE markets SET yes_pool=$1, no_pool=$2 WHERE id=$3`,
      [newYes, newNo, marketId]
    );

    // Lock funds in wallet
    await client.query(
      `UPDATE wallets SET locked_amount = locked_amount + $1 WHERE agent_id = $2`,
      [amountUsdc, agentId]
    );

    // Create position
    const pos = await client.query(
      `INSERT INTO positions (agent_id, market_id, direction, amount_usdc, shares, entry_price, skill_used)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [agentId, marketId, direction, amountUsdc, shares, entryPrice, 'auto']
    );

    await client.query('COMMIT');
    return pos.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resolve market using Pyth oracle price
 */
async function resolveMarket(marketId) {
  const mkt = await db.query('SELECT * FROM markets WHERE id=$1', [marketId]);
  const market = mkt.rows[0];
  if (!market || market.resolved) return null;

  const finalPrice = await getCurrentPrice(market.asset);
  if (!finalPrice) throw new Error('Cannot get final price');

  const outcome = finalPrice > parseFloat(market.target_price) ? 'yes' : 'no';

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Resolve market
    await client.query(
      `UPDATE markets SET resolved=TRUE, outcome=$1, final_price=$2 WHERE id=$3`,
      [outcome, finalPrice, marketId]
    );

    // Settle positions
    const positions = await client.query(
      `SELECT p.*, w.agent_id as wid FROM positions p
       WHERE p.market_id=$1 AND p.settled=FALSE`,
      [marketId]
    );

    for (const pos of positions.rows) {
      let pnl = -parseFloat(pos.amount_usdc); // lose entry amount by default

      if (pos.direction === outcome) {
        // Winner: get back amount + profit proportional to odds
        const market2 = await client.query('SELECT * FROM markets WHERE id=$1', [marketId]);
        const m = market2.rows[0];
        const totalPool = parseFloat(m.yes_pool) + parseFloat(m.no_pool);
        const winPool = outcome === 'yes' ? parseFloat(m.yes_pool) : parseFloat(m.no_pool);
        const payout = (parseFloat(pos.shares) / winPool) * totalPool * 0.98; // 2% platform fee
        pnl = payout - parseFloat(pos.amount_usdc);

        // Credit wallet
        await client.query(
          `UPDATE wallets 
           SET balance_usdc = balance_usdc + $1,
               locked_amount = locked_amount - $2
           WHERE agent_id = $3`,
          [payout, pos.amount_usdc, pos.agent_id]
        );
      } else {
        // Loser: just unlock (funds already deducted conceptually)
        await client.query(
          `UPDATE wallets SET locked_amount = locked_amount - $1 WHERE agent_id = $2`,
          [pos.amount_usdc, pos.agent_id]
        );
      }

      // Update position
      await client.query(
        `UPDATE positions SET pnl=$1, settled=TRUE, settled_at=NOW() WHERE id=$2`,
        [pnl, pos.id]
      );
    }

    await client.query('COMMIT');
    return { outcome, finalPrice, settledCount: positions.rows.length };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Get active markets with live odds
 */
async function getActiveMarkets(asset = null, timeframe = null) {
  let query = `
    SELECT m.*,
      ROUND(m.yes_pool / NULLIF(m.yes_pool + m.no_pool, 0) * 100, 1) AS yes_pct,
      ROUND(m.no_pool / NULLIF(m.yes_pool + m.no_pool, 0) * 100, 1) AS no_pct,
      COUNT(DISTINCT p.agent_id) AS agent_count
    FROM markets m
    LEFT JOIN positions p ON p.market_id = m.id AND p.settled=FALSE
    WHERE m.resolved = FALSE AND m.closes_at > NOW()
  `;
  const params = [];
  if (asset) { params.push(asset); query += ` AND m.asset = $${params.length}`; }
  if (timeframe) { params.push(timeframe); query += ` AND m.timeframe = $${params.length}`; }
  query += ` GROUP BY m.id ORDER BY m.closes_at ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

module.exports = { createMarkets, buyShares, resolveMarket, getActiveMarkets, getCurrentPrice, lmsrPrice };
