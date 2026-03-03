const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');

/**
 * POST /wh/:webhookId
 * Called by the ClawBid SDK to:
 * 1. Register agent on first connect (sends wallet address)
 * 2. Send heartbeat / status updates
 * 3. Broadcast skill updates
 */
router.post('/:webhookId', async (req, res) => {
  const { webhookId } = req.params;
  const payload = req.body;

  // Verify HMAC signature
  const signature = req.headers['x-clawbid-signature'];
  if (signature) {
    const expected = crypto
      .createHmac('sha256', process.env.WEBHOOK_HMAC_SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    if (signature !== `sha256=${expected}`) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  try {
    // Find agent by webhook ID
    let agent = await db.query(
      `SELECT a.*, w.balance_usdc FROM agents a
       LEFT JOIN wallets w ON w.agent_id = a.id
       WHERE a.webhook_id = $1`,
      [webhookId]
    );

    if (agent.rows.length === 0) {
      return res.status(404).json({ error: 'Webhook ID not found. Generate one at clawbid.site/dashboard' });
    }

    const ag = agent.rows[0];

    // Handle event types
    switch (payload.event) {
      case 'AGENT_INIT': {
        // Agent first connect — register wallet address
        await db.query(
          `UPDATE agents SET
             wallet_address = $1,
             agent_id = $2,
             status = 'active',
             last_ping = NOW()
           WHERE id = $3`,
          [payload.wallet_address, payload.agent_id, ag.id]
        );
        // Create/update wallet record
        await db.query(
          `INSERT INTO wallets (agent_id, address)
           VALUES ($1, $2)
           ON CONFLICT (address) DO NOTHING`,
          [ag.id, payload.wallet_address]
        );
        console.log(`[Webhook] Agent INIT: ${payload.agent_id} wallet=${payload.wallet_address}`);
        break;
      }

      case 'HEARTBEAT': {
        await db.query(
          `UPDATE agents SET status='active', last_ping=NOW() WHERE id=$1`,
          [ag.id]
        );
        break;
      }

      case 'SKILLS_UPDATE': {
        await db.query(
          `UPDATE agents SET skills=$1, last_ping=NOW() WHERE id=$1`,
          [JSON.stringify(payload.skills), ag.id]
        );
        break;
      }

      case 'STATUS_UPDATE': {
        await db.query(
          `UPDATE agents SET status=$1, last_ping=NOW() WHERE id=$2`,
          [payload.status, ag.id]
        );
        break;
      }

      case 'LLM_CONFIG': {
        await db.query(
          `UPDATE agents SET llm_model=$1, llm_fallback=$2, use_bankr_llm=$3 WHERE id=$4`,
          [payload.model, payload.fallback, payload.use_bankr, ag.id]
        );
        break;
      }
    }

    // Log webhook event
    await db.query(
      `INSERT INTO webhook_events (agent_id, event_type, payload) VALUES ($1,$2,$3)`,
      [ag.id, payload.event || 'UNKNOWN', payload]
    );

    // Broadcast to WebSocket dashboard
    const ws = req.app.get('ws');
    if (ws) {
      ws.broadcastToAgent(ag.id, {
        type: 'WEBHOOK_EVENT',
        event: payload.event,
        agentId: ag.agent_id,
        ts: new Date().toISOString(),
      });
    }

    res.json({ ok: true, agentId: ag.agent_id });

  } catch (err) {
    console.error('[Webhook]', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /wh/:webhookId/status
 * Returns agent status for the SDK to verify connection
 */
router.get('/:webhookId/status', async (req, res) => {
  const result = await db.query(
    `SELECT a.agent_id, a.status, a.last_ping, w.balance_usdc
     FROM agents a LEFT JOIN wallets w ON w.agent_id = a.id
     WHERE a.webhook_id = $1`,
    [req.params.webhookId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
  res.json(result.rows[0]);
});

module.exports = router;
