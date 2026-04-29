"""Password hashing and JWT helpers."""

from __future__ import annotations

from datetime import datetime, timedelta

import bcrypt
from jose import JWTError, jwt


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(*, subject_user_id: str, secret: str, expires_hours: int) -> str:
    expire = datetime.utcnow() + timedelta(hours=expires_hours)
    return jwt.encode({"sub": subject_user_id, "exp": expire}, secret, algorithm="HS256")


def decode_access_token(token: str, secret: str) -> str:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
        sub = payload.get("sub")
        if not isinstance(sub, str) or not sub:
            raise JWTError("missing sub")
        return sub
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
