"""Auth and persisted chat (SQLite in-memory)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from crypto_util import encrypt_cryptojs_openssl


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    def fake_invoke(self, messages, *args, **kwargs):  # noqa: ANN001
        return AIMessage(content="mock reply")

    monkeypatch.setattr("langchain_anthropic.ChatAnthropic.invoke", fake_invoke)

    from database import init_db

    init_db()

    from main import app

    return TestClient(app)


@pytest.fixture
def enc() -> str:
    return encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")


def test_register_login_persisted_chat(client: TestClient, enc: str) -> None:
    h = {"X-App-Password": "test-app-password"}
    r = client.post(
        "/api/auth/register",
        json={"email": "u1@example.com", "password": "password-one"},
        headers=h,
    )
    assert r.status_code == 200

    r2 = client.post(
        "/api/auth/login",
        json={"email": "u1@example.com", "password": "password-one"},
        headers=h,
    )
    assert r2.status_code == 200
    token = r2.json()["access_token"]

    auth = {**h, "Authorization": f"Bearer {token}"}
    c1 = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "hello db"},
        headers=auth,
    )
    assert c1.status_code == 200
    conv_id = c1.json()["conversation_id"]

    c2 = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "second turn", "conversation_id": conv_id},
        headers=auth,
    )
    assert c2.status_code == 200
    assert c2.json()["conversation_id"] == conv_id

    lst = client.get("/api/conversations", headers=auth)
    assert lst.status_code == 200
    assert len(lst.json()) >= 1

    msgs = client.get(f"/api/conversations/{conv_id}/messages", headers=auth)
    assert msgs.status_code == 200
    assert len(msgs.json()["messages"]) == 4
