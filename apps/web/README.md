# @repo/web — Frontend (Vite + React SPA)

Frontend GovernanceFund: **Public Budget Explorer** (tanpa login) + dashboard per-role dengan aksi
on-chain. Single-Page App (tanpa SSR) — cukup untuk cakupan akademik.

> Bagian dari monorepo [`governancefund`](../../README.md). Mengimpor `@repo/shared` untuk ABI,
> alamat kontrak, konstanta EIP-712, dan `computeProgramHash` — jangan duplikasi.

## Tech Stack

- **Vite + React 18** — SPA. Env var pakai `import.meta.env.VITE_*`.
- **React Router** (`react-router-dom`) — routing sisi klien, semua route `lazy()` + `Suspense`.
- **Tailwind CSS v4** (CSS-first, tanpa `tailwind.config`) + **shadcn/ui** (Radix primitives).
- **Wagmi v2 + Viem v2 + RainbowKit v2** — wallet connect (butuh Reown/WalletConnect `projectId`);
  `useSignTypedData` untuk EIP-712. Tidak memakai ethers.js.
- **@tanstack/react-query v5** — server-state + polling eventual-consistency.
- **react-hook-form + Zod** — form & validasi. **Axios** (`withCredentials`) ke Express.
- **@marsidev/react-turnstile** — Cloudflare Turnstile pada form auth (aktif hanya di build production).
- **framer-motion + GSAP + Lenis** — HANYA untuk landing/immersive; dashboard tetap minim-animasi.
- **Fonts:** Space Grotesk (display), Inter (body), JetBrains Mono (hash/wallet).

## Struktur (`src/`)

```
config/       # env, wagmi, alamat kontrak, roles
providers/    # AppProviders (Wagmi + RainbowKit + React Query), SmoothScroll (landing)
lib/          # axios instance, store route-progress
services/     # modul pemanggil API (authApi, programApi, votesApi, ...) — unwrap envelope
hooks/        # React Query + hook on-chain (useAuth, useTurnstile, useSignMilestone, useTxThenSync, ...)
schemas/      # skema Zod (auth, program, profile, withdraw)
types/        # tipe domain (plain .ts, bukan .d.ts)
utils/        # format, cn, error, bft, poll, cookie (session hint)
routes/       # AppRoutes (semua route lazy)
pages/        # halaman: landing, public/*, dashboard/*, auth
components/    # backgrounds, charts, landing, layout, motion, ui (shadcn)
```

**Pola aksi on-chain:** tulis via Wagmi `writeContract` (BUKAN API) → tunggu receipt →
poll endpoint read (React Query `refetchInterval`) sampai webhook memperbarui backend → tampilkan
state "menunggu sinkronisasi" (tidak pernah optimistic-success). Diabstraksi di `useTxThenSync`.

> **Sesi login:** `token` JWT disimpan sebagai cookie `httpOnly` (tak bisa dibaca JS) — `axios`
> dipanggil dengan `withCredentials: true`, tanpa token disimpan di `localStorage`. `useMe()`
> (`hooks/useAuth.ts`) hanya memanggil `GET /auth/me` jika cookie penanda `has_session` ada
> (`utils/cookie.ts`), supaya visitor yang jelas belum login tidak menembak endpoint itu sama sekali.

## Environment (`apps/web/.env`)

| Var | Wajib | Keterangan |
|---|---|---|
| `VITE_API_URL` | – | URL Express (default `http://localhost:4000`) |
| `VITE_CHAIN_ID` | – | default `84532` (Base Sepolia) |
| `VITE_WC_PROJECT_ID` | ✓ | WalletConnect/Reown project id |
| `VITE_ALCHEMY_RPC` | – | RPC Alchemy (kosong → fallback RPC publik) |
| `VITE_TURNSTILE_SITE_KEY` | – | Site key Turnstile (kosong → widget nonaktif) |

## Perintah

```bash
pnpm --filter @repo/web dev       # vite dev  → http://localhost:3000
pnpm --filter @repo/web build     # tsc --noEmit && vite build
pnpm --filter @repo/web preview   # preview hasil build
pnpm --filter @repo/web lint      # eslint
```

## Catatan

- **Turnstile** dinonaktifkan penuh di dev (`import.meta.env.PROD`), aktif otomatis di build production.
- Landing di-`lazy()` sehingga dependency immersive (framer/gsap/lenis) masuk chunk terpisah — dashboard tetap ringan.
- Deploy target: **Vercel** (daftarkan domain Vercel di Reown + Turnstile).
