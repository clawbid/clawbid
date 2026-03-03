#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const crypto = require('crypto');
const axios = require('axios');
const Conf = require('conf');

const config = new Conf({ projectName: 'clawbid' });
const CLAWBID_API = process.env.CLAWBID_API || 'https://api.clawbid.site';

const logo = chalk.cyan(`
  ██████╗██╗      █████╗ ██╗    ██╗██████╗ ██╗██████╗ 
 ██╔════╝██║     ██╔══██╗██║    ██║██╔══██╗██║██╔══██╗
 ██║     ██║     ███████║██║ █╗ ██║██████╔╝██║██║  ██║
 ██║     ██║     ██╔══██║██║███╗██║██╔══██╗██║██║  ██║
 ╚██████╗███████╗██║  ██║╚███╔███╔╝██████╔╝██║██████╔╝
  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ ╚═════╝ ╚═╝╚═════╝
`) + chalk.gray('  AI Prediction Market Agent SDK v1.0.0\n');

program
  .name('clawbid')
  .description('ClawBid AI Agent SDK')
  .version('1.0.0');

// ── clawbid login ────────────────────────────────────────────────────────────
// NEW COMMAND: Login via Telegram. No browser needed.
// Flow:
//   1. Request login token from backend
//   2. User sends /login <token> to @ClawBidBot on Telegram
//   3. CLI polls backend every 3s until confirmed
//   4. Backend returns: openclaw_key, webhook_id, webhook_url
//   5. CLI saves to local config — ready to use
program
  .command('login')
  .description('Login via Telegram (@ClawBidBot) — get your OpenClaw key & Webhook ID automatically')
  .option('--timeout <seconds>', 'Seconds to wait for Telegram confirmation', '120')
  .action(async (opts) => {
    console.log(logo);
    console.log(chalk.bold('  Login via Telegram\n'));

    const spinner = ora('Generating login token...').start();

    try {
      // Step 1: Request a one-time login token from backend
      const tokenRes = await axios.post(`${CLAWBID_API}/api/auth/telegram-login-token`, {}, {
        timeout: 10000
      });

      const { token, expires_in } = tokenRes.data;
      spinner.stop();

      // Step 2: Show instructions to user
      console.log(chalk.bgCyan.black.bold(' STEP 1 ') + chalk.bold(' Open Telegram and message @ClawBidBot:\n'));
      console.log(chalk.bgWhite.black(`  /login ${token}  `));
      console.log();
      console.log(chalk.gray(`  Token valid for ${expires_in}s · expires at ${new Date(Date.now() + expires_in * 1000).toLocaleTimeString()}`));
      console.log();

      // Step 3: Poll for confirmation
      const pollSpinner = ora('Waiting for Telegram confirmation...').start();
      const timeout = parseInt(opts.timeout) * 1000;
      const startTime = Date.now();
      const pollInterval = 3000;

      const result = await new Promise((resolve, reject) => {
        const poll = async () => {
          if (Date.now() - startTime > timeout) {
            return reject(new Error(`Timeout after ${opts.timeout}s. Token expired.`));
          }

          try {
            const res = await axios.get(`${CLAWBID_API}/api/auth/telegram-login-poll/${token}`, {
              timeout: 5000
            });

            if (res.data.status === 'confirmed') {
              return resolve(res.data);
            }

            if (res.data.status === 'expired') {
              return reject(new Error('Token expired. Run clawbid login again.'));
            }

            // Still pending — show elapsed time
            const elapsed = Math.floor((Date.now() - startTime) / 1000);
            const remaining = parseInt(opts.timeout) - elapsed;
            pollSpinner.text = `Waiting for Telegram confirmation... (${remaining}s remaining)`;

          } catch (err) {
            if (err.response?.status === 404) {
              return reject(new Error('Invalid token. Run clawbid login again.'));
            }
            // Network error — keep polling
          }

          setTimeout(poll, pollInterval);
        };

        poll();
      });

      pollSpinner.succeed(chalk.green('✓ Telegram confirmed!'));

      // Step 4: Save credentials to local config
      const { openclaw_key, webhook_id, webhook_url, telegram_username, agent_db_id } = result;

      config.set('openclaw_key', openclaw_key);
      config.set('webhook_id', webhook_id);
      config.set('webhook_url', webhook_url);
      config.set('telegram_username', telegram_username);
      config.set('logged_in_at', new Date().toISOString());

      // Step 5: Show result
      console.log();
      console.log(chalk.green('  ✓ Logged in as @' + telegram_username));
      console.log();
      console.log(chalk.bold('  Your credentials (saved locally):'));
      console.log();
      console.log(`  ${chalk.bold('OpenClaw Key:')}  ${chalk.cyan(openclaw_key)}`);
      console.log(`  ${chalk.bold('Webhook ID:')}    ${chalk.cyan(webhook_id)}`);
      console.log(`  ${chalk.bold('Webhook URL:')}   ${chalk.cyan(webhook_url)}`);
      console.log(`  ${chalk.bold('Config saved:')} ${chalk.gray(config.path)}`);
      console.log();
      console.log(chalk.yellow('  Next step:'));
      console.log(`  ${chalk.cyan('clawbid init my-agent')}  ${chalk.gray('(wallet will be auto-generated)')}`);
      console.log();

    } catch (err) {
      spinner.fail(chalk.red('Login failed: ' + err.message));
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.log(chalk.gray('\n  Cannot reach ClawBid API. Check your internet connection.'));
      }
      process.exit(1);
    }
  });

