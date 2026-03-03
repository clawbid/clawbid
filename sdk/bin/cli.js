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

// Fix for conf ESM issue — use manual JSON config instead
const os = require('os');
const CONFIG_DIR = path.join(os.homedir(), '.clawbid');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    if (!fs.existsSync(CONFIG_FILE)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch { return {}; }
}

function saveConfig(data) {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), { mode: 0o600 });
}

const config = {
  _data: null,
  _load() { if (!this._data) this._data = loadConfig(); return this._data; },
  get(key) { return this._load()[key]; },
  set(key, value) { const d = this._load(); d[key] = value; saveConfig(d); },
  clear() { this._data = {}; saveConfig({}); },
  get path() { return CONFIG_FILE; }
};

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
program
  .command('login')
  .description('Login menggunakan Telegram Bot kamu yang sudah dikonfigurasi OpenClaw')
  .option('--timeout <seconds>', 'Detik menunggu konfirmasi', '120')
  .action(async (opts) => {
    console.log(logo);
    console.log(chalk.bold('  Login via Telegram Bot kamu\n'));
    console.log(chalk.gray('  Bot Telegram kamu yang sudah terhubung OpenClaw\n'));

    // Minta bot token dari user
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    const botToken = await new Promise((resolve) => {
      rl.question(chalk.bold('  Masukkan Bot Token kamu: '), (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    });

    if (!botToken || !botToken.includes(':')) {
      console.log(chalk.red('\n  ❌ Bot token tidak valid. Format: 123456:ABC...\n'));
      console.log(chalk.gray('  Dapatkan bot token dari @BotFather di Telegram\n'));
      process.exit(1);
    }

    const spinner = ora('Memverifikasi bot token ke Telegram...').start();

    try {
      // Step 1: Kirim bot token ke backend untuk diverifikasi
      const tokenRes = await axios.post(`${CLAWBID_API}/api/auth/telegram-login-token`, {
        bot_token: botToken
      }, { timeout: 15000 });

      const { token, expires_in, bot_username, bot_name, is_new_user, message_sent, instruction } = tokenRes.data;
      spinner.stop();

      // Step 2: Tampilkan instruksi
      console.log();
      console.log(chalk.green(`  ✓ Bot @${bot_username} (${bot_name}) terverifikasi!`));
      console.log();
      
      if (is_new_user) {
        console.log(chalk.cyan('  ✨ Akun baru akan dibuat untuk bot ini'));
      } else {
        console.log(chalk.cyan('  ♻️  Menggunakan akun yang sudah ada'));
      }
      console.log();

      if (message_sent) {
        console.log(chalk.bgGreen.black.bold(' STEP 1 ') + chalk.bold(` Pesan konfirmasi sudah dikirim ke bot @${bot_username} kamu!\n`));
        console.log(chalk.gray('  Buka Telegram → cari bot kamu → ketik:'));
      } else {
        console.log(chalk.bgCyan.black.bold(' STEP 1 ') + chalk.bold(` Buka bot @${bot_username} kamu di Telegram dan ketik:\n`));
      }

      console.log(chalk.bgWhite.black(`  /confirm ${token}  `));
      console.log();
      console.log(chalk.gray(`  Token valid ${expires_in}s · expired ${new Date(Date.now() + expires_in * 1000).toLocaleTimeString()}`));
      console.log();

      // Step 3: Poll untuk konfirmasi
      const pollSpinner = ora('Menunggu konfirmasi dari bot kamu...').start();
      const timeout = parseInt(opts.timeout) * 1000;
      const startTime = Date.now();

      const result = await new Promise((resolve, reject) => {
        const poll = async () => {
          if (Date.now() - startTime > timeout) {
            return reject(new Error(`Timeout setelah ${opts.timeout}s. Token expired.`));
          }
          try {
            const res = await axios.get(`${CLAWBID_API}/api/auth/telegram-login-poll/${token}`, { timeout: 5000 });
            if (res.data.status === 'confirmed') return resolve(res.data);
            if (res.data.status === 'expired') return reject(new Error('Token expired. Jalankan clawbid login lagi.'));
            const remaining = parseInt(opts.timeout) - Math.floor((Date.now() - startTime) / 1000);
            pollSpinner.text = `Menunggu konfirmasi dari bot @${bot_username}... (${remaining}s)`;
          } catch (err) {
            if (err.response?.status === 404) return reject(new Error('Token tidak valid.'));
          }
          setTimeout(poll, 3000);
        };
        poll();
      });

      pollSpinner.succeed(chalk.green(`✓ Konfirmasi diterima dari bot @${bot_username}!`));

      // Step 4: Simpan credentials
      const { openclaw_key, webhook_id, webhook_url } = result;
      config.set('openclaw_key', openclaw_key);
      config.set('webhook_id', webhook_id);
      config.set('webhook_url', webhook_url);
      config.set('bot_username', bot_username);
      config.set('bot_token', botToken);
      config.set('logged_in_at', new Date().toISOString());

      // Step 5: Auto-generate wallet
      const walletSpinner = ora('Auto-generating wallet...').start();
      const wallet = ethers.Wallet.createRandom();

      const keystoreDir = path.join(os.homedir(), '.clawbid');
      if (!fs.existsSync(keystoreDir)) fs.mkdirSync(keystoreDir, { mode: 0o700 });
      const keystorePath = path.join(keystoreDir, `wallet-${bot_username}.json`);
      const iv = crypto.randomBytes(16);
      const key = crypto.scryptSync(wallet.address, 'clawbid-salt', 32);
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encryptedPK = cipher.update(wallet.privateKey, 'utf8', 'hex');
      encryptedPK += cipher.final('hex');
      fs.writeFileSync(keystorePath, JSON.stringify({
        address: wallet.address,
        encrypted_pk: encryptedPK,
        iv: iv.toString('hex'),
        created_at: new Date().toISOString()
      }), { mode: 0o600 });

      config.set('wallet_address', wallet.address);
      config.set('wallet_keystore', keystorePath);
      walletSpinner.succeed(chalk.green('✓ Wallet di-generate!'));

      // Kirim info wallet ke bot user
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: result.owner_chat_id || '',
        text:
          `💼 *Wallet Agent Kamu*\n\n` +
          `Address: \`${wallet.address}\`\n\n` +
          `_Private key disimpan terenkripsi di lokal device kamu._\n\n` +
          `Deposit USDC ke address ini di Base network untuk mulai trading.`,
        parse_mode: 'Markdown'
      }, { timeout: 5000 }).catch(() => {});

      // Tampilkan hasil
      console.log();
      console.log(chalk.green(`  ✓ Login sebagai bot @${bot_username}`));
      console.log();
      console.log(chalk.bold('  Credentials tersimpan lokal:'));
      console.log();
      console.log(`  ${chalk.bold('Bot:')}           ${chalk.cyan('@' + bot_username)}`);
      console.log(`  ${chalk.bold('OpenClaw Key:')} ${chalk.cyan(openclaw_key)}`);
      console.log(`  ${chalk.bold('Webhook ID:')}   ${chalk.cyan(webhook_id)}`);
      console.log(`  ${chalk.bold('Wallet:')}        ${chalk.cyan(wallet.address)}`);
      console.log(`  ${chalk.bold('PK saved:')}      ${chalk.gray(keystorePath)} ${chalk.green('(encrypted)')}`);
      console.log(`  ${chalk.bold('Config:')}        ${chalk.gray(config.path)}`);
      console.log();
      console.log(chalk.yellow('  Next step:'));
      console.log(`  ${chalk.cyan('clawbid init my-agent')}`);
      console.log();

    } catch (err) {
      spinner.fail(chalk.red('Login gagal: ' + err.message));
      if (err.response?.status === 401) {
        console.log(chalk.gray('\n  Bot token tidak valid. Cek token dari @BotFather.\n'));
      } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        console.log(chalk.gray('\n  Tidak bisa reach ClawBid API. Cek koneksi internet.\n'));
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
    const botUsername = config.get('bot_username');
    const agentConf = config.get('agent');
    const loggedInAt = config.get('logged_in_at');
    const walletAddress = config.get('wallet_address');

    if (!openclawKey) {
      console.log(chalk.yellow('Belum login. Jalankan: clawbid login'));
      return;
    }

    console.log();
    console.log(chalk.bold('  Session Aktif:'));
    console.log();
    if (botUsername) console.log(`  Bot:           ${chalk.cyan('@' + botUsername)}`);
    console.log(`  OpenClaw Key:  ${chalk.cyan(openclawKey)}`);
    console.log(`  Webhook ID:    ${chalk.cyan(webhookId)}`);
    if (walletAddress) console.log(`  Wallet:        ${chalk.cyan(walletAddress)}`);
    if (agentConf) {
      console.log(`  Agent ID:      ${chalk.cyan(agentConf.agent_id)}`);
      console.log(`  LLM Model:     ${chalk.cyan(agentConf.llm_model)}`);
    }
    if (loggedInAt) console.log(`  Login at:      ${chalk.gray(new Date(loggedInAt).toLocaleString())}`);
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

      // Generate or reuse Ethereum wallet
      spinner.text = 'Setting up wallet...';
      let walletAddress = config.get('wallet_address');
      let walletPrivateKey;

      if (walletAddress) {
        // Reuse wallet from login
        const keystorePath = config.get('wallet_keystore');
        console.log(chalk.gray(`\n  ♻  Reusing wallet from login: ${walletAddress}`));
        walletPrivateKey = '(stored in keystore)'; // PK already encrypted & saved
        spinner.start('Building agent config...');
      } else {
        // Generate new wallet
        const newWallet = ethers.Wallet.createRandom();
        walletAddress = newWallet.address;
        walletPrivateKey = newWallet.privateKey;

        // Save encrypted PK
        const iv = crypto.randomBytes(16);
        const key = crypto.scryptSync(walletAddress, 'clawbid-salt', 32);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encryptedPK = cipher.update(walletPrivateKey, 'utf8', 'hex');
        encryptedPK += cipher.final('hex');
        const keystoreDir = path.join(require('os').homedir(), '.clawbid');
        if (!fs.existsSync(keystoreDir)) fs.mkdirSync(keystoreDir, { mode: 0o700 });
        const keystorePath = path.join(keystoreDir, `${name}.json`);
        fs.writeFileSync(keystorePath, JSON.stringify({
          address: walletAddress,
          encrypted_pk: encryptedPK,
          iv: iv.toString('hex')
        }), { mode: 0o600 });
        config.set('wallet_address', walletAddress);
        config.set('wallet_keystore', keystorePath);
      }

      // Build agent config
      const agentConfig = {
        name,
        agent_id: `${name}-${walletAddress.slice(2, 8).toLowerCase()}`,
        wallet_address: walletAddress,
        wallet_private_key: walletPrivateKey,
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

      // Register with ClawBid platform via webhook
      spinner.text = 'Registering with ClawBid platform...';
      const sig = crypto.createHmac('sha256', process.env.WEBHOOK_HMAC_SECRET || 'dev')
        .update(JSON.stringify({
          event: 'AGENT_INIT',
          wallet_address: walletAddress,
          agent_id: agentConfig.agent_id
        }))
        .digest('hex');

      await axios.post(webhookUrl, {
        event: 'AGENT_INIT',
        agent_id: agentConfig.agent_id,
        wallet_address: walletAddress,
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
  ${chalk.bold('Wallet:')}      ${chalk.cyan(walletAddress)}
  ${chalk.bold('PK saved:')}    ${chalk.gray(config.get('wallet_keystore'))} ${chalk.green('(local only)')}
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
