const { WebSocketServer } = require('ws');
const { v4: uuidv4 } = require('uuid');

class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Map(); // clientId → { ws, agentId }
    this._setup();
  }

  _setup() {
    this.wss.on('connection', (ws, req) => {
      const clientId = uuidv4();
      this.clients.set(clientId, { ws, agentId: null });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          if (msg.type === 'SUBSCRIBE_AGENT') {
            const client = this.clients.get(clientId);
            if (client) client.agentId = msg.agentId;
            ws.send(JSON.stringify({ type: 'SUBSCRIBED', agentId: msg.agentId }));
          }
        } catch {}
      });

      ws.on('close', () => this.clients.delete(clientId));
      ws.send(JSON.stringify({ type: 'CONNECTED', clientId }));
    });
  }

  broadcast(data) {
    const msg = JSON.stringify(data);
    for (const { ws } of this.clients.values()) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  broadcastToAgent(agentId, data) {
    const msg = JSON.stringify(data);
    for (const { ws, agentId: aid } of this.clients.values()) {
      if (aid === agentId && ws.readyState === 1) ws.send(msg);
    }
  }
}

module.exports = WebSocketManager;
