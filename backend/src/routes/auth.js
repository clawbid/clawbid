const express = require('express');
const router = express.Router();

// GET /api/auth/verify-openclaw
// Verify OpenClaw API key is valid
router.post('/verify', async (req, res) => {
  const { openclaw_key } = req.body;
  if (!openclaw_key || openclaw_key.length < 8) {
    return res.status(400).json({ valid: false, error: 'Invalid key format' });
  }
  // In production: verify against OpenClaw/Bankr API
  res.json({ valid: true });
});

module.exports = router;
