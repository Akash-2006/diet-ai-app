"""Decrypt CryptoJS/OpenSSL salted AES ciphertext (AES-256-CBC + MD5 EVP_BytesToKey).

Matches frontend: ``CryptoJS.AES.encrypt(plain, passphrase).toString()``.
"""

from __future__ import annotations

import base64
import hashlib
import os

from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad


def _evp_bytes_to_key(password: bytes, salt: bytes, key_len: int, iv_len: int) -> tuple[bytes, bytes]:
    """OpenSSL EVP_BytesToKey with MD5 (CryptoJS default when using a passphrase string)."""
    derived = b""
    prev = b""
    while len(derived) < key_len + iv_len:
        prev = hashlib.md5(prev + password + salt).digest()
        derived += prev
    return derived[:key_len], derived[key_len : key_len + iv_len]


def decrypt_cryptojs_openssl(ciphertext_b64: str, passphrase: str) -> str:
    """Decrypt string produced by ``CryptoJS.AES.encrypt(plain, passphrase).toString()``."""
    raw = base64.b64decode(ciphertext_b64.strip())
    if not raw.startswith(b"Salted__"):
        raise ValueError("Invalid ciphertext: missing OpenSSL salt header (Salted__)")
    salt = raw[8:16]
    body = raw[16:]
    key, iv = _evp_bytes_to_key(passphrase.encode("utf-8"), salt, 32, 16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    decrypted = cipher.decrypt(body)
    try:
        return unpad(decrypted, AES.block_size).decode("utf-8")
    except ValueError as exc:
        raise ValueError("Invalid ciphertext padding") from exc


def encrypt_cryptojs_openssl(plaintext: str, passphrase: str) -> str:
    """Encrypt compatibly with CryptoJS (same format as openssl ``enc -aes-256-cbc`` salted)."""

    salt = os.urandom(8)
    key, iv = _evp_bytes_to_key(passphrase.encode("utf-8"), salt, 32, 16)
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ct = cipher.encrypt(pad(plaintext.encode("utf-8"), AES.block_size))
    return base64.b64encode(b"Salted__" + salt + ct).decode("ascii")
