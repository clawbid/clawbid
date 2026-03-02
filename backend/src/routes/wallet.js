// wallet.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/wallet - get wallet by webhook
router.get('/', async (req, res) => {
  const webhookId = req.headers['x-webhook-id'];
  try {
    const result = await db.query(
      `SELECT w.* FROM wallets w
       JOIN agents a ON a.id = w.agent_id
       WHERE a.webhook_id = $1`,
      [webhookId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
