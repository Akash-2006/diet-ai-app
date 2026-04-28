# Backend

FastAPI service: `GET /health` (issue **#2**).

## Encryption (issue **#3**)

Anthropic keys are AES-encrypted in the browser (`crypto-js`). The backend decrypts payloads with **`decrypt_cryptojs_openssl` in `crypto_util.py`**, using the passphrase from env **`ENCRYPTION_SECRET`**. It **must match** **`NEXT_PUBLIC_ENCRYPTION_SECRET`** on the frontend (`crypto-js`).

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open `GET http://127.0.0.1:8000/health` — expect `{ "status": "ok" }`.

Copy `.env.example` to `.env` and set `APP_PASSWORD` and `ENCRYPTION_SECRET`.

## Chat API (issue **#4**)

`POST /api/chat` JSON body:

```json
{
  "encrypted_api_key": "<CryptoJS ciphertext>",
  "message": "user text",
  "conversation_id": null
}
```

Headers: `X-App-Password: <APP_PASSWORD>`  
Response: `{ "reply": "...", "conversation_id": "<uuid>" }`.

Send the returned **`conversation_id`** on later turns so the assistant keeps thread context (stored **in-memory** on the server).

## Reset conversation (issue **#6**)

`POST /api/chat/reset`:

```json
{
  "encrypted_api_key": "<CryptoJS ciphertext>",
  "conversation_id": "<id to clear>"
}
```

Headers: `X-App-Password`  
Response: `{ "ok": true, "conversation_id": "..." }`

## Image upload (issue **#5**)

`POST /api/chat/image` — multipart form:

| Field | Type | Notes |
|-------|------|--------|
| `encrypted_api_key` | string | CryptoJS ciphertext (same as text chat) |
| `conversation_id` | string | optional; omit or send server id to stay in-thread |
| `message` | string | optional caption |
| `image` | file | image/jpeg, png, … |

Same header **`X-App-Password`**. Response shape: `{ "reply", "conversation_id" }`.

## Tests

```bash
pytest tests/
```
