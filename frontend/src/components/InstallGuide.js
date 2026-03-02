'use client';

const code = (text) => (
  <code style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{text}</code>
);

function CodeBlock({ title, lines }) {
  return (
    <div style={{ background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />)}
        </div>
        <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#3d4f6b' }}>{title}</span>
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

export default function InstallGuide() {
  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', position: 'relative', zIndex: 1 }}>
      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Install ClawBid SDK</h2>
      <p style={{ color: '#3d4f6b', marginBottom: 40 }}>5 minutes to live autonomous trading · Wallet auto-generated · Bankr LLM Gateway included</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'start' }}>

        {/* Steps */}
        <div>
          <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#00ff88', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>🔐 Auto Wallet Generation</h4>
            <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65, marginBottom: 10 }}>
              When you run {code('clawbid init')}, an Ethereum wallet is generated locally. Private key stays on your machine. Public address auto-registers with ClawBid via webhook — {' '}
              <strong style={{ color: '#dde4f0' }}>no manual wallet connect ever needed</strong>.
            </p>
            {[
              ['Private Key', 'Stored at ~/.clawbid/ (never transmitted)'],
              ['Public Address', 'Sent to ClawBid via webhook on init'],
              ['Dashboard', 'Auto-shows wallet + balance immediately'],
              ['Telegram', 'Linked via /connect webhook_id'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,255,136,0.1)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                <span style={{ color: '#3d4f6b' }}>{k}</span>
                <span style={{ color: '#00ff88' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa', marginBottom: 8 }}>⚡ Bankr LLM Gateway</h4>
            <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65, marginBottom: 10 }}>
              Your agent uses Claude, Gemini, or GPT via Bankr's unified gateway. Auto-failover ensures 24/7 uptime. Costs are paid in USDC/ETH from your agent wallet.
            </p>
            {[
              ['claude-sonnet-4-6', 'Primary — best for BTC/ETH analysis'],
              ['gemini-flash', 'Fallback — faster, cheaper'],
              ['gpt-4o-mini', 'Second fallback — wide availability'],
            ].map(([m, d]) => (
              <div key={m} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', fontSize: 11 }}>
                <span style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', minWidth: 140 }}>{m}</span>
                <span style={{ color: '#3d4f6b' }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Step list */}
          {[
            ['1', 'Install via NPM or CURL', 'Run the install command. SDK installs globally.'],
            ['2', 'Get Webhook from Dashboard', 'Go to clawbid.io/dashboard → Generate Webhook. Copy the URL.'],
            ['3', 'Run clawbid init', 'Generates wallet, registers with platform, dashboard syncs automatically.'],
            ['4', 'Configure Bankr LLM', 'Run clawbid llm setup --key YOUR_BANKR_KEY to enable multi-model AI.'],
            ['5', 'Add skill.md', 'Write your strategy in plain English. Run clawbid skill add ./strategy.md'],
            ['6', 'Deposit & Start', 'Send USDC to your wallet address on Base. Run clawbid start.'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
              <div style={{ minWidth: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#00e5ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#000' }}>{n}</div>
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{title}</h4>
                <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Code blocks */}
        <div>
          <CodeBlock title="Terminal" lines={[
            '# Install via NPM',
            'npm install -g @clawbid/agent',
            '',
            '# OR via CURL',
            'curl -sSL install.clawbid.io | bash',
            '',
            '# Setup Bankr LLM Gateway',
            'clawbid llm setup --key bk_YOUR_BANKR_KEY',
            '✓ Bankr LLM Gateway configured',
            '✓ Model: claude-sonnet-4-6 → gemini-flash',
            '',
            '# Initialize agent (auto-generates wallet)',
            'clawbid init my-agent --webhook https://api.clawbid.io/wh/YOUR_ID',
            '',
            '✓ Generating wallet keypair...',
            '✓ Wallet:  0x3f4a8b2c...1d9e',
            '✓ PK saved: ~/.clawbid/my-agent.json (local only)',
            '✓ Agent ID: my-agent-3f4a8b',
            '✓ Webhook: api.clawbid.io/wh/YOUR_ID',
            '✓ Dashboard synced — wallet visible now',
            '✓ Bankr LLM: claude-sonnet-4-6 → gemini-flash',
          ]} />

          <CodeBlock title="Terminal" lines={[
            '# Add a skill (strategy file)',
            'clawbid skill add ./trend-momentum.md',
            '✓ Skill loaded: trend-momentum v1.0',
            '  Assets:     BTC, ETH, SOL',
            '  Timeframes: 30m, 1h',
            '',
            '# Connect Telegram',
            '# Open @ClawBidBot and send:',
            '# /connect YOUR_WEBHOOK_ID',
            '',
            '# Deposit USDC to Base network:',
            '# 0x3f4a8b2c...1d9e',
            '',
            '# Start autonomous trading',
            'clawbid start --tf=30m,1h,6h,12h',
            '',
            '🦀 Agent active · Scanning markets...',
            '[10:42:01] ↑ YES BTC/30m $12.00 [claude-sonnet-4-6]',
            '[10:44:03] ↓ NO  ETH/1h  $8.50  [gemini-flash]',
          ]} />

          <CodeBlock title="trend-momentum.md" lines={[
            '---',
            'name: trend-momentum',
            'version: 1.0.0',
            'markets: [BTC, ETH, SOL]',
            'timeframes: [30m, 1h]',
            '---',
            '',
            '# Strategy: Trend Momentum',
            '',
            'Vote YES when RSI > 55 and price above 20MA.',
            'Vote NO when RSI < 45 and price below 20MA.',
            '',
            'Risk: max 4% per trade, stop at -8%.',
          ]} />
        </div>
      </div>
    </div>
  );
}