// ── clawbid whoami ───────────────────────────────────────────────────────────
// Show current logged-in user
program
  .command('whoami')
  .description('Show current login info')
  .action(() => {
    const openclawKey = config.get('openclaw_key');
    const webhookId = config.get('webhook_id');
    const telegramUsername = config.get('telegram_username');
    const agentConf = config.get('agent');
    const loggedInAt = config.get('logged_in_at');

    if (!openclawKey) {
      console.log(chalk.yellow('Not logged in. Run: clawbid login'));
      return;
    }

    console.log();
    console.log(chalk.bold('  Current Session:'));
    console.log();
    if (telegramUsername) console.log(`  Telegram:      ${chalk.cyan('@' + telegramUsername)}`);
    console.log(`  OpenClaw Key:  ${chalk.cyan(openclawKey)}`);
    console.log(`  Webhook ID:    ${chalk.cyan(webhookId)}`);
    if (agentConf) {
      console.log(`  Agent ID:      ${chalk.cyan(agentConf.agent_id)}`);
      console.log(`  Wallet:        ${chalk.cyan(agentConf.wallet_address)}`);
      console.log(`  LLM Model:     ${chalk.cyan(agentConf.llm_model)}`);
    }
    if (loggedInAt) console.log(`  Logged in:     ${chalk.gray(new Date(loggedInAt).toLocaleString())}`);
    console.log();
  });

// ── clawbid logout ───────────────────────────────────────────────────────────
program
  .command('logout')
  .description('Clear local credentials')
  .action(() => {
    config.clear();
    console.log(chalk.green('\n  ✓ Logged out. Credentials cleared.\n'));
  });

