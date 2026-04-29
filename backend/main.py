"""FastAPI backend: health, auth, persisted chat, image chat, analytics."""

from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth_tokens import create_access_token, decode_access_token, hash_password, verify_password
from conversation_store import delete_conversation_for_user, run_persisted_image_chat, run_persisted_text_chat
from crypto_util import decrypt_cryptojs_openssl
from database import get_db, init_db
from models import Conversation, Message, NutritionLog, User
from nutrition_graph import reset_conversation, run_nutrition_chat, run_nutrition_image_chat


class Settings(BaseSettings):
    app_password: str
    encryption_secret: str
    jwt_secret: str = "dev-change-me-in-production-use-a-long-random-string"
    jwt_expiry_hours: int = 168

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="Diet Nutrition AI API", version="1.0.0", lifespan=lifespan)

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
    conversation_id: str | None = None


class ResetBody(BaseModel):
    encrypted_api_key: str
    conversation_id: str


class RegisterBody(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class NutritionLogBody(BaseModel):
    logged_on: date
    calories: int | None = None
    protein_g: float | None = None
    carbs_g: float | None = None
    fat_g: float | None = None
    notes: str | None = Field(default=None, max_length=1024)


def decrypt_user_key(enc: str) -> str:
    try:
        return decrypt_cryptojs_openssl(enc.strip(), settings.encryption_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not decrypt API key: {exc}") from exc


def verify_app_password_header(x_app_password: str | None = Header(None, alias="X-App-Password")) -> None:
    if x_app_password is None:
        raise HTTPException(status_code=403, detail="Missing X-App-Password header")
    if x_app_password != settings.app_password:
        raise HTTPException(status_code=403, detail="Invalid app password")


def optional_bearer_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    try:
        user_id = decode_access_token(token, settings.jwt_secret)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def verify_app_or_user(
    x_app_password: str | None = Header(None, alias="X-App-Password"),
    user: User | None = Depends(optional_bearer_user),
) -> User | None:
    if user is not None:
        return user
    verify_app_password_header(x_app_password)
    return None


DependsAppOrUser = Depends(verify_app_or_user)


def require_user(user: User | None = Depends(optional_bearer_user)) -> User:
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register")
async def api_register(
    body: RegisterBody,
    _: None = Depends(verify_app_password_header),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    existing = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(
        email=body.email.lower().strip(),
        hashed_password=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    return {"ok": True, "email": user.email}


@app.post("/api/auth/login")
async def api_login(
    body: LoginBody,
    _: None = Depends(verify_app_password_header),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(
        subject_user_id=user.id,
        secret=settings.jwt_secret,
        expires_hours=settings.jwt_expiry_hours,
    )
    return {"access_token": token, "token_type": "bearer", "user_id": user.id, "email": user.email}


@app.get("/api/auth/me")
async def api_me(user: User = Depends(require_user)) -> dict[str, str]:
    return {"id": user.id, "email": user.email}


@app.get("/api/conversations")
async def list_conversations(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = (
        db.query(Conversation)
        .filter(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "created_at": r.created_at.isoformat() + "Z",
            "updated_at": r.updated_at.isoformat() + "Z",
        }
        for r in rows
    ]


@app.get("/api/conversations/{conversation_id}/messages")
async def get_conversation_messages(
    conversation_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    return {
        "conversation_id": conv.id,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "has_image": m.has_image,
                "created_at": m.created_at.isoformat() + "Z",
            }
            for m in msgs
        ],
    }


@app.delete("/api/conversations/{conversation_id}")
async def api_delete_conversation(
    conversation_id: str,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, bool]:
    delete_conversation_for_user(db, user.id, conversation_id)
    return {"ok": True}


@app.post("/api/nutrition/logs")
async def create_nutrition_log(
    body: NutritionLogBody,
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    log = NutritionLog(
        user_id=user.id,
        logged_on=body.logged_on,
        calories=body.calories,
        protein_g=body.protein_g,
        carbs_g=body.carbs_g,
        fat_g=body.fat_g,
        notes=body.notes,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"id": log.id}


@app.get("/api/analytics/activity")
async def analytics_activity(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    days: int = 14,
) -> dict[str, Any]:
    days = max(1, min(days, 90))
    start = datetime.utcnow().date() - timedelta(days=days - 1)
    q = (
        db.query(func.date(Message.created_at).label("d"), func.count(Message.id))
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(
            Conversation.user_id == user.id,
            Message.role == "user",
            func.date(Message.created_at) >= start,
        )
        .group_by(func.date(Message.created_at))
        .order_by(func.date(Message.created_at))
    )
    bars = [{"date": str(row[0]), "user_messages": int(row[1])} for row in q.all()]
    return {"days": days, "bars": bars}


@app.get("/api/analytics/nutrition")
async def analytics_nutrition(
    user: User = Depends(require_user),
    db: Session = Depends(get_db),
    days: int = 14,
) -> dict[str, Any]:
    days = max(1, min(days, 90))
    start = datetime.utcnow().date() - timedelta(days=days - 1)
    q = (
        db.query(NutritionLog.logged_on, func.sum(NutritionLog.calories))
        .filter(NutritionLog.user_id == user.id, NutritionLog.logged_on >= start)
        .group_by(NutritionLog.logged_on)
        .order_by(NutritionLog.logged_on)
    )
    bars = [{"date": str(row[0]), "calories": int(row[1] or 0)} for row in q.all()]
    return {"days": days, "bars": bars}


@app.post("/api/chat")
async def api_chat(
    body: ChatBody,
    db: Session = Depends(get_db),
    user: User | None = DependsAppOrUser,
) -> dict[str, Any]:
    api_key_plain = decrypt_user_key(body.encrypted_api_key)
    if user:
        reply, conv_id = run_persisted_text_chat(
            db,
            user.id,
            body.conversation_id,
            body.message,
            api_key_plain,
        )
        return {"reply": reply, "conversation_id": conv_id}
    reply, conv_id = run_nutrition_chat(api_key_plain, body.message, body.conversation_id)
    return {"reply": reply, "conversation_id": conv_id}


@app.post("/api/chat/image")
async def api_chat_image(
    encrypted_api_key: str = Form(...),
    conversation_id: str = Form(""),
    message: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User | None = DependsAppOrUser,
) -> dict[str, Any]:
    api_key_plain = decrypt_user_key(encrypted_api_key)
    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image upload")
    media = image.content_type or "application/octet-stream"
    cid_in = conversation_id.strip() if conversation_id else None
    if user:
        reply, conv_id = run_persisted_image_chat(
            db,
            user.id,
            cid_in,
            media,
            raw,
            message or None,
            api_key_plain,
        )
        return {"reply": reply, "conversation_id": conv_id}
    reply, conv_id = run_nutrition_image_chat(
        api_key_plain,
        media,
        raw,
        message or None,
        cid_in,
    )
    return {"reply": reply, "conversation_id": conv_id}


@app.post("/api/chat/reset")
async def api_chat_reset(
    body: ResetBody,
    db: Session = Depends(get_db),
    user: User | None = DependsAppOrUser,
) -> dict[str, Any]:
    _ = decrypt_user_key(body.encrypted_api_key)
    cid = body.conversation_id.strip()
    if not cid:
        raise HTTPException(status_code=400, detail="conversation_id required")
    if user:
        delete_conversation_for_user(db, user.id, cid)
        return {"ok": True, "conversation_id": cid}
    reset_conversation(cid)
    return {"ok": True, "conversation_id": cid}
