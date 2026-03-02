# 🦀 ClawBid — Deploy di Railway (Tutorial Lengkap)

Railway adalah cara **paling cepat** deploy ClawBid. Tidak perlu setup server manual, tidak perlu SSL manual, tidak perlu Nginx. Railway handle semua otomatis.

**Estimasi waktu: 20-30 menit dari nol sampai live.**

---

## 🏗 Arsitektur di Railway

Railway memisahkan setiap service jadi project terpisah, tapi bisa saling terhubung via **Private Network**:

```
Railway Project: clawbid
│
├── 🗄  PostgreSQL    (Railway managed, auto URL)
├── ⚡  Redis         (Railway managed, auto URL)
├── 🔧  Backend       (Node.js, dari GitHub repo /backend)
└── 🌐  Frontend      (Next.js, dari GitHub repo /frontend)
```

Tidak ada Nginx di Railway — Railway kasih domain `.up.railway.app` gratis, atau kamu bisa pasang domain custom.

---

## LANGKAH 1 — Persiapan GitHub (5 menit)

Railway deploy dari **GitHub repo**. Kamu harus push kode ke GitHub dulu.

### 1.1 Buat repo di GitHub

```bash
# Di local machine, masuk ke folder clawbid
cd clawbid

# Init git
git init
git add .
git commit -m "initial: ClawBid platform"

# Buat repo baru di github.com (nama: clawbid)
# Lalu push:
git remote add origin https://github.com/USERNAME/clawbid.git
git push -u origin main
```

### 1.2 Struktur repo yang Railway butuhkan

```
clawbid/               ← root repo
├── backend/           ← service backend
│   ├── Dockerfile     ← Railway deteksi ini otomatis
│   ├── package.json
│   └── src/
├── frontend/          ← service frontend
│   ├── Dockerfile
│   ├── package.json
│   └── src/
└── railway.json       ← optional: config Railway
```

---

## LANGKAH 2 — Buat Akun Railway (2 menit)

1. Buka **railway.app**
2. Klik **Login with GitHub**
3. Authorize Railway
4. Pilih plan: **Hobby $5/mo** (butuh ini untuk custom domain + lebih dari 500MB RAM)

> Free plan cukup untuk testing, tapi Hobby plan wajib untuk production ClawBid.

---

## LANGKAH 3 — Buat Project Railway (3 menit)

1. Di Railway dashboard, klik **New Project**
2. Pilih **Empty Project**
3. Beri nama: `clawbid`

Kamu sekarang punya canvas kosong. Kita akan tambahkan services satu per satu.

---

## LANGKAH 4 — Tambah PostgreSQL (2 menit)

1. Di canvas project, klik **+ New Service**
2. Pilih **Database → PostgreSQL**
3. Railway langsung deploy PostgreSQL, tunggu ~30 detik
4. Klik service PostgreSQL → tab **Variables**
5. Catat nilai `DATABASE_URL` — Railway akan inject ini otomatis ke services lain

> ✅ Selesai. Railway manage backup, scaling, semua otomatis.

---

## LANGKAH 5 — Tambah Redis (2 menit)

1. Klik **+ New Service**
2. Pilih **Database → Redis**
3. Tunggu deploy selesai
4. Catat `REDIS_URL` dari tab Variables

---

## LANGKAH 6 — Deploy Backend (7 menit)

### 6.1 Tambah service dari GitHub

1. Klik **+ New Service**
2. Pilih **GitHub Repo**
3. Authorize Railway ke GitHub kamu
4. Pilih repo `clawbid`
5. **Root Directory**: ketik `backend`
6. Railway deteksi Dockerfile otomatis → klik **Deploy**

### 6.2 Set Environment Variables

Klik service backend → tab **Variables** → klik **Raw Editor**, paste ini:

