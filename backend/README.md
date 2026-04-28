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
Response: `{ "reply": "...", "conversation_id": "<uuid>" }` (multi-turn memory in issue **#6**).

## Tests

```bash
pytest tests/
```