// ── clawbid init [name] ──────────────────────────────────────────────────────
program
  .command('init [name]')
  .description('Initialize a new ClawBid agent (generates wallet automatically)')
  .option('--llm <model>', 'LLM model to use', 'claude-sonnet-4-6')
  .option('--bankr-key <key>', 'Bankr API key for LLM Gateway')
  .option('--webhook <url>', 'Webhook URL (optional if already logged in)')
  .action(async (name, opts) => {
    console.log(logo);

    if (!name) name = `agent-${Date.now().toString(36)}`;
    const spinner = ora('Initializing ClawBid agent...').start();

    try {
      // Auto-use webhook from login if available
      let webhookUrl = opts.webhook
        || config.get('webhook_url')
        || null;

      // If logged in but no webhook yet, generate one
      if (!webhookUrl) {
        const openclawKey = config.get('openclaw_key');
        if (openclawKey) {
          spinner.text = 'Generating webhook from your OpenClaw key...';
          const regRes = await axios.post(`${CLAWBID_API}/api/agents/register`, {}, {
            headers: { 'x-openclaw-key': openclawKey },
            timeout: 10000
          });
          webhookUrl = regRes.data.webhook_url;
          config.set('webhook_url', webhookUrl);
          config.set('webhook_id', regRes.data.webhook_id);
        }
      }

      if (!webhookUrl) {
        spinner.stop();
        console.log(chalk.yellow('\n⚠ Not logged in and no webhook URL provided.'));
        console.log('  Option 1: ' + chalk.cyan('clawbid login') + chalk.gray(' (recommended — via Telegram)'));
        console.log('  Option 2: ' + chalk.cyan(`clawbid init ${name} --webhook https://api.clawbid.site/wh/YOUR_ID\n`));
        process.exit(1);
      }

      const webhookId = webhookUrl.split('/wh/')[1];

      // Generate Ethereum wallet
      spinner.text = 'Generating wallet keypair...';
      const wallet = ethers.Wallet.createRandom();

      // Build agent config
      const agentConfig = {
        name,
        agent_id: `${name}-${wallet.address.slice(2, 8).toLowerCase()}`,
        wallet_address: wallet.address,
        wallet_private_key: wallet.privateKey,
        webhook_url: webhookUrl,
        webhook_id: webhookId,
        llm_model: opts.llm || 'claude-sonnet-4-6',
        llm_fallback: 'gemini-flash',
        bankr_api_key: opts.bankrKey || config.get('openclaw_key') || process.env.BANKR_API_KEY || '',
        use_bankr_llm: true,
        skills_path: './skills',
        created_at: new Date().toISOString(),
      };

      config.set('agent', agentConfig);

      // Save project config (no PK)
      const configPath = path.join(process.cwd(), 'clawbid.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        ...agentConfig,
        wallet_private_key: undefined
      }, null, 2));

      // Save encrypted PK to ~/.clawbid/
      const keystoreDir = path.join(require('os').homedir(), '.clawbid');
      if (!fs.existsSync(keystoreDir)) fs.mkdirSync(keystoreDir, { mode: 0o700 });
      const keystorePath = path.join(keystoreDir, `${name}.json`);
      const encrypted = crypto.createCipher('aes-256-cbc', wallet.address);
      let encryptedPK = encrypted.update(wallet.privateKey, 'utf8', 'hex');
      encryptedPK += encrypted.final('hex');
      fs.writeFileSync(keystorePath, JSON.stringify({
        address: wallet.address,
        encrypted_pk: encryptedPK
      }), { mode: 0o600 });

      // Register with ClawBid platform via webhook
      spinner.text = 'Registering with ClawBid platform...';
      const sig = crypto.createHmac('sha256', process.env.WEBHOOK_HMAC_SECRET || 'dev')
        .update(JSON.stringify({
          event: 'AGENT_INIT',
          wallet_address: wallet.address,
          agent_id: agentConfig.agent_id
        }))
        .digest('hex');

      await axios.post(webhookUrl, {
        event: 'AGENT_INIT',
        agent_id: agentConfig.agent_id,
        wallet_address: wallet.address,
        llm_model: agentConfig.llm_model,
        llm_fallback: agentConfig.llm_fallback,
        use_bankr_llm: true,
      }, {
        headers: {
          'Content-Type': 'application/json',
          'x-clawbid-signature': `sha256=${sig}`
        },
        timeout: 10000
      });

      spinner.succeed(chalk.green('Agent initialized!'));

      const telegramUser = config.get('telegram_username');

      console.log(`
  ${chalk.bold('Agent ID:')}    ${chalk.cyan(agentConfig.agent_id)}
  ${chalk.bold('Webhook ID:')}  ${chalk.cyan(webhookId)}
  ${chalk.bold('Wallet:')}      ${chalk.cyan(wallet.address)}
  ${chalk.bold('PK saved:')}    ${chalk.gray(keystorePath)} ${chalk.green('(local only)')}
  ${chalk.bold('Webhook:')}     ${chalk.cyan(webhookUrl)}
  ${chalk.bold('LLM Model:')}   ${chalk.cyan(agentConfig.llm_model)} ${chalk.gray('→ fallback: ' + agentConfig.llm_fallback)}
  ${chalk.bold('Config:')}      ${chalk.gray(configPath)}

  ${chalk.green('✓')} Dashboard: ${chalk.cyan('https://clawbid.site/dashboard')}
  ${chalk.green('✓')} Telegram:  ${telegramUser
    ? chalk.cyan('@ClawBidBot already connected as @' + telegramUser)
    : chalk.cyan('/connect ' + webhookId) + chalk.gray(' → @ClawBidBot')}

  ${chalk.yellow('Next steps:')}
  1. ${chalk.cyan('clawbid skill add ./my-strategy.md')}
  2. Deposit USDC to: ${chalk.cyan(wallet.address)} ${chalk.gray('(Base network)')}
  3. ${chalk.cyan('clawbid start')}
`);

    } catch (err) {
      spinner.fail(chalk.red('Init failed: ' + err.message));
      if (err.code === 'ECONNREFUSED') {
        console.log(chalk.gray('  Check your webhook URL is correct'));
      }
      process.exit(1);
    }
  });

