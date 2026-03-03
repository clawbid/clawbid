'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchAgentMe, fetchPNL, fetchPositions, fetchLLMStats, registerAgent } from '../lib/api';

const C = {
  blue: '#0055ff', purple: '#7c3aed', green: '#10b981', red: '#ef4444',
  border: '#e8ecf0', bg: '#f7f8fa', white: '#fff',
  text: '#111827', muted: '#6b7280', dim: '#9ca3af',
};

const card = (children, extra = {}) => (
  <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', ...extra }}>
    {children}
  </div>
);

const label = (t) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: C.dim, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 10 }}>{t}</div>
);

const fmt = (val) => {
  const n = parseFloat(val || 0);
  return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);
};

export default function Dashboard({ webhookId, setWebhookId, prices }) {
  const [agent, setAgent] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [positions, setPositions] = useState([]);
  const [llmStats, setLlmStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputWebhook, setInputWebhook] = useState('');
  const [openclawKey, setOpenclawKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!webhookId) return;
    setLoading(true); setError(null);
    Promise.all([fetchAgentMe(webhookId), fetchPNL(webhookId), fetchPositions(webhookId, false), fetchLLMStats(webhookId)])
      .then(([ag, p, pos, llm]) => { setAgent(ag); setPnl(p); setPositions(pos); setLlmStats(llm); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [webhookId]);

  const connectWebhook = () => {
    const val = inputWebhook.trim();
    if (!val) return;
    const id = val.includes('/wh/') ? val.split('/wh/')[1] : val;
    localStorage.setItem('clawbid_webhook_id', id);
    setWebhookId(id);
  };

  const generateWebhook = async () => {
    if (!openclawKey.trim()) return;
    setGenerating(true);
    try {
      const result = await registerAgent(openclawKey.trim());
      setGenerated(result);
      localStorage.setItem('clawbid_webhook_id', result.webhook_id);
      setWebhookId(result.webhook_id);
    } catch (err) { alert('❌ ' + err.message); }
    finally { setGenerating(false); }
  };

  const copyWebhook = () => {
    navigator.clipboard.writeText(`https://api.clawbid.site/wh/${webhookId}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const disconnectAgent = () => {
    localStorage.removeItem('clawbid_webhook_id');
    setWebhookId(null); setAgent(null); setPnl(null); setPositions([]);
  };

  // ── Not connected ───────────────────────────────────────────────────────────
  if (!webhookId) {
    return (
      <div style={{ background: C.bg, minHeight: '100vh' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '60px 36px' }}>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: -0.5, marginBottom: 6 }}>Agent Dashboard</h2>
          <p style={{ color: C.muted, marginBottom: 36, fontSize: 14 }}>Connect your existing agent or generate a new webhook to get started.</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 }}>

            {/* Connect */}
            {card(<>
              {label('Connect Existing Agent')}
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Already ran <code style={{ color: C.blue, fontFamily: 'IBM Plex Mono, monospace' }}>clawbid init</code>? Paste your Webhook ID or URL.
              </p>
              <input
                value={inputWebhook}
                onChange={e => setInputWebhook(e.target.value)}
                placeholder="Webhook ID or full URL..."
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 10,
                  background: C.bg, border: `1.5px solid ${C.border}`,
                  color: C.text, fontSize: 13, outline: 'none',
                  fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box',
                  transition: 'border .15s',
                }}
                onKeyDown={e => e.key === 'Enter' && connectWebhook()}
              />
              <button onClick={connectWebhook} style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: 'linear-gradient(135deg,#0055ff,#3b82f6)',
                color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', boxShadow: '0 2px 8px rgba(0,85,255,0.25)',
              }}>Connect →</button>
            </>)}

            {/* Generate */}
            {card(<>
              {label('Generate New Webhook')}
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
                Enter your <strong style={{ color: C.purple }}>OpenClaw API key</strong> to generate a webhook URL automatically.
              </p>
              <input
                value={openclawKey}
                onChange={e => setOpenclawKey(e.target.value)}
                placeholder="ocl_xxxxxxxxxxxxxxxxxxxx"
                type="password"
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: 10, marginBottom: 10,
                  background: C.bg, border: `1.5px solid ${C.border}`,
                  color: C.text, fontSize: 13, outline: 'none',
                  fontFamily: 'IBM Plex Mono, monospace', boxSizing: 'border-box',
                }}
              />
              <button onClick={generateWebhook} disabled={generating || !openclawKey.trim()} style={{
                width: '100%', padding: '11px', borderRadius: 10,
                background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', opacity: (generating || !openclawKey.trim()) ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
              }}>{generating ? '⏳ Generating...' : 'Generate Webhook →'}</button>
              {generated && (
                <div style={{ marginTop: 12, padding: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10 }}>
                  <div style={{ fontSize: 10, color: C.green, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, marginBottom: 4 }}>✓ WEBHOOK GENERATED</div>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: C.green, wordBreak: 'break-all', marginBottom: 8 }}>{generated.webhook_url}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>Run: <code style={{ color: C.blue }}>clawbid init --webhook {generated.webhook_url}</code></div>
                </div>
              )}
            </>)}
          </div>

          {/* Quick guide */}
          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>📖</span> Quick Start Guide
            </div>
            {[
              ['1', 'Install SDK', 'npm install -g clawbid-agent', C.blue],
              ['2', 'Login', 'clawbid login  →  confirm via your Telegram bot', C.purple],
              ['3', 'Init Agent', 'clawbid init my-agent  →  wallet auto-generated', C.green],
              ['4', 'Add Strategy', 'clawbid skill add ./my-strategy.md', '#f59e0b'],
              ['5', 'Start Trading', 'clawbid start  →  agent runs autonomously', C.green],
            ].map(([n, title, desc, color]) => (
              <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 26, height: 26, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 11, color: '#fff', flexShrink: 0 }}>{n}</div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{title}</span>
                  <span style={{ fontSize: 12, color: C.muted, marginLeft: 8, fontFamily: 'IBM Plex Mono, monospace' }}>— {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e8ecf0', borderTopColor: C.blue, animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: 13, color: C.muted }}>Loading agent data...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 500, margin: '60px auto', padding: '0 36px' }}>
        <div style={{ background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: 16, padding: 24 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.red, marginBottom: 8 }}>⚠ Error Loading Agent</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>{error}</div>
          <button onClick={disconnectAgent} style={{ padding: '8px 16px', borderRadius: 8, background: '#fee2e2', border: '1px solid #fecdd3', color: C.red, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>← Disconnect & Try Again</button>
        </div>
      </div>
    </div>
  );

  // ── Connected ──────────────────────────────────────────────────────────────
  const chartData = pnl?.daily?.map(d => ({ date: d.date?.slice(5), pnl: parseFloat(d.pnl) })) || [];
  const winRate = pnl?.trades > 0 ? ((pnl.wins / pnl.trades) * 100).toFixed(0) : 0;

  return (
    <div style={{ background: C.bg, minHeight: '100vh' }}>
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '32px 36px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>

          {/* ── Sidebar ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Wallet card */}
            {card(<>
              {label('Agent Wallet')}
              {agent && <>
                <div style={{ fontSize: 10, color: C.dim, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>ADDRESS</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: C.blue, wordBreak: 'break-all', marginBottom: 14, padding: '6px 8px', background: '#f0f4ff', borderRadius: 6 }}>{agent.wallet_address}</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: C.text, letterSpacing: -1 }}>${parseFloat(agent.balance_usdc || 0).toFixed(2)}</div>
                <div style={{ fontSize: 11, color: C.dim, fontFamily: 'IBM Plex Mono, monospace', marginBottom: 16 }}>USDC BALANCE · BASE NETWORK</div>
              </>}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[['⬇ Deposit', C.blue], ['⬆ Withdraw', '#6b7280']].map(([t, bg]) => (
                  <button key={t} style={{ padding: 9, borderRadius: 9, fontSize: 12, fontWeight: 700, border: 'none', background: t.includes('Deposit') ? '#f0f4ff' : C.bg, color: t.includes('Deposit') ? C.blue : C.muted, cursor: 'pointer', fontFamily: 'Syne, sans-serif', transition: 'all .15s' }}>{t}</button>
                ))}
              </div>
            </>)}

            {/* PNL summary */}
            {card(<>
              {label('PNL Overview')}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                  [fmt(pnl?.today), 'Today'],
                  [fmt(pnl?.week), 'Week'],
                  [fmt(pnl?.total), 'All Time'],
                ].map(([v, l]) => (
                  <div key={l} style={{ background: C.bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: parseFloat(v) >= 0 ? C.green : C.red }}>{v}</div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.muted, padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
                <span>Win rate: <strong style={{ color: C.green }}>{winRate}%</strong></span>
                <span>Trades: <strong style={{ color: C.text }}>{pnl?.trades || 0}</strong></span>
              </div>
            </>)}

            {/* Webhook */}
            {card(<>
              {label('Webhook')}
              <div style={{ background: '#f0f4ff', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: C.blue, wordBreak: 'break-all', marginBottom: 6 }}>
                  {`https://api.clawbid.site/wh/${webhookId}`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
                  <span style={{ fontSize: 10, color: C.green, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700 }}>Connected</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={copyWebhook} style={{
                  padding: 8, borderRadius: 8, border: 'none',
                  background: copied ? '#f0fdf4' : 'linear-gradient(135deg,#7c3aed,#a78bfa)',
                  color: copied ? C.green : '#fff', fontWeight: 700, fontSize: 11,
                  cursor: 'pointer', fontFamily: 'Syne, sans-serif',
                  border: copied ? `1px solid #bbf7d0` : 'none',
                }}>{copied ? '✓ Copied!' : 'Copy URL'}</button>
                <button onClick={disconnectAgent} style={{ padding: 8, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, color: C.muted, fontWeight: 600, fontSize: 11, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Disconnect</button>
              </div>
            </>)}

            {/* Agent Config */}
            {agent && card(<>
              {label('Agent Config')}
              {[
                ['Agent ID', agent.agent_id, C.blue],
                ['LLM Model', agent.llm_model || 'claude-sonnet-4-6', C.purple],
                ['Fallback', agent.llm_fallback || 'gemini-flash', C.muted],
                ['Status', agent.status || 'idle', agent.status === 'active' ? C.green : C.dim],
                ['Skills', `${agent.skills?.length || 0} loaded`, C.text],
              ].map(([k, v, c]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.dim, fontFamily: 'IBM Plex Mono, monospace' }}>{k}</span>
                  <span style={{ color: c, fontWeight: 600, fontFamily: 'IBM Plex Mono, monospace', maxWidth: 140, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</span>
                </div>
              ))}
            </>)}

            {/* LLM usage */}
            {llmStats.length > 0 && card(<>
              {label('AI Usage (7 days)')}
              {llmStats.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>
                  <span style={{ color: C.blue, fontFamily: 'IBM Plex Mono, monospace' }}>{s.model}</span>
                  <span style={{ color: C.muted, fontFamily: 'IBM Plex Mono, monospace' }}>${parseFloat(s.total_cost || 0).toFixed(4)}</span>
                </div>
              ))}
            </>)}
          </div>

          {/* ── Main content ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* PNL Chart */}
            {card(<>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>📈 PNL History — 30 Days</div>
                <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: '#f0fdf4', border: '1px solid #bbf7d0', color: C.green, fontWeight: 700 }}>● Live</span>
              </div>
              {chartData.length === 0 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dim, fontSize: 13, background: C.bg, borderRadius: 10 }}>
                  No trade history yet — start the agent to see data here
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0055ff" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#0055ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.dim, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: C.dim, fontFamily: 'IBM Plex Mono' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}
                      formatter={v => [`$${parseFloat(v).toFixed(2)}`, 'PNL']}
                    />
                    <Area type="monotone" dataKey="pnl" stroke={C.blue} fill="url(#pnlGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </>)}

            {/* Open Positions */}
            {card(<>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 16 }}>📋 Open Positions</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr 1fr .8fr', padding: '6px 14px', fontSize: 10, color: C.dim, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, marginBottom: 6, letterSpacing: 0.8 }}>
                {['MARKET', 'DIRECTION', 'SIZE', 'ENTRY', 'PNL'].map(h => <span key={h}>{h}</span>)}
              </div>
              {positions.length === 0 && (
                <div style={{ fontSize: 13, color: C.dim, padding: '20px 14px', textAlign: 'center', background: C.bg, borderRadius: 10 }}>No open positions</div>
              )}
              {positions.map((p, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr 1fr .8fr', alignItems: 'center', padding: '11px 14px', background: C.bg, borderRadius: 10, marginBottom: 7, fontSize: 12, border: `1px solid ${C.border}` }}>
                  <span style={{ fontWeight: 600, color: C.text }}>{p.asset}/{p.timeframe}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 700,
                    color: p.direction === 'yes' ? C.green : C.red,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.direction === 'yes' ? C.green : C.red }} />
                    {p.direction === 'yes' ? 'YES' : 'NO'}
                  </span>
                  <span style={{ color: C.text }}>${parseFloat(p.amount_usdc).toFixed(2)}</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: C.muted }}>{(parseFloat(p.entry_price) * 100).toFixed(0)}¢</span>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: parseFloat(p.pnl) >= 0 ? C.green : C.red }}>{fmt(p.pnl)}</span>
                </div>
              ))}
            </>)}

          </div>
        </div>
      </div>
    </div>
  );
}
