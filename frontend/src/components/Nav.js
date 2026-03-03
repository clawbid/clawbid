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
  const [menuOpen, setMenuOpen] = useState(false);
  const { ready, authenticated, displayName, address, usdcBalance, login, logout } = useAuth();

  const handleTabClick = (id) => {
    setTab(id);
    setMenuOpen(false);
  };

  return (
    <>
      <style>{`
        .nav-desktop-tabs { display: flex; }
        .nav-agent-btn { display: flex; }
        .nav-hamburger { display: none !important; }
        .nav-mobile-menu { display: none; }
        .mobile-bottom-tabs { display: none !important; }
        @media (max-width: 768px) {
          .nav-desktop-tabs { display: none !important; }
          .nav-agent-btn { display: none !important; }
          .nav-hamburger { display: flex !important; }
          .nav-mobile-menu { display: block; }
          .mobile-bottom-tabs { display: flex !important; }
          .nav-inner { padding: 0 16px !important; }
        }
      `}</style>

      <nav style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #e8ecf0', boxShadow: '0 1px 8px rgba(0,0,0,0.05)' }}>
        <div className="nav-inner" style={{ maxWidth: 1360, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', gap: 0 }}>

          {/* Brand */}
          <div onClick={() => handleTabClick('markets')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginRight: 24, flexShrink: 0 }}>
            <img src="/logo.png" alt="ClawBid" style={{ width: 34, height: 34, objectFit: 'contain', borderRadius: 6 }} />
            <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(90deg,#0055ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ClawBid</span>
          </div>

          {/* Desktop tabs */}
          <div className="nav-desktop-tabs" style={{ gap: 1, flex: 1 }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)} style={{ padding: '6px 13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif', background: tab === t.id ? '#f0f4ff' : hovered === t.id ? '#f7f8fa' : 'transparent', border: tab === t.id ? '1px solid #d0ddff' : '1px solid transparent', borderBottom: tab === t.id ? '2px solid #0055ff' : '2px solid transparent', borderRadius: tab === t.id ? '8px 8px 0 0' : '8px', color: tab === t.id ? '#0055ff' : '#6b7280', fontSize: 13, fontWeight: tab === t.id ? 700 : 500, marginBottom: tab === t.id ? '-1px' : '0px', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 'auto' }}>
            {ready && (authenticated ? (
              <WalletDropdown displayName={displayName} address={address} balance={usdcBalance} onLogout={logout} onDeposit={() => alert('Deposit USDC to: ' + address)} onWithdraw={() => alert('Withdraw coming soon')} />
            ) : (
              <button onClick={login} style={{ padding: '7px 18px', borderRadius: 20, background: 'linear-gradient(135deg,#0055ff,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap' }}>Login</button>
            ))}

            {/* Agent status - desktop only */}
            <div className="nav-agent-btn" style={{ alignItems: 'center', gap: 10 }}>
              <div style={{ width: 1, height: 26, background: '#e8ecf0' }} />
              <div onClick={() => setTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: wsConnected ? '#f0fff8' : '#f7f8fa', border: wsConnected ? '1px solid #bbf7d0' : '1px solid #e5e7eb', borderRadius: 24, padding: '5px 12px 5px 9px', cursor: 'pointer' }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#10b981' : '#d1d5db', boxShadow: wsConnected ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none' }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: wsConnected ? '#065f46' : '#374151', lineHeight: 1.2 }}>Agent</div>
                  <div style={{ fontSize: 10, color: '#9ca3af' }}>{webhookId ? 'Connected' : 'Connect'}</div>
                </div>
              </div>
            </div>

            {/* Hamburger - mobile only */}
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(o => !o)}
              style={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 5, width: 38, height: 38, background: menuOpen ? '#f0f4ff' : 'transparent', border: '1px solid ' + (menuOpen ? '#c7d7ff' : '#e5e7eb'), borderRadius: 8, cursor: 'pointer', padding: 0 }}
            >
              <span style={{ display: 'block', width: 18, height: 2, background: menuOpen ? '#0055ff' : '#374151', borderRadius: 2, transition: 'all .2s', transform: menuOpen ? 'rotate(45deg) translate(0px, 7px)' : 'none' }} />
              <span style={{ display: 'block', width: 18, height: 2, background: menuOpen ? '#0055ff' : '#374151', borderRadius: 2, transition: 'all .2s', opacity: menuOpen ? 0 : 1 }} />
              <span style={{ display: 'block', width: 18, height: 2, background: menuOpen ? '#0055ff' : '#374151', borderRadius: 2, transition: 'all .2s', transform: menuOpen ? 'rotate(-45deg) translate(0px, -7px)' : 'none' }} />
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="nav-mobile-menu" style={{ background: '#fff', borderTop: '1px solid #f3f4f6', paddingBottom: 8 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', background: tab === t.id ? '#f0f4ff' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#0055ff' : '#374151', textAlign: 'left', borderLeft: tab === t.id ? '3px solid #0055ff' : '3px solid transparent' }}
              >
                <span style={{ fontSize: 18 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
            <div style={{ margin: '6px 16px 4px', paddingTop: 10, borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: wsConnected ? '#10b981' : '#d1d5db' }} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>Agent {webhookId ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="mobile-bottom-tabs" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 199, background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', borderTop: '1px solid #e8ecf0', flexDirection: 'row', padding: '6px 0 max(8px, env(safe-area-inset-bottom))' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => handleTabClick(t.id)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 2px', background: 'transparent', border: 'none', cursor: 'pointer', color: tab === t.id ? '#0055ff' : '#9ca3af' }}
          >
            <span style={{ fontSize: 20 }}>{t.icon}</span>
            <span style={{ fontSize: 9, fontWeight: tab === t.id ? 700 : 500, fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
              {t.id === 'install' ? 'SDK' : t.label}
            </span>
            {tab === t.id && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#0055ff', marginTop: 1 }} />}
          </button>
        ))}
      </div>
    </>
  );
}
