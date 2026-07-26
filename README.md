# GovernanceFund

> Sistem tata kelola dana institusi hibrida **Web2 + Web3** untuk mencegah penggelapan dan
> pemalsuan dokumen pada pengelolaan anggaran pemerintah/organisasi. Blockchain menjadi
> sumber kebenaran yang anti-manipulasi; Web2 menangani semua yang tidak perlu on-chain.

<p align="left">
  <img alt="Solidity" src="https://img.shields.io/badge/Solidity-0.8.35-363636?logo=solidity">
  <img alt="Base Sepolia" src="https://img.shields.io/badge/Base%20Sepolia-84532-0052FF">
  <img alt="React" src="https://img.shields.io/badge/React-18-61DAFB?logo=react">
  <img alt="Express" src="https://img.shields.io/badge/Express-4.21-000000?logo=express">
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-5.20-2D3748?logo=prisma">
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green">
</p>

> **Catatan penamaan:** repo GitHub bernama `governancefund`, namun kontrak Solidity inti tetap
> memakai nama teknis `Web3Governance` (domain EIP-712: `GovernanceAntiCorruption`). Nama aplikasi
> dan nama kontrak memang sengaja berbeda.

---

## Deskripsi

**GovernanceFund** adalah aplikasi institusional internal — dengan **Public Budget Explorer**
(tanpa login) agar publik dapat memantau peredaran dana secara transparan, termasuk tab **Fraud**
yang justru mengekspos upaya kecurangan yang terdeteksi.

**Tesis inti:** audit tradisional menemukan kecurangan *setelah* uang hilang. Sistem ini membuat
kecurangan **mustahil secara mekanis** *sebelum* terjadi — tidak ada satu orang pun yang bisa
memindahkan dana sendirian, setiap pengeluaran ditambatkan (anchored) secara kriptografis on-chain,
dan aktivitas mencurigakan dapat dibekukan seketika oleh auditor independen.

> Proyek ini adalah **proyek akademik/paper**, di-deploy ke **Base Sepolia testnet** (bukan mainnet).

## Permasalahan yang Dipecahkan

| Masalah klasik | Solusi GovernanceFund |
|---|---|
| Satu pejabat bisa mencairkan dana sepihak | **Multi-sig on-chain**: 3 tanda tangan EIP-712 unik (admin + validator + auditor) per milestone |
| Persetujuan program tidak transparan / bisa dikongkalikong | **Voting validator 67% BFT** on-chain |
| Dokumen bukti bisa dipalsukan/diganti | **Hash anchoring**: SHA-256 dokumen ditambatkan on-chain, diverifikasi ulang tiap webhook & rekonsiliasi |
| Data Web2 diam-diam diubah/dihapus untuk menutupi jejak | **Orphan detection + rekonsiliasi**: catatan tanpa pasangan on-chain diklasifikasikan `FLAGGED`, penghapusan justru menciptakan ulang record sebagai `ORPHAN` |
| Fraud baru ketahuan setelah dana hilang | **Freeze instan** oleh auditor independen + banding dua-arah (approve/reject) berbasis vote |
| Token bisa dijual/dialihkan bebas | **Token non-transferable** (e-IDR) — hanya bisa ditebus (burn) di gateway |

## Konsep Kunci — Batas Kepercayaan Web2 vs Web3

Smart contract bersifat **publik & permissionless**: siapa pun yang tahu alamat + ABI bisa memanggil
fungsi langsung (via Etherscan/script), melewati frontend. **Guard Web2 selalu bisa di-bypass —
ini diterima secara desain.**

> **Prinsip:** yang melindungi **DANA** harus on-chain; yang melindungi **UX** boleh di Web2.

Pem-bypass yang memanggil `submitProposal()` langsung tetap **tidak bisa memindahkan uang**, karena
pencairan butuh voting 67% validator (on-chain) + 3 tanda tangan EIP-712 (on-chain) yang tak bisa ia
kendalikan/palsukan. Hasilnya hanya proposal `PENDING` yang tak berguna — dan Express meng-cross-check
setiap event on-chain terhadap Supabase lalu mengklasifikasikannya (lihat *Orphan Detection*).

| Aksi | Dilindungi oleh |
|---|---|
| Mint token (pencairan) | 3 tanda tangan EIP-712 on-chain ✓ |
| Setujui program | Voting 67% validator on-chain ✓ |
| Grant/revoke role | Voting 67% admin on-chain ✓ |
| Freeze program | `onlyRole(AUDITOR)` on-chain ✓ |
| Unfreeze / konfirmasi fraud | Voting dua-arah 67% validator on-chain ✓ |
| Siapa boleh submit proposal | `onlyRole(PIC_ROLE)` on-chain + verifikasi Web2 ✓ |

