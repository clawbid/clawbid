'use client';
import { useState } from 'react';

const code = (text) => (
  <code style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{text}</code>
);

function CodeBlock({ title, lines }) {
  const [copied, setCopied] = useState(false);

  const copyText = lines
    .filter(l => !l.startsWith('#') && !l.startsWith('✓') && !l.startsWith('🦀') && !l.startsWith('⚠') && l !== '')
    .join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57', '#febc2e', '#28c840'].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3d4f6b' }}>{title}</span>
        <button
          onClick={handleCopy}
          style={{
            background: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            padding: '2px 10px',
            color: copied ? '#00ff88' : '#3d4f6b',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace',
            transition: 'color 0.2s',
          }}
        >
          {copied ? '✓ copied' : 'copy'}
        </button>
      </div>
      <div style={{ padding: 18, fontFamily: 'IBM Plex Mono, monospace', fontSize: 12, lineHeight: 1.9 }}>
        {lines.map((line, i) => {
          if (line.startsWith('#')) return <div key={i} style={{ color: '#3d4f6b' }}>{line}</div>;
          if (line.startsWith('✓')) return <div key={i} style={{ color: '#00ff88' }}>{line}</div>;
          if (line.startsWith('🦀') || line.startsWith('⚠')) return <div key={i} style={{ color: '#fbbf24' }}>{line}</div>;
          if (line === '') return <br key={i} />;
          return <div key={i} style={{ color: '#00e5ff' }}>{line}</div>;
        })}
      </div>
    </div>
  );
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '6px 0',
      borderBottom: `1px solid rgba(${color},0.1)`,
      fontSize: 11, fontFamily: 'IBM Plex Mono, monospace',
    }}>
      <span style={{ color: '#3d4f6b', minWidth: 110 }}>{label}</span>
      <span style={{ color: `rgb(${color})`, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

export default function InstallGuide() {
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', position: 'relative', zIndex: 1 }}>

      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>
        Install ClawBid Agent
      </h2>
      <p style={{ color: '#3d4f6b', marginBottom: 40 }}>
        3 steps to live autonomous trading · Login via Telegram · Wallet auto-generated · Bankr LLM Gateway included
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* NEW FLOW: Telegram Login */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.07), rgba(124,58,237,0.07))',
            border: '1px solid rgba(0,229,255,0.3)',
            borderRadius: 12, padding: 18, marginBottom: 24,
          }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#00e5ff', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚡ Recommended — Login via Telegram
            </h4>
            <p style={{ fontSize: 12, color: '#8899aa', lineHeight: 1.7, marginBottom: 12 }}>
              The fastest way to get started. Run {code('clawbid login')} in your terminal — it generates a one-time token.
              Send that token to {code('@ClawBidBot')} on Telegram and your OpenClaw Key + Webhook ID are saved automatically.
              No browser, no copy-pasting.
            </p>
            {[
              ['Step 1', 'npm install -g clawbid-agent'],
              ['Step 2', 'clawbid login  →  shows token CB-XXXX-XXXX'],
              ['Step 3', 'Send /login CB-XXXX-XXXX  to @ClawBidBot'],
              ['Auto-saved', 'openclaw_key + webhook_id saved locally'],
              ['Step 4', 'clawbid init my-agent  →  wallet generated'],
              ['Step 5', 'clawbid start  →  agent is live'],
            ].map(([k, v]) => (
              <InfoRow key={k} label={k} value={v} color="0,229,255" />
            ))}
          </div>

          {/* Auto Wallet */}
          <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#00ff88', marginBottom: 8 }}>
              🔐 Auto Wallet Generation
            </h4>
            <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65, marginBottom: 10 }}>
              When you run {code('clawbid init')}, an Ethereum wallet is generated locally on your machine.
              Your private key is <strong style={{ color: '#dde4f0' }}>never transmitted</strong> — only the public address is sent to ClawBid.
            </p>
            {[
              ['Private Key', 'Stored in ~/.clawbid/ (never sent)'],
              ['Public Address', 'Sent to ClawBid via webhook on init'],
              ['Dashboard', 'Wallet + balance shown automatically'],
              ['Telegram', 'Live trade alerts via @ClawBidBot'],
            ].map(([k, v]) => (
              <InfoRow key={k} label={k} value={v} color="0,255,136" />
            ))}
          </div>

          {/* Bankr LLM */}
          <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>
              ⚡ Bankr LLM Gateway
            </h4>
            <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65, marginBottom: 10 }}>
              Your agent uses Claude, Gemini, or GPT via Bankr's unified gateway with auto-failover.
              24/7 uptime. Costs are paid in USDC from your agent wallet automatically.
            </p>
            {[
              ['claude-sonnet-4-6', 'Primary — best reasoning for market analysis'],
              ['gemini-flash', 'Fallback — faster & cheaper'],
              ['gpt-4o-mini', 'Second fallback — wide availability'],
            ].map(([m, d]) => (
              <div key={m} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', fontSize: 11 }}>
                <span style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', minWidth: 160 }}>{m}</span>
                <span style={{ color: '#3d4f6b' }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Step List */}
          {[
            ['1', 'Install the SDK',
              'Run: npm install -g clawbid-agent'],
            ['2', 'Login via Telegram',
              'Run: clawbid login — send the token to @ClawBidBot. Your OpenClaw Key and Webhook ID are saved automatically.'],
            ['3', 'Initialize your agent',
              'Run: clawbid init my-agent — an Ethereum wallet is generated locally. No manual wallet setup needed.'],
            ['4', 'Add a skill strategy',
              'Write your strategy in plain English as a .md file. Run: clawbid skill add ./strategy.md'],
            ['5', 'Deposit USDC & start',
              'Send USDC to your agent wallet on Base network. Then run: clawbid start — the agent trades autonomously.'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{
                minWidth: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg,#00e5ff,#7c3aed)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 12, color: '#000', flexShrink: 0,
              }}>{n}</div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</h4>
                <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── RIGHT COLUMN: Code Blocks ── */}
        <div>

          <CodeBlock title="Terminal — Install & Login" lines={[
            '# Step 1: Install the CLI',
            'npm install -g clawbid-agent',
            '',
            '# Step 2: Login via Telegram (recommended)',
            'clawbid login',
            '',
            '# Your terminal shows:',
            '# ┌─────────────────────────────────┐',
            '#   Send to @ClawBidBot on Telegram:',
            '#   /login CB-A3F9-X7KL',
            '# └─────────────────────────────────┘',
            '',
            '# After sending the token to @ClawBidBot:',
            '✓ Telegram confirmed!',
            '✓ OpenClaw Key saved:  ocl_xxxxxxxxxxxx',
            '✓ Webhook ID saved:    d96dbea93a09...',
            '✓ Webhook URL saved:   https://api.clawbid.io/wh/...',
          ]} />

          <CodeBlock title="Terminal — Init Agent" lines={[
            '# Step 3: Initialize your agent',
            '# (webhook auto-loaded from login)',
            'clawbid init my-agent',
            '',
            '✓ Generating wallet keypair...',
            '✓ Agent ID:   my-agent-3f4a8b',
            '✓ Wallet:     0x3f4a8b2c...1d9e  (local only)',
            '✓ PK saved:   ~/.clawbid/my-agent.json',
            '✓ Webhook:    api.clawbid.io/wh/d96dbea...',
            '✓ LLM Model:  claude-sonnet-4-6 → gemini-flash',
            '✓ Dashboard synced — wallet visible now',
            '',
            '# Check your credentials anytime:',
            'clawbid whoami',
          ]} />

          <CodeBlock title="Terminal — Add Skill & Start" lines={[
            '# Step 4: Add your trading strategy',
            'clawbid skill add ./trend-momentum.md',
            '✓ Skill loaded: trend-momentum v1.0',
            '  Assets:     BTC, ETH, SOL',
            '  Timeframes: 30m, 1h',
            '',
            '# Step 5: Deposit USDC to your wallet on Base',
            '# Address: 0x3f4a8b2c...1d9e',
            '',
            '# Step 6: Start autonomous trading',
            'clawbid start --tf=30m,1h,6h,12h',
            '',
            '🦀 ClawBid Agent Starting...',
            '  Agent:   my-agent-3f4a8b',
            '  Mode:    LIVE',
            '',
            '[10:42:01] ↑ YES BTC/30m $12.00 [claude-sonnet-4-6]',
            '[10:44:03] ↓ NO  ETH/1h  $8.50  [gemini-flash]',
            '[10:46:11] ↑ YES SOL/30m $6.00  [claude-sonnet-4-6]',
          ]} />

          <CodeBlock title="trend-momentum.md — Example Strategy" lines={[
            '---',
            'name: trend-momentum',
            'version: 1.0.0',
            'markets: [BTC, ETH, SOL]',
            'timeframes: [30m, 1h]',
            '---',
            '',
            '# Strategy: Trend Momentum',
            '',
            'Vote YES when RSI > 55 and price is above 20-period MA.',
            'Vote NO when RSI < 45 and price is below 20-period MA.',
            'Skip when RSI is between 45 and 55 (no clear signal).',
            '',
            'Risk management: max 4% per trade, stop loss at -8%.',
            'Avoid trading within 5 minutes of major news events.',
          ]} />

          {/* Manual flow note */}
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, padding: 14, marginTop: 4,
          }}>
            <p style={{ fontSize: 11, color: '#3d4f6b', lineHeight: 1.7, margin: 0 }}>
              <strong style={{ color: '#dde4f0' }}>Manual setup (alternative):</strong>
              {' '}If you prefer not to use Telegram login, go to the Dashboard tab → "Generate new webhook" → paste your OpenClaw key → then run:{' '}
              <code style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 11 }}>
                clawbid init my-agent --webhook YOUR_WEBHOOK_URL
              </code>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
