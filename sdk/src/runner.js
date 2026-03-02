/**
 * AgentRunner
 * Runs on user's machine. Connects to ClawBid platform via webhook,
 * polls markets, analyzes via Bankr LLM Gateway, submits bids.
 */

const axios = require('axios');
const chalk = require('chalk');
const cron = require('node-cron');
const crypto = require('crypto');

const CLAWBID_API = process.env.CLAWBID_API || 'https://api.clawbid.io';
const BANKR_LLM_URL = process.env.BANKR_LLM_URL || 'https://llm.bankr.bot';

async function start(config) {
  const { agent_id, wallet_address, webhook_url, webhook_id, skills, dryRun, bankr_api_key, llm_model, llm_fallback } = config;

  console.log(chalk.cyan('\n🦀 ClawBid Agent Starting...\n'));
  console.log(`  Agent:   ${chalk.bold(agent_id)}`);
  console.log(`  Wallet:  ${chalk.bold(wallet_address)}`);
  console.log(`  LLM:     ${chalk.bold(llm_model)} → ${chalk.gray(llm_fallback)}`);
  console.log(`  Skills:  ${chalk.bold(skills?.length || 0)} loaded`);
  console.log(`  Mode:    ${dryRun ? chalk.yellow('DRY RUN') : chalk.green('LIVE')}`);
  console.log();

  // Heartbeat — let platform know we're alive
  const heartbeat = async () => {
    try {
      await axios.post(webhook_url, { event: 'HEARTBEAT', agent_id, ts: Date.now() }, { timeout: 5000 });
    } catch {}
  };

  // Trade cycle
  const tradeCycle = async () => {
    try {
      // Fetch active markets
      const markets = await axios.get(`${CLAWBID_API}/api/markets`, { timeout: 10000 });
      const activeMarkets = markets.data;

      if (activeMarkets.length === 0) return;

      // Fetch wallet balance
      const walletRes = await axios.get(`${CLAWBID_API}/api/wallet`, {
        headers: { 'x-webhook-id': webhook_id },
        timeout: 5000
      });
      const wallet = walletRes.data;
      const available = parseFloat(wallet.balance_usdc) - parseFloat(wallet.locked_amount);

      if (available < 1) {
        console.log(chalk.yellow(`  ⚠ Low balance: $${available.toFixed(2)} — deposit USDC to ${wallet_address}`));
        return;
      }

      console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] Scanning ${activeMarkets.length} markets · Balance: $${available.toFixed(2)}`));

      for (const market of activeMarkets.slice(0, 10)) { // Max 10 markets per cycle
        if (!skills || skills.length === 0) continue;
        const skill = pickSkill(skills, market.asset, market.timeframe);
        if (!skill) continue;

        // Call Bankr LLM Gateway
        const analysis = await analyzeWithBankr({
          skill: skill.content,
          market,
          model: llm_model,
          fallback: llm_fallback,
          bankr_api_key,
        });

        if (!analysis || analysis.decision === 'skip' || analysis.confidence < 0.55) continue;

        const betAmount = Math.min(available * (analysis.amount_pct || 0.03), available * 0.05, 100);
        if (betAmount < 0.5) continue;

        console.log(
          `  ${analysis.decision === 'yes' ? chalk.green('↑ YES') : chalk.red('↓ NO ')} ` +
          `${chalk.bold(market.asset)}/${market.timeframe} ` +
          `$${betAmount.toFixed(2)} ` +
          `${chalk.gray(analysis.confidence * 100 + '% confidence')} ` +
          `[${chalk.cyan(analysis.model_used || llm_model)}]`
        );

        if (!dryRun) {
          // Submit bid to platform
          await axios.post(`${CLAWBID_API}/api/markets/${market.id}/bid`, {
            direction: analysis.decision,
            amount_usdc: betAmount,
            webhook_id,
            skill_name: skill.name,
          }, { timeout: 10000 });
        } else {
          console.log(chalk.gray('    (dry run — not submitted)'));
        }
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(chalk.red('  Trade cycle error:'), err.message);
      }
    }
  };

  // Start cycles
  await heartbeat();
  await tradeCycle();

  cron.schedule('*/30 * * * * *', heartbeat);     // Heartbeat every 30s
  cron.schedule('*/2 * * * *', tradeCycle);         // Trade every 2 min

  console.log(chalk.green('✓ Agent running. Press Ctrl+C to stop.\n'));

  // Keep alive
  process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n⏸ Stopping agent...'));
    await axios.post(webhook_url, { event: 'STATUS_UPDATE', status: 'idle' }, { timeout: 5000 }).catch(() => {});
    process.exit(0);
  });

  await new Promise(() => {}); // run forever
}

async function analyzeWithBankr({ skill, market, model, fallback, bankr_api_key }) {
  const systemPrompt = `You are an autonomous crypto prediction market AI agent. 
Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

  const userPrompt = `## Your Strategy
${skill}

## Market
Asset: ${market.asset}
Question: ${market.question}
Timeframe: ${market.timeframe}  
Target Price: $${market.target_price}
YES odds: ${market.yes_pct || 50}% · NO odds: ${market.no_pct || 50}%
Time remaining: ${Math.round((new Date(market.closes_at) - Date.now()) / 60000)} minutes

Respond with JSON only:
{"decision":"yes"|"no"|"skip","confidence":0.0-1.0,"amount_pct":0.01-0.05,"reasoning":"brief","model_used":"${model}"}`;

  for (const tryModel of [model, fallback || 'gemini-flash']) {
    try {
      const res = await axios.post(
        `${BANKR_LLM_URL}/v1/messages`,
        {
          model: tryModel,
          max_tokens: 256,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': bankr_api_key,
          },
          timeout: 20000,
        }
      );

      const text = res.data?.content?.[0]?.text || '{}';
      const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
      return { ...parsed, model_used: tryModel };
    } catch (err) {
      if (tryModel === (fallback || 'gemini-flash')) {
        console.error(chalk.red(`  LLM error: ${err.message}`));
        return null;
      }
    }
  }
  return null;
}

function pickSkill(skills, asset, timeframe) {
  if (!skills || skills.length === 0) return null;
  return (
    skills.find(s => s.assets?.includes(asset) && s.timeframes?.includes(timeframe)) ||
    skills.find(s => s.assets?.includes(asset)) ||
    skills[0]
  );
}

module.exports = { start };
