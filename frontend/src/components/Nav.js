'use client';
import { useState } from 'react';

const tabs = [
  { id: 'markets', label: 'Markets', icon: '🏛' },
  { id: 'trade',   label: 'Trade',   icon: '⚡' },
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'dashboard',   label: 'Dashboard',   icon: '📊' },
  { id: 'install', label: 'Install SDK', icon: '🦀' },
];

export default function Nav({ tab, setTab, wsConnected, webhookId }) {
  const [hovered, setHovered] = useState(null);

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 200,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid #e8ecf0',
      boxShadow: '0 1px 12px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        maxWidth: 1360, margin: '0 auto',
        padding: '0 36px',
        height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => setTab('markets')}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #0066ff, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 17, boxShadow: '0 2px 8px rgba(0,102,255,0.3)',
          }}>🦀</div>
          <span style={{
            fontSize: 20, fontWeight: 800, letterSpacing: -0.5,
            background: 'linear-gradient(90deg, #0066ff, #7c3aed)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>ClawBid</span>
          <span style={{
            fontSize: 10, padding: '2px 7px', borderRadius: 20,
            background: '#f0f4ff', color: '#0066ff',
            fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace',
            border: '1px solid #d0ddff',
          }}>BETA</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              onMouseEnter={() => setHovered(t.id)}
              onMouseLeave={() => setHovered(null)}
              style={{
                padding: '7px 16px', borderRadius: 8,
                background: tab === t.id ? '#f0f4ff' : hovered === t.id ? '#f7f8fa' : 'transparent',
                border: tab === t.id ? '1px solid #d0ddff' : '1px solid transparent',
                cursor: 'pointer',
                color: tab === t.id ? '#0066ff' : '#6b7280',
                fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                fontFamily: 'Syne, sans-serif',
                transition: 'all .15s',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
            >
              <span style={{ fontSize: 13 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Agent status */}
        <div
          onClick={() => setTab('dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 9,
            background: wsConnected ? '#f0fff8' : '#f7f8fa',
            border: wsConnected ? '1px solid #bbf7d0' : '1px solid #e5e7eb',
            borderRadius: 24, padding: '6px 14px 6px 10px',
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: wsConnected ? '#10b981' : '#d1d5db',
            boxShadow: wsConnected ? '0 0 0 3px rgba(16,185,129,0.2)' : 'none',
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: wsConnected ? '#065f46' : '#374151' }}>
              {webhookId ? 'Agent Connected' : 'Connect Agent'}
            </div>
            {webhookId && (
              <div style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'IBM Plex Mono, monospace' }}>
                {webhookId.slice(0, 14)}...
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
