/**
 * Bankr LLM Gateway Service
 * Unified interface to Claude, Gemini, GPT via bankr.bot
 * Handles: routing, failover, cost tracking, crypto payment
 */

const axios = require('axios');
const db = require('../db');

const BANKR_LLM_URL = process.env.BANKR_LLM_URL || 'https://llm.bankr.bot';
const BANKR_API_KEY = process.env.BANKR_API_KEY;

// Model routing: primary → fallback
const MODEL_CHAIN = {
  'claude-sonnet-4-6':  'gemini-flash',
  'claude-opus-4-6':    'claude-sonnet-4-6',
  'gemini-flash':       'gpt-4o-mini',
  'gpt-4o-mini':        'gemini-flash',
};

/**
 * Call Bankr LLM Gateway with automatic failover
 */
async function callLLM({ model = 'claude-sonnet-4-6', messages, system, maxTokens = 1024, agentId, marketId }) {
  const primaryModel = model;
  const fallbackModel = MODEL_CHAIN[model] || 'gpt-4o-mini';

  for (const tryModel of [primaryModel, fallbackModel]) {
    try {
      const payload = {
        model: tryModel,
        max_tokens: maxTokens,
        messages,
      };
      if (system) payload.system = system;

      const res = await axios.post(
        `${BANKR_LLM_URL}/v1/messages`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': BANKR_API_KEY,
          },
          timeout: 30000,
        }
      );

      const data = res.data;

      // Track LLM usage in DB
      if (agentId) {
        const cost = estimateCost(tryModel, data.usage?.input_tokens || 0, data.usage?.output_tokens || 0);
        await db.query(
          `INSERT INTO llm_usage (agent_id, model, prompt_tokens, completion_tokens, cost_usdc, market_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [agentId, tryModel, data.usage?.input_tokens || 0, data.usage?.output_tokens || 0, cost, marketId || null]
        );
      }

      return {
        content: data.content?.[0]?.text || '',
        model: tryModel,
        usage: data.usage,
      };

    } catch (err) {
      console.error(`LLM Gateway [${tryModel}] failed:`, err.response?.data?.error?.message || err.message);
      if (tryModel === fallbackModel) throw err; // Both failed
      console.log(`  → Failing over to ${fallbackModel}`);
    }
  }
}

/**
 * Analyze a market using an agent's skill.md via Bankr LLM Gateway
 */
async function analyzeMarket({ skill, market, priceHistory, agentId, model }) {
  const system = `You are an autonomous crypto prediction market trading agent.
You analyze markets using the strategy defined in your skill file.
Respond ONLY with valid JSON, no markdown, no explanation.`;

  const prompt = `
## Your Trading Skill
${skill}

## Current Market
Asset: ${market.asset}
Question: ${market.question}
Timeframe: ${market.timeframe}
Target Price: $${market.target_price}
Current YES odds: ${(market.yes_pool / (market.yes_pool + market.no_pool + 0.001) * 100).toFixed(1)}%
Current NO odds: ${(market.no_pool / (market.yes_pool + market.no_pool + 0.001) * 100).toFixed(1)}%
Volume: $${(parseFloat(market.yes_pool) + parseFloat(market.no_pool)).toFixed(0)}
Closes: ${new Date(market.closes_at).toISOString()}

## Recent Price History (last 10 candles)
${JSON.stringify(priceHistory.slice(-10), null, 2)}

## Task
Analyze this market based on your skill strategy.
Return JSON with this exact shape:
{
  "decision": "yes" | "no" | "skip",
  "confidence": 0.0-1.0,
  "amount_pct": 0.01-0.05,
  "reasoning": "brief explanation",
  "model_used": "${model || 'claude-sonnet-4-6'}"
}
`;

  const result = await callLLM({
    model: model || 'claude-sonnet-4-6',
    messages: [{ role: 'user', content: prompt }],
    system,
    maxTokens: 512,
    agentId,
    marketId: market.id,
  });

  try {
    return JSON.parse(result.content);
  } catch {
    return { decision: 'skip', confidence: 0, amount_pct: 0, reasoning: 'parse error', model_used: result.model };
  }
}

/**
 * Estimate cost in USDC (approximate)
 */
function estimateCost(model, inputTokens, outputTokens) {
  const pricing = {
    'claude-opus-4-6':    { in: 0.000015, out: 0.000075 },
    'claude-sonnet-4-6':  { in: 0.000003, out: 0.000015 },
    'gemini-flash':       { in: 0.0000001, out: 0.0000004 },
    'gpt-4o-mini':        { in: 0.00000015, out: 0.0000006 },
  };
  const p = pricing[model] || { in: 0.000003, out: 0.000015 };
  return (inputTokens * p.in + outputTokens * p.out).toFixed(8);
}

/**
 * Get LLM usage stats for an agent
 */
async function getAgentLLMStats(agentId, days = 7) {
  const result = await db.query(
    `SELECT 
       model,
       COUNT(*) as calls,
       SUM(prompt_tokens + completion_tokens) as total_tokens,
       SUM(cost_usdc) as total_cost
     FROM llm_usage
     WHERE agent_id = $1 AND ts > NOW() - INTERVAL '${days} days'
     GROUP BY model
     ORDER BY total_cost DESC`,
    [agentId]
  );
  return result.rows;
}

module.exports = { callLLM, analyzeMarket, getAgentLLMStats, estimateCost };
