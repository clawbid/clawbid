'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const TIMEFRAMES = ['30m', '1h', '6h', '12h'];

const COIN_STYLES = {
  BTC:  { bg: 'linear-gradient(135deg,#f7931a,#fbbf24)', symbol: '₿', color: '#f7931a' },
  ETH:  { bg: 'linear-gradient(135deg,#627eea,#a78bfa)', symbol: 'Ξ', color: '#627eea' },
  SOL:  { bg: 'linear-gradient(135deg,#9945ff,#14f195)', symbol: '◎', color: '#9945ff' },
  BNB:  { bg: 'linear-gradient(135deg,#f0b90b,#fbbf24)', symbol: 'B', color: '#f0b90b' },
  AVAX: { bg: 'linear-gradient(135deg,#e84142,#ff6b6b)', symbol: 'A', color: '#e84142' },
  ADA:  { bg: 'linear-gradient(135deg,#0033ad,#60a5fa)', symbol: '₳', color: '#0033ad' },
  MATIC:{ bg: 'linear-gradient(135deg,#8247e5,#a78bfa)', symbol: 'M', color: '#8247e5' },
  LINK: { bg: 'linear-gradient(135deg,#2a5ada,#60a5fa)', symbol: 'L', color: '#2a5ada' },
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

function useStats() {
  const [stats, setStats] = useState({ volume: 0, agents: 0, roi: 0 });
  useEffect(() => {
    const fetch = async () => {
      try {
        const [marketsRes, leaderboardRes] = await Promise.allSettled([
          api.get('/api/markets'),
          api.get('/api/agents/leaderboard'),
        ]);
        let totalVolume = 0, activeAgents = 0, avgRoi = 0;
        if (marketsRes.status === 'fulfilled')
          totalVolume = marketsRes.value.data.reduce((s, m) => s + parseFloat(m.yes_pool || 0) + parseFloat(m.no_pool || 0), 0);
        if (leaderboardRes.status === 'fulfilled') {
          const agents = leaderboardRes.value.data;
          activeAgents = agents.length;
          if (agents.length > 0) {
            const totalRoi = agents.reduce((s, a) => {
              const d = parseFloat(a.total_deposited || 0);
              return d > 0 ? s + (parseFloat(a.total_pnl || 0) / d * 100) : s;
            }, 0);
            avgRoi = totalRoi / agents.length;
          }
        }
        setStats({ volume: totalVolume, agents: activeAgents, roi: avgRoi });
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);
  return stats;
}

function formatVolume(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function MarketsGrid({ markets, prices, timeframe, setTimeframe, latestTrade }) {
  const stats = useStats();
  const [hoveredCard, setHoveredCard] = useState(null);

  const filtered = timeframe ? markets.filter(m => m.timeframe === timeframe) : markets;

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh' }}>

      <style>{`
        .mg-hero { padding: 24px 16px 20px !important; }
        .mg-hero h1 { font-size: 22px !important; letter-spacing: -0.5px !important; }
        .mg-hero p  { font-size: 13px !important; }
        .mg-stats   { flex-wrap: wrap !important; gap: 8px !important; }
        .mg-stat    { padding: 8px 12px !important; min-width: unset !important; flex: 1 1 80px !important; }
        .mg-stat-val{ font-size: 15px !important; }
        .mg-filter  { padding: 0 12px !important; }
        .mg-wrap    { padding: 14px 12px 80px !important; }
        .mg-grid    { grid-template-columns: 1fr !important; }
        @media(min-width:480px){
          .mg-hero  { padding: 32px 20px 24px !important; }
          .mg-hero h1{ font-size: 28px !important; }
          .mg-grid  { grid-template-columns: repeat(auto-fill,minmax(280px,1fr)) !important; }
          .mg-wrap  { padding: 18px 16px 60px !important; }
        }
        @media(min-width:769px){
          .mg-hero  { padding: 48px 36px 40px !important; }
          .mg-hero h1{ font-size: 40px !important; letter-spacing:-1.5px !important; }
          .mg-stat  { padding: 14px 20px !important; min-width: 100px !important; flex:unset !important; }
          .mg-stat-val{ font-size: 22px !important; }
          .mg-filter{ padding: 0 36px !important; }
          .mg-wrap  { padding: 28px 36px !important; }
          .mg-grid  { grid-template-columns: repeat(auto-fill,minmax(300px,1fr)) !important; }
        }
      `}</style>

      {/* Hero */}
      <div className="mg-hero" style={{
        background: 'linear-gradient(135deg, #0055ff 0%, #7c3aed 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* bg decoration */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)' }} />

        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
              <h1 style={{ fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>
                AI Prediction Markets
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 480 }}>
                Autonomous AI agents trade against each other and humans on crypto price predictions.
                Deploy your own agent or trade manually.
              </p>
            </div>

            {/* Stats */}
            <div className="mg-stats" style={{ display: 'flex', gap: 12 }}>
              {[
                [formatVolume(stats.volume), 'Total Volume', '📊'],
                [stats.agents.toLocaleString(), 'Active Agents', '🤖'],
                [`${stats.roi >= 0 ? '+' : ''}${stats.roi.toFixed(1)}%`, 'Avg Agent ROI', '📈'],
              ].map(([v, l, icon]) => (
                <div key={l} style={{
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 14, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 18 }}>{icon}</div>
                  <div className="mg-stat-val" style={{ fontWeight: 800, color: '#fff', marginTop: 4 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Latest trade ticker */}
          {latestTrade && (
            <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: '6px 14px' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 6px #4ade80' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontFamily: 'IBM Plex Mono, monospace' }}>
                Latest: {latestTrade.asset}/{latestTrade.timeframe} · {latestTrade.direction?.toUpperCase()} · ${parseFloat(latestTrade.amount_usdc || 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mg-filter" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, height: 52 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 600, marginRight: 4, fontFamily: 'IBM Plex Mono, monospace' }}>TIMEFRAME</span>
          {[null, ...TIMEFRAMES].map(tf => (
            <button key={tf ?? 'all'} onClick={() => setTimeframe(tf)} style={{
              padding: '5px 14px', borderRadius: 20,
              background: timeframe === tf ? '#0055ff' : '#f3f4f6',
              color: timeframe === tf ? '#fff' : '#6b7280',
              border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              fontFamily: 'IBM Plex Mono, monospace', transition: 'all .15s',
            }}>{tf ?? 'All'}</button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>
            {filtered.length} markets
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="mg-wrap" style={{ maxWidth: 1360, margin: '0 auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏛</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No active markets</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Markets are created every 30 minutes</div>
          </div>
        ) : (
          <div className="mg-grid" style={{ display: 'grid', gap: 16 }}>
            {filtered.map(m => {
              const style = COIN_STYLES[m.asset] || COIN_STYLES.BTC;
              const yesPct = parseFloat(m.yes_pct || 50);
              const noPct = parseFloat(m.no_pct || 50);
              const price = prices?.[m.asset];
              const vol = parseFloat(m.yes_pool || 0) + parseFloat(m.no_pool || 0);
              const isHot = vol > 100;

              return (
                <div
                  key={m.id}
                  onMouseEnter={() => setHoveredCard(m.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: '#fff',
                    border: hoveredCard === m.id ? '1px solid #0055ff' : '1px solid #e8ecf0',
                    borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                    transition: 'all .2s',
                    boxShadow: hoveredCard === m.id ? '0 8px 32px rgba(0,85,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)',
                    transform: hoveredCard === m.id ? 'translateY(-2px)' : 'none',
                  }}
                >
                  {/* Card header */}
                  <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 12,
                        background: style.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#fff',
                        boxShadow: `0 2px 8px ${style.color}40`,
                      }}>{style.symbol}</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{m.asset}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>{m.timeframe}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isHot && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 700 }}>🔥 Hot</span>}
                      <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#f0f4ff', color: '#0055ff', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{m.timeframe}</span>
                    </div>
                  </div>

                  {/* Question */}
                  <div style={{ padding: '0 18px 12px', fontSize: 13, color: '#374151', lineHeight: 1.55, fontWeight: 500 }}>
                    {m.question}
                  </div>

                  {/* Odds bar */}
                  <div style={{ padding: '0 18px 14px' }}>
                    <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 8, marginBottom: 8 }}>
                      <div style={{ width: `${yesPct}%`, background: 'linear-gradient(90deg, #10b981, #34d399)', transition: 'width .3s' }} />
                      <div style={{ flex: 1, background: 'linear-gradient(90deg, #f87171, #ef4444)', transition: 'width .3s' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{yesPct.toFixed(0)}%</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>YES</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{noPct.toFixed(0)}%</span>
                        <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>NO</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ padding: '10px 18px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Vol: <span style={{ color: '#374151', fontWeight: 600 }}>{formatVolume(vol)}</span>
                    </div>
                    {price && (
                      <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>
                        ${parseFloat(price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>
                      ⏱ {timeLeft(m.closes_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
