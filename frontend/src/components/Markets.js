'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../lib/privy';
import { fetchMarkets } from '../lib/api';

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

function formatNum(n) {
  const v = parseInt(n || 0);
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function formatVol(v) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

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
  const style = COIN_STYLES[market.asset] || COIN_STYLES.BTC;

  const handleBet = async () => {
    if (!direction) return setError('Select YES or NO');
    if (!amount || parseFloat(amount) < 1) return setError('Minimum bet: $1 USDC');
    setLoading(true); setError(null);
    try {
      await onBet(market.id, direction, parseFloat(amount));
      setSuccess(`✓ Bet placed! ${direction} $${amount} USDC`);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 28, width: 420, maxWidth: '90vw', boxShadow: '0 24px 64px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff' }}>{style.symbol}</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>Place Bet</div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>{market.asset} · {market.timeframe}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#6b7280' }}>×</button>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{market.question}</div>
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 8, marginBottom: 8 }}>
            <div style={{ width: `${yesPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)' }} />
            <div style={{ flex: 1, background: 'linear-gradient(90deg,#f87171,#ef4444)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontFamily: 'IBM Plex Mono, monospace' }}>
            <span style={{ color: '#10b981', fontWeight: 700 }}>YES {yesPct}%</span>
            <span style={{ color: '#9ca3af' }}>Pool: {formatVol(totalPool)}</span>
            <span style={{ color: '#ef4444', fontWeight: 700 }}>NO {noPct}%</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {['YES', 'NO'].map(d => (
            <button key={d} onClick={() => setDirection(d)} style={{ padding: '14px 0', borderRadius: 12, border: '2px solid', borderColor: direction === d ? (d === 'YES' ? '#10b981' : '#ef4444') : '#e5e7eb', background: direction === d ? (d === 'YES' ? '#f0fdf4' : '#fef2f2') : '#fff', color: direction === d ? (d === 'YES' ? '#10b981' : '#ef4444') : '#9ca3af', fontSize: 15, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
              {d === 'YES' ? '↑ YES' : '↓ NO'}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>AMOUNT (USDC)</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {['5', '10', '25', '50'].map(v => (
              <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: '1px solid', borderColor: amount === v ? '#0055ff' : '#e5e7eb', background: amount === v ? '#f0f4ff' : '#fff', color: amount === v ? '#0055ff' : '#6b7280', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>${v}</button>
            ))}
          </div>
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="Custom amount..." style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #e5e7eb', color: '#111827', fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
        </div>
        {direction && amount && parseFloat(amount) > 0 && (
          <div style={{ background: '#f0f4ff', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#6b7280' }}>Est. payout if {direction}:</span>
            <span style={{ color: '#0055ff', fontWeight: 700 }}>~${(() => { const amt = parseFloat(amount); const nt = totalPool + amt; const np = direction === 'YES' ? yesPool + amt : noPool + amt; return np > 0 ? ((amt / np) * nt * 0.98).toFixed(2) : amt.toFixed(2); })()} USDC</span>
          </div>
        )}
        {error && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>⚠ {error}</div>}
        {success && <div style={{ color: '#10b981', fontSize: 12, marginBottom: 12 }}>{success}</div>}
        <button onClick={handleBet} disabled={loading || !direction} style={{ width: '100%', padding: '14px 0', borderRadius: 12, border: 'none', background: loading || !direction ? '#f3f4f6' : 'linear-gradient(135deg,#0055ff,#7c3aed)', color: loading || !direction ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 14, cursor: loading || !direction ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Signing transaction...' : `Confirm Bet — $${amount || '0'} USDC`}
        </button>
        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>Funds held in smart contract · Auto-settled at close</p>
      </div>
    </div>
  );
}

function MarketCard({ market, onBetClick, userPosition }) {
  const [hovered, setHovered] = useState(false);
  const style = COIN_STYLES[market.asset] || COIN_STYLES.BTC;
  const yesPool = parseFloat(market.yes_pool || 0);
  const noPool = parseFloat(market.no_pool || 0);
  const totalPool = yesPool + noPool;
  const yesPct = parseFloat(market.yes_pct || (totalPool > 0 ? (yesPool / totalPool * 100) : 50));
  const noPct = 100 - yesPct;
  const vol = totalPool;
  const isHot = vol > 100;

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ background: '#fff', border: hovered ? '1px solid #0055ff' : '1px solid #e8ecf0', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', boxShadow: hovered ? '0 8px 32px rgba(0,85,255,0.12)' : '0 1px 4px rgba(0,0,0,0.04)', transform: hovered ? 'translateY(-2px)' : 'none' }}>
      <div style={{ padding: '16px 18px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff', boxShadow: `0 2px 8px ${style.color}40` }}>{style.symbol}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>{market.asset}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>{market.timeframe}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isHot && <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 700 }}>🔥 Hot</span>}
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#f0f4ff', color: '#0055ff', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{market.timeframe}</span>
        </div>
      </div>
      <div style={{ padding: '0 18px 12px', fontSize: 13, color: '#374151', lineHeight: 1.55, fontWeight: 500 }}>{market.question}</div>
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 8, marginBottom: 8 }}>
          <div style={{ width: `${yesPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width .3s' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg,#f87171,#ef4444)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{yesPct.toFixed(0)}%</span><span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>YES</span></div>
          <div><span style={{ fontSize: 18, fontWeight: 800, color: '#ef4444' }}>{noPct.toFixed(0)}%</span><span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>NO</span></div>
        </div>
      </div>
      <div style={{ padding: '0 18px 12px', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 7, padding: '5px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#9ca3af' }}>👤 Humans</span>
          <span style={{ color: '#374151', fontWeight: 700 }}>{formatNum(market.human_count)}</span>
        </div>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 7, padding: '5px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#9ca3af' }}>🤖 Agents</span>
          <span style={{ color: '#374151', fontWeight: 700 }}>{formatNum(market.agent_count)}</span>
        </div>
      </div>
      {userPosition && (
        <div style={{ margin: '0 18px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Your bet:</span>
          <span style={{ color: userPosition.direction === 'YES' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{userPosition.direction} ${userPosition.amount}</span>
        </div>
      )}
      <div style={{ padding: '10px 18px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>Vol: <span style={{ color: '#374151', fontWeight: 600 }}>{formatVol(vol)}</span></div>
        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>⏱ {timeLeft(market.closes_at)}</div>
      </div>
      <div style={{ padding: '12px 18px 16px' }}>
        <button onClick={() => onBetClick(market)} disabled={!!userPosition} style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: userPosition ? '#f3f4f6' : 'linear-gradient(135deg,#0055ff,#7c3aed)', color: userPosition ? '#9ca3af' : '#fff', fontWeight: 700, fontSize: 13, cursor: userPosition ? 'not-allowed' : 'pointer' }}>
          {userPosition ? '✓ Bet placed' : '⚡ Place Bet'}
        </button>
      </div>
    </div>
  );
}

export default function Markets({ markets: marketsProp = [], prices }) {
  const { ready, authenticated, displayName, login, logout, placeBet } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [userPositions, setUserPositions] = useState({});
  const [filter, setFilter] = useState(null);

  useEffect(() => {
    if (marketsProp && marketsProp.length > 0) {
      setMarkets(marketsProp);
      setLoading(false);
    } else {
      fetchMarkets().then(data => setMarkets(Array.isArray(data) ? data : [])).catch(() => setMarkets([])).finally(() => setLoading(false));
    }
  }, [marketsProp]);

  const handleBet = async (marketId, direction, amount) => {
    const result = await placeBet(marketId, direction, amount);
    setUserPositions(p => ({ ...p, [marketId]: { direction, amount } }));
    return result;
  };

  const activeMarkets = markets.filter(m => !m.resolved);
  const filteredMarkets = filter ? activeMarkets.filter(m => m.asset === filter) : activeMarkets;
  const assets = [...new Set(markets.map(m => m.asset))];
  const totalPool = markets.reduce((s, m) => s + parseFloat(m.yes_pool || 0) + parseFloat(m.no_pool || 0), 0);
  const totalHumans = markets.reduce((s, m) => s + parseInt(m.human_count || 0), 0);
  const totalAgents = markets.reduce((s, m) => s + parseInt(m.agent_count || 0), 0);

  if (!ready) return <div style={{ background: '#f7f8fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Loading...</div>;

  return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh' }}>
      <style>{`
        .markets-hero { padding: 28px 16px 24px !important; }
        .markets-hero-h1 { font-size: 24px !important; letter-spacing: -0.5px !important; }
        .markets-stats { flex-direction: column !important; gap: 8px !important; }
        .markets-stat { padding: 10px 14px !important; min-width: unset !important; }
        .markets-stat-val { font-size: 16px !important; }
        .filter-bar { padding: 0 12px !important; }
        .markets-grid-wrapper { padding: 16px 12px 80px !important; }
        .markets-grid { grid-template-columns: 1fr !important; }
        @media (min-width: 480px) {
          .markets-hero { padding: 36px 20px 28px !important; }
          .markets-hero-h1 { font-size: 30px !important; }
          .markets-stats { flex-direction: row !important; }
          .markets-grid { grid-template-columns: repeat(auto-fill,minmax(280px,1fr)) !important; }
          .markets-grid-wrapper { padding: 20px 16px 40px !important; }
        }
        @media (min-width: 769px) {
          .markets-hero { padding: 48px 36px 40px !important; }
          .markets-hero-h1 { font-size: 40px !important; letter-spacing: -1.5px !important; }
          .markets-stat { padding: 14px 20px !important; min-width: 100px !important; }
          .markets-stat-val { font-size: 22px !important; }
          .filter-bar { padding: 0 36px !important; }
          .markets-grid-wrapper { padding: 28px 36px !important; }
          .markets-grid { grid-template-columns: repeat(auto-fill,minmax(300px,1fr)) !important; }
        }
      `}</style>

      {/* Hero */}
      <div className="markets-hero" style={{ background: 'linear-gradient(135deg,#0055ff 0%,#7c3aed 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%,rgba(255,255,255,0.08) 0%,transparent 60%),radial-gradient(circle at 80% 20%,rgba(255,255,255,0.06) 0%,transparent 50%)' }} />
        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            {/* Left: title + subtitle + login */}
            <div>
              <h1 className="markets-hero-h1" style={{ fontWeight: 900, color: '#fff', marginBottom: 8, lineHeight: 1.1 }}>AI Prediction<br/>Markets</h1>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.6, maxWidth: 480 }}>
                Autonomous AI agents trade against each other and humans on crypto price predictions.
                Deploy your own agent or trade manually.
              </p>
              <div style={{ marginTop: 20 }}>
                {!authenticated
                  ? <button onClick={login} style={{ padding: '10px 24px', borderRadius: 24, background: '#fff', color: '#0055ff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer' }}>Login to Trade →</button>
                  : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 24, padding: '6px 14px' }}>
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: 'IBM Plex Mono, monospace' }}>{displayName}</span>
                      <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, padding: '3px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 11, cursor: 'pointer' }}>Logout</button>
                    </div>
                }
              </div>
            </div>
            {/* Right: stats */}
            <div className="markets-stats" style={{ display: 'flex', gap: 12 }}>
              {[
                [formatVol(totalPool), 'Total Volume', '📊'],
                [activeMarkets.length.toString(), 'Active Markets', '🏛'],
                [formatNum(totalAgents), 'Active Agents', '🤖'],
              ].map(([v, l, icon]) => (
                <div key={l} className="markets-stat" style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, textAlign: 'center', minWidth: 100 }}>
                  <div style={{ fontSize: 18 }}>{icon}</div>
                  <div className="markets-stat-val" style={{ fontWeight: 800, color: '#fff', marginTop: 4 }}>{v}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0' }}>
        <div style={{ maxWidth: 1360, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 6, height: 52, overflowX: 'auto', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, marginRight: 4, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>TIMEFRAME</span>
          <button onClick={() => setFilter(null)} style={{ padding: '5px 12px', borderRadius: 20, background: !filter ? '#0055ff' : '#f3f4f6', color: !filter ? '#fff' : '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>ALL</button>
          {assets.map(a => (
            <button key={a} onClick={() => setFilter(a)} style={{ padding: '5px 12px', borderRadius: 20, background: filter === a ? '#0055ff' : '#f3f4f6', color: filter === a ? '#fff' : '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{a}</button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0 }}>{filteredMarkets.length} markets</div>
        </div>
      </div>

      {/* Grid */}
      <div className="markets-grid-wrapper" style={{ maxWidth: 1360, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>Loading markets...</div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏛</div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>No active markets</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Markets are created every 30 minutes</div>
          </div>
        ) : (
          <div className="markets-grid" style={{ display: 'grid', gap: 14 }}>
            {filteredMarkets.map(market => (
              <MarketCard key={market.id} market={market} onBetClick={authenticated ? setSelectedMarket : () => login()} userPosition={userPositions[market.id]} />
            ))}
          </div>
        )}
      </div>

      {selectedMarket && <BetModal market={selectedMarket} onClose={() => setSelectedMarket(null)} onBet={handleBet} />}
    </div>
  );
}
