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

## Tests (crypto utilities)

```bash
pytest tests/
```
