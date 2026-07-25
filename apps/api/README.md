# @repo/api — Backend (Express.js + TypeScript)

REST API GovernanceFund: autentikasi, endpoint baca program/vote/user publik, **ingesti webhook
Alchemy** (sinkronisasi event on-chain → Supabase), reputasi, pengumpulan tanda tangan EIP-712,
upload (Cloudinary/IPFS), dan infrastruktur asinkron (BullMQ).

> Bagian dari monorepo [`governancefund`](../../README.md). Mengimpor `@repo/database` (Prisma) &
> `@repo/shared` (ABI, EIP-712, `computeProgramHash`).

## Prinsip Inti

- **Blockchain = sumber kebenaran.** Aksi finansial (submit/vote/approve/freeze/withdraw/grant/burn)
  **tidak punya endpoint** — semua on-chain via Wagmi; backend menyerapnya lewat webhook.
- Setiap event on-chain **di-cross-check** ke Supabase; anomali diklasifikasikan (`ORPHAN`/`HASH_MISMATCH`),
  tidak pernah didiam-diamkan.
- Jangan percaya data Supabase untuk keputusan on-chain — verifikasi ulang via `ecrecover`/view call.

## Tech Stack

Express 4.21 · **tsx** (dev watch) · **tsup** (bundle prod) · Prisma 5.20 · BullMQ (Upstash Redis via
ioredis) · JWT (cookie httpOnly + fallback Bearer) · bcryptjs · **Brevo** email HTTP API (EJS) · **Pino** (log
terstruktur, redaksi rahasia) · **Sentry** · Alchemy SDK · Cloudinary + **Pinata** (IPFS) · Multer ·
helmet · express-rate-limit · sanitize-html · **Cloudflare Turnstile** (anti-bot pada auth).

## Struktur (`src/`)

```
index.ts        # entrypoint (connect DB retry, start server + workers, graceful shutdown)
instrument.ts   # inisialisasi Sentry (diimpor PALING awal)
app.ts          # susunan middleware Express
config/         # env (validasi Zod), pinata, cloudinary, dll.
middleware/     # auth, requireRole, rateLimiter, turnstile, webhookVerify, upload, errorHandler
routes/         # auth, users, programs, signatures, uploads, public, webhook
controllers/    # handler tiap route
services/       # logika bisnis (auth, program, webhook, reputation, signature, ipfs, ...)
validators/     # skema Zod + helper sanitasi
queues/         # definisi BullMQ (webhook-ingestion, reconciliation)
workers/        # worker BullMQ + scheduler rekonsiliasi + warm-cache validator count
scripts/        # skrip one-off (mis. backfillProposalVotes.ts)
templates/      # email EJS (verify, reset password)
lib/            # prisma (+ prismaDirect), redis, cache (in-memory), logger
utils/          # AppError, asyncHandler, response envelope
```

## Strategi Cache

- **In-memory (app-level)** — `lib/cache.ts` (via `lib/memoryCache.ts`, `Map` in-process dengan TTL)
  dipakai untuk semua `cacheAside()`: list/detail program, statistik publik, daftar penarikan,
  jumlah validator on-chain, dll. API berjalan sebagai **satu proses long-running** (bukan
  serverless), jadi data yang memang bisa dihitung ulang tak perlu bolak-balik ke Redis — ini
  menghapus 1-2 network round-trip dari hampir semua endpoint baca.
  ⚠️ **Konsekuensi:** cache ini tidak dibagi antar-proses. Skrip di `scripts/` yang memanggil
  `invalidate()`/`invalidatePattern()` (mis. `backfillProposalVotes.ts`) hanya menghapus cache di
  proses skrip itu sendiri — **restart server API** (atau tunggu TTL habis) setelah menjalankan
  skrip one-off supaya server yang sedang berjalan ikut melihat data terbaru.
- **Redis (Upstash)** — khusus data yang wajib shared & tahan-restart: **rate limiter**
  (`middleware/rateLimiter.ts`) dan **blocklist token JWT** (`middleware/auth.ts`, wajib segera
  berlaku lintas restart demi keamanan revocation).
- **`prismaDirect`** (`lib/prisma.ts`, sumber di `packages/database`) — klien Prisma terpisah yang
  memakai `DIRECT_URL` (bukan pooler transaction-mode). Dipakai khusus untuk
  `prisma.$transaction(...)` multi-statement (mis. `createProgram`) karena PgBouncer
  transaction-mode tidak cocok dengan asumsi "satu koneksi dipegang sepanjang BEGIN..COMMIT" yang
  dibutuhkan interactive transaction Prisma.

## Alur Penting

- **Webhook Alchemy** (`routes/webhook.ts`) pakai `express.raw()` + verifikasi HMAC → **enqueue** ke
  BullMQ → balas 200 cepat. Worker men-decode event (viem `decodeEventLog`, dedup `txHash:logIndex`)
  lalu memperbarui Supabase (status, orphan, reputasi, withdrawal).
- **Rekonsiliasi** periodik (1 jam) mengaudit seluruh program on-chain vs Supabase (deteksi
  tampering/penghapusan).
- **Turnstile** (`middleware/turnstile.ts`) hanya ditegakkan di production; dev/test dilewati.

## Environment (`apps/api/.env`) — inti

`DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET` (≥32), `UPSTASH_REDIS_URL` (`rediss://…`),
`ALCHEMY_BASE_SEPOLIA_RPC_URL`, `ALCHEMY_WEBHOOK_SECRET`, `BREVO_API_KEY`, `EMAIL_FROM`,
`FRONTEND_URL`, `QUEUE_ADMIN_USER/PASS`, `CLOUDINARY_*`, `PINATA_JWT/GATEWAY`,
`TURNSTILE_SECRET_KEY` (opsional), `SENTRY_DSN` (opsional), `ENABLE_WORKERS` (`false` untuk hemat
kuota Redis saat dev).

> **Email pakai Brevo HTTP API, bukan SMTP** — host cloud (Railway) memblok egress SMTP (port 465
> & 587 sama-sama timeout), jadi pengiriman lewat HTTPS/443. `BREVO_API_KEY` **wajib** (app gagal
> boot tanpanya) dan `EMAIL_FROM` harus sender yang sudah diverifikasi di dashboard Brevo.

> **Jangan commit `.env`.** Alamat kontrak + ABI + alamat deployer aman publik (fitur transparansi).

## Perintah

```bash
pnpm --filter @repo/api dev                    # tsx watch  → http://localhost:4000
pnpm --filter @repo/api backfill:proposal-votes  # skrip one-off, lihat catatan Strategi Cache di atas
```

Endpoint kesehatan: `GET /health` (cek DB + Redis). BullBoard: `/admin/queues` (basic-auth).
Deploy target: **Railway**.

> **Cookie sesi:** `POST /auth/login` men-set dua cookie — `token` (JWT, `httpOnly`) dan
> `has_session` (flag `"1"`, **bukan** `httpOnly`, tanpa nilai sensitif). `has_session` ada
> semata agar frontend tahu kemungkinan ada sesi tanpa perlu memanggil `GET /auth/me` untuk
> visitor yang jelas belum pernah login — keduanya dihapus bersamaan saat `POST /auth/logout`.