## 5 Peran

- **User** — akun default, tanpa kuasa governance; bisa dipromosikan lewat voting admin.
- **Multi Admin** — voting 67% BFT untuk grant/demote role; 1 dari 3 tanda tangan milestone. Min. 1 admin.
- **Multi Validator** — voting 67% menyetujui proposal & banding unfreeze. Min. 3 validator untuk beroperasi.
- **Auditor** — independen; satu-satunya kuasa: **freeze** program yang dicurigai; co-sign milestone; punya skor reputasi.
- **PIC** (Person in Charge) — `PIC_ROLE` on-chain (di-grant satu admin tanpa voting); mengajukan proposal, mengumpulkan 3 tanda tangan, menarik dana bertahap; punya skor reputasi.

## Struktur Monorepo

```
governancefund/
├── apps/
│   ├── web/          # Frontend — Vite + React 18 SPA (README sendiri)
│   └── api/          # Backend  — Express.js + TypeScript (README sendiri)
├── packages/
│   ├── blockchain/   # Smart contract — Hardhat 3 + Solidity (README sendiri)
│   ├── database/     # Prisma schema + client (README sendiri)
│   └── shared/       # ABI, konstanta EIP-712, computeProgramHash (README sendiri)
├── turbo.json        # Pipeline Turborepo (dev/build/lint/db:generate)
├── pnpm-workspace.yaml
└── package.json      # Root workspace (pnpm@9)
```

**Aliran ABI:** Hardhat compile → ABI JSON → `packages/shared` → diimpor `apps/web` (Wagmi) & `apps/api` (webhook).
**Aliran Prisma:** `schema.prisma` di `packages/database` → generate client → diimpor `apps/api`.

## Tech Stack

| Layer | Teknologi utama |
|---|---|
| **Frontend** (`apps/web`) | Vite + React 18, React Router, Tailwind v4 (CSS-first) + shadcn/ui (Radix), Wagmi v2 + Viem + RainbowKit, React Query, react-hook-form + Zod, framer-motion/GSAP/Lenis (landing), Cloudflare Turnstile |
| **Backend** (`apps/api`) | Express 4 + TypeScript (tsx/tsup), Prisma (pooler + koneksi direct khusus transaksi), cache in-memory app-level + BullMQ (Upstash Redis), JWT (httpOnly cookie), Brevo (email via HTTP API), Pino, Sentry, Alchemy SDK, Cloudinary + Pinata (IPFS) |
| **Blockchain** (`packages/blockchain`) | Solidity 0.8.35, Hardhat 3, OpenZeppelin v5 (EIP712/ECDSA/AccessControl/ERC20), Ethers (khusus script) |
| **Database** | Supabase PostgreSQL via Prisma 5.20 (session pooler) |
| **Infra** | Vercel (FE), Railway (BE), Upstash Redis, Alchemy Notify webhook |

> **Strategi cache:** data yang aman untuk stale sebentar (list/detail program, statistik publik,
> jumlah validator on-chain, dll.) di-cache **in-memory di dalam proses API** (bukan Redis) — API
> berjalan sebagai satu proses long-running, jadi tak butuh cache terdistribusi untuk data yang
> memang bisa dihitung ulang. Redis (Upstash) tetap dipakai khusus untuk hal yang wajib
> shared/tahan-restart: **rate limiter** dan **blocklist token JWT**. Lihat `apps/api/README.md`.

## Fitur / Lapisan Anti-Fraud

1. Trigger PostgreSQL — baris ber-status `APPROVED`/terkunci menolak UPDATE/DELETE.
2. Hash anchoring — `programHash` = SHA-256 atas 15 field kanonik, diverifikasi ulang tiap webhook & rekonsiliasi.
3. Prisma FK Restrict, EIP-712 signature binding, `historyOfSigners` (anti-kolusi antar-milestone).
4. Sistem reputasi berbasis outcome (PIC & auditor), clawback window 72 jam.
5. Orphan detection + rekonsiliasi periodik (BullMQ), cumulative budget guard on-chain.
6. Token non-transferable, expiry proposal 7 hari on-chain, unfreeze dua-arah + deadline.
7. Sanitasi stored-XSS, auth cookie httpOnly, **Cloudflare Turnstile** (anti-bot) di endpoint auth (aktif hanya production).

## Alur Instalasi (General)

**Prasyarat:** Node.js ≥ 18 (dikembangkan di Node 24), **pnpm 9**, akun Supabase / Upstash / Alchemy / Cloudinary / Pinata.

