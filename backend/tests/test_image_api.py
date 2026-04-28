"""POST /api/chat/image multipart tests."""

from __future__ import annotations

import base64

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from crypto_util import encrypt_cryptojs_openssl

PNG_1X1_BYTES = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    def fake_invoke(self, messages, *args, **kwargs):  # noqa: ANN001
        return AIMessage(content="Vision: mock macros for this snack.")

    monkeypatch.setattr("langchain_anthropic.ChatAnthropic.invoke", fake_invoke)
    from main import app

    return TestClient(app)


def test_chat_image_requires_password(client: TestClient) -> None:
    enc = encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")
    r = client.post(
        "/api/chat/image",
        data={"encrypted_api_key": enc, "message": "how many calories?"},
        files={"image": ("tiny.png", PNG_1X1_BYTES, "image/png")},
    )
    assert r.status_code == 403


def test_chat_image_success(client: TestClient) -> None:
    enc = encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")
    r = client.post(
        "/api/chat/image",
        data={
            "encrypted_api_key": enc,
            "message": "Rough calories?",
            "conversation_id": "",
        },
        files={"image": ("tiny.png", PNG_1X1_BYTES, "image/png")},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("reply")
    assert data.get("conversation_id")
