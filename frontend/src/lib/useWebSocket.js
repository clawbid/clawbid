'use client';
import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://clawbid-production.up.railway.app/ws';

export function useWebSocket(agentId) {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [prices, setPrices] = useState({});
  const [latestTrade, setLatestTrade] = useState(null);
  const [marketUpdates, setMarketUpdates] = useState([]);
  const reconnectTimer = useRef(null);
  const isMounted = useRef(true); // FIX: track mount state

  const connect = useCallback(() => {
    if (!WS_URL) return;
    if (!isMounted.current) return; // FIX: don't reconnect after unmount
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        if (!isMounted.current) return;
        setConnected(true);
        if (agentId) {
          ws.current.send(JSON.stringify({ type: 'SUBSCRIBE_AGENT', agentId }));
        }
      };

      ws.current.onmessage = (e) => {
        if (!isMounted.current) return;
        try {
          const msg = JSON.parse(e.data);
          switch (msg.type) {
            case 'PRICES': setPrices(msg.data); break;
            case 'NEW_POSITION': setLatestTrade(msg.position); break;
            case 'MARKET_RESOLVED': setMarketUpdates(p => [msg, ...p.slice(0, 19)]); break;
          }
        } catch {}
      };

      ws.current.onclose = () => {
        if (!isMounted.current) return;
        setConnected(false);
        // FIX: exponential backoff — 3s, max 30s
        const delay = Math.min(3000 * (reconnectTimer.current?.attempts || 1), 30000);
        reconnectTimer.current = setTimeout(connect, delay);
      };

      ws.current.onerror = () => ws.current?.close();
    } catch (err) {
      console.warn('[WS] Connection error:', err);
    }
  }, [agentId]);

  useEffect(() => {
    isMounted.current = true;
    connect();
    return () => {
      isMounted.current = false; // FIX: mark as unmounted
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { connected, prices, latestTrade, marketUpdates };
}
