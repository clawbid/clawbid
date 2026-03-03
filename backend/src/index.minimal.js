require('dotenv').config();
const express = require('express');
const { createServer } = require('http');

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now(), env: process.env.NODE_ENV });
});

app.get('/', (req, res) => {
  res.json({ message: '🦀 ClawBid API', version: '1.0.0' });
});

const PORT = process.env.PORT || 4000;
const server = createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🦀 ClawBid listening on 0.0.0.0:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => server.close(() => process.exit(0)));
