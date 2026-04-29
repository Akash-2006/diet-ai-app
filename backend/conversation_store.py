"""Load/save chat turns for authenticated users (PostgreSQL or SQLite)."""

from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from sqlalchemy.orm import Session

from models import Conversation, Message
from nutrition_graph import invoke_graph_with_messages


def db_messages_to_lc(rows: list[Message]) -> list[BaseMessage]:
    out: list[BaseMessage] = []
    for m in rows:
        if m.role == "user":
            out.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            out.append(AIMessage(content=m.content))
    return out


def get_or_create_conversation(
    db: Session,
    user_id: str,
    conversation_id: str | None,
) -> Conversation:
    cid = conversation_id.strip() if conversation_id else ""
    if cid:
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == cid, Conversation.user_id == user_id)
            .first()
        )
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conv
    conv = Conversation(user_id=user_id, title="New chat")
    db.add(conv)
    db.commit()
    db.refresh(conv)
    return conv


def run_persisted_text_chat(
    db: Session,
    user_id: str,
    conversation_id: str | None,
    user_message: str,
    api_key_plain: str,
) -> tuple[str, str]:
    conv = get_or_create_conversation(db, user_id, conversation_id)
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    lc_hist = db_messages_to_lc(rows)
    lc_hist.append(HumanMessage(content=user_message))
    reply, _merged = invoke_graph_with_messages(api_key_plain, lc_hist)
    db.add(
        Message(
            conversation_id=conv.id,
            role="user",
            content=user_message,
            has_image=False,
        )
    )
    db.add(
        Message(
            conversation_id=conv.id,
            role="assistant",
            content=reply,
            has_image=False,
        )
    )
    if conv.title == "New chat":
        conv.title = user_message[:80] + ("…" if len(user_message) > 80 else "")
    conv.updated_at = datetime.utcnow()
    db.commit()
    return reply, conv.id


def run_persisted_image_chat(
    db: Session,
    user_id: str,
    conversation_id: str | None,
    media_type: str,
    image_bytes: bytes,
    user_caption: str | None,
    api_key_plain: str,
) -> tuple[str, str]:
    import base64

    conv = get_or_create_conversation(db, user_id, conversation_id)
    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.asc())
        .all()
    )
    lc_hist = db_messages_to_lc(rows)

    caption = (user_caption or "").strip()
    if not caption:
        caption = "Describe this food and estimate nutrition (calories and macros)."
    b64 = base64.b64encode(image_bytes).decode("ascii")
    media = media_type.strip() if media_type else "application/octet-stream"
    content: list[str | dict] = [
        {"type": "text", "text": caption},
        {"type": "image_url", "image_url": {"url": f"data:{media};base64,{b64}"}},
    ]
    lc_hist.append(HumanMessage(content=content))
    reply, _merged = invoke_graph_with_messages(api_key_plain, lc_hist)

    db.add(
        Message(
            conversation_id=conv.id,
            role="user",
            content=caption,
            has_image=True,
        )
    )
    db.add(
        Message(
            conversation_id=conv.id,
            role="assistant",
            content=reply,
            has_image=False,
        )
    )
    if conv.title == "New chat":
        conv.title = caption[:80] + ("…" if len(caption) > 80 else "")
    conv.updated_at = datetime.utcnow()
    db.commit()
    return reply, conv.id


def delete_conversation_for_user(db: Session, user_id: str, conversation_id: str) -> None:
    conv = (
        db.query(Conversation)
        .filter(Conversation.id == conversation_id.strip(), Conversation.user_id == user_id)
        .first()
    )
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
