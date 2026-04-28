"""FastAPI backend: health + nutrition chat (issue #4)."""

from __future__ import annotations

from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings, SettingsConfigDict

from crypto_util import decrypt_cryptojs_openssl
from nutrition_graph import run_nutrition_chat


class Settings(BaseSettings):
    app_password: str
    encryption_secret: str

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

app = FastAPI(title="Diet Nutrition AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatBody(BaseModel):
    encrypted_api_key: str
    message: str
    conversation_id: str | None = None  # multi-turn memory wired in issue #6


def verify_app_password(x_app_password: str | None = Header(None, alias="X-App-Password")) -> None:
    if x_app_password is None:
        raise HTTPException(status_code=403, detail="Missing X-App-Password header")
    if x_app_password != settings.app_password:
        raise HTTPException(status_code=403, detail="Invalid app password")


def decrypt_user_key(enc: str) -> str:
    try:
        return decrypt_cryptojs_openssl(enc.strip(), settings.encryption_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decrypt API key: {exc}") from exc


DependsPassword = Depends(verify_app_password)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chat")
async def api_chat(body: ChatBody, _: None = DependsPassword) -> dict[str, Any]:
    api_key_plain = decrypt_user_key(body.encrypted_api_key)
    reply, conv_id = run_nutrition_chat(api_key_plain, body.message)
    return {"reply": reply, "conversation_id": conv_id}

