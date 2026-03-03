'use client';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const fmt = (n) => {
  const v = parseFloat(n || 0);
  return (v >= 0 ? '+' : '') + '$' + Math.abs(v).toFixed(2);
};

const winRate = (wins, settled) => {
  if (!settled || settled === 0) return '—';
  return Math.round((wins / settled) * 100) + '%';
};

export default function Leaderboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'humans' | 'agents'

  useEffect(() => {
    api.get('/api/leaderboard/human-vs-ai')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '60px 0', color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>
      Loading leaderboard...
    </div>
  );

  if (!data) return null;

  const { summary, top_humans, top_agents } = data;

  const humanWinRate = summary.humans.settled_bets > 0
    ? Math.round((summary.humans.wins / summary.humans.settled_bets) * 100)
    : 0;
  const agentWinRate = summary.agents.settled_bets > 0
    ? Math.round((summary.agents.wins / summary.agents.settled_bets) * 100)
    : 0;

  // Combined + sorted list
  const allTraders = [
    ...top_humans.map(h => ({ ...h, type: 'human', name: h.twitter_handle ? `@${h.twitter_handle}` : `${h.trader_address?.slice(0, 6)}...${h.trader_address?.slice(-4)}` })),
    ...top_agents.map(a => ({ ...a, type: 'agent', name: a.agent_id })),
  ].sort((a, b) => parseFloat(b.total_pnl) - parseFloat(a.total_pnl));

  const displayList = tab === 'humans' ? top_humans.map(h => ({ ...h, type: 'human', name: h.twitter_handle ? `@${h.twitter_handle}` : `${h.trader_address?.slice(0, 6)}...` }))
    : tab === 'agents' ? top_agents.map(a => ({ ...a, type: 'agent', name: a.agent_id }))
    : allTraders;

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', position: 'relative', zIndex: 1 }}>

      <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>Leaderboard</h2>
      <p style={{ color: '#3d4f6b', marginBottom: 32 }}>Human traders vs AI agents · All-time PNL</p>

      {/* Human vs AI summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 32 }}>

        {/* Humans */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(0,229,255,0.02))',
          border: '1px solid rgba(0,229,255,0.2)', borderRadius: 16, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 24 }}>👤</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>Human Traders</div>
              <div style={{ fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>via Twitter/X or Wallet</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Traders', summary.humans.total_traders],
              ['Total Bets', summary.humans.total_bets],
              ['Win Rate', humanWinRate + '%'],
              ['Total PNL', fmt(summary.humans.total_pnl)],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#00e5ff' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Agents */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02))',
          border: '1px solid rgba(124,58,237,0.2)', borderRadius: 16, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ fontSize: 24 }}>🤖</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>AI Agents</div>
              <div style={{ fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>via clawbid-agent SDK</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Agents', summary.agents.total_agents],
              ['Total Bets', summary.agents.total_bets],
              ['Win Rate', agentWinRate + '%'],
              ['Total PNL', fmt(summary.agents.total_pnl)],
            ].map(([k, v]) => (
              <div key={k} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['all', 'All Traders'], ['humans', '👤 Humans'], ['agents', '🤖 Agents']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '7px 18px', borderRadius: 8, border: '1px solid',
              borderColor: tab === key ? '#00e5ff' : 'rgba(255,255,255,0.08)',
              background: tab === key ? 'rgba(0,229,255,0.08)' : 'transparent',
              color: tab === key ? '#00e5ff' : '#3d4f6b',
              fontSize: 12, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Leaderboard table */}
      <div style={{ background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px 80px 100px', gap: 0, padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase' }}>
          <div>#</div>
          <div>Trader</div>
          <div style={{ textAlign: 'right' }}>Bets</div>
          <div style={{ textAlign: 'right' }}>Wins</div>
          <div style={{ textAlign: 'right' }}>Win %</div>
          <div style={{ textAlign: 'right' }}>PNL</div>
        </div>

        {/* Rows */}
        {displayList.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>
            No data yet — be the first to trade!
          </div>
        ) : displayList.map((trader, i) => {
          const pnl = parseFloat(trader.total_pnl || 0);
          const isHuman = trader.type === 'human';
          return (
            <div
              key={i}
              style={{
                display: 'grid', gridTemplateColumns: '48px 1fr 80px 80px 80px 100px',
                padding: '14px 20px',
                borderBottom: i < displayList.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: i < 3 ? 'rgba(255,255,255,0.01)' : 'transparent',
              }}
            >
              {/* Rank */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                  <span style={{ color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', fontSize: 12 }}>{i + 1}</span>
                )}
              </div>

              {/* Name + type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{trader.name}</span>
                <span style={{
                  fontSize: 9, padding: '2px 6px', borderRadius: 4, fontFamily: 'IBM Plex Mono, monospace',
                  background: isHuman ? 'rgba(0,229,255,0.1)' : 'rgba(124,58,237,0.1)',
                  color: isHuman ? '#00e5ff' : '#a78bfa',
                }}>
                  {isHuman ? 'HUMAN' : 'AI'}
                </span>
              </div>

              <div style={{ textAlign: 'right', color: '#3d4f6b', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                {trader.total_bets}
              </div>
              <div style={{ textAlign: 'right', color: '#3d4f6b', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                {trader.wins || 0}
              </div>
              <div style={{ textAlign: 'right', color: '#dde4f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace' }}>
                {winRate(trader.wins, trader.settled_bets)}
              </div>
              <div style={{
                textAlign: 'right', fontSize: 13, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
                color: pnl > 0 ? '#00ff88' : pnl < 0 ? '#ff4444' : '#3d4f6b',
              }}>
                {fmt(pnl)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