// ── clawbid skill ────────────────────────────────────────────────────────────
const skillCmd = program
  .command('skill')
  .description('Manage agent skills');

skillCmd
  .command('add <file>')
  .description('Add a skill.md to your agent')
  .action(async (file) => {
    const matter = require('gray-matter');
    const spinner = ora(`Loading skill from ${file}...`).start();
    try {
      if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
      const raw = fs.readFileSync(file, 'utf8');
      const parsed = matter(raw);

      const skill = {
        name: parsed.data.name || path.basename(file, '.md'),
        version: parsed.data.version || '1.0.0',
        assets: parsed.data.markets || ['BTC', 'ETH', 'SOL'],
        timeframes: parsed.data.timeframes || ['30m', '1h'],
        content: parsed.content.trim(),
        file: path.resolve(file),
        added_at: new Date().toISOString(),
      };

      const skillsDir = path.join(process.cwd(), 'skills');
      if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir);
      fs.copyFileSync(file, path.join(skillsDir, path.basename(file)));

      const agentConfig = config.get('agent') || {};
      const skills = agentConfig.skills || [];
      const existing = skills.findIndex(s => s.name === skill.name);
      if (existing >= 0) skills[existing] = skill; else skills.push(skill);
      agentConfig.skills = skills;
      config.set('agent', agentConfig);

      const webhookUrl = agentConfig.webhook_url;
      if (webhookUrl) {
        await axios.post(webhookUrl, {
          event: 'SKILLS_UPDATE',
          skills: skills.map(s => ({ name: s.name, version: s.version, assets: s.assets, timeframes: s.timeframes }))
        }, { timeout: 5000 }).catch(() => {});
      }

      spinner.succeed(chalk.green(`Skill loaded: ${skill.name} v${skill.version}`));
      console.log(`  Assets:     ${chalk.cyan(skill.assets.join(', '))}`);
      console.log(`  Timeframes: ${chalk.cyan(skill.timeframes.join(', '))}`);
      console.log(`  Total skills loaded: ${chalk.bold(skills.length)}`);
    } catch (err) {
      spinner.fail(chalk.red(err.message));
    }
  });

