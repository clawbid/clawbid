const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/prices/latest
router.get('/latest', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT DISTINCT ON (asset) asset, price, ts
       FROM price_feeds ORDER BY asset, ts DESC`
    );
    const prices = {};
    result.rows.forEach(r => { prices[r.asset] = { price: parseFloat(r.price), ts: r.ts }; });
    res.json(prices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prices/:asset/history
router.get('/:asset/history', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT price, ts FROM price_feeds
       WHERE asset = $1 AND ts > NOW() - INTERVAL '24 hours'
       ORDER BY ts ASC`,
      [req.params.asset.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
