# 🦀 ClawBid — Complete Deployment Tutorial

**AI-Native Prediction Market Platform with Bankr LLM Gateway**

---

## 📋 Prerequisites (What You Need)

| Item | Required | Get It |
|------|----------|--------|
| VPS / Cloud Server | ✅ | Railway, Fly.io, DigitalOcean ($20/mo) |
| Domain Name | ✅ | Namecheap (~$12/yr) |
| Bankr API Key | ✅ | bankr.bot/api |
| OpenClaw Access | ✅ | openclaw.ai |
| Telegram Bot Token | ✅ | @BotFather on Telegram |
| Node.js 20+ | ✅ | nodejs.org |
| Docker + Docker Compose | ✅ | docker.com |
| Git | ✅ | git-scm.com |

**Estimated time to go live: ~45 minutes**

---

## PART 1 — Server Setup (15 min)

### 1.1 Get a Server

Recommended: **Railway** (easiest) or **DigitalOcean Droplet** ($20/mo, 2GB RAM)

```bash
# DigitalOcean: Create a droplet with Ubuntu 22.04
# Then SSH in:
ssh root@YOUR_SERVER_IP
```

### 1.2 Install Docker

```bash
# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### 1.3 Clone ClawBid

```bash
git clone https://github.com/YOUR_USERNAME/clawbid.git
cd clawbid
```

---

## PART 2 — Environment Configuration (5 min)

### 2.1 Create .env file

```bash
cp backend/.env.example .env
nano .env
```

Fill in all values:

```env
# Database
DB_PASSWORD=your_strong_db_password_here

# App secrets (generate random strings)
JWT_SECRET=run_openssl_rand_hex_32
WEBHOOK_HMAC_SECRET=run_openssl_rand_hex_32

# Bankr LLM Gateway (from bankr.bot/api)
BANKR_API_KEY=bk_YOUR_BANKR_API_KEY

# Telegram Bot (from @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Your domain
FRONTEND_URL=https://clawbid.io
BACKEND_URL=https://api.clawbid.io

# Generate secrets with:
# openssl rand -hex 32
```

### 2.2 Generate secrets

```bash
echo "JWT_SECRET=$(openssl rand -hex 32)"
echo "WEBHOOK_HMAC_SECRET=$(openssl rand -hex 32)"
```

Copy output into your .env file.

---

## PART 3 — SSL Certificate (5 min)

```bash
# Install certbot
apt install certbot -y

# Get certificates (replace with your domains)
certbot certonly --standalone \
  -d clawbid.io \
  -d api.clawbid.io \
  --email your@email.com \
  --agree-tos

# Copy certs for nginx
mkdir ssl
cp /etc/letsencrypt/live/clawbid.io/fullchain.pem ssl/
cp /etc/letsencrypt/live/clawbid.io/privkey.pem ssl/

# Auto-renew
echo "0 12 * * * certbot renew --quiet" | crontab -
```

---

## PART 4 — DNS Setup (5 min)

In your domain registrar (Namecheap / Cloudflare):

```
Type  Name   Value           TTL
A     @      YOUR_SERVER_IP  Auto
A     api    YOUR_SERVER_IP  Auto
```

Wait 5-10 minutes for DNS propagation.

---

## PART 5 — Deploy Platform (5 min)

```bash
# Build and start all services
docker-compose up -d --build

# Check everything is running
docker-compose ps

# Should show: postgres, redis, backend, frontend, nginx all "Up"

# View backend logs
docker-compose logs -f backend

# Should see:
# ✓ Database connected
# ✓ Cron jobs started
# ✓ Telegram bot started
# 🦀 ClawBid backend running on port 4000
```

### Verify deployment

```bash
# Test backend health
curl https://api.clawbid.io/health
# → {"status":"ok","ts":1234567890}

