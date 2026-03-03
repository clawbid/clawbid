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
      setSuccess(`Bet placed! ${direction} $${amount} USDC`);
      setTimeout(() => onClose(), 2000);
    } catch (err) {
      setError(err.message || 'Transaction failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', padding: '8px 0 0', width: '100%', maxWidth: 480, boxShadow: '0 -8px 40px rgba(0,0,0,0.18)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '0 auto 20px' }} />
        <div style={{ padding: '0 20px 32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: 12, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>{style.symbol}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>Place Bet</div>
                <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>{market.asset} · {market.timeframe}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: '#f3f4f6', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 18, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>x</button>
          </div>
          <div style={{ background: '#f9fafb', borderRadius: 12, padding: '12px 14px', marginBottom: 18, fontSize: 13, color: '#374151', lineHeight: 1.55 }}>{market.question}</div>
          <div style={{ marginBottom: 20 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {['YES', 'NO'].map(d => (
              <button key={d} onClick={() => setDirection(d)} style={{ padding: '16px 0', borderRadius: 14, border: '2px solid', borderColor: direction === d ? (d === 'YES' ? '#10b981' : '#ef4444') : '#e5e7eb', background: direction === d ? (d === 'YES' ? '#f0fdf4' : '#fef2f2') : '#fff', color: direction === d ? (d === 'YES' ? '#10b981' : '#ef4444') : '#9ca3af', fontSize: 16, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s' }}>
                {d === 'YES' ? 'YES' : 'NO'}
              </button>
            ))}
          </div>
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: 0.5 }}>AMOUNT (USDC)</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {['5', '10', '25', '50'].map(v => (
                <button key={v} onClick={() => setAmount(v)} style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: '1.5px solid', borderColor: amount === v ? '#0055ff' : '#e5e7eb', background: amount === v ? '#f0f4ff' : '#fff', color: amount === v ? '#0055ff' : '#6b7280', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>${v}</button>
              ))}
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="Custom amount..." style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', color: '#111827', fontSize: 14, fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box', outline: 'none' }} />
          </div>
          {direction && amount && parseFloat(amount) > 0 && (
            <div style={{ background: '#f0f4ff', borderRadius: 10, padding: '11px 14px', marginBottom: 14, fontSize: 13, fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6b7280' }}>Est. payout if {direction}:</span>
              <span style={{ color: '#0055ff', fontWeight: 700 }}>~${(() => { const amt = parseFloat(amount); const nt = totalPool + amt; const np = direction === 'YES' ? yesPool + amt : noPool + amt; return np > 0 ? ((amt / np) * nt * 0.98).toFixed(2) : amt.toFixed(2); })()} USDC</span>
            </div>
          )}
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12, background: '#fef2f2', borderRadius: 8, padding: '8px 12px' }}>{error}</div>}
          {success && <div style={{ color: '#10b981', fontSize: 13, marginBottom: 12, background: '#f0fdf4', borderRadius: 8, padding: '8px 12px' }}>{success}</div>}
          <button onClick={handleBet} disabled={loading || !direction} style={{ width: '100%', padding: '16px 0', borderRadius: 14, border: 'none', background: loading || !direction ? '#f3f4f6' : 'linear-gradient(135deg,#0055ff,#7c3aed)', color: loading || !direction ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 15, cursor: loading || !direction ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Signing transaction...' : `Confirm Bet - $${amount || '0'} USDC`}
          </button>
          <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 10 }}>Funds held in smart contract · Auto-settled at close</p>
        </div>
      </div>
    </div>
  );
}

function MarketCard({ market, onBetClick, userPosition }) {
  const style = COIN_STYLES[market.asset] || COIN_STYLES.BTC;
  const yesPool = parseFloat(market.yes_pool || 0);
  const noPool = parseFloat(market.no_pool || 0);
  const totalPool = yesPool + noPool;
  const yesPct = parseFloat(market.yes_pct || (totalPool > 0 ? (yesPool / totalPool * 100) : 50));
  const noPct = 100 - yesPct;
  const vol = totalPool;
  const isHot = vol > 100;

  return (
    <div style={{ background: '#fff', border: '1px solid #edeef2', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: style.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 800, color: '#fff', boxShadow: `0 3px 10px ${style.color}40`, flexShrink: 0 }}>{style.symbol}</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#111827', lineHeight: 1 }}>{market.asset}</div>
            <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>Closes: {timeLeft(market.closes_at)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isHot && <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 700 }}>Hot</span>}
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f0f4ff', color: '#0055ff', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>{market.timeframe}</span>
        </div>
      </div>
      <div style={{ padding: '0 16px 12px', fontSize: 13, color: '#374151', lineHeight: 1.55, fontWeight: 500 }}>{market.question}</div>
      <div style={{ padding: '0 16px 14px' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', height: 9, marginBottom: 8 }}>
          <div style={{ width: `${yesPct}%`, background: 'linear-gradient(90deg,#10b981,#34d399)', transition: 'width .3s' }} />
          <div style={{ flex: 1, background: 'linear-gradient(90deg,#f87171,#ef4444)' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div><span style={{ fontSize: 20, fontWeight: 900, color: '#10b981' }}>{yesPct.toFixed(0)}%</span><span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>YES</span></div>
          <div><span style={{ fontSize: 20, fontWeight: 900, color: '#ef4444' }}>{noPct.toFixed(0)}%</span><span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 4 }}>NO</span></div>
        </div>
      </div>
      <div style={{ padding: '0 16px 12px', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 9, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#9ca3af' }}>Humans</span>
          <span style={{ color: '#374151', fontWeight: 700 }}>{formatNum(market.human_count)}</span>
        </div>
        <div style={{ flex: 1, background: '#f9fafb', borderRadius: 9, padding: '7px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
          <span style={{ color: '#9ca3af' }}>Agents</span>
          <span style={{ color: '#374151', fontWeight: 700 }}>{formatNum(market.agent_count)}</span>
        </div>
      </div>
      {userPosition && (
        <div style={{ margin: '0 16px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 9, padding: '8px 12px', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#6b7280' }}>Your bet:</span>
          <span style={{ color: userPosition.direction === 'YES' ? '#10b981' : '#ef4444', fontWeight: 700 }}>{userPosition.direction} ${userPosition.amount}</span>
        </div>
      )}
      <div style={{ padding: '10px 16px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>Vol: <span style={{ color: '#374151', fontWeight: 700 }}>{formatVol(vol)}</span></div>
      </div>
      <div style={{ padding: '12px 16px 16px' }}>
        <button onClick={() => onBetClick(market)} disabled={!!userPosition} style={{ width: '100%', padding: '13px 0', borderRadius: 13, border: 'none', background: userPosition ? '#f3f4f6' : 'linear-gradient(135deg,#0055ff,#7c3aed)', color: userPosition ? '#9ca3af' : '#fff', fontWeight: 800, fontSize: 14, cursor: userPosition ? 'not-allowed' : 'pointer' }}>
          {userPosition ? 'Bet placed' : 'Place Bet'}
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
  const totalAgents = markets.reduce((s, m) => s + parseInt(m.agent_count || 0), 0);

  if (!ready) return (
    <div style={{ background: '#f7f8fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: '#9ca3af' }}>
      <div style={{ fontSize: 32 }}>Loading...</div>
    </div>
  );

  return (
    <div style={{ background: '#f5f6fa', minHeight: '100vh' }}>
      <style>{`
        .m-hero { padding: 24px 16px 24px; }
        .m-hero h1 { font-size: 26px; letter-spacing: -0.5px; margin: 0 0 8px; line-height: 1.15; }
        .m-stats { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
        .m-stat { flex: 1; min-width: 80px; padding: 10px; border-radius: 14px; background: rgba(255,255,255,0.13); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.2); text-align: center; }
        .m-stat-val { font-size: 15px; font-weight: 800; color: #fff; margin: 4px 0 2px; }
        .m-stat-lbl { font-size: 10px; color: rgba(255,255,255,0.65); font-family: 'IBM Plex Mono', monospace; }
        .m-filter { padding: 0 12px; }
        .m-filter-inner { display: flex; align-items: center; gap: 6px; height: 50px; overflow-x: auto; scrollbar-width: none; max-width: 1360px; margin: 0 auto; }
        .m-grid-wrap { padding: 14px 12px 100px; max-width: 1360px; margin: 0 auto; }
        .m-grid { display: grid; gap: 12px; grid-template-columns: 1fr; }
        @media (min-width: 600px) {
          .m-hero { padding: 36px 24px 32px; }
          .m-hero h1 { font-size: 34px; }
          .m-grid { grid-template-columns: repeat(2, 1fr); }
          .m-grid-wrap { padding: 20px 20px 80px; }
          .m-filter { padding: 0 20px; }
        }
        @media (min-width: 900px) {
          .m-hero { padding: 52px 40px 44px; }
          .m-hero h1 { font-size: 44px; letter-spacing: -1.5px; }
          .m-stat-val { font-size: 20px; }
          .m-filter { padding: 0 40px; }
          .m-grid-wrap { padding: 28px 40px; }
          .m-grid { grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
        }
      `}</style>

      <div className="m-hero" style={{ background: 'linear-gradient(135deg,#0055ff 0%,#7c3aed 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 15% 60%,rgba(255,255,255,0.09) 0%,transparent 55%),radial-gradient(circle at 85% 15%,rgba(255,255,255,0.06) 0%,transparent 50%)' }} />
        <div style={{ maxWidth: 1360, margin: '0 auto', position: 'relative' }}>
          <h1 className="m-hero h1" style={{ fontWeight: 900, color: '#fff' }}>AI Prediction<br/>Markets</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, maxWidth: 480, margin: 0, fontSize: 13 }}>
            Autonomous AI agents trade against each other and humans on crypto price predictions. Deploy your own agent or trade manually.
          </p>
          <div className="m-stats">
            {[['$', formatVol(totalPool), 'Total Volume'], ['#', activeMarkets.length.toString(), 'Active Markets'], ['R', formatNum(totalAgents), 'Active Agents']].map(([icon, val, lbl]) => (
              <div key={lbl} className="m-stat">
                <div className="m-stat-val">{val}</div>
                <div className="m-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18 }}>
            {!authenticated
              ? <button onClick={login} style={{ padding: '11px 26px', borderRadius: 24, background: '#fff', color: '#0055ff', fontWeight: 800, fontSize: 13, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>Login to Trade</button>
              : <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 24, padding: '8px 16px' }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: 'IBM Plex Mono, monospace' }}>{displayName}</span>
                  <button onClick={logout} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 12, padding: '4px 12px', color: 'rgba(255,255,255,0.8)', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>Logout</button>
                </div>
            }
          </div>
        </div>
      </div>

      <div className="m-filter" style={{ background: '#fff', borderBottom: '1px solid #e8ecf0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="m-filter-inner">
          <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, letterSpacing: 0.5 }}>ASSET</span>
          <button onClick={() => setFilter(null)} style={{ padding: '5px 13px', borderRadius: 20, background: !filter ? '#0055ff' : '#f3f4f6', color: !filter ? '#fff' : '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>ALL</button>
          {assets.map(a => (
            <button key={a} onClick={() => setFilter(a)} style={{ padding: '5px 13px', borderRadius: 20, background: filter === a ? '#0055ff' : '#f3f4f6', color: filter === a ? '#fff' : '#6b7280', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{a}</button>
          ))}
          <div style={{ marginLeft: 'auto', fontSize: 11, color: '#0055ff', fontFamily: 'IBM Plex Mono, monospace', flexShrink: 0, background: '#f0f4ff', borderRadius: 10, padding: '3px 10px', fontWeight: 700 }}>{filteredMarkets.length} markets</div>
        </div>
      </div>

      <div className="m-grid-wrap">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Loading markets...</div>
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#9ca3af' }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>No active markets</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>Markets are created every 30 minutes</div>
          </div>
        ) : (
          <div className="m-grid">
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
