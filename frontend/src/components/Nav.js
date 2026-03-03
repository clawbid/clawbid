'use client';

const tabs = [
  { id: 'markets', label: '🏛 Markets' },
  { id: 'trade', label: '⚡ Trade' },
  { id: 'leaderboard', label: '🏆 Leaderboard' },
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'install', label: '🦀 Install SDK' },
];

export default function Nav({ tab, setTab, wsConnected, webhookId }) {
  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px',
        background: 'rgba(4,6,15,0.92)',
        backdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
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
