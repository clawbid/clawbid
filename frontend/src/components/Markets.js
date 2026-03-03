'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/privy';
import { fetchMarkets } from '../lib/api';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => '$' + parseFloat(n || 0).toFixed(2);
const countdown = (ts) => {
  const diff = Math.max(0, new Date(ts) - Date.now());
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

// ── BetModal ──────────────────────────────────────────────────────────────────
function BetModal({ market, onClose, onBet }) {
  const [direction, setDirection] = useState(null);
  const [amount, setAmount] = useState('10');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const yesPool = parseFloat(market.yes_pool || 0);
  const noPool = parseFloat(market.no_pool || 0);
  const totalPool = yesPool + noPool;
  const yesPct = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPct = 100 - yesPct;

  const handleBet = async () => {
    if (!direction) return setError('Select YES or NO');
    if (!amount || parseFloat(amount) < 1) return setError('Minimum bet: $1 USDC');
    setLoading(true);
    setError(null);
    try {
      await onBet(market.id, direction, parseFloat(amount));
      setSuccess(`✓ Bet placed! ${direction} $${amount} USDC`);
      setTimeout(() => { onClose(); }, 2000);
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        background: '#080c1a', border: '1px solid rgba(0,229,255,0.2)',
        borderRadius: 18, padding: 32, width: 420, maxWidth: '90vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Place Bet</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#3d4f6b', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        {/* Market info */}
        <div style={{ background: '#0c1123', borderRadius: 10, padding: 14, marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6 }}>
            {market.asset} / {market.timeframe}
          </div>
          <div style={{ fontSize: 13, color: '#dde4f0', lineHeight: 1.5 }}>{market.question}</div>
          <div style={{ fontSize: 11, color: '#3d4f6b', marginTop: 8, fontFamily: 'IBM Plex Mono, monospace' }}>
            Closes in: {countdown(market.closes_at)}
          </div>
        </div>

        {/* Odds bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#3d4f6b', marginBottom: 6, fontFamily: 'IBM Plex Mono, monospace' }}>
            <span>YES {yesPct}%</span>
            <span>Pool: {fmt((market.yes_pool || 0) + (market.no_pool || 0))} USDC</span>
            <span>NO {noPct}%</span>
          </div>
          <div style={{ height: 6, background: '#1a2035', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${yesPct}%`, background: 'linear-gradient(90deg,#00ff88,#00e5ff)', borderRadius: 4 }} />
          </div>
        </div>

        {/* Direction buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
          {['YES', 'NO'].map(d => (
            <button
              key={d}
              onClick={() => setDirection(d)}
              style={{
                padding: '14px 0', borderRadius: 10, border: '2px solid',
                borderColor: direction === d ? (d === 'YES' ? '#00ff88' : '#ff4444') : 'rgba(255,255,255,0.08)',
                background: direction === d
                  ? (d === 'YES' ? 'rgba(0,255,136,0.1)' : 'rgba(255,68,68,0.1)')
                  : 'transparent',
                color: direction === d ? (d === 'YES' ? '#00ff88' : '#ff4444') : '#3d4f6b',
                fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {d === 'YES' ? '↑ YES' : '↓ NO'}
            </button>
          ))}
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, color: '#3d4f6b', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace' }}>AMOUNT (USDC)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['5', '10', '25', '50'].map(v => (
              <button
                key={v}
                onClick={() => setAmount(v)}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 7,
                  border: '1px solid',
                  borderColor: amount === v ? '#00e5ff' : 'rgba(255,255,255,0.08)',
                  background: amount === v ? 'rgba(0,229,255,0.08)' : 'transparent',
                  color: amount === v ? '#00e5ff' : '#3d4f6b',
                  fontSize: 12, cursor: 'pointer',
                }}
              >
                ${v}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            min="1"
            placeholder="Custom amount..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              background: '#0c1123', border: '1px solid rgba(255,255,255,0.08)',
              color: '#dde4f0', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Potential payout */}
        {direction && amount && parseFloat(amount) > 0 && (
          <div style={{ background: 'rgba(0,229,255,0.05)', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            <span style={{ color: '#3d4f6b' }}>Est. payout if {direction}: </span>
            <span style={{ color: '#00e5ff' }}>
              ~${(() => {
                const amt = parseFloat(amount);
                const newTotal = totalPool + amt;
                const newPool = direction === 'YES' ? yesPool + amt : noPool + amt;
                const payout = newPool > 0 ? (amt / newPool) * newTotal * 0.98 : amt;
                return payout.toFixed(2);
              })()} USDC
            </span>
          </div>
        )}

        {error && <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>⚠ {error}</div>}
        {success && <div style={{ color: '#00ff88', fontSize: 12, marginBottom: 12, fontFamily: 'IBM Plex Mono, monospace' }}>{success}</div>}

        <button
          onClick={handleBet}
          disabled={loading || !direction}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 10, border: 'none',
            background: loading || !direction
              ? 'rgba(255,255,255,0.05)'
              : 'linear-gradient(135deg,#00e5ff,#7c3aed)',
            color: loading || !direction ? '#3d4f6b' : '#000',
            fontWeight: 800, fontSize: 14, cursor: loading || !direction ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing transaction...' : `Confirm Bet — $${amount || '0'} USDC`}
        </button>
        <p style={{ fontSize: 11, color: '#3d4f6b', textAlign: 'center', marginTop: 10 }}>
          Funds held in smart contract · Auto-settled at close
        </p>
      </div>
    </div>
  );
}

// ── Market Card ───────────────────────────────────────────────────────────────
function MarketCard({ market, onBetClick, userPosition }) {
  const [timer, setTimer] = useState(countdown(market.closes_at));

  useEffect(() => {
    const t = setInterval(() => setTimer(countdown(market.closes_at)), 1000);
    return () => clearInterval(t);
  }, [market.closes_at]);

  const yesPool = parseFloat(market.yes_pool || 0);
  const noPool = parseFloat(market.no_pool || 0);
  const totalPool = yesPool + noPool;
  const yesPct = totalPool > 0 ? Math.round((yesPool / totalPool) * 100) : 50;
  const noPct = 100 - yesPct;
  const humanBets = market.human_count || 0;
  const aiBets = market.agent_count || 0;

  return (
    <div style={{
      background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: 18, transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ background: 'rgba(0,229,255,0.1)', color: '#00e5ff', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
            {market.asset}
          </span>
          <span style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', borderRadius: 5, padding: '2px 8px', fontSize: 10, fontFamily: 'IBM Plex Mono, monospace' }}>
            {market.timeframe}
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>{timer}</span>
      </div>

      {/* Question */}
      <p style={{ fontSize: 13, color: '#dde4f0', lineHeight: 1.5, marginBottom: 14, minHeight: 38 }}>
        {market.question}
      </p>

      {/* Odds bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ height: 6, background: '#1a2035', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
          <div style={{ height: '100%', width: `${yesPct}%`, background: 'linear-gradient(90deg,#00ff88,#00e5ff)', borderRadius: 4, transition: 'width 0.5s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#00ff88' }}>YES {yesPct}%</span>
          <span style={{ color: '#3d4f6b' }}>{fmt(totalPool)} pool</span>
          <span style={{ color: '#ff4444' }}>NO {noPct}%</span>
        </div>
      </div>

      {/* Human vs AI count */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: 'rgba(0,229,255,0.05)', borderRadius: 7, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#3d4f6b' }}>👤 Humans</span>
          <span style={{ color: '#00e5ff' }}>{humanBets}</span>
        </div>
        <div style={{ flex: 1, background: 'rgba(124,58,237,0.05)', borderRadius: 7, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#3d4f6b' }}>🤖 Agents</span>
          <span style={{ color: '#a78bfa' }}>{aiBets}</span>
        </div>
      </div>

      {/* User's existing position */}
      {userPosition && (
        <div style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#3d4f6b' }}>Your bet:</span>
          <span style={{ color: userPosition.direction === 'YES' ? '#00ff88' : '#ff4444' }}>
            {userPosition.direction} {fmt(userPosition.amount)}
          </span>
        </div>
      )}

      {/* Bet button */}
      <button
        onClick={() => onBetClick(market)}
        disabled={!!userPosition}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 8, border: 'none',
          background: userPosition
            ? 'rgba(255,255,255,0.03)'
            : 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,58,237,0.15))',
          color: userPosition ? '#3d4f6b' : '#00e5ff',
          border: `1px solid ${userPosition ? 'rgba(255,255,255,0.04)' : 'rgba(0,229,255,0.2)'}`,
          fontWeight: 700, fontSize: 12, cursor: userPosition ? 'not-allowed' : 'pointer',
        }}
      >
        {userPosition ? '✓ Bet placed' : '⚡ Place Bet'}
      </button>
    </div>
  );
}

// ── Main Markets Component ────────────────────────────────────────────────────
export default function Markets({ prices }) {
  const { ready, authenticated, displayName, address, login, logout, placeBet } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [userPositions, setUserPositions] = useState({});
  const [filter, setFilter] = useState('ALL');
  const [betLoading, setBetLoading] = useState(false);

  useEffect(() => {
    fetchMarkets().then(data => {
      setMarkets(Array.isArray(data) ? data : []);
    }).catch(() => setMarkets([])).finally(() => setLoading(false));

    const interval = setInterval(() => {
      fetchMarkets().then(data => setMarkets(Array.isArray(data) ? data : [])).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleBet = async (marketId, direction, amount) => {
    const result = await placeBet(marketId, direction, amount);
    // Record locally until next API refresh
    setUserPositions(p => ({ ...p, [marketId]: { direction, amount } }));
    return result;
  };

  const filteredMarkets = markets.filter(m => {
    if (filter === 'ALL') return !m.resolved;
    return m.asset === filter && !m.resolved;
  });

  const assets = ['ALL', ...new Set(markets.map(m => m.asset))];

  if (!ready) return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', textAlign: 'center', color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', paddingTop: '120px' }}>
      Loading...
    </div>
  );

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '40px 36px', position: 'relative', zIndex: 1 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 6 }}>
            Prediction Markets
          </h2>
          <p style={{ color: '#3d4f6b', fontSize: 13 }}>
            Bet YES or NO against AI agents · USDC on Base · Auto-settled onchain
          </p>
        </div>

        {/* Login / User pill */}
        {authenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 20, padding: '8px 16px', fontSize: 12, color: '#00e5ff', fontFamily: 'IBM Plex Mono, monospace' }}>
              {displayName}
            </div>
            <button
              onClick={logout}
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '8px 14px', color: '#3d4f6b', fontSize: 12, cursor: 'pointer' }}
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            style={{
              padding: '12px 24px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg,#00e5ff,#7c3aed)',
              color: '#000', fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}
          >
            Login to Trade
          </button>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          ['Active Markets', filteredMarkets.length],
          ['Total Pool', fmt(markets.reduce((s, m) => s + (m.yes_pool || 0) + (m.no_pool || 0), 0)) + ' USDC'],
          ['Human Traders', markets.reduce((s, m) => s + (m.human_count || 0), 0)],
          ['AI Agents', markets.reduce((s, m) => s + (m.agent_count || 0), 0)],
        ].map(([label, value]) => (
          <div key={label} style={{ background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dde4f0' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Asset filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {assets.map(a => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            style={{
              padding: '6px 16px', borderRadius: 8, border: '1px solid',
              borderColor: filter === a ? '#00e5ff' : 'rgba(255,255,255,0.08)',
              background: filter === a ? 'rgba(0,229,255,0.08)' : 'transparent',
              color: filter === a ? '#00e5ff' : '#3d4f6b',
              fontSize: 12, cursor: 'pointer', fontFamily: 'IBM Plex Mono, monospace',
            }}
          >
            {a}
          </button>
        ))}
      </div>

      {/* Login prompt */}
      {!authenticated && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,229,255,0.05), rgba(124,58,237,0.05))',
          border: '1px solid rgba(0,229,255,0.15)', borderRadius: 12,
          padding: '20px 24px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Login to place bets</div>
            <div style={{ fontSize: 12, color: '#3d4f6b' }}>Connect Twitter/X or your wallet to trade against AI agents</div>
          </div>
          <button
            onClick={login}
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg,#00e5ff,#7c3aed)',
              color: '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            Connect →
          </button>
        </div>
      )}

      {/* Markets grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>
          Loading markets...
        </div>
      ) : filteredMarkets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>
          No active markets right now. Check back soon.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filteredMarkets.map(market => (
            <MarketCard
              key={market.id}
              market={market}
              onBetClick={authenticated ? setSelectedMarket : () => login()}
              userPosition={userPositions[market.id]}
            />
          ))}
        </div>
      )}

      {/* Bet modal */}
      {selectedMarket && (
        <BetModal
          market={selectedMarket}
          onClose={() => setSelectedMarket(null)}
          onBet={handleBet}
        />
      )}
    </div>
  );
}
