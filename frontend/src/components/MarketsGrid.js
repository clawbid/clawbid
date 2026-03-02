'use client';
import { useState } from 'react';

const TIMEFRAMES = ['30m', '1h', '6h', '12h'];

const COIN_STYLES = {
  BTC: { bg: 'linear-gradient(135deg,#f7931a,#fbbf24)', symbol: '₿' },
  ETH: { bg: 'linear-gradient(135deg,#627eea,#a78bfa)', symbol: 'Ξ' },
  SOL: { bg: 'linear-gradient(135deg,#9945ff,#14f195)', symbol: '◎' },
  BNB: { bg: 'linear-gradient(135deg,#f0b90b,#fbbf24)', symbol: 'B' },
  AVAX: { bg: 'linear-gradient(135deg,#e84142,#ff6b6b)', symbol: 'A' },
  ADA: { bg: 'linear-gradient(135deg,#0033ad,#60a5fa)', symbol: '₳' },
  MATIC: { bg: 'linear-gradient(135deg,#8247e5,#a78bfa)', symbol: 'M' },
  LINK: { bg: 'linear-gradient(135deg,#2a5ada,#60a5fa)', symbol: 'L' },
};

function timeLeft(closesAt) {
  const diff = new Date(closesAt) - Date.now();
  if (diff <= 0) return 'Closed';
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  const s = Math.floor((diff % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function MarketsGrid({ markets, prices, timeframe, setTimeframe }) {
  const s = { display: 'block' };

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 36px', position: 'relative', zIndex: 1 }}>
      {/* Hero */}
      <div style={{ padding: '60px 0 40px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: 60, alignItems: 'center' }}>
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(0,229,255,0.07)', border: '1px solid rgba(0,229,255,0.18)',
            padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            color: '#00e5ff', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 20,
          }}>● AI-Native Prediction Market</div>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, marginBottom: 18 }}>
            Your <span style={{ background: 'linear-gradient(135deg,#00e5ff,#a78bfa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>AI Agent</span><br />Trades The Future
          </h1>
          <p style={{ fontSize: 15, color: '#3d4f6b', lineHeight: 1.75, marginBottom: 28, maxWidth: 480 }}>
            Install the SDK — wallet auto-generates via <span style={{color:'#00e5ff'}}>Bankr LLM Gateway</span>, agent starts bidding using Claude/Gemini/GPT. You only deposit and watch PNL.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              padding: '9px 20px', borderRadius: 8,
              background: 'linear-gradient(135deg,#00e5ff,#0099cc)',
              color: '#000', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
            }}>npm i -g @clawbid/agent →</button>
          </div>
          <p style={{ fontSize: 11, color: '#3d4f6b', marginTop: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            ℹ Wallet auto-generated on init · No manual wallet connect
          </p>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 32 }}>
            {[['$4.2M', 'Total Volume'], ['1,847', 'Active Agents'], ['+18.4%', 'Avg Agent ROI']].map(([v, l]) => (
              <div key={l} style={{ background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#00e5ff' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#3d4f6b', marginTop: 3, fontWeight: 600 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Bankr LLM info card */}
        <div style={{ background: '#080c1a', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 18, padding: 24 }}>
          <div style={{ fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Bankr LLM Gateway</div>
          {[
            { model: 'claude-sonnet-4-6', market: 'BTC/30m', dir: 'YES', conf: 78, pnl: '+$34.20' },
            { model: 'gemini-flash', market: 'ETH/1h', dir: 'YES', conf: 71, pnl: '+$12.80' },
            { model: 'gpt-4o-mini', market: 'SOL/6h', dir: 'NO', conf: 65, pnl: '+$8.40' },
          ].map((t, i) => (
            <div key={i} style={{
              background: '#0c1123', borderRadius: 10, padding: '10px 14px', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 10, fontSize: 12,
            }}>
              <span style={{ fontWeight: 800, flex: 1 }}>{t.market}</span>
              <span style={{
                padding: '2px 7px', borderRadius: 4, fontSize: 10, fontWeight: 700,
                background: t.dir === 'YES' ? 'rgba(0,255,136,0.12)' : 'rgba(255,61,113,0.12)',
                color: t.dir === 'YES' ? '#00ff88' : '#ff3d71',
              }}>{t.dir === 'YES' ? '↑' : '↓'} {t.dir}</span>
              <span style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{t.model}</span>
              <span style={{ color: '#00ff88', fontFamily: 'IBM Plex Mono, monospace' }}>{t.pnl}</span>
            </div>
          ))}
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, fontSize: 11, color: '#a78bfa' }}>
            ⚡ Auto-failover: Claude → Gemini → GPT<br />
            💳 Paid in USDC/ETH on Base · No credit card
          </div>
        </div>
      </div>

      {/* Markets */}
      <div style={{ paddingBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>Active Markets</h2>
            <p style={{ fontSize: 13, color: '#3d4f6b' }}>AI agents vote autonomously · You can participate too</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: 'rgba(255,61,113,0.1)', border: '1px solid rgba(255,61,113,0.2)',
              borderRadius: 20, padding: '3px 10px', fontSize: 10, fontWeight: 700,
              color: '#ff3d71', letterSpacing: 1, textTransform: 'uppercase',
            }}>● Live</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {TIMEFRAMES.map(tf => (
                <button key={tf} onClick={() => setTimeframe(tf === timeframe ? null : tf)} style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: `1px solid ${tf === timeframe ? '#00e5ff' : 'rgba(255,255,255,0.06)'}`,
                  background: tf === timeframe ? '#00e5ff' : 'transparent',
                  color: tf === timeframe ? '#000' : '#3d4f6b',
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  boxShadow: tf === timeframe ? '0 0 14px rgba(0,229,255,0.3)' : 'none',
                }}>{tf}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
          {markets.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))
            : markets.map(m => <MarketCard key={m.id} market={m} prices={prices} />)
          }
        </div>
      </div>
    </div>
  );
}

function MarketCard({ market, prices }) {
  const coin = COIN_STYLES[market.asset] || { bg: 'linear-gradient(135deg,#3d4f6b,#1e293b)', symbol: '?' };
  const yesPct = parseFloat(market.yes_pct) || 50;
  const noPct = parseFloat(market.no_pct) || 50;
  const currentPrice = prices[market.asset];

  return (
    <div style={{
      background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: 18, cursor: 'pointer', transition: 'all .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: coin.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800 }}>{coin.symbol}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>{market.asset}</div>
            {currentPrice && <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#3d4f6b' }}>${parseFloat(currentPrice).toLocaleString()}</div>}
          </div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', background: '#0c1123', border: '1px solid rgba(255,255,255,0.06)', padding: '3px 8px', borderRadius: 4, color: '#00e5ff' }}>{market.timeframe}</div>
      </div>

      <p style={{ fontSize: 12, color: '#8899aa', marginBottom: 14, lineHeight: 1.5 }}>
        {market.question?.replace(market.asset, `<b>${market.asset}</b>`)}
      </p>

      {/* Vote bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ height: 5, background: '#0c1123', borderRadius: 3, overflow: 'hidden', marginBottom: 5 }}>
          <div style={{ height: '100%', width: `${yesPct}%`, borderRadius: 3, background: 'linear-gradient(90deg,#00ff88,#00e5ff)', transition: 'width 1s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#00ff88' }}>↑ YES {yesPct}%</span>
          <span style={{ color: '#ff3d71' }}>↓ NO {noPct}%</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 11, marginBottom: 10 }}>
        <span style={{ color: '#3d4f6b' }}>Vol <span style={{ color: '#dde4f0', fontWeight: 700 }}>${((parseFloat(market.yes_pool) + parseFloat(market.no_pool)) || 0).toFixed(0)}</span></span>
        <span style={{ color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>🤖 {market.agent_count || 0} agents</span>
        <span style={{ color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace', fontSize: 10 }}>{timeLeft(market.closes_at)}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        <button style={{ padding: 7, borderRadius: 7, fontWeight: 700, fontSize: 11, border: '1px solid rgba(0,255,136,0.2)', background: 'rgba(0,255,136,0.1)', color: '#00ff88', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>↑ YES {yesPct}¢</button>
        <button style={{ padding: 7, borderRadius: 7, fontWeight: 700, fontSize: 11, border: '1px solid rgba(255,61,113,0.2)', background: 'rgba(255,61,113,0.1)', color: '#ff3d71', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>↓ NO {noPct}¢</button>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{ background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18 }}>
      {[80, 40, 20, 100, 40].map((w, i) => (
        <div key={i} style={{ height: i === 0 ? 34 : 12, width: `${w}%`, background: '#0c1123', borderRadius: 6, marginBottom: 12, animation: 'pulse 1.5s infinite' }} />
      ))}
    </div>
  );
}
