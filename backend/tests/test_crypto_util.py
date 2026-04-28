"""Tests for CryptoJS-compatible encrypt/decrypt."""

from __future__ import annotations

import base64

import pytest

from crypto_util import decrypt_cryptojs_openssl, encrypt_cryptojs_openssl

SECRET = "test-shared-secret-for-pytest-only!!"


def test_roundtrip_decrypt_matches_plaintext() -> None:
    plain = "sk-ant-api-example-key-not-real"
    enc = encrypt_cryptojs_openssl(plain, SECRET)
    assert len(enc) > 0
    raw = decrypt_cryptojs_openssl(enc, SECRET)
    assert raw == plain


def test_missing_salted_header_raises() -> None:
    # Valid base64 of bytes that do not start with Salted__
    bogus = base64.b64encode(b"nope-no-header").decode("ascii")
    with pytest.raises(ValueError, match="Salted"):
        decrypt_cryptojs_openssl(bogus, SECRET)
