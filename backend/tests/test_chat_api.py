"""Integration tests for POST /api/chat (mocked LLM)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from crypto_util import encrypt_cryptojs_openssl


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    def fake_invoke(self, messages, *args, **kwargs):  # noqa: ANN001
        return AIMessage(content="Mock nutrition reply about protein.")

    monkeypatch.setattr("langchain_anthropic.ChatAnthropic.invoke", fake_invoke)
    from main import app

    return TestClient(app)


def test_chat_missing_app_password(client: TestClient) -> None:
    enc = encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")
    r = client.post("/api/chat", json={"encrypted_api_key": enc, "message": "Hi"})
    assert r.status_code == 403


def test_chat_success(client: TestClient) -> None:
    enc = encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")
    r = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "How much protein per day?"},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["reply"]
    assert "conversation_id" in data


def test_get_health_requires_no_auth_and_returns_ok() -> None:
    from main import app

    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_chat_invalid_app_password_is_403(client: TestClient) -> None:
    enc = encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")
    r = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "Hi"},
        headers={"X-App-Password": "wrong-password"},
    )
    assert r.status_code == 403


def test_chat_invalid_ciphertext_is_400(client: TestClient) -> None:
    r = client.post(
        "/api/chat",
        json={"encrypted_api_key": "not-openssl-salted-json", "message": "Hi"},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r.status_code == 400
    detail = r.json().get("detail") or ""
    assert isinstance(detail, str) and ("decrypt" in detail.lower())
