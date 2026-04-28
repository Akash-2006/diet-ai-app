"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  clearStoredEncryptedApiKey,
  encryptApiKey,
  getStoredEncryptedApiKey,
  hasEncryptionConfigured,
  setStoredEncryptedApiKey,
} from "@/lib/encryptedApiKey";

export default function SetupPage() {
  const [plaintextKey, setPlaintextKey] = useState("");
  const [stored, setStored] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStored(Boolean(getStoredEncryptedApiKey()?.trim()));
  }, []);

  const secret = process.env.NEXT_PUBLIC_ENCRYPTION_SECRET?.trim();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!plaintextKey.trim()) {
      setError("Enter your Anthropic API key.");
      return;
    }
    if (!secret) {
      setError(
        "Missing NEXT_PUBLIC_ENCRYPTION_SECRET (must match backend ENCRYPTION_SECRET). Add it to .env.local and restart."
      );
      return;
    }
    try {
      const enc = encryptApiKey(plaintextKey, secret);
      setStoredEncryptedApiKey(enc);
      setStored(true);
      setPlaintextKey("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Encryption failed.");
    }
  }

  function handleClear() {
    clearStoredEncryptedApiKey();
    setStored(false);
    setPlaintextKey("");
    setError(null);
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">API key setup</h1>
          <p className="text-sm text-muted-foreground">
            Your key is encrypted in the browser with{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">CryptoJS.AES.encrypt</code>{" "}
            (same format as backend <code className="rounded bg-muted px-1 py-0.5 text-xs">decrypt_cryptojs_openssl</code>
            ).
            Only the ciphertext is kept in{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">localStorage</code>.
          </p>
        </div>

        {!hasEncryptionConfigured() ? (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Set{" "}
            <code className="font-mono text-xs">NEXT_PUBLIC_ENCRYPTION_SECRET</code> to the same value
            as backend <code className="font-mono text-xs">ENCRYPTION_SECRET</code> (copy from{" "}
            <code className="font-mono text-xs">frontend/.env.example</code>), then restart{" "}
            <code className="font-mono text-xs">npm run dev</code>.
          </p>
        ) : null}

        {stored ? (
          <p className="text-sm font-medium text-foreground">
            Saved: an encrypted API key is stored on this device.
          </p>
        ) : null}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="api-key" className="text-sm font-medium leading-none">
              Anthropic API key
            </label>
            <Input
              id="api-key"
              type="password"
              autoComplete="off"
              value={plaintextKey}
              onChange={(e) => setPlaintextKey(e.target.value)}
              placeholder="sk-ant-api03-..."
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit">Encrypt & save</Button>
            <Button type="button" variant="outline" onClick={handleClear} disabled={!stored}>
              Clear saved key
            </Button>
          </div>
        </form>

        <Button variant="ghost" className="w-full" asChild>
          <Link href="/">&larr; Back to home</Link>
        </Button>
      </div>
    </main>
  );
}
