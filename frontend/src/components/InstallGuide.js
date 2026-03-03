'use client';
import { useState } from 'react';

const CYAN = '#00e5ff';
const GREEN = '#00ff88';
const PURPLE = '#a78bfa';
const GOLD = '#fbbf24';
const DIM = '#b0c4d8';
const MONO = 'IBM Plex Mono, monospace';

const inlineCode = (text) => (
  <code style={{ color: CYAN, fontFamily: MONO, fontSize: 12 }}>{text}</code>
);

function CodeBlock({ title, lines }) {
  const [copied, setCopied] = useState(false);
  const copyText = lines
    .filter(l => !l.startsWith('#') && !l.startsWith('✓') && !l.startsWith('🦀') && !l.startsWith('⚠') && l !== '')
    .join('\n');

  return (
    <div style={{ background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 10, color: DIM, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 5, padding: '3px 10px', color: copied ? GREEN : DIM, fontSize: 10, cursor: 'pointer', fontFamily: MONO, transition: 'color 0.2s', flexShrink: 0 }}
        >
          {copied ? '✓ ok' : 'copy'}
        </button>
      </div>
      <div style={{ padding: '14px 16px', fontFamily: MONO, fontSize: 12, lineHeight: 1.85, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {lines.map((line, i) => {
          if (line.startsWith('#')) return <div key={i} style={{ color: DIM, whiteSpace: 'pre' }}>{line}</div>;
          if (line.startsWith('✓')) return <div key={i} style={{ color: GREEN, whiteSpace: 'pre' }}>{line}</div>;
          if (line.startsWith('🦀') || line.startsWith('⚠')) return <div key={i} style={{ color: GOLD, whiteSpace: 'pre' }}>{line}</div>;
          if (line === '') return <br key={i} />;
          return <div key={i} style={{ color: CYAN, whiteSpace: 'pre' }}>{line}</div>;
        })}
      </div>
    </div>
  );
}

function SectionHeader({ number, title, subtitle, color = CYAN }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16, marginTop: 28 }}>
      <div style={{
        minWidth: 30, height: 30, borderRadius: 9,
        background: `linear-gradient(135deg, ${color}, #7c3aed)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 800, fontSize: 13, color: '#000', flexShrink: 0,
      }}>{number}</div>
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 4, color: '#ffffff', margin: '0 0 4px' }}>{title}</h3>
        <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.6, margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function Badge({ text, color }) {
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 20,
      background: `rgba(${color},0.1)`, border: `1px solid rgba(${color},0.3)`,
      fontSize: 11, fontFamily: MONO, color: `rgb(${color})`,
    }}>{text}</span>
  );
}

function InfoCard({ icon, title, color, children }) {
  return (
    <div style={{
      background: `rgba(${color},0.05)`,
      border: `1px solid rgba(${color},0.2)`,
      borderRadius: 12, padding: '16px 16px', marginBottom: 16,
    }}>
      <h4 style={{ fontSize: 13, fontWeight: 700, color: `rgb(${color})`, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{icon}</span>{title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{ padding: '7px 0', borderBottom: `1px solid rgba(${color},0.1)`, fontSize: 11.5, fontFamily: MONO }}>
      <div style={{ color: DIM, marginBottom: 2 }}>{label}</div>
      <div style={{ color: `rgb(${color})`, wordBreak: 'break-all' }}>{value}</div>
    </div>
  );
}

const SKILL_EXAMPLES = [
  {
    label: 'Momentum',
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
      '## Signal YES (price UP)',
      '- Last 3 candles are all green',
      '- Price above 5-candle moving average',
      '- RSI between 55-70',
      '- YES pool odds below 60%',
      '',
      '## Signal NO (price DOWN)',
      '- Last 3 candles are all red',
      '- Price below 5-candle moving average',
      '- RSI between 30-45',
      '',
      '## Risk',
      '- Confidence threshold: 65%',
      '- Max bet: 4% of balance per trade',
      '- Skip if closes in < 8 minutes',
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
      'Bet against the crowd when market',
      'is heavily one-sided.',
      '',
      '## Signal YES',
      '- NO pool odds > 70%',
      '- Price dropped > 2% in 2 hours',
      '- RSI < 35 (oversold)',
      '',
      '## Signal NO',
      '- YES pool odds > 70%',
      '- Price risen > 2% in 2 hours',
      '- RSI > 65 (overbought)',
      '',
      '## Risk',
      '- Only trade when imbalance > 65/35',
      '- Max 3% of balance per bet',
    ]
  },
  {
    label: 'Simple BTC',
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
      'Only trade BTC on longer timeframes',
      'where trends are clearer.',
      '',
      '## Signal YES',
      '- BTC price higher than 24h ago',
      '- YES odds are 40-55% (fair value)',
      '',
      '## Signal NO',
      '- BTC price lower than 24h ago',
      '- Downtrend visible on 6h chart',
      '',
      '## Risk',
      '- Max 2% of balance per trade',
      '- Max 2 open positions',
      '- Skip trades on weekends',
    ]
  },
];

export default function InstallGuide() {
  const [activeSkill, setActiveSkill] = useState(0);

  return (
    <div style={{ background: '#060910', color: '#dde4f0', minHeight: '100vh', paddingBottom: 80 }}>
      <style>{`
        .sdk-inner { max-width: 1360px; margin: 0 auto; padding: 24px 16px 0; }
        .sdk-layout { display: flex; flex-direction: column; gap: 0; }
        .sdk-col { width: 100%; }
        .whats-new-grid { display: grid; grid-template-columns: 1fr; gap: 4px; }
        .info-row-flex { display: flex; flex-direction: column; gap: 2px; }
        @media (min-width: 769px) {
          .sdk-inner { padding: 40px 36px 0; }
          .sdk-layout { flex-direction: row; gap: 40px; align-items: start; }
          .sdk-col { width: 50%; }
          .whats-new-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="sdk-inner">

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
              Install ClawBid Agent
            </h2>
            <Badge text="v1.0.10" color="0,229,255" />
            <Badge text="Base Network" color="0,255,136" />
          </div>
          <p style={{ color: DIM, fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Set up your autonomous AI trading agent in minutes · Login via your own Telegram bot · Wallet auto-generated locally · Write your own strategy in plain English
          </p>
        </div>

        {/* What's New Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(124,58,237,0.06))',
          border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 28,
        }}>
          <h4 style={{ fontSize: 13, fontWeight: 700, color: CYAN, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🆕</span> What's new in v1.0.10
          </h4>
          <div className="whats-new-grid">
            {[
              ['✓ Login now works via your own Telegram bot', GREEN],
              ['✓ Webhook auto-registered on login', GREEN],
              ['✓ Wallet generated locally, never transmitted', GREEN],
              ['✓ Custom skill support — write in plain English', GOLD],
              ['✓ Multi-skill support — load multiple strategies', GOLD],
              ['✓ All CLI messages now in English', CYAN],
            ].map(([msg, color]) => (
              <div key={msg} style={{ fontSize: 12, fontFamily: MONO, color, padding: '3px 0' }}>{msg}</div>
            ))}
          </div>
        </div>

        {/* Main 2-col layout (stacked on mobile) */}
        <div className="sdk-layout">

          {/* LEFT: Steps */}
          <div className="sdk-col">

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

            <SectionHeader number="2" title="Login via Telegram Bot" color={GREEN}
              subtitle="Use your own Telegram bot from @BotFather. ClawBid registers a webhook automatically — no manual config needed." />

            <div style={{ background: 'rgba(0,255,136,0.04)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: DIM, lineHeight: 1.7 }}>
              <strong style={{ color: '#dde4f0' }}>Don't have a bot yet?</strong> Open Telegram → search{' '}
              {inlineCode('@BotFather')} → send {inlineCode('/newbot')} → follow the steps → copy the token. Takes ~60 seconds.
            </div>

            <CodeBlock title="bash — Login" lines={[
              'clawbid login',
              '',
              '# Enter your bot token when prompted:',
              '# Enter Bot Token: 7968633890:AAFGBuT...',
              '',
              '✓ Bot @yourbotname verified!',
              '✓ New account created for this bot',
              '',
              '# Open your bot on Telegram and type:',
              '/confirm CB-XXXX-XXXX',
              '',
              '✓ Confirmation received!',
              '✓ Wallet generated',
              '✓ Logged in as bot @yourbotname',
              '',
              '  OpenClaw Key:  ocl_xxxxxxxxxxxx',
              '  Webhook ID:    d96dbea93a09...',
              '  Wallet:        0x3f4a8b2c...1d9e',
            ]} />

            <SectionHeader number="3" title="Initialize your Agent" color={PURPLE}
              subtitle="Creates your agent config and registers it with the ClawBid platform." />

            <CodeBlock title="bash — Init" lines={[
              'clawbid init my-agent',
              '',
              '✓ Agent initialized!',
              '',
              '  Agent ID:    my-agent-3f4a8b',
              '  Webhook ID:  6a81b2ce2ee69b...',
              '  Wallet:      0xdEE0A83C...afDb',
              '  LLM Model:   claude-sonnet-4-6',
              '  Config:      ~/.clawbid/config.json',
              '',
              '# Check credentials anytime:',
              'clawbid whoami',
            ]} />

            <SectionHeader number="4" title="Add a Skill Strategy" color={GOLD}
              subtitle="Your skill is a plain-text Markdown file. Write your trading logic in plain English — no code required." />

            <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, padding: '12px 14px', marginBottom: 14, fontSize: 12.5, color: DIM, lineHeight: 1.7 }}>
              Skills tell the AI <strong style={{ color: '#dde4f0' }}>when to bet YES, when to bet NO, and when to skip.</strong> You can load multiple skills at once.
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
              '# List loaded skills',
              'clawbid skill list',
            ]} />

            <SectionHeader number="5" title="Deposit USDC & Start" color={GREEN}
              subtitle="Send USDC to your agent wallet on Base. The agent trades every 2 minutes autonomously." />

            <CodeBlock title="bash — Start" lines={[
              '# Deposit USDC to wallet on Base:',
              '# 0xdEE0A83C84d4F0...2afDb',
              '',
              '# Start the agent (live trading)',
              'clawbid start',
              '',
              '# Test without spending real funds:',
              'clawbid start --dry-run',
              '',
              '🦀 ClawBid Agent Starting...',
              '  Agent:   my-agent-3f4a8b',
              '  Mode:    LIVE',
              '  Skills:  2 loaded',
              '',
              '[10:42] ↑ YES  BTC/30m  $12.00',
              '[10:44] ↓ NO   ETH/1h   $8.50',
              '[10:46] ↑ YES  SOL/30m  $6.00',
            ]} />

          </div>

          {/* RIGHT: Info cards */}
          <div className="sdk-col">

            <div style={{ marginTop: 28 }} />

            <InfoCard icon="⚡" title="How the Telegram Login Works" color="0,229,255">
              {[
                ['Run clawbid login', 'CLI asks for your bot token'],
                ['Token sent to backend', 'Backend verifies bot with Telegram'],
                ['Webhook auto-registered', 'Your bot receives /confirm messages'],
                ['Type /confirm in your bot', 'Backend confirms and saves credentials'],
                ['Credentials saved locally', 'OpenClaw Key + Webhook ID stored'],
                ['Wallet auto-generated', 'Private key stored only on your machine'],
              ].map(([k, v]) => <InfoRow key={k} label={k} value={v} color="0,229,255" />)}
            </InfoCard>

            <InfoCard icon="🔐" title="Wallet Security" color="0,255,136">
              <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.65, marginBottom: 10 }}>
                Your private key is <strong style={{ color: '#dde4f0' }}>generated and stored locally</strong>. It is encrypted and never sent to ClawBid servers.
              </p>
              {[
                ['Private Key', 'Encrypted in ~/.clawbid/ (never transmitted)'],
                ['Public Address', 'Shared with platform on init'],
                ['Deposits', 'USDC on Base network to your wallet'],
                ['Payouts', 'Sent directly to your wallet address'],
              ].map(([k, v]) => <InfoRow key={k} label={k} value={v} color="0,255,136" />)}
            </InfoCard>

            <InfoCard icon="⚡" title="AI Models (via Bankr LLM Gateway)" color="124,58,237">
              <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.65, marginBottom: 10 }}>
                Uses Claude as primary with automatic failover. Costs paid in USDC from your agent wallet.
              </p>
              {[
                ['claude-sonnet-4-6', 'Primary — best market reasoning', CYAN],
                ['gemini-flash', 'Fallback 1 — fast & cheap', GREEN],
                ['gpt-4o-mini', 'Fallback 2 — wide availability', GOLD],
              ].map(([m, d, c]) => (
                <div key={m} style={{ padding: '7px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', fontSize: 11.5, fontFamily: MONO }}>
                  <div style={{ color: c, marginBottom: 2 }}>{m}</div>
                  <div style={{ color: DIM }}>{d}</div>
                </div>
              ))}
            </InfoCard>

            {/* Skill Builder */}
            <div style={{ background: 'rgba(251,191,36,0.04)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, padding: '16px 16px', marginBottom: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: GOLD, marginBottom: 6 }}>📋 Write Your Own Skill</h4>
              <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.65, marginBottom: 14 }}>
                A skill is a <strong style={{ color: '#dde4f0' }}>.md file</strong> with a YAML header and your strategy in plain English. No code required.
              </p>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontFamily: MONO, color: DIM, marginBottom: 8 }}>Required fields:</div>
                {[
                  ['name', 'Unique identifier (no spaces)', CYAN],
                  ['version', 'e.g. 1.0.0', DIM],
                  ['markets', '[BTC, ETH, SOL, BNB, AVAX ...]', GREEN],
                  ['timeframes', '[30m, 1h, 6h, 12h]', PURPLE],
                  ['Signal YES/NO', 'Conditions for each direction', GOLD],
                  ['Risk rules', 'Position size, confidence threshold', '#ff6b6b'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ padding: '5px 0', borderBottom: '1px solid rgba(251,191,36,0.08)', fontSize: 11, fontFamily: MONO, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    <span style={{ color: c, minWidth: 110 }}>{k}</span>
                    <span style={{ color: DIM }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 11, fontFamily: MONO, color: DIM, marginBottom: 8 }}>Example skills:</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {SKILL_EXAMPLES.map((s, i) => (
                  <button key={i} onClick={() => setActiveSkill(i)} style={{
                    padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: MONO,
                    background: activeSkill === i ? `rgba(${s.color},0.15)` : 'rgba(255,255,255,0.03)',
                    border: `1px solid rgba(${s.color}, ${activeSkill === i ? '0.5' : '0.15'})`,
                    color: activeSkill === i ? `rgb(${s.color})` : DIM,
                    transition: 'all 0.15s',
                  }}>{s.label}</button>
                ))}
              </div>

              <div style={{ background: '#080e1d', borderRadius: 8, padding: '12px 14px', fontFamily: MONO, fontSize: 11.5, lineHeight: 1.85, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {SKILL_EXAMPLES[activeSkill].code.map((line, i) => {
                  if (line.startsWith('---')) return <div key={i} style={{ color: '#6a8099', whiteSpace: 'pre' }}>{line}</div>;
                  if (line.startsWith('name:') || line.startsWith('version:') || line.startsWith('markets:') || line.startsWith('timeframes:'))
                    return <div key={i} style={{ color: PURPLE, whiteSpace: 'pre' }}>{line}</div>;
                  if (line.startsWith('#')) return <div key={i} style={{ color: GOLD, fontWeight: 700, whiteSpace: 'pre' }}>{line}</div>;
                  if (line.startsWith('- ')) return <div key={i} style={{ color: '#dde4f0', whiteSpace: 'pre' }}>{line}</div>;
                  if (line === '') return <br key={i} />;
                  return <div key={i} style={{ color: DIM, whiteSpace: 'pre' }}>{line}</div>;
                })}
              </div>
            </div>

            {/* Tips */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px', marginBottom: 14 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: '#dde4f0', marginBottom: 12 }}>💡 Tips for Better Skills</h4>
              {[
                ['Be specific', 'Define exact conditions (RSI > 65, not "RSI is high")'],
                ['Set thresholds', 'Always include a minimum confidence % to skip bad trades'],
                ['Keep it simple', 'One clear idea per skill beats complex multi-condition logic'],
                ['Use dry-run', 'Test with clawbid start --dry-run before going live'],
                ['Stack skills', 'Load 2-3 complementary skills to cover more conditions'],
              ].map(([tip, desc]) => (
                <div key={tip} style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10, fontSize: 12 }}>
                  <span style={{ color: CYAN, fontFamily: MONO, fontWeight: 600 }}>{tip}</span>
                  <span style={{ color: DIM, lineHeight: 1.6 }}>{desc}</span>
                </div>
              ))}
            </div>

            {/* Manual setup */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
              <p style={{ fontSize: 12.5, color: DIM, lineHeight: 1.7, margin: 0 }}>
                <strong style={{ color: '#dde4f0' }}>Manual setup (alternative):</strong>{' '}
                Go to Dashboard tab → "Generate new webhook" → copy your webhook URL → run:{' '}
                <code style={{ color: CYAN, fontFamily: MONO, fontSize: 11, wordBreak: 'break-all' }}>
                  clawbid init my-agent --webhook YOUR_WEBHOOK_URL
                </code>
              </p>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