skillCmd
  .command('list')
  .description('List loaded skills')
  .action(() => {
    const agentConfig = config.get('agent') || {};
    const skills = agentConfig.skills || [];
    if (skills.length === 0) {
      console.log(chalk.gray('No skills loaded. Run: clawbid skill add ./my-strategy.md'));
      return;
    }
    console.log(chalk.bold(`\nLoaded Skills (${skills.length}):`));
    skills.forEach(s => {
      console.log(`  ${chalk.cyan(s.name)} v${s.version} · ${s.assets?.join(', ')} · ${s.timeframes?.join(', ')}`);
    });
    console.log();
  });

// ── clawbid start ────────────────────────────────────────────────────────────
program
  .command('start')
  .description('Start the autonomous trading agent')
  .option('--tf <timeframes>', 'Comma-separated timeframes', '30m,1h,6h,12h')
  .option('--dry-run', 'Analyze markets but do not place real bids')
  .action(async (opts) => {
    const AgentRunner = require('../src/runner');
    const agentConfig = config.get('agent');
    if (!agentConfig) {
      console.log(chalk.red('No agent configured. Run: clawbid init'));
      process.exit(1);
    }
    if (!agentConfig.skills || agentConfig.skills.length === 0) {
      console.log(chalk.yellow('⚠ No skills loaded. Run: clawbid skill add ./my-strategy.md'));
    }
    await AgentRunner.start({ ...agentConfig, dryRun: opts.dryRun, timeframes: opts.tf.split(',') });
  });

// ── clawbid status ───────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show agent status and balance')
  .action(async () => {
    const agentConfig = config.get('agent');
    if (!agentConfig) {
      console.log(chalk.red('No agent. Run: clawbid login && clawbid init'));
      return;
    }
    const spinner = ora('Fetching status...').start();
    try {
      const res = await axios.get(`${agentConfig.webhook_url}/status`, { timeout: 5000 });
      spinner.stop();
      const s = res.data;
      console.log(`\n  ${chalk.bold('Agent:')}   ${chalk.cyan(s.agent_id || agentConfig.agent_id)}`);
      console.log(`  ${chalk.bold('Status:')}  ${s.status === 'active' ? chalk.green('● Active') : chalk.yellow('○ Idle')}`);
      console.log(`  ${chalk.bold('Balance:')} ${chalk.green('$' + parseFloat(s.balance_usdc || 0).toFixed(2))} USDC`);
      console.log(`  ${chalk.bold('Last ping:')} ${s.last_ping || 'never'}\n`);
    } catch (err) {
      spinner.fail('Status check failed: ' + err.message);
    }
  });

// ── clawbid llm setup ────────────────────────────────────────────────────────
program
  .command('llm setup')
  .description('Configure Bankr LLM Gateway')
  .option('--key <key>', 'Bankr API key')
  .option('--model <model>', 'Primary LLM model', 'claude-sonnet-4-6')
  .option('--fallback <model>', 'Fallback model', 'gemini-flash')
  .action(async (opts) => {
    const agentConfig = config.get('agent') || {};
    agentConfig.bankr_api_key = opts.key || agentConfig.bankr_api_key;
    agentConfig.llm_model = opts.model;
    agentConfig.llm_fallback = opts.fallback;
    agentConfig.use_bankr_llm = true;
    config.set('agent', agentConfig);

    if (agentConfig.webhook_url) {
      await axios.post(agentConfig.webhook_url, {
        event: 'LLM_CONFIG',
        model: opts.model,
        fallback: opts.fallback,
        use_bankr: true,
      }, { timeout: 5000 }).catch(() => {});
    }

    console.log(chalk.green('\n✓ Bankr LLM Gateway configured'));
    console.log(`  Primary:  ${chalk.cyan(opts.model)}`);
    console.log(`  Fallback: ${chalk.cyan(opts.fallback)}`);
    console.log(`  Payment:  ${chalk.gray('USDC on Base (auto from wallet)')}\n`);
  });

program.parse();
