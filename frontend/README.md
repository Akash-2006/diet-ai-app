# Frontend

**Next.js 14** (App Router) · **Tailwind CSS** · **[shadcn/ui](https://ui.shadcn.com/)** · **crypto-js** (CryptoJS-compatible AES for API keys).

## Scripts

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start
npm run lint
npm run test       # Vitest (happy-dom): encrypt helper, Setup, Chat smoke + Photo wiring
```

## Configuration

Copy `.env.example` to `.env.local` at minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ENCRYPTION_SECRET` | **Must equal** backend `ENCRYPTION_SECRET`. Used client-side only to encrypt the Anthropic API key before `localStorage`; never uploaded as plain text. |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL (defaults reasonable for local FastAPI when wiring chat). |
| `NEXT_PUBLIC_APP_PASSWORD` | **Must equal** backend `APP_PASSWORD`; used as `X-App-Password` on API calls once connected. |

## Deploy (Railway) (issue **#16**)

- **GitHub service** → **Root Directory** **`frontend`** (uses `railway.toml`, `package.json`, lockfile).
- **`frontend/railway.toml`** — **`npm ci && npm run build`**, start **`next start`** on **`$PORT`** (bind **`0.0.0.0`**), **`GET /**` health probe.
- **Variables** — Add in Railway **before the first deploy** so `next build` can embed **`NEXT_PUBLIC_*`**:
  | Variable | Purpose |
  |----------|---------|
  | **`NEXT_PUBLIC_API_BASE_URL`** | Public URL of your **backend** Railway service (`https://…`, no trailing slash). |
  | **`NEXT_PUBLIC_ENCRYPTION_SECRET`** | Same string as backend **`ENCRYPTION_SECRET`**. |
  | **`NEXT_PUBLIC_APP_PASSWORD`** | Same string as backend **`APP_PASSWORD`**. |
- **`NODE_ENV`** is set automatically by the build/start pipeline.

## Features

- **`/`** — Landing with links to setup and chat.
- **`/setup`** — Enter Anthropic API key → **`CryptoJS.AES.encrypt(...).toString()`** → ciphertext stored under `lib/encryptedApiKey.ts` (`diet_ai_encrypted_api_key_v1`).
- **`/chat`** — Text chat (`POST /api/chat`), optional **food photo** via multipart **`POST /api/chat/image`** (caption optional), **`conversation_id`** continuity, **`Reset thread`** (`POST /api/chat/reset`). Needs **`NEXT_PUBLIC_APP_PASSWORD`** and a saved encrypted key.

### Tests (`vitest`)

- **`lib/encryptedApiKey.test.ts`** — AES encrypt/decrypt parity with CryptoJS, `localStorage` helpers, `hasEncryptionConfigured` vs env.
- **`__tests__/setup-page.test.tsx`** — validation + ciphertext saved after Encrypt & save.
- **`__tests__/chat-page.smoke.test.tsx`** — chat shell when a key exists; **Photo** + hidden file input.

Config: `vitest.config.mjs`, `vitest.setup.ts` (maps `next/link`, stubs `ResizeObserver` / `scrollIntoView`).

CI on `frontend/**`: `.github/workflows/frontend-ci.yml` (`npm ci`, `npm run lint`, `npm run test`).