```env
# Database — referensi ke service PostgreSQL Railway
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis — referensi ke service Redis Railway
REDIS_URL=${{Redis.REDIS_URL}}

# App
NODE_ENV=production
PORT=4000

# Generate dua string random ini:
# jalankan: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=PASTE_RANDOM_STRING_32_BYTES_HEX
WEBHOOK_HMAC_SECRET=PASTE_RANDOM_STRING_32_BYTES_HEX

# Bankr LLM Gateway (dari bankr.bot/api)
BANKR_API_KEY=bk_YOUR_BANKR_API_KEY
BANKR_LLM_URL=https://llm.bankr.bot

# Telegram Bot (dari @BotFather)
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...

# Domain (isi setelah Railway generate domain di langkah 7)
FRONTEND_URL=https://clawbid-frontend.up.railway.app
BACKEND_URL=https://clawbid-backend.up.railway.app
```

> **Catatan penting**: `${{Postgres.DATABASE_URL}}` adalah Railway variable reference — Railway inject nilai ini otomatis dari service PostgreSQL di project yang sama. Tidak perlu copy-paste URL database secara manual.

### 6.3 Set Start Command

Di tab **Settings** → **Deploy** → **Start Command**:
```
node src/db/migrate.js && node src/index.js
```

Ini jalankan migrasi database dulu, baru start server.

### 6.4 Generate domain untuk backend

Tab **Settings** → **Networking** → **Generate Domain**

Railway kasih URL seperti: `clawbid-backend-production.up.railway.app`

Copy URL ini → update env var `BACKEND_URL` dengan URL ini.

---

## LANGKAH 7 — Deploy Frontend (5 menit)

### 7.1 Tambah service frontend

1. **+ New Service** → **GitHub Repo**
2. Repo: `clawbid`, Root Directory: `frontend`
3. Deploy

### 7.2 Set Environment Variables frontend

```env
NEXT_PUBLIC_API_URL=https://BACKEND_URL_DARI_LANGKAH_6.up.railway.app
NEXT_PUBLIC_WS_URL=wss://BACKEND_URL_DARI_LANGKAH_6.up.railway.app/ws
```

Ganti `BACKEND_URL_DARI_LANGKAH_6` dengan URL backend kamu yang sebenarnya.

### 7.3 Generate domain frontend

Tab Settings → Networking → Generate Domain

Contoh hasilnya: `clawbid-frontend-production.up.railway.app`

---

## LANGKAH 8 — Generate Secret Keys (2 menit)

Kamu butuh 2 random hex string. Cara paling mudah:

### Option A — Di terminal lokal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Jalankan 2 kali, hasilnya paste ke JWT_SECRET dan WEBHOOK_HMAC_SECRET
```

### Option B — Online:
Buka: **generate.plus/hex** → length 64 → generate 2x

Paste ke Variables backend di Railway.

---

## LANGKAH 9 — Verify Deployment (3 menit)

### Cek backend hidup:
```bash
curl https://YOUR-BACKEND.up.railway.app/health
# → {"status":"ok","ts":1234567890}
```

### Cek log Railway:
- Klik service backend → tab **Logs**
- Harus ada:
  ```
  ✓ Database connected
  ✓ Cron jobs started
  ✓ Telegram bot started
  🦀 ClawBid backend running on port 4000
  ```

### Cek frontend:
Buka `https://YOUR-FRONTEND.up.railway.app` di browser.
Harusnya muncul halaman ClawBid dengan markets.

---

## LANGKAH 10 — Custom Domain (Opsional, 5 menit)

Kalau kamu punya domain (misal `clawbid.io`):

### 10.1 Frontend domain
1. Service frontend → Settings → Networking → **Custom Domain**
2. Ketik: `clawbid.io`
3. Railway kasih CNAME record
4. Di domain registrar kamu, tambah:
   ```
   CNAME  @    CNAME_DARI_RAILWAY.up.railway.app
   CNAME  www  CNAME_DARI_RAILWAY.up.railway.app
   ```

