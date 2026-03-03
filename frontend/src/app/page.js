'use client';
import { useState, useEffect } from 'react';
import Nav from '../components/Nav';
import MarketsGrid from '../components/MarketsGrid';
import Dashboard from '../components/Dashboard';
import InstallGuide from '../components/InstallGuide';
import Markets from '../components/Markets';
import Leaderboard from '../components/Leaderboard';
import { fetchMarkets, fetchPrices } from '../lib/api';
import { useWebSocket } from '../lib/useWebSocket';

export default function Home() {
  const [tab, setTab] = useState('markets');
  const [markets, setMarkets] = useState([]);
  const [prices, setPrices] = useState({});
  const [timeframe, setTimeframe] = useState(null);
  const [webhookId, setWebhookId] = useState(null);

  // Load webhook from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('clawbid_webhook_id');
    if (stored) setWebhookId(stored);
  }, []);

  // WebSocket for real-time price + market updates
  const { connected, prices: wsPrices, latestTrade } = useWebSocket(webhookId);

  // Merge WS prices with HTTP prices
  useEffect(() => {
    if (Object.keys(wsPrices).length > 0) setPrices(wsPrices);
  }, [wsPrices]);

  // Initial data load
  useEffect(() => {
    fetchMarkets(null, timeframe).then(setMarkets).catch(console.error);
    fetchPrices().then(p => {
      const simplified = {};
      Object.entries(p).forEach(([k, v]) => { simplified[k] = v.price || v; });
      setPrices(simplified);
    }).catch(console.error);
  }, [timeframe]);

  // Refresh markets every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMarkets(null, timeframe).then(setMarkets).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Nav
        tab={tab}
        setTab={setTab}
        wsConnected={connected}
        webhookId={webhookId}
      />

      {/* AI Markets (existing) */}
      {tab === 'markets' && (
        <MarketsGrid
          markets={markets}
          prices={prices}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          latestTrade={latestTrade}
        />
      )}

      {/* Human Trading — bet YES/NO against AI agents */}
      {tab === 'trade' && (
        <Markets prices={prices} />
      )}

      {/* Human vs AI Leaderboard */}
      {tab === 'leaderboard' && (
        <Leaderboard />
      )}

      {/* AI Agent Dashboard */}
      {tab === 'dashboard' && (
        <Dashboard
          webhookId={webhookId}
          setWebhookId={setWebhookId}
          prices={prices}
        />
      )}

      {/* Install SDK guide */}
      {tab === 'install' && <InstallGuide />}
    </div>
  );
}
