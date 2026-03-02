import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.clawbid.io';

export const api = axios.create({ baseURL: API, timeout: 15000 });

// Inject webhook ID on every request if available
if (typeof window !== 'undefined') {
  api.interceptors.request.use(config => {
    const webhookId = localStorage.getItem('clawbid_webhook_id');
    if (webhookId) config.headers['x-webhook-id'] = webhookId;
    return config;
  });
}

export const fetchMarkets = (asset, timeframe) =>
  api.get('/api/markets', { params: { asset, timeframe } }).then(r => r.data);

export const fetchPrices = () =>
  api.get('/api/prices/latest').then(r => r.data);

export const fetchAgentMe = (webhookId) =>
  api.get('/api/agents/me', { headers: { 'x-webhook-id': webhookId } }).then(r => r.data);

export const fetchPNL = (webhookId) =>
  api.get('/api/agents/me/pnl', { headers: { 'x-webhook-id': webhookId } }).then(r => r.data);

export const fetchPositions = (webhookId, settled) =>
  api.get('/api/agents/me/positions', {
    headers: { 'x-webhook-id': webhookId },
    params: { settled }
  }).then(r => r.data);

export const fetchLeaderboard = () =>
  api.get('/api/agents/leaderboard').then(r => r.data);

export const fetchLLMStats = (webhookId) =>
  api.get('/api/agents/me/llm-stats', { headers: { 'x-webhook-id': webhookId } }).then(r => r.data);

export const registerAgent = (openapiKey) =>
  api.post('/api/agents/register', {}, {
    headers: { 'x-openclaw-key': openapiKey }
  }).then(r => r.data);
