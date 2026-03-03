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
          {/* FIX: OpenClaw Key box — explains how to get it */}
          <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#00e5ff', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              🔑 Cara Dapat OpenClaw API Key
            </h4>
            {[
              ['Daftar', 'openclaw.ai → Sign Up → Verifikasi email'],
              ['Login', 'Masuk ke dashboard openclaw.ai'],
              ['API Keys', 'Settings → API Keys → Create New Key'],
              ['Format Key', 'ocl_xxxxxxxxxxxxxxxxxxxxxxxx'],
              ['Pakai di sini', 'Tab Dashboard → Generate new webhook → paste key'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(0,229,255,0.08)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                <span style={{ color: '#3d4f6b', minWidth: 80 }}>{k}</span>
                <span style={{ color: '#00e5ff', textAlign: 'right' }}>{v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: '#00ff88', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>🔐 Auto Wallet Generation</h4>
            <p style={{ fontSize: 12, color: '#3d4f6b', lineHeight: 1.65, marginBottom: 10 }}>
              Saat run {code('clawbid init')}, Ethereum wallet digenerate lokal. Private key tetap di mesinmu.{' '}
              <strong style={{ color: '#dde4f0' }}>Tidak perlu connect wallet manual.</strong>
            </p>
            {[
              ['Private Key', 'Tersimpan di ~/.clawbid/ (tidak pernah dikirim)'],
              ['Public Address', 'Dikirim ke ClawBid via webhook saat init'],
              ['Dashboard', 'Auto-tampilkan wallet + balance'],
              ['Telegram', 'Link via /connect webhook_id'],
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
              Agent menggunakan Claude, Gemini, atau GPT via Bankr's unified gateway. Auto-failover 24/7. Biaya dibayar USDC dari agent wallet.
            </p>
            {[
              ['claude-sonnet-4-6', 'Primary — best for BTC/ETH analysis'],
              ['gemini-flash', 'Fallback — faster, cheaper'],
              ['gpt-4o-mini', 'Second fallback — wide availability'],
            ].map(([m, d]) => (
              <div key={m} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(124,58,237,0.1)', fontSize: 11 }}>
                <span style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', minWidth: 160 }}>{m}</span>
                <span style={{ color: '#3d4f6b' }}>{d}</span>
              </div>
            ))}
          </div>

          {/* Step list */}
          {[
            ['1', 'Dapat OpenClaw API Key', 'Daftar di openclaw.ai → Settings → API Keys → Create Key'],
            ['2', 'Generate Webhook', 'Tab Dashboard → "Generate new webhook" → paste OpenClaw key → Generate'],
            // FIX: corrected npm package name from @clawbid/agent to clawbid-agent
            ['3', 'Install SDK', 'npm install -g clawbid-agent  (atau via CURL)'],
            ['4', 'Run clawbid init', 'clawbid init my-agent --webhook YOUR_WEBHOOK_URL  (wallet auto-generated)'],
            ['5', 'Configure Bankr LLM', 'clawbid llm setup --key YOUR_BANKR_KEY  (enable multi-model AI)'],
            ['6', 'Add skill.md', 'Tulis strategi dalam plain English. clawbid skill add ./strategy.md'],
            ['7', 'Deposit & Start', 'Kirim USDC ke wallet address di Base network. Lalu: clawbid start'],
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
          <CodeBlock title="Terminal — Install & Setup" lines={[
            '# FIX: Nama package yang benar di npm',
            'npm install -g clawbid-agent',
            '',
            '# OR via CURL',
            'curl -sSL install.clawbid.site | bash',
            '',
            '# Setup Bankr LLM Gateway',
            'clawbid llm setup --key bk_YOUR_BANKR_KEY',
            '✓ Bankr LLM Gateway configured',
            '✓ Model: claude-sonnet-4-6 → gemini-flash',
          ]} />

          <CodeBlock title="Terminal — Init Agent" lines={[
            '# Initialize agent (auto-generates wallet)',
            'clawbid init my-agent \\',
            '  --webhook https://api.clawbid.site/wh/YOUR_WEBHOOK_ID',
            '',
            '✓ Generating wallet keypair...',
            '✓ Wallet:  0x3f4a8b2c...1d9e',
            '✓ PK saved: ~/.clawbid/my-agent.json (local only)',
            '✓ Agent ID: my-agent-3f4a8b   ← INI AGENT ID KAMU',
            '✓ Webhook: api.clawbid.site/wh/YOUR_WEBHOOK_ID',
            '✓ Dashboard synced — wallet visible now',
            '✓ Bankr LLM: claude-sonnet-4-6 → gemini-flash',
          ]} />

          <CodeBlock title="Terminal — Start Trading" lines={[
            '# Add a skill (strategy file)',
            'clawbid skill add ./trend-momentum.md',
            '✓ Skill loaded: trend-momentum v1.0',
            '  Assets:     BTC, ETH, SOL',
            '  Timeframes: 30m, 1h',
            '',
            '# Connect Telegram: buka @ClawBidBot dan kirim:',
            '# /connect YOUR_WEBHOOK_ID',
            '',
            '# Deposit USDC ke Base network:',
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
