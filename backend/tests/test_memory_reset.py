"""Multi-turn conversation and /api/chat/reset."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage

from crypto_util import encrypt_cryptojs_openssl


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    lens: list[int] = []

    def fake_invoke(self, messages, *args, **kwargs):  # noqa: ANN001
        lens.append(len(messages))
        return AIMessage(content=f"reply-with-{len(messages)}-msgs")

    monkeypatch.setattr("langchain_anthropic.ChatAnthropic.invoke", fake_invoke)

    import nutrition_graph as ng

    ng._conversation_histories.clear()

    from main import app

    c = TestClient(app)
    c._dummy_lens = lens  # type: ignore[attr-defined]
    return c


@pytest.fixture
def enc() -> str:
    return encrypt_cryptojs_openssl("sk-test", "test-shared-secret-for-pytest-only!!")


def test_multi_turn_second_call_has_more_messages(client: TestClient, enc: str) -> None:
    lens: list[int] = client._dummy_lens  # type: ignore[union-attr]

    r1 = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "hello"},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r1.status_code == 200
    cid = r1.json()["conversation_id"]

    client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "follow-up", "conversation_id": cid},
        headers={"X-App-Password": "test-app-password"},
    )

    assert len(lens) >= 2
    assert lens[1] > lens[0]


def test_reset_then_same_id_starts_clean(client: TestClient, enc: str) -> None:
    lens: list[int] = client._dummy_lens  # type: ignore[union-attr]

    r1 = client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "hello"},
        headers={"X-App-Password": "test-app-password"},
    )
    cid = r1.json()["conversation_id"]
    first_len = lens[0]

    client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "second", "conversation_id": cid},
        headers={"X-App-Password": "test-app-password"},
    )

    rr = client.post(
        "/api/chat/reset",
        json={"encrypted_api_key": enc, "conversation_id": cid},
        headers={"X-App-Password": "test-app-password"},
    )
    assert rr.status_code == 200

    client.post(
        "/api/chat",
        json={"encrypted_api_key": enc, "message": "after-reset", "conversation_id": cid},
        headers={"X-App-Password": "test-app-password"},
    )

    assert lens[-1] == first_len


def test_reset_missing_conversation_id(client: TestClient, enc: str) -> None:
    r = client.post(
        "/api/chat/reset",
        json={"encrypted_api_key": enc, "conversation_id": "   "},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r.status_code == 400


def test_reset_invalid_password_is_403(client: TestClient, enc: str) -> None:
    r = client.post(
        "/api/chat/reset",
        json={"encrypted_api_key": enc, "conversation_id": "conversation-ignored"},
        headers={"X-App-Password": "invalid-app-password"},
    )
    assert r.status_code == 403


def test_reset_invalid_cipher_is_400(client: TestClient) -> None:
    r = client.post(
        "/api/chat/reset",
        json={"encrypted_api_key": "not-real-ciphertext-at-all", "conversation_id": "valid-looking-id-string"},
        headers={"X-App-Password": "test-app-password"},
    )
    assert r.status_code == 400
