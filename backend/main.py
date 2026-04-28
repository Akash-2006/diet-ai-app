"""FastAPI backend (issue #2: health check)."""

from fastapi import FastAPI

app = FastAPI(title="Diet Nutrition AI API", version="1.0.0")


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness/readiness probe for Railway and localhost."""
    return {"status": "ok"}
