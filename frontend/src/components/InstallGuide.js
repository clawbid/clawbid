'use client';
import { useState } from 'react';

const CYAN = '#00e5ff';
const GREEN = '#00ff88';
const PURPLE = '#a78bfa';
const GOLD = '#fbbf24';
const DIM = '#8aa0be';
const MONO = 'IBM Plex Mono, monospace';

const code = (text) => (
  <code style={{ color: CYAN, fontFamily: MONO, fontSize: 12 }}>{text}</code>
);

function CodeBlock({ title, lines }) {
  const [copied, setCopied] = useState(false);
  const copyText = lines
    .filter(l => !l.startsWith('#') && !l.startsWith('✓') && !l.startsWith('🦀') && !l.startsWith('⚠') && l !== '')
    .join('\n');

  return (
    <div style={{ background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: DIM }}>{title}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '2px 10px', color: copied ? GREEN : DIM, fontSize: 10, cursor: 'pointer', fontFamily: MONO, transition: 'color 0.2s' }}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <div style={{ padding: 18, fontFamily: MONO, fontSize: 12, lineHeight: 1.9 }}>
        {lines.map((line, i) => {
          if (line.startsWith('#')) return <div key={i} style={{ color: DIM }}>{line}</div>;
          if (line.startsWith('✓')) return <div key={i} style={{ color: GREEN }}>{line}</div>;
          if (line.startsWith('🦀') || line.startsWith('⚠')) return <div key={i} style={{ color: GOLD }}>{line}</div>;
          if (line === '') return <br key={i} />;
          return <div key={i} style={{ color: CYAN }}>{line}</div>;
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid rgba(${color},0.1)`, fontSize: 11, fontFamily: MONO }}>
      <span style={{ color: DIM, minWidth: 120 }}>{label}</span>
      <span style={{ color: `rgb(${color})`, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function SectionHeader({ number, title, subtitle, color = CYAN }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20, marginTop: 36 }}>
      <div style={{
        minWidth: 32, height: 32, borderRadius: 9,
        background: `linear-gradient(135deg, ${color}, #7c3aed)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, color: '#000', flexShrink: 0,
      }}>{number}</div>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 3, color: '#dde4f0' }}>{title}</h3>
        <p style={{ fontSize: 12, color: '#8aa0be', lineHeight: 1.6 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.25)`,
      fontSize: 10, fontFamily: MONO, color: `rgb(${color})`, marginRight: 6,
    }}>{text}</span>
  );
}

const SKILL_EXAMPLES = [
  {
    label: 'Momentum + RSI',
    color: '0,229,255',
    code: [
      '---',
      'name: momentum-rsi',
      'version: 1.0.0',
      'markets: [BTC, ETH, SOL]',
      'timeframes: [30m, 1h]',
      '---',
      '',
      '# Momentum + RSI Strategy',
      '',
      '## Signal YES (price will go UP)',
      '- Last 3 candles are all green',
      '- Price above 5-candle moving average',
      '- RSI between 55-70 (strong, not overbought)',
      '- YES pool odds below 60% (good value)',
      '',
      '## Signal NO (price will go DOWN)',
      '- Last 3 candles are all red',
      '- Price below 5-candle moving average',
      '- RSI between 30-45 (weak, not oversold)',
      '',
      '## Risk',
      '- Confidence threshold: 65%',
      '- Max bet: 4% of balance per trade',
      '- Skip if market closes in < 8 minutes',
    ]
  },
  {
    label: 'Contrarian',
    color: '251,191,36',
    code: [
      '---',
      'name: contrarian',
      'version: 1.0.0',
      'markets: [BTC, ETH]',
      'timeframes: [1h, 6h]',
      '---',
      '',
      '# Contrarian Strategy',
      '',
      '## Core Idea',
      'Bet against the crowd when the market is',
      'heavily one-sided. Crowd is usually wrong',
      'at extremes.',
      '',
      '## Signal YES',
      '- NO pool odds > 70% (crowd betting NO)',
      '- Price has dropped > 2% in last 2 hours',
      '- RSI < 35 (oversold — expect bounce)',
      '',
      '## Signal NO',
      '- YES pool odds > 70% (crowd betting YES)',
      '- Price has risen > 2% in last 2 hours',
      '- RSI > 65 (overbought — expect pullback)',
      '',
      '## Risk',
      '- Only trade when odds imbalance > 65/35',
      '- Max 3% of balance per bet',
    ]
  },
  {
    label: 'Simple & Stable',
    color: '0,255,136',
    code: [
      '---',
      'name: simple-btc',
      'version: 1.0.0',
      'markets: [BTC]',
      'timeframes: [1h, 6h, 12h]',
      '---',
      '',
      '# Simple BTC Strategy',
      '',
      '## Overview',
      'Keep it simple: only trade BTC on longer',
      'timeframes where trends are clearer.',
      '',
      '## Signal YES',
      '- BTC price is higher than 24 hours ago',
      '- Market sentiment looks positive',
      '- YES odds are 40-55% (fair value)',
      '',
      '## Signal NO',
      '- BTC price is lower than 24 hours ago',
      '- Downtrend visible on 6h chart',
      '',
      '## Risk',
      '- Max 2% of balance per trade',
      '- Never more than 2 open positions',
      '- Skip all trades on weekends',
    ]
  },
];

export default function InstallGuide() {
  const [activeSkill, setActiveSkill] = useState(0);

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', position: 'relative', zIndex: 1 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>
            Install ClawBid Agent
          </h2>
          <Badge text="v1.0.10" color="0,229,255" />
          <Badge text="Base Network" color="0,255,136" />
        </div>
        <p style={{ color: DIM, fontSize: 13, lineHeight: 1.7 }}>
          Set up your autonomous AI trading agent in minutes · Login via your own Telegram bot ·
          Wallet auto-generated locally · Write your own strategy in plain English
        </p>
      </div>

      {/* ── What's New Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06))',
        border: '1px solid rgba(0,229,255,0.2)',
        borderRadius: 12, padding: '14px 20px', marginBottom: 36,
        display: 'flex', alignItems: 'flex-start', gap: 14,
      }}>
        <span style={{ fontSize: 20 }}>🆕</span>
        <div>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: CYAN, marginBottom: 6 }}>What's new in v1.0.10</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 0' }}>
            {[
              ['✓ Login now works via your own Telegram bot', GREEN],
              ['✓ Webhook auto-registered on login — no manual setup', GREEN],
              ['✓ Wallet generated locally and never transmitted', GREEN],
              ['✓ Custom skill support — write your own strategy in plain English', GOLD],
              ['✓ Multi-skill support — load multiple strategies simultaneously', GOLD],
              ['✓ All CLI messages now in English', CYAN],
            ].map(([msg, color]) => (
              <div key={msg} style={{ width: '50%', fontSize: 11, fontFamily: MONO, color, paddingRight: 12, marginBottom: 3 }}>{msg}</div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Step 1 */}
          <SectionHeader number="1" title="Install the CLI" subtitle="Requires Node.js 18+. Install once, works on Linux, macOS, and Windows." />
          <CodeBlock title="bash — Install" lines={[
            'npm install -g clawbid-agent',
            '',
            '# Verify installation',
            'clawbid --version',
            '✓ 1.0.10',
            '',
            '# See all commands',
            'clawbid --help',
          ]} />

          {/* Step 2 */}
          <SectionHeader number="2" title="Login via your Telegram Bot" color={GREEN}
            subtitle="Use your own Telegram bot (from @BotFather). ClawBid registers a webhook on it automatically — no manual configuration needed." />

          <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 12, color: DIM, lineHeight: 1.7 }}>
            <strong style={{ color: '#dde4f0' }}>Don't have a bot yet?</strong> Open Telegram → search{' '}
            {code('@BotFather')} → send {code('/newbot')} → follow the steps → copy the token.
            It takes about 60 seconds.
          </div>

          <CodeBlock title="bash — Login" lines={[
            'clawbid login',
            '',
            '# Enter your bot token when prompted:',
            '# Enter your Bot Token: 7968633890:AAFGBuTEJ-...',
            '',
            '✓ Bot @yourbotname verified!',
            '✓ New account created for this bot',
            '',
            '# STEP 1 — Open your bot on Telegram and type:',
            '/confirm CB-XXXX-XXXX',
            '',
            '✓ Confirmation received from bot @yourbotname!',
            '✓ Wallet generated',
            '✓ Logged in as bot @yourbotname',
            '',
            '  OpenClaw Key:  ocl_xxxxxxxxxxxx',
            '  Webhook ID:    d96dbea93a09...',
            '  Wallet:        0x3f4a8b2c...1d9e',
          ]} />

          {/* Step 3 */}
          <SectionHeader number="3" title="Initialize your Agent" color={PURPLE}
            subtitle="Creates your agent config and registers it with the ClawBid platform. Wallet is reused from login." />

          <CodeBlock title="bash — Init" lines={[
            'clawbid init my-agent',
            '',
            '✓ Agent initialized!',
            '',
            '  Agent ID:    my-agent-3f4a8b',
            '  Webhook ID:  6a81b2ce2ee69b...',
            '  Wallet:      0xdEE0A83C84d4F0... (Base network)',
            '  LLM Model:   claude-sonnet-4-6 → fallback: gemini-flash',
            '  Config:      /home/user/.clawbid/config.json',
            '',
            '# Check your credentials anytime:',
            'clawbid whoami',
          ]} />

          {/* Step 4 */}
          <SectionHeader number="4" title="Add a Skill Strategy" color={GOLD}
            subtitle="Your skill is a plain-text Markdown file. Write your trading logic in plain English — the AI agent reads and follows it." />

          <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: 14, marginBottom: 14, fontSize: 12, color: DIM, lineHeight: 1.7 }}>
            Skills tell the AI <strong style={{ color: '#dde4f0' }}>when to bet YES, when to bet NO, and when to skip.</strong>{' '}
            The more specific your conditions, the smarter the agent. You can load multiple skills at once.
          </div>

          <CodeBlock title="bash — Add skill" lines={[
            '# Add a skill from a .md file',
            'clawbid skill add ./my-strategy.md',
            '',
            '✓ Skill loaded: my-strategy v1.0.0',
            '  Assets:     BTC, ETH, SOL',
            '  Timeframes: 30m, 1h',
            '  Total skills loaded: 1',
            '',
            '# Load multiple skills',
            'clawbid skill add ./momentum.md',
            'clawbid skill add ./contrarian.md',
            '',
            '# See loaded skills',
            'clawbid skill list',
          ]} />

          {/* Step 5 */}
          <SectionHeader number="5" title="Deposit USDC & Start" color={GREEN}
            subtitle="Send USDC to your agent wallet on Base network. Then start — the agent trades every 2 minutes autonomously." />

          <CodeBlock title="bash — Start" lines={[
            '# Deposit USDC to your wallet on Base:',
            '# 0xdEE0A83C84d4F0288d68c2dbF7FE961131b2afDb',
            '',
            '# Start the agent (live trading)',
            'clawbid start',
            '',
            '# Or test without spending real funds:',
            'clawbid start --dry-run',
            '',
            '🦀 ClawBid Agent Starting...',
            '  Agent:   my-agent-3f4a8b',
            '  Mode:    LIVE',
            '  Skills:  2 loaded',
            '',
            '[10:42:01] ↑ YES  BTC/30m  $12.00  [claude-sonnet-4-6]',
            '[10:44:03] ↓ NO   ETH/1h   $8.50   [gemini-flash]',
            '[10:46:11] ↑ YES  SOL/30m  $6.00   [claude-sonnet-4-6]',
          ]} />

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>

          {/* Login flow info */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.07), rgba(124,58,237,0.07))',
            border: '1px solid rgba(0,229,255,0.25)',
            borderRadius: 12, padding: 18, marginBottom: 20,
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: CYAN, marginBottom: 10 }}>
              ⚡ How the Telegram Login Works
            </h4>
            {[
              ['Run clawbid login', 'CLI asks for your bot token'],
              ['Token sent to backend', 'Backend verifies bot with Telegram'],
              ['Webhook auto-registered', 'Your bot receives /confirm messages'],
              ['Type /confirm in your bot', 'Backend confirms and saves credentials'],
              ['Credentials saved locally', 'OpenClaw Key + Webhook ID stored'],
              ['Wallet auto-generated', 'Private key stored only on your machine'],
            ].map(([k, v]) => <InfoRow key={k} label={k} value={v} color="0,229,255" />)}
          </div>

          {/* Wallet security */}
          <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: GREEN, marginBottom: 8 }}>
              🔐 Wallet Security
            </h4>
            <p style={{ fontSize: 12, color: DIM, lineHeight: 1.65, marginBottom: 10 }}>
              Your private key is <strong style={{ color: '#dde4f0' }}>generated and stored locally</strong> on your machine.
              It is encrypted and never sent to ClawBid servers.
            </p>
            {[
              ['Private Key', 'Encrypted in ~/.clawbid/ (never transmitted)'],
              ['Public Address', 'Shared with platform on init'],
              ['Deposits', 'USDC on Base network to your wallet'],
              ['Payouts', 'Sent directly to your wallet address'],
            ].map(([k, v]) => <InfoRow key={k} label={k} value={v} color="0,255,136" />)}
          </div>

          {/* LLM Gateway */}
          <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: PURPLE, marginBottom: 8 }}>
              ⚡ AI Models (via Bankr LLM Gateway)
            </h4>
            <p style={{ fontSize: 12, color: DIM, lineHeight: 1.65, marginBottom: 10 }}>
              Your agent uses Claude as primary, with automatic failover. Costs are paid in USDC from your agent wallet.
            </p>
            {[
              ['claude-sonnet-4-6', 'Primary — best market reasoning', CYAN],
              ['gemini-flash', 'Fallback 1 — fast & cheap', GREEN],
              ['gpt-4o-mini', 'Fallback 2 — wide availability', GOLD],
            ].map(([m, d, c]) => (
              <div key={m} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', fontSize: 11 }}>
                <span style={{ color: c, fontFamily: MONO, minWidth: 170 }}>{m}</span>
                <span style={{ color: DIM }}>{d}</span>
              </div>
            ))}
          </div>

          {/* ── SKILL SECTION ── */}
          <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: 18, marginBottom: 20 }}>
            <h4 style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginBottom: 4 }}>
              📋 Write Your Own Skill
            </h4>
            <p style={{ fontSize: 12, color: DIM, lineHeight: 1.65, marginBottom: 14 }}>
              A skill is a <strong style={{ color: '#dde4f0' }}>.md file</strong> with a YAML header and your strategy in plain English.
              The AI agent reads your instructions and applies them to real market data every trading cycle.
              No code required — just clear logic.
            </p>

            {/* Skill structure */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontFamily: MONO, color: DIM, marginBottom: 8 }}>Required structure:</div>
              {[
                ['name', 'Unique skill identifier (no spaces)', CYAN],
                ['version', 'Semantic version e.g. 1.0.0', DIM],
                ['markets', 'Assets: [BTC, ETH, SOL, BNB, AVAX ...]', GREEN],
                ['timeframes', 'Windows: [30m, 1h, 6h, 12h]', PURPLE],
                ['Signal YES/NO', 'Conditions for each direction', GOLD],
                ['Risk rules', 'Position size, confidence threshold', '#ff6b6b'],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: 'flex', padding: '5px 0', borderBottom: '1px solid rgba(251,191,36,0.08)', fontSize: 11, fontFamily: MONO }}>
                  <span style={{ color: c, minWidth: 130 }}>{k}</span>
                  <span style={{ color: DIM }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Example skill tabs */}
            <div style={{ fontSize: 11, fontFamily: MONO, color: DIM, marginBottom: 8 }}>Example skills:</div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
              {SKILL_EXAMPLES.map((s, i) => (
                <button key={i} onClick={() => setActiveSkill(i)} style={{
                  padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 10, fontFamily: MONO,
                  background: activeSkill === i ? `rgba(${s.color},0.15)` : 'rgba(255,255,255,0.03)',
                  border: `1px solid rgba(${s.color}, ${activeSkill === i ? '0.5' : '0.15'})`,
                  color: activeSkill === i ? `rgb(${s.color})` : DIM,
                  transition: 'all 0.15s',
                }}>{s.label}</button>
              ))}
            </div>

            <div style={{ background: '#080e1d', borderRadius: 8, padding: 14, fontFamily: MONO, fontSize: 11, lineHeight: 1.85 }}>
              {SKILL_EXAMPLES[activeSkill].code.map((line, i) => {
                if (line.startsWith('---')) return <div key={i} style={{ color: '#3d4f6b' }}>{line}</div>;
                if (line.startsWith('name:') || line.startsWith('version:') || line.startsWith('markets:') || line.startsWith('timeframes:'))
                  return <div key={i} style={{ color: PURPLE }}>{line}</div>;
                if (line.startsWith('#')) return <div key={i} style={{ color: GOLD, fontWeight: 700 }}>{line}</div>;
                if (line.startsWith('- ')) return <div key={i} style={{ color: '#dde4f0' }}>{line}</div>;
                if (line === '') return <br key={i} />;
                return <div key={i} style={{ color: DIM }}>{line}</div>;
              })}
            </div>
          </div>

          {/* Tips */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <h4 style={{ fontSize: 12, fontWeight: 700, color: '#dde4f0', marginBottom: 10 }}>💡 Tips for Better Skills</h4>
            {[
              ['Be specific', 'Define exact conditions (RSI > 65, not "RSI is high")'],
              ['Set thresholds', 'Always include a minimum confidence % to skip bad trades'],
              ['Keep it simple', 'One clear idea per skill beats complex multi-condition logic'],
              ['Use dry-run', 'Test with clawbid start --dry-run before going live'],
              ['Stack skills', 'Load 2-3 complementary skills to cover more market conditions'],
            ].map(([tip, desc]) => (
              <div key={tip} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 11 }}>
                <span style={{ color: CYAN, fontFamily: MONO, minWidth: 100, flexShrink: 0 }}>{tip}</span>
                <span style={{ color: DIM, lineHeight: 1.6 }}>{desc}</span>
              </div>
            ))}
          </div>

          {/* Manual setup note */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 14 }}>
            <p style={{ fontSize: 11, color: DIM, lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#dde4f0' }}>Manual setup (alternative):</strong>{' '}
              If you prefer not to use Telegram login, go to the Dashboard tab → "Generate new webhook" → copy your webhook URL → then run:{' '}
              <code style={{ color: CYAN, fontFamily: MONO, fontSize: 11 }}>
                clawbid init my-agent --webhook YOUR_WEBHOOK_URL
              </code>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
