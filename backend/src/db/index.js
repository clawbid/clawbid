const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  connect: async () => {
    const client = await pool.connect();
    client.release();
  },
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool
};
