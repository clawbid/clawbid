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
const CLAWBID_API = process.env.CLAWBID_API || 'https://api.clawbid.io';

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

// ── clawbid init [name] ──────────────────────────────────────────────────────
program
  .command('init [name]')
  .description('Initialize a new ClawBid agent (generates wallet automatically)')
  .option('--llm <model>', 'LLM model to use', 'claude-sonnet-4-6')
  .option('--bankr-key <key>', 'Bankr API key for LLM Gateway')
  .option('--webhook <url>', 'Webhook URL from clawbid.io/dashboard')
  .action(async (name, opts) => {
    console.log(logo);

    if (!name) name = `agent-${Date.now().toString(36)}`;
    const spinner = ora('Initializing ClawBid agent...').start();

    try {
      // 1. Generate Ethereum wallet
      spinner.text = 'Generating wallet keypair...';
      const wallet = ethers.Wallet.createRandom();

      // 2. Determine webhook URL
      let webhookUrl = opts.webhook || config.get('webhook_url');
      if (!webhookUrl) {
        spinner.stop();
        console.log(chalk.yellow('\n⚠ No webhook URL provided.'));
        console.log('  1. Go to ' + chalk.cyan('https://clawbid.io/dashboard'));
        console.log('  2. Click "Generate Webhook"');
        console.log('  3. Run: ' + chalk.cyan(`clawbid init ${name} --webhook https://api.clawbid.io/wh/YOUR_ID\n`));
        process.exit(1);
      }

      const webhookId = webhookUrl.split('/wh/')[1];

      // 3. Save config locally
      const agentConfig = {
        name,
        agent_id: `${name}-${wallet.address.slice(2, 8).toLowerCase()}`,
        wallet_address: wallet.address,
        wallet_private_key: wallet.privateKey,
        webhook_url: webhookUrl,
        webhook_id: webhookId,
        llm_model: opts.llm || 'claude-sonnet-4-6',
        llm_fallback: 'gemini-flash',
        bankr_api_key: opts.bankrKey || process.env.BANKR_API_KEY || '',
        use_bankr_llm: true,
        skills_path: './skills',
        created_at: new Date().toISOString(),
      };

      config.set('agent', agentConfig);

      // Save to local file too
      const configPath = path.join(process.cwd(), 'clawbid.config.json');
      fs.writeFileSync(configPath, JSON.stringify({
        ...agentConfig,
        wallet_private_key: undefined // Don't write PK to project config
      }, null, 2));

      // Save PK to secure location
      const keystoreDir = path.join(require('os').homedir(), '.clawbid');
      if (!fs.existsSync(keystoreDir)) fs.mkdirSync(keystoreDir, { mode: 0o700 });
      const keystorePath = path.join(keystoreDir, `${name}.json`);
      const encrypted = crypto.createCipher('aes-256-cbc', wallet.address);
      let encryptedPK = encrypted.update(wallet.privateKey, 'utf8', 'hex');
      encryptedPK += encrypted.final('hex');
      fs.writeFileSync(keystorePath, JSON.stringify({ address: wallet.address, encrypted_pk: encryptedPK }), { mode: 0o600 });

      // 4. Register with ClawBid platform
      spinner.text = 'Registering with ClawBid platform...';
      const sig = crypto.createHmac('sha256', process.env.WEBHOOK_HMAC_SECRET || 'dev')
        .update(JSON.stringify({ event: 'AGENT_INIT', wallet_address: wallet.address, agent_id: agentConfig.agent_id }))
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
      console.log(`
  ${chalk.bold('Agent ID:')}   ${chalk.cyan(agentConfig.agent_id)}
  ${chalk.bold('Wallet:')}     ${chalk.cyan(wallet.address)}
  ${chalk.bold('PK saved:')}   ${chalk.gray(keystorePath)} ${chalk.green('(local only, never transmitted)')}
  ${chalk.bold('Webhook:')}    ${chalk.cyan(webhookUrl)}
  ${chalk.bold('LLM Model:')}  ${chalk.cyan(agentConfig.llm_model)} ${chalk.gray('→ fallback: ' + agentConfig.llm_fallback)}
  ${chalk.bold('Config:')}     ${chalk.gray(configPath)}

  ${chalk.green('✓')} Dashboard: ${chalk.cyan('https://clawbid.io/dashboard')} ${chalk.gray('(wallet visible now)')}
  ${chalk.green('✓')} Telegram:  ${chalk.cyan('/connect ' + webhookId)} ${chalk.gray('via @ClawBidBot')}

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

// ── clawbid skill add <file> ─────────────────────────────────────────────────
program
  .command('skill add <file>')
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

      // Copy to skills dir
      const skillsDir = path.join(process.cwd(), 'skills');
      if (!fs.existsSync(skillsDir)) fs.mkdirSync(skillsDir);
      fs.copyFileSync(file, path.join(skillsDir, path.basename(file)));

      // Update local config
      const agentConfig = config.get('agent') || {};
      const skills = agentConfig.skills || [];
      const existing = skills.findIndex(s => s.name === skill.name);
      if (existing >= 0) skills[existing] = skill; else skills.push(skill);
      agentConfig.skills = skills;
      config.set('agent', agentConfig);

      // Push to platform
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

// ── clawbid skill list ───────────────────────────────────────────────────────
program
  .command('skill list')
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
      console.log(chalk.red('No agent. Run: clawbid init'));
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

    // Notify platform
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
