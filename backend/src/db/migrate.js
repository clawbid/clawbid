require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const db = require('./index');

const SQL = `
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id     VARCHAR(64) UNIQUE,
  openclaw_key    VARCHAR(255) UNIQUE NOT NULL,
  email           VARCHAR(255),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AGENTS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) ON DELETE CASCADE,
  agent_id        VARCHAR(64) UNIQUE NOT NULL,
  wallet_address  VARCHAR(42) NOT NULL,
  webhook_id      VARCHAR(64) UNIQUE NOT NULL,
  status          VARCHAR(16) DEFAULT 'idle' CHECK (status IN ('active','idle','error')),
  skills          JSONB DEFAULT '[]',
  last_ping       TIMESTAMPTZ,
  llm_model       VARCHAR(64) DEFAULT 'claude-sonnet-4-6',
  llm_fallback    VARCHAR(64) DEFAULT 'gemini-flash',
  use_bankr_llm   BOOLEAN DEFAULT TRUE,
  telegram_chat_id VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- Add missing columns to existing deployments
DO $$ BEGIN
  ALTER TABLE agents ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(64);
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── WALLETS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID REFERENCES agents(id) ON DELETE CASCADE,
  address         VARCHAR(42) UNIQUE NOT NULL,
  balance_usdc    DECIMAL(18,6) DEFAULT 0,
  locked_amount   DECIMAL(18,6) DEFAULT 0,
  total_deposited DECIMAL(18,6) DEFAULT 0,
  total_withdrawn DECIMAL(18,6) DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MARKETS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS markets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset           VARCHAR(16) NOT NULL,
  question        TEXT NOT NULL,
  timeframe       VARCHAR(8) NOT NULL CHECK (timeframe IN ('30m','1h','6h','12h')),
  target_price    DECIMAL(20,8) NOT NULL,
  yes_pool        DECIMAL(18,6) DEFAULT 0,
  no_pool         DECIMAL(18,6) DEFAULT 0,
  opens_at        TIMESTAMPTZ DEFAULT NOW(),
  closes_at       TIMESTAMPTZ NOT NULL,
  resolved        BOOLEAN DEFAULT FALSE,
  outcome         VARCHAR(4) CHECK (outcome IN ('yes','no',NULL)),
  final_price     DECIMAL(20,8),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_markets_closes_at ON markets(closes_at);
CREATE INDEX IF NOT EXISTS idx_markets_resolved ON markets(resolved);
CREATE INDEX IF NOT EXISTS idx_markets_asset ON markets(asset);

-- ─── POSITIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS positions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID REFERENCES agents(id),
  market_id       UUID REFERENCES markets(id),
  direction       VARCHAR(4) NOT NULL CHECK (direction IN ('yes','no')),
  amount_usdc     DECIMAL(18,6) NOT NULL,
  shares          DECIMAL(18,6) NOT NULL,
  entry_price     DECIMAL(10,6) NOT NULL,
  pnl             DECIMAL(18,6) DEFAULT 0,
  settled         BOOLEAN DEFAULT FALSE,
  skill_used      VARCHAR(255),
  llm_model_used  VARCHAR(64),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  settled_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_positions_agent ON positions(agent_id);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);

-- ─── PRICE FEEDS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS price_feeds (
  id              BIGSERIAL PRIMARY KEY,
  asset           VARCHAR(16) NOT NULL,
  price           DECIMAL(20,8) NOT NULL,
  source          VARCHAR(32) DEFAULT 'binance',
  ts              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_price_feeds_asset_ts ON price_feeds(asset, ts DESC);

-- ─── WEBHOOK EVENTS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID REFERENCES agents(id),
  event_type      VARCHAR(64) NOT NULL,
  payload         JSONB,
  received_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LLM USAGE TRACKING ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_usage (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID REFERENCES agents(id),
  model           VARCHAR(64),
  prompt_tokens   INT DEFAULT 0,
  completion_tokens INT DEFAULT 0,
  cost_usdc       DECIMAL(10,8) DEFAULT 0,
  market_id       UUID REFERENCES markets(id),
  ts              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TELEGRAM LOGIN COLUMNS ──────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS telegram_username TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_telegram_chat_id ON users(telegram_chat_id);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_users_openclaw_key ON users(openclaw_key);
EXCEPTION WHEN others THEN NULL; END $$;

-- ─── BOT TOKEN COLUMNS (new auth flow) ──────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_token TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_username TEXT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_id BIGINT;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_bot_username ON users(bot_username);
EXCEPTION WHEN others THEN NULL; END $$;

-- ─── FIX WALLETS TABLE: add wallet_address as alias for address ───────────────
DO $$ BEGIN
  ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_address VARCHAR(42);
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  UPDATE wallets SET wallet_address = address WHERE wallet_address IS NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- Add unique constraint on wallets.address if not exists
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS idx_wallets_address ON wallets(address);
EXCEPTION WHEN others THEN NULL; END $$;
`;

async function migrate() {
  console.log('Running migrations...');
  try {
    await db.query(SQL);
    console.log('✓ All tables created successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
