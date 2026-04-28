import CryptoJS from "crypto-js";

import {
  ENCRYPTED_API_KEY_STORAGE_KEY,
  clearStoredEncryptedApiKey,
  encryptApiKey,
  getStoredEncryptedApiKey,
  hasEncryptionConfigured,
  setStoredEncryptedApiKey,
} from "./encryptedApiKey";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("encryptApiKey", () => {
  const PASS = "test-passphrase-shared-with-backend!!";

  it("encrypts so CryptoJS decrypts back to plaintext", () => {
    const plain = "sk-ant-test-plaintext-key-example";
    const enc = encryptApiKey(plain, PASS);
    expect(enc.length).toBeGreaterThan(20);
    const dec = CryptoJS.AES.decrypt(enc, PASS).toString(CryptoJS.enc.Utf8);
    expect(dec).toBe(plain);
  });

  it("trims plaintext before encrypting", () => {
    const enc = encryptApiKey("  trimmed  ", "pass");
    const dec = CryptoJS.AES.decrypt(enc, "pass").toString(CryptoJS.enc.Utf8);
    expect(dec).toBe("trimmed");
  });
});

describe("stored encrypted API key helpers", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("persist and clear ciphertext in localStorage", () => {
    expect(getStoredEncryptedApiKey()).toBeNull();
    setStoredEncryptedApiKey("mock-ciphertext");
    expect(localStorage.getItem(ENCRYPTED_API_KEY_STORAGE_KEY)).toBe("mock-ciphertext");
    expect(getStoredEncryptedApiKey()).toBe("mock-ciphertext");
    clearStoredEncryptedApiKey();
    expect(getStoredEncryptedApiKey()).toBeNull();
  });
});

describe("hasEncryptionConfigured", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("is true when NEXT_PUBLIC_ENCRYPTION_SECRET is non-empty", () => {
    vi.stubEnv("NEXT_PUBLIC_ENCRYPTION_SECRET", "some-secret");
    expect(hasEncryptionConfigured()).toBe(true);
  });

  it("is false when NEXT_PUBLIC_ENCRYPTION_SECRET is absent or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_ENCRYPTION_SECRET", "");
    expect(hasEncryptionConfigured()).toBe(false);
  });
});
