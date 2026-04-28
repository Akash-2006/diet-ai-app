# Frontend

**Next.js 14** (App Router) · **Tailwind CSS** · **[shadcn/ui](https://ui.shadcn.com/)** · **crypto-js** (CryptoJS-compatible AES for API keys).

## Scripts

```bash
npm install
npm run dev       # http://localhost:3000
npm run build
npm run start
npm run lint
```

## Configuration

Copy `.env.example` to `.env.local` at minimum:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ENCRYPTION_SECRET` | **Must equal** backend `ENCRYPTION_SECRET`. Used client-side only to encrypt the Anthropic API key before `localStorage`; never uploaded as plain text. |
| `NEXT_PUBLIC_API_BASE_URL` | Backend URL (defaults reasonable for local FastAPI when wiring chat). |
| `NEXT_PUBLIC_APP_PASSWORD` | **Must equal** backend `APP_PASSWORD`; used as `X-App-Password` on API calls once connected. |

## Features

- **`/`** — Landing with links to setup and chat.
- **`/setup`** — Enter Anthropic API key → **`CryptoJS.AES.encrypt(...).toString()`** → ciphertext stored under `lib/encryptedApiKey.ts` (`diet_ai_encrypted_api_key_v1`).
- **`/chat`** — Text chat (`POST /api/chat`), optional **food photo** via multipart **`POST /api/chat/image`** (caption optional), **`conversation_id`** continuity, **`Reset thread`** (`POST /api/chat/reset`). Needs **`NEXT_PUBLIC_APP_PASSWORD`** and a saved encrypted key.

Later: Vitest around encrypt + chat flows.
