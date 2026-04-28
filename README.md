# Diet AI App (monorepo)

Private monorepo for the Diet & Nutrition AI Chat App.

## Layout

| Path | Purpose |
|------|---------|
| `frontend/` | Next.js 14 (App Router) UI — wired in issues 7+ |
| `backend/` | FastAPI + LangChain; **`railway.toml`** for Railway deploy (#15) |
| `.github/workflows/` | `backend-ci.yml` (#13), `frontend-ci.yml` (#14) |

See `frontend/README.md` (Next.js) and `backend/README.md` (FastAPI) for how to run each app.