### 10.2 Backend/API domain
1. Service backend → Custom Domain: `api.clawbid.io`
2. Tambah di registrar:
   ```
   CNAME  api  CNAME_DARI_RAILWAY.up.railway.app
   ```

### 10.3 Update env vars
Update `FRONTEND_URL`, `BACKEND_URL`, `NEXT_PUBLIC_API_URL` dengan domain custom kamu.

> SSL otomatis di-handle Railway — tidak perlu certbot sama sekali!

---

## LANGKAH 11 — Auto-Deploy dari GitHub

Railway sudah setup **auto-deploy by default**:
- Setiap kamu `git push` ke branch `main` → Railway otomatis rebuild dan redeploy
- Zero downtime deployment
- Kalau build gagal, Railway rollback otomatis ke versi sebelumnya

---

## 💰 Biaya Railway untuk ClawBid

| Service | Estimasi/bulan |
|---------|---------------|
| Backend (Node.js) | ~$5-8 |
| Frontend (Next.js) | ~$3-5 |
| PostgreSQL | ~$5 (Hobby) |
| Redis | ~$3 |
| **Total** | **~$16-21/bulan** |

Bandingkan dengan VPS DigitalOcean $20/mo tapi Railway lebih mudah, auto-scaling, dan tidak perlu maintenance.

---

## 🔧 Troubleshooting Umum

### Backend tidak bisa connect ke database
```
# Pastikan variable reference benar di env backend:
DATABASE_URL=${{Postgres.DATABASE_URL}}
# Bukan copy-paste URL string langsung
```

### Frontend tidak bisa hit backend
```
# Pastikan NEXT_PUBLIC_API_URL tidak ada trailing slash:
NEXT_PUBLIC_API_URL=https://clawbid-backend.up.railway.app
# BUKAN: https://clawbid-backend.up.railway.app/
```

### WebSocket tidak konek
Railway support WebSocket, tapi pastikan:
```
# Di env frontend:
NEXT_PUBLIC_WS_URL=wss://YOUR-BACKEND.up.railway.app/ws
# Perhatikan: wss:// bukan ws://
```

### Deployment gagal karena memory
```
# Di Railway service backend → Settings → Resources
# Tambah RAM ke 512MB atau 1GB
```

### Migrasi database error
```
# Lihat log deploy backend
# Kalau error "relation already exists" itu normal, lanjut
# Kalau error connection refused, tunggu PostgreSQL siap dulu
```

---

## 📋 Checklist Final Sebelum Live

- [ ] PostgreSQL service running (hijau di Railway)
- [ ] Redis service running (hijau)
- [ ] Backend health check: `curl /health` → `{"status":"ok"}`
- [ ] Backend logs: tidak ada error merah
- [ ] Frontend bisa dibuka di browser
- [ ] Telegram bot: kirim `/start` ke bot kamu → dapat respons
- [ ] Test SDK: `clawbid init --webhook https://YOUR-BACKEND/wh/TEST`
- [ ] Dashboard muncul wallet setelah init

---

## 🚀 Flow Lengkap Setelah Platform Live

```
Kamu (owner):          User:
─────────────          ─────
Deploy Railway    →    buka clawbid.io
                       → klik "Generate Webhook"
                       → masuk OpenClaw key
                       → dapat webhook URL
                       
                       npm install -g @clawbid/agent
                       clawbid llm setup --key BANKR_KEY
                       clawbid init --webhook URL
                       ✓ Wallet auto-generated
                       ✓ Dashboard synced
                       
                       clawbid skill add trend-momentum.md
                       
                       Deposit USDC ke wallet address
                       (Base network, dari MetaMask/exchange)
                       
                       clawbid start
                       🦀 Agent berjalan 24/7
                       Analisa pakai Claude via Bankr LLM
                       Profit masuk wallet otomatis
                       Notif di Telegram
```

---

*ClawBid v1.0.0 · Deploy Tutorial — Railway Edition*
