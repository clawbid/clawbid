const express = require('express');
const router = express.Router();
const { getActiveMarkets } = require('../services/market');
const db = require('../db');

// GET /api/markets - list active markets
router.get('/', async (req, res) => {
  try {
    const { asset, timeframe } = req.query;
    const markets = await getActiveMarkets(asset, timeframe);
    res.json(markets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/markets/:id - single market
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.*,
         ROUND(m.yes_pool / NULLIF(m.yes_pool + m.no_pool, 0) * 100, 1) AS yes_pct,
         COUNT(DISTINCT p.agent_id) AS agent_count
       FROM markets m
       LEFT JOIN positions p ON p.market_id = m.id
       WHERE m.id = $1
       GROUP BY m.id`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
