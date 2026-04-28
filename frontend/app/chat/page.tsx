"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getApiBaseUrl, resetConversation as resetRemote, sendChatMessage } from "@/lib/chatApi";
import { getStoredEncryptedApiKey } from "@/lib/encryptedApiKey";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function ChatPage() {
  const [mounted, setMounted] = useState(false);
  const [encryptedKey, setEncryptedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setEncryptedKey(getStoredEncryptedApiKey()?.trim() ?? null);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const appendMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }, []);

  async function submitMessage() {
    setError(null);
    const text = draft.trim();
    if (!text || loading) return;
    const key = encryptedKey?.trim();
    if (!key) {
      setError("No API key configured. Visit setup first.");
      return;
    }
    appendMessage({ role: "user", content: text });
    setDraft("");
    setLoading(true);
    try {
      const data = await sendChatMessage({
        encryptedApiKey: key,
        message: text,
        conversationId: conversationId ?? undefined,
      });
      appendMessage({ role: "assistant", content: data.reply });
      setConversationId(data.conversation_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset() {
    setError(null);
    const key = encryptedKey?.trim();
    if (!conversationId?.trim()) {
      setMessages([]);
      setConversationId(null);
      return;
    }
    if (!key) {
      setError("No API key configured.");
      return;
    }
    setLoading(true);
    try {
      await resetRemote(key, conversationId);
      setMessages([]);
      setConversationId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  const hasKey = Boolean(encryptedKey);

  return (
    <main className="flex min-h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Chat</h1>
          <p className="text-xs text-muted-foreground">
            Backend:{" "}
            <code className="rounded bg-muted px-1 py-px text-[11px]" suppressHydrationWarning>
              {getApiBaseUrl()}
            </code>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => handleReset()}>
            Reset thread
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/setup">API key</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Home</Link>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        {!mounted ? (
          <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground text-sm">Loading…</div>
        ) : !hasKey ? (
          <div className="m-4 rounded-lg border border-border bg-muted/40 px-4 py-6 text-center text-sm">
            <p className="font-medium text-foreground">Encrypted API key not found</p>
            <p className="mt-1 text-muted-foreground">Save one on the setup screen, then come back.</p>
            <Button className="mt-4" asChild>
              <Link href="/setup">Go to API key setup</Link>
            </Button>
          </div>
        ) : (
          <>
            <section
              className="flex-1 overflow-y-auto px-4 py-4"
              aria-label="Conversation"
            >
              {messages.length === 0 ? (
                <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
                  Ask anything about nutrition, meals, macros, or diet goals — messages stay in memory until you
                  reset or refresh the page.
                </p>
              ) : (
                <ul className="mx-auto flex max-w-xl flex-col gap-3">
                  {messages.map((m) => (
                    <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
                            : "max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-foreground whitespace-pre-wrap"
                        }
                      >
                        {m.content}
                      </div>
                    </li>
                  ))}
                  <div ref={endRef} />
                </ul>
              )}
              {conversationId ? (
                <p className="mt-6 text-center text-[11px] text-muted-foreground">
                  Conversation <code className="rounded bg-muted px-1">{conversationId.slice(0, 8)}…</code>
                </p>
              ) : null}
            </section>

            {error ? (
              <div className="border-t border-border bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form
              className="border-t border-border bg-card p-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submitMessage();
              }}
            >
              <div className="mx-auto flex max-w-xl flex-col gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message…"
                  rows={3}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submitMessage();
                    }
                  }}
                  className="resize-none"
                  aria-label="Message"
                />
                <div className="flex justify-end gap-2">
                  <Button type="submit" disabled={loading || !draft.trim()}>
                    {loading ? "Sending…" : "Send"}
                  </Button>
                </div>
              </div>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