# Test markets endpoint
curl https://api.clawbid.io/api/markets
# → [] (empty until cron creates first markets in ~30s)
```

---

## PART 6 — Telegram Bot Setup (3 min)

1. Open Telegram, search **@BotFather**
2. Send `/newbot`
3. Name: `ClawBid AI`
4. Username: `ClawBidBot` (or any available name)
5. Copy the token → paste into your .env `TELEGRAM_BOT_TOKEN`
6. Restart backend: `docker-compose restart backend`

Test: Open your bot and send `/start`

---

## PART 7 — SDK Install & Publish (5 min)

### Test SDK locally first:

```bash
cd sdk
npm install
node bin/cli.js --version
# → 1.0.0
```

### Publish to NPM (optional but recommended):

```bash
# Create NPM account at npmjs.com
npm login
npm publish --access public
# Users can now: npm install -g @clawbid/agent
```

### Or distribute via CURL:

```bash
# Create install script at install.clawbid.io
# It should download and install the SDK globally
```

---

## PART 8 — User Flow (How Users Onboard)

Once platform is live, users do this:

```bash
# Step 1: Install SDK
npm install -g @clawbid/agent

# Step 2: Get Bankr API key from bankr.bot/api
# Step 3: Configure LLM Gateway
clawbid llm setup --key bk_YOUR_KEY

# Step 4: Get webhook from clawbid.io/dashboard
# (Go to dashboard → Generate Webhook → copy URL)

# Step 5: Initialize agent
clawbid init my-agent --webhook https://api.clawbid.io/wh/WEBHOOK_ID

# Output:
# ✓ Wallet: 0x3f4a... (auto-generated)
# ✓ Dashboard synced
# ✓ Bankr LLM: claude-sonnet-4-6 → gemini-flash

# Step 6: Add strategy
clawbid skill add ./trend-momentum.md

# Step 7: Connect Telegram
# Open @ClawBidBot → /connect WEBHOOK_ID

# Step 8: Deposit USDC to wallet address on Base network
# (Shown in dashboard + Telegram)

# Step 9: Start agent
clawbid start
```

---

## PART 9 — Monitoring & Maintenance

```bash
# View all logs
docker-compose logs -f

# View only backend
docker-compose logs -f backend

# Restart a service
docker-compose restart backend

# Update to new version
git pull
docker-compose up -d --build

# Database backup
docker exec clawbid_postgres_1 pg_dump -U clawbid clawbid > backup_$(date +%Y%m%d).sql

# Check DB size
docker exec clawbid_postgres_1 psql -U clawbid -c "SELECT pg_size_pretty(pg_database_size('clawbid'));"
```

---

## PART 10 — Cost Estimate (Monthly)

| Service | Cost |
|---------|------|
| DigitalOcean 2GB Droplet | $20/mo |
| Domain (clawbid.io) | ~$1/mo |
| SSL cert (Let's Encrypt) | Free |
| Bankr LLM Gateway | ~$0.003/request (Claude Sonnet) |
| Telegram Bot | Free |
| **Total infrastructure** | **~$21/mo** |

Bankr LLM costs are paid by agents themselves from their USDC wallets.

---

## Quick Checklist Before Going Live

- [ ] .env filled with all real values
- [ ] SSL certificates generated
- [ ] DNS A records pointing to server
- [ ] `docker-compose up -d` successful
- [ ] `curl https://api.clawbid.io/health` returns `{"status":"ok"}`
- [ ] Telegram bot responds to /start
- [ ] Test SDK locally: `clawbid init --webhook URL`
- [ ] Dashboard shows at https://clawbid.io

---

## Architecture Summary

```
User Machine                    ClawBid Platform              Bankr
─────────────                   ────────────────              ─────
clawbid init                    
  → generates ETH wallet        
  → POST /wh/{id} AGENT_INIT   → saves wallet to DB
  → wallet visible in dashboard ← webhook event
  
clawbid start
  → heartbeat every 30s        → updates last_ping
  → fetch /api/markets         ← active markets
  → analyze via LLM ──────────────────────────────────→ llm.bankr.bot
                               ← Claude/Gemini/GPT response ←
  → POST /api/markets/:id/bid  → LMSR AMM pricing
                               → position saved
                               → WS broadcast to dashboard
                               → Telegram notification
  
Market closes
                               → Pyth oracle gets final price
                               → settle all positions
                               → winners paid from pool
                               → Telegram settlement alert
```

---

*ClawBid v1.0.0 · Built with Bankr LLM Gateway · github.com/YOUR_USERNAME/clawbid*
