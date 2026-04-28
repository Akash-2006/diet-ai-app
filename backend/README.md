# Backend

FastAPI service (minimal); see **issue #2** for `/health`.

## Run locally

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Then open `GET http://127.0.0.1:8000/health` — expect `{ "status": "ok" }`.