```bash
# 1. Clone + install seluruh workspace
git clone https://github.com/Xnaizer/governancefund.git
cd governancefund
pnpm install

# 2. Siapkan environment (lihat README tiap paket untuk daftar lengkap)
#    - packages/database/.env  → DATABASE_URL, DIRECT_URL (Supabase pooler)
#    - apps/api/.env           → JWT_SECRET, UPSTASH_REDIS_URL, ALCHEMY_*, BREVO_API_KEY, dst.
#    - apps/web/.env           → VITE_API_URL, VITE_WC_PROJECT_ID, dst.

# 3. Database — generate client + push schema (+ seed opsional)
pnpm --filter @repo/database db:generate
pnpm --filter @repo/database db:push
pnpm --filter @repo/database db:seed        # opsional (faker id_ID)

# 4. Blockchain — compile (deploy hanya bila perlu redeploy)
pnpm --filter @repo/blockchain compile

# 5. Jalankan dev (semua paket paralel via Turborepo)
pnpm dev
#    atau per paket:
pnpm --filter @repo/api dev      # http://localhost:4000
pnpm --filter @repo/web dev      # http://localhost:3000
```

> Turnstile **nonaktif otomatis** di development (FE & BE), jadi alur auth lokal bebas hambatan.

## Kontrak Ter-deploy (Base Sepolia — chainId 84532)

| Kontrak | Alamat |
|---|---|
| RupiahToken | `0xECfa4Bde55D1EA9408e07948fDf0f8df04d1623a` |
| TrustedGatewayBurner | `0x6be4bB45658Eb844Ff3685Ea7E25fc51Ab1cd332` |
| Web3Governance | `0x1D4e8fD4F037830f463C3dCB0272DAcDD8dc7766` |
| Deployer | `0x3ff8C245C6499062A98Ed214EA606Ec5fa2627Dd` |

Block explorer: https://sepolia.basescan.org

## Batasan yang Diketahui (untuk paper)

Batasan berikut sengaja didokumentasikan sebagai *known limitations* (bukan bug):

- **Ambang BFT dinamis** — `N` diambil live saat vote di-cast, tidak dikunci saat proposal dibuat;
  admin yang grant/revoke role di tengah voting bisa menggeser ambang.
- **Hanya testnet** — di-deploy ke Base Sepolia (84532), belum mainnet.
- **Reputasi off-chain** (Web2) — bisa dimanipulasi bila Supabase dibobol; dimitigasi dengan
  menurunkannya **eksklusif dari event on-chain** (bukan input manual).
- **Guard Web2 bisa di-bypass** — memanggil kontrak langsung hanya menghasilkan proposal `ORPHAN`
  yang tak berbahaya (tak pernah tervoting/terdanai), karena otoritas finansial sepenuhnya on-chain.
- **`totalBudget` vs Σ`milestoneBudget`** — cumulative guard ditegakkan on-chain; angka perencanaan
  per-milestone di Web2 hanya bersifat *advisory*.
- **Satu siklus freeze–unfreeze per program** — `appealStartedAt != 0` memblokir banding ulang;
  program yang dibekukan lagi tak bisa banding lagi (dianggap sinyal kuat).
- **`UNRESOLVED` = freeze permanen** — bila deadline banding lewat tanpa ambang tercapai, program
  tetap `FROZEN` selamanya **tanpa perubahan reputasi** (tak menghakimi tanpa konsensus). PIC yang
  sebenarnya tak bersalah namun validatornya apatis bisa "terdampar" — konservatif secara desain
  (melindungi dana publik saat ragu). *Future work:* mekanisme banding-ulang / eskalasi admin.
- **Clawback 72 jam** — ditegakkan di lapisan aplikasi/UX saja (Opsi C), bukan jaminan kriptografis on-chain.
- **Kuota milestone yang di-finalize tidak dikembalikan** ke pool alokasi (alokasi = komitmen).
- **Proposal kedaluwarsa tetap `PENDING`** on-chain selamanya (tak ada enum `EXPIRED`); PIC harus
  submit ulang dengan `programId` baru. Web2 menampilkannya sebagai "Expired" (data transparansi).
- **`VOTING_PERIOD`** satu konstanta 7 hari dipakai bersama untuk voting proposal **dan** unfreeze.
- **Public Explorer** hanya menampilkan program `isOnChain = true` (draft Web2 disembunyikan dari publik).
- **Normalisasi wallet lowercase** dilakukan per-field di service layer (bukan middleware global —
  agar tak menimpa field alamat fisik `User.address`).
- **Di luar cakupan** (*future work*): reputasi validator, akuntabilitas signer, penalti proposal
  kedaluwarsa, EIP-4337 (account abstraction), dan ZK proof.

## Lisensi

MIT.
