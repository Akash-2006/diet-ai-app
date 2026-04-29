"""SQLAlchemy engine and session. Defaults to SQLite for local dev; use PostgreSQL on Railway."""

from __future__ import annotations

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool


class Base(DeclarativeBase):
    pass


def _database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///./diet_ai.db").strip()


def _make_engine(url: str):
    if url.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
        if ":memory:" in url:
            return create_engine(
                url,
                connect_args=connect_args,
                poolclass=StaticPool,
            )
        return create_engine(url, connect_args=connect_args)
    return create_engine(url, pool_pre_ping=True)


DATABASE_URL = _database_url()
engine = _make_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    import models  # noqa: F401 — register models on Base.metadata

    Base.metadata.create_all(bind=engine)
