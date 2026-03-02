'use client';
import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { fetchAgentMe, fetchPNL, fetchPositions, fetchLLMStats, registerAgent } from '../lib/api';

export default function Dashboard({ webhookId, setWebhookId, prices }) {
  const [agent, setAgent] = useState(null);
  const [pnl, setPnl] = useState(null);
  const [positions, setPositions] = useState([]);
  const [llmStats, setLlmStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [inputWebhook, setInputWebhook] = useState('');
  const [openapiKey, setOpenapiKey] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(null);

  useEffect(() => {
    if (!webhookId) return;
    setLoading(true);
    Promise.all([
      fetchAgentMe(webhookId),
      fetchPNL(webhookId),
      fetchPositions(webhookId, false),
      fetchLLMStats(webhookId),
    ]).then(([ag, p, pos, llm]) => {
      setAgent(ag); setPnl(p); setPositions(pos); setLlmStats(llm);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [webhookId]);

  const connectWebhook = () => {
    if (!inputWebhook.trim()) return;
    const id = inputWebhook.includes('/wh/') ? inputWebhook.split('/wh/')[1] : inputWebhook;
    localStorage.setItem('clawbid_webhook_id', id);
    setWebhookId(id);
  };

  const generateWebhook = async () => {
    if (!openapiKey.trim()) return;
    setGenerating(true);
    try {
      const result = await registerAgent(openapiKey);
      setGenerated(result);
      localStorage.setItem('clawbid_webhook_id', result.webhook_id);
      setWebhookId(result.webhook_id);
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  const card = (children, extra = {}) => (
    <div style={{ background: '#080c1a', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 18, ...extra }}>
      {children}
    </div>
  );

  const sectionTitle = (t) => (
    <div style={{ fontSize: 10, fontWeight: 700, color: '#3d4f6b', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 14 }}>{t}</div>
  );

  const fmt = (val) => {
    const n = parseFloat(val || 0);
    return (n >= 0 ? '+' : '') + '$' + Math.abs(n).toFixed(2);
  };

  // Not connected state
  if (!webhookId) {
    return (
      <div style={{ maxWidth: 1360, margin: '0 auto', padding: '60px 36px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>Agent Dashboard</h2>
        <p style={{ color: '#3d4f6b', marginBottom: 40 }}>Connect your agent or generate a new webhook to get started.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 800 }}>
          {/* Connect existing */}
          {card(<>
            {sectionTitle('Connect existing agent')}
            <p style={{ fontSize: 13, color: '#3d4f6b', marginBottom: 16, lineHeight: 1.6 }}>Already ran <code style={{ color: '#00e5ff' }}>clawbid init</code>? Paste your webhook ID or URL.</p>
            <input
              value={inputWebhook}
              onChange={e => setInputWebhook(e.target.value)}
              placeholder="Webhook ID or URL..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, marginBottom: 10,
                background: '#0c1123', border: '1px solid rgba(255,255,255,0.08)',
                color: '#dde4f0', fontSize: 13, outline: 'none', fontFamily: 'IBM Plex Mono, monospace',
              }}
              onKeyDown={e => e.key === 'Enter' && connectWebhook()}
            />
            <button onClick={connectWebhook} style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'linear-gradient(135deg,#00e5ff,#0099cc)',
              color: '#000', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif',
            }}>Connect →</button>
          </>)}

          {/* Generate new webhook */}
          {card(<>
            {sectionTitle('Generate new webhook')}
            <p style={{ fontSize: 13, color: '#3d4f6b', marginBottom: 16, lineHeight: 1.6 }}>Enter your OpenClaw key to generate a webhook URL for your agent.</p>
            <input
              value={openapiKey}
              onChange={e => setOpenapiKey(e.target.value)}
              placeholder="Your OpenClaw API key..."
              type="password"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, marginBottom: 10,
                background: '#0c1123', border: '1px solid rgba(255,255,255,0.08)',
                color: '#dde4f0', fontSize: 13, outline: 'none', fontFamily: 'IBM Plex Mono, monospace',
              }}
            />
            <button onClick={generateWebhook} disabled={generating} style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
              color: '#fff', fontWeight: 700, fontSize: 13, border: 'none', cursor: 'pointer',
              fontFamily: 'Syne, sans-serif', opacity: generating ? 0.6 : 1,
            }}>{generating ? 'Generating...' : 'Generate Webhook →'}</button>
            {generated && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.2)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 6 }}>YOUR WEBHOOK URL</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 11, color: '#00ff88', wordBreak: 'break-all' }}>{generated.webhook_url}</div>
                <div style={{ marginTop: 8, fontSize: 11, color: '#3d4f6b' }}>Run: <code style={{ color: '#00e5ff' }}>clawbid init --webhook {generated.webhook_url}</code></div>
              </div>
            )}
          </>)}
        </div>
      </div>
    );
  }

  // Connected state
  const chartData = pnl?.daily?.map(d => ({ date: d.date?.slice(5), pnl: parseFloat(d.pnl) })) || [];

  return (
    <div style={{ maxWidth: 1360, margin: '0 auto', padding: '0 36px', position: 'relative', zIndex: 1 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 18, padding: '36px 0' }}>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Wallet - auto from agent */}
          {card(<>
            {sectionTitle('Agent Wallet')}
            <div style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.1)', borderRadius: 8, padding: 10, marginBottom: 12, fontSize: 11, color: '#3d4f6b', lineHeight: 1.6 }}>
              🔐 Wallet auto-generated by SDK on init
            </div>
            {agent && <>
              <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>WALLET ADDRESS</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00e5ff', wordBreak: 'break-all', marginBottom: 10 }}>{agent.wallet_address}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#00ff88' }}>${parseFloat(agent.balance_usdc || 0).toFixed(2)}</div>
              <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 12 }}>USDC BALANCE</div>
            </>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {['⬇ Deposit', '⬆ Withdraw'].map(t => (
                <button key={t} style={{ padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, border: '1px solid rgba(255,255,255,0.06)', background: '#0c1123', color: '#dde4f0', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>{t}</button>
              ))}
            </div>
          </>)}

          {/* PNL */}
          {card(<>
            {sectionTitle('PNL Overview')}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
              {[
                [fmt(pnl?.today), 'Today'],
                [fmt(pnl?.week), 'Week'],
                [fmt(pnl?.total), 'All Time'],
              ].map(([v, l]) => (
                <div key={l} style={{ background: '#0c1123', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 800, color: parseFloat(v) >= 0 ? '#00ff88' : '#ff3d71' }}>{v}</div>
                  <div style={{ fontSize: 10, color: '#3d4f6b', marginTop: 2, fontFamily: 'IBM Plex Mono, monospace' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace' }}>
              Win rate: <span style={{ color: '#00ff88' }}>{pnl?.trades > 0 ? ((pnl.wins / pnl.trades) * 100).toFixed(0) : 0}%</span>
              {' · '}Trades: <span style={{ color: '#dde4f0' }}>{pnl?.trades || 0}</span>
            </div>
          </>)}

          {/* Webhook */}
          {card(<>
            {sectionTitle('Webhook API')}
            <p style={{ fontSize: 11, color: '#3d4f6b', marginBottom: 8, lineHeight: 1.6 }}>Your agent connects via this URL. Website auto-receives wallet, PNL, and trades.</p>
            <div style={{ background: '#0c1123', borderRadius: 8, padding: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>WEBHOOK URL</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 10, color: '#00e5ff', wordBreak: 'break-all' }}>
                {`https://api.clawbid.io/wh/${webhookId}`}
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: '#00ff88' }}>● Connected</div>
            </div>
            <button
              onClick={() => { navigator.clipboard.writeText(`https://api.clawbid.io/wh/${webhookId}`); }}
              style={{ width: '100%', padding: 8, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#a78bfa)', color: '#fff', fontWeight: 700, fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>
              Copy Webhook URL
            </button>
          </>)}

          {/* Telegram */}
          {card(<>
            {sectionTitle('Telegram Alerts')}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,136,204,0.08)', border: '1px solid rgba(0,136,204,0.2)', borderRadius: 10, padding: 12 }}>
              <span style={{ fontSize: 26 }}>✈</span>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <strong style={{ color: '#41b3f5' }}>@ClawBidBot</strong><br />
                <code style={{ fontSize: 10, color: '#3d4f6b' }}>/connect {webhookId?.slice(0, 8)}...</code>
              </div>
            </div>
          </>)}

          {/* LLM Stats */}
          {card(<>
            {sectionTitle('Bankr LLM Usage (7d)')}
            {llmStats.length === 0 ? (
              <div style={{ fontSize: 12, color: '#3d4f6b' }}>No usage yet</div>
            ) : llmStats.map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, fontFamily: 'IBM Plex Mono, monospace' }}>
                <span style={{ color: '#00e5ff' }}>{s.model}</span>
                <span style={{ color: '#3d4f6b' }}>${parseFloat(s.total_cost || 0).toFixed(4)}</span>
              </div>
            ))}
          </>)}
        </div>

        {/* Main */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* PNL Chart */}
          {card(<>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              📈 PNL History (30 Days)
              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'rgba(255,61,113,0.1)', border: '1px solid rgba(255,61,113,0.2)', color: '#ff3d71' }}>● Live</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#3d4f6b', fontFamily: 'IBM Plex Mono' }} />
                <YAxis tick={{ fontSize: 10, fill: '#3d4f6b', fontFamily: 'IBM Plex Mono' }} />
                <Tooltip
                  contentStyle={{ background: '#0c1123', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 8, fontSize: 12 }}
                  formatter={v => [`$${parseFloat(v).toFixed(2)}`, 'PNL']}
                />
                <Area type="monotone" dataKey="pnl" stroke="#00e5ff" fill="url(#pnlGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </>)}

          {/* Open Positions */}
          {card(<>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>📋 Open Positions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr 1fr .8fr', padding: '4px 14px', fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, marginBottom: 6 }}>
              {['MARKET', 'DIRECTION', 'SIZE', 'ENTRY', 'PNL'].map(h => <span key={h}>{h}</span>)}
            </div>
            {positions.length === 0 && <div style={{ fontSize: 12, color: '#3d4f6b', padding: '8px 14px' }}>No open positions</div>}
            {positions.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr .8fr 1fr .8fr', alignItems: 'center', padding: '10px 14px', background: '#0c1123', borderRadius: 9, marginBottom: 7, fontSize: 12 }}>
                <span>{p.asset}/{p.timeframe}</span>
                <span style={{ color: p.direction === 'yes' ? '#00ff88' : '#ff3d71' }}>{p.direction === 'yes' ? '↑ YES' : '↓ NO'}</span>
                <span>${parseFloat(p.amount_usdc).toFixed(2)}</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace' }}>{(parseFloat(p.entry_price) * 100).toFixed(0)}¢</span>
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: parseFloat(p.pnl) >= 0 ? '#00ff88' : '#ff3d71' }}>{fmt(p.pnl)}</span>
              </div>
            ))}
          </>)}

          {/* Agent Config */}
          {agent && card(<>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>⚙ Agent Config</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
              <div style={{ background: '#0c1123', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>AGENT ID</div>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#00e5ff', fontSize: 11 }}>{agent.agent_id}</div>
              </div>
              <div style={{ background: '#0c1123', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>LLM MODEL</div>
                <div style={{ color: '#a78bfa', fontSize: 12, fontWeight: 700 }}>{agent.llm_model || 'claude-sonnet-4-6'}</div>
                <div style={{ fontSize: 10, color: '#3d4f6b', marginTop: 2 }}>→ {agent.llm_fallback || 'gemini-flash'}</div>
              </div>
              <div style={{ background: '#0c1123', borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 10, color: '#3d4f6b', fontFamily: 'IBM Plex Mono, monospace', marginBottom: 4 }}>STATUS</div>
                <div style={{ color: agent.status === 'active' ? '#00ff88' : '#3d4f6b', fontWeight: 700 }}>● {agent.status}</div>
                <div style={{ fontSize: 10, color: '#3d4f6b', marginTop: 2 }}>Skills: {agent.skills?.length || 0}</div>
              </div>
            </div>
          </>)}
        </div>

      </div>
    </div>
  );
}
