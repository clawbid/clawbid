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
  const shortAddr = address ? `${address.slice(0,6)}...${address.slice(-4)}` : '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: open ? '#f0f4ff' : '#f7f8fa',
        border: `1px solid ${open ? '#c7d7ff' : '#e5e7eb'}`,
        borderRadius: 24, padding: '5px 12px 5px 7px',
        cursor: 'pointer', transition: 'all .15s',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'linear-gradient(135deg,#0055ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 800 }}>
          {displayName?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{displayName || shortAddr}</div>
          <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'IBM Plex Mono, monospace' }}>
            ${parseFloat(balance || 0).toFixed(2)} USDC
          </div>
        </div>
        <span style={{ fontSize: 9, color: '#9ca3af', transition: 'transform .2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', border: '1px solid #e8ecf0', borderRadius: 14, padding: 6, minWidth: 220, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 500 }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f3f4f6', marginBottom: 4 }}>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>WALLET BALANCE</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>
              ${parseFloat(balance || 0).toFixed(2)} <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>USDC</span>
            </div>
            <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace', marginTop: 4 }}>{shortAddr}</div>
          </div>
          {[['⬇  Deposit USDC', '#0055ff', '#f0f4ff', onDeposit], ['⬆  Withdraw', '#10b981', '#f0fdf4', onWithdraw]].map(([lbl, clr, bg, fn]) => (
            <button key={lbl} onClick={() => { fn?.(); setOpen(false); }}
              style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 2 }}
              onMouseEnter={e => e.currentTarget.style.background = bg}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            ><span style={{ color: clr }}>{lbl}</span></button>
          ))}
          <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />
          {address && (
            <a href={`https://basescan.org/address/${address}`} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 600, color: '#6b7280', textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >🔗  View on Basescan</a>
          )}
          <button onClick={() => { onLogout(); setOpen(false); }}
            style={{ width: '100%', padding: '9px 14px', borderRadius: 9, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#ef4444' }}
            onMouseEnter={e => e.currentTarget.style.background = '#fff1f2'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >← Logout</button>
        </div>
      )}
    </div>
  );
}

export default function Nav({ tab, setTab, wsConnected, webhookId }) {
  const [hovered, setHovered] = useState(null);
  const { ready, authenticated, displayName, address, usdcBalance, login, logout } = useAuth();

  return (
    // SINGLE BAR ONLY — no second tab bar below
    <nav style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #e8ecf0',
      boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 32px', height: 58, display: 'flex', alignItems: 'center', gap: 0 }}>

        {/* Logo */}
        <div onClick={() => setTab('markets')} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', marginRight: 24, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#0055ff,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, boxShadow: '0 2px 8px rgba(0,85,255,0.2)' }}>🦀</div>
          <span style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.5, background: 'linear-gradient(90deg,#0055ff,#7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ClawBid</span>
        </div>

        {/* Tabs — SINGLE ROW, no second bar */}
        <div style={{ display: 'flex', gap: 1, flex: 1 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered(null)}
              style={{
                padding: '6px 13px', cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                background: tab === t.id ? '#f0f4ff' : hovered === t.id ? '#f7f8fa' : 'transparent',
                border: tab === t.id ? '1px solid #d0ddff' : '1px solid transparent',
                borderBottom: tab === t.id ? '2px solid #0055ff' : '2px solid transparent',
                borderRadius: tab === t.id ? '8px 8px 0 0' : 8,
                color: tab === t.id ? '#0055ff' : '#6b7280',
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                marginBottom: tab === t.id ? '-1px' : 0,
                transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 12 }}>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {/* Right: human wallet + agent chip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {ready && (authenticated ? (
            <WalletDropdown
              displayName={displayName} address={address} balance={usdcBalance}
              onLogout={logout}
              onDeposit={() => alert(`Deposit USDC to your wallet on Base:\n${address}`)}
              onWithdraw={() => alert('Withdraw coming soon — use Dashboard for agent withdrawals.')}
            />
          ) : (
            <button onClick={login} style={{ padding: '7px 18px', borderRadius: 20, background: 'linear-gradient(135deg,#0055ff,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', boxShadow: '0 2px 8px rgba(0,85,255,0.2)' }}>
              Login to Trade
            </button>
          ))}

          <div style={{ width: 1, height: 26, background: '#e8ecf0' }} />

          {/* Agent chip */}
          <div onClick={() => setTab('dashboard')} style={{ display: 'flex', alignItems: 'center', gap: 7, background: wsConnected ? '#f0fff8' : '#f7f8fa', border: `1px solid ${wsConnected ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 24, padding: '5px 12px 5px 9px', cursor: 'pointer' }}>
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

// ── REMOVE OLD SECOND TAB BAR — nothing below this line renders a second bar
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #00e5ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
          }}>🦀</div>
          <span style={{
            fontSize: 20, fontWeight: 800,
            background: 'linear-gradient(90deg, #00e5ff, #a78bfa)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>ClawBid</span>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '6px 14px', borderRadius: 6,
              background: tab === t.id ? 'rgba(0,229,255,0.08)' : 'transparent',
              border: 'none', cursor: 'pointer',
              color: tab === t.id ? '#00e5ff' : '#3d4f6b',
              fontSize: 13, fontWeight: 600, fontFamily: 'Syne, sans-serif',
              transition: 'all .2s',
            }}>{t.label}</button>
          ))}
        </div>

        {/* Agent status chip */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(12,17,35,1)', border: '1px solid rgba(0,229,255,0.15)',
          borderRadius: 20, padding: '5px 14px 5px 8px', cursor: 'pointer',
        }} onClick={() => setTab('dashboard')}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: wsConnected ? '#00ff88' : '#3d4f6b',
            boxShadow: wsConnected ? '0 0 8px #00ff88' : 'none',
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#dde4f0' }}>
              {webhookId ? 'Agent Connected' : 'Connect Agent'}
            </div>
            {webhookId && (
              <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>
                {webhookId.slice(0, 16)}...
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: 'rgba(4,6,15,1)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 36px',
        position: 'relative', zIndex: 10,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '13px 20px', fontSize: 13, fontWeight: 600,
            color: tab === t.id ? '#00e5ff' : '#3d4f6b',
            background: 'none', border: 'none', cursor: 'pointer',
            borderBottom: tab === t.id ? '2px solid #00e5ff' : '2px solid transparent',
            fontFamily: 'Syne, sans-serif', transition: 'color .2s',
          }}>{t.label}</button>
        ))}
      </div>
    </>
  );
}
