const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // increased from 2000ms
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false,
});

// Auto-reconnect on connection errors
pool.on('error', (err) => {
  console.error('⚠ DB pool error (auto-reconnecting):', err.message);
});

// Connect with retry — for Railway where DB may not be ready immediately
async function connectWithRetry(retries = 10, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('✓ Database connected');
      return;
    } catch (err) {
      console.error(`⚠ DB connection attempt ${i}/${retries} failed: ${err.message}`);
      if (i === retries) throw new Error(`DB unavailable after ${retries} attempts`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

module.exports = {
  connect: connectWithRetry,
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
