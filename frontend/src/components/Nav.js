'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../lib/privy';

const tabs = [
  { id: 'markets',     label: 'Markets',     icon: '🏛' },
  { id: 'trade',       label: 'Trade',       icon: '⚡' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'dashboard',   label: 'Dashboard',   icon: '📊' },
  { id: 'install',     label: 'Install SDK', icon: '🦀' },
];

function WalletDropdown({ displayName, address, balance, onLogout, onDeposit, onWithdraw }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const shortAddr = address ? address.slice(0,6) + '...' + address.slice(-4) : '';
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: open ? '#f0f4ff' : '#f7f8fa', border: '1px solid ' + (open ? '#c7d7ff' : '#e5e7eb'), borderRadius: 24, padding: '5px 12px 5px 7px', cursor: 'pointer', transition: 'all .15s' }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800 }}>
          {displayName ? displayName[0].toUpperCase() : '?'}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{displayName || shortAddr}</div>
          <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>${parseFloat(balance || 0).toFixed(2)} USDC</div>
        </div>
        <span style={{ fontSize: 9, color: '#9ca3af', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>▼</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: '1px solid #e8ecf0', borderRadius: 14, padding: 6, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 500 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>WALLET BALANCE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>${parseFloat(balance || 0).toFixed(2)} <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>USDC</span></div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', marginTop: 4 }}>{shortAddr}</div>
          </div>
          <button onClick={() => { onDeposit && onDeposit(); setOpen(false); }} onMouseEnter={e => e.currentTarget.style.background='#f0f4ff'} onMouseLeave={e => e.currentTarget.style.background='transparent'} style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#0055ff', display: 'block', marginBottom: 2 }}>⬇ Deposit USDC</button>
          <button onClick={() => { onWithdraw && onWithdraw(); setOpen(false); }} onMouseEnter={e => e.currentTarget.style.background='#f0fdf4'} onMouseLeave={e => e.currentTarget.style.background='transparent'} style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 2 }}>⬆ Withdraw</button>
          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
          {address && (
            <a href={'https://basescan.org/address/' + address} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)} onMouseEnter={e => e.currentTarget.style.background='#f9fafb'} onMouseLeave={e => e.currentTarget.style.background='transparent'} style={{ display: 'block', padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}>View on Basescan</a>
          )}
          <button onClick={() => { onLogout && onLogout(); setOpen(false); }} onMouseEnter={e => e.currentTarget.style.background='#fff1f2'} onMouseLeave={e => e.currentTarget.style.background='transparent'} style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#ef4444' }}>Logout</button>
        </div>
      )}
    </div>
  );
}

export default function Nav({ tab, setTab, wsConnected, webhookId }) {
  const [hovered, setHovered] = useState(null);
  const { ready, authenticated, displayName, address, usdcBalance, login, logout } = useAuth();
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e8ecf0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', gap: 0 }}>
        <div onClick={() => setTab('markets')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginRight: 24, flexShrink: 0 }}>
          <div style={{ width: 34, height: 34, flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" width="34" height="34">
              <defs>
                <linearGradient id="navGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#00e5ff"/>
                  <stop offset="100%" stopColor="#00ff88"/>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="46" fill="#060910" stroke="url(#navGrad)" strokeWidth="1.5"/>
              <path d="M22 30 C22 24 27 20 33 21 L44 24 L46 34 L36 40 L24 38 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M20 42 C19 36 23 32 28 33 L38 36 L38 48 L27 52 L19 48 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M22 56 C21 50 26 46 32 48 L40 52 L38 64 L28 68 L20 62 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M28 68 C26 74 30 80 38 80 L48 78 L48 70 L38 66 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <line x1="50" y1="18" x2="50" y2="82" stroke="url(#navGrad)" strokeWidth="1.8"/>
              <path d="M50 22 C58 18 70 18 76 26 C80 31 79 37 74 40 L64 42 L56 36 L50 28 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M56 24 C62 22 70 23 74 28" stroke="url(#navGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
              <path d="M56 30 C62 28 70 29 74 34" stroke="url(#navGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/>
              <path d="M50 78 C58 82 70 82 76 74 C80 69 79 63 74 60 L64 58 L56 64 L50 72 Z" fill="none" stroke="url(#navGrad)" strokeWidth="2.2" strokeLinejoin="round"/>
              <path d="M56 76 C62 78 70 77 74 72" stroke="url(#navGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.6"/>
              <path d="M56 70 C62 72 70 71 74 66" stroke="url(#navGrad)" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/>
              <text x="52" y="59" fontSize="13" fontWeight="900" fill="url(#navGrad)" fontFamily="Arial, sans-serif" letterSpacing="-0.5">YES</text>
              <text x="52" y="75" fontSize="13" fontWeight="900" fill="url(#navGrad)" fontFamily="Arial, sans-serif" letterSpacing="-0.5">NO</text>
            </svg>
          </div>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(90deg,#0055ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ClawBid</span>
        </div>
        <div style={{ display: 'flex', gap: 1, flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)} style={{ padding: '6px 13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', background: tab === t.id ? '#f0f4ff' : hovered === t.id ? '#f7f8fa' : 'transparent', border: tab === t.id ? '1px solid #d0ddff' : '1px solid transparent', borderBottom: tab === t.id ? '2px solid #0055ff' : '2px solid transparent', borderRadius: tab === t.id ? '8px 8px 0 0' : '8px', color: tab === t.id ? '#0055ff' : '#6b7280', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, marginBottom: tab === t.id ? '-1px' : '0px', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {ready && (authenticated ? (
            <WalletDropdown displayName={displayName} address={address} balance={usdcBalance} onLogout={logout} onDeposit={() => alert('Deposit USDC to: ' + address)} onWithdraw={() => alert('Withdraw coming soon')} />
          ) : (
            <button onClick={login} style={{ padding: '7px 18px', borderRadius: 20, background: 'linear-gradient(135deg,#0055ff,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Login to Trade</button>
          ))}
          <div style={{ width: 1, height: 26, background: '#e8ecf0' }} />
          <div onClick={() => setTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: wsConnected ? '#f0fff8' : '#f7f8fa', border: wsConnected ? '1px solid #bbf7d0' : '1px solid #e5e7eb', borderRadius: 24, padding: '5px 12px 5px 9px', cursor: 'pointer' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#10b981' : '#d1d5db', boxShadow: wsConnected ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' }} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: wsConnected ? '#065f46' : '#374151', lineHeight: 1.2 }}>Agent</div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>{webhookId ? 'Connected' : 'Connect'}</div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
