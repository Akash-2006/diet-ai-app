import CryptoJS from "crypto-js";

/** localStorage entry for ciphertext (OpenSSL salted format, decryptable by backend `crypto_util`). */
export const ENCRYPTED_API_KEY_STORAGE_KEY = "diet_ai_encrypted_api_key_v1";

/**
 * Encrypt plaintext for `encrypted_api_key` payloads. Matches
 * ``CryptoJS.AES.encrypt(plain, passphrase).toString()`` and backend `encrypt_cryptojs_openssl`.
 */
export function encryptApiKey(plaintext: string, passphrase: string): string {
  return CryptoJS.AES.encrypt(plaintext.trim(), passphrase).toString();
}

export function hasEncryptionConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ENCRYPTION_SECRET?.trim());
}

export function getStoredEncryptedApiKey(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ENCRYPTED_API_KEY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredEncryptedApiKey(ciphertext: string): void {
  localStorage.setItem(ENCRYPTED_API_KEY_STORAGE_KEY, ciphertext);
}

export function clearStoredEncryptedApiKey(): void {
  localStorage.removeItem(ENCRYPTED_API_KEY_STORAGE_KEY);
}
