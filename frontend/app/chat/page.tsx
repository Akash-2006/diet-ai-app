"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  getApiBaseUrl,
  resetConversation as resetRemote,
  sendChatImage,
  sendChatMessage,
} from "@/lib/chatApi";
import { getStoredEncryptedApiKey } from "@/lib/encryptedApiKey";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  imagePreviewUrl?: string;
};

function revokeMessageImages(messages: ChatMessage[]) {
  for (const m of messages) {
    if (m.imagePreviewUrl) URL.revokeObjectURL(m.imagePreviewUrl);
  }
}

const assistantMarkdownClass =
  "prose prose-sm max-w-none break-words text-foreground " +
  "prose-headings:mb-2 prose-headings:mt-3 prose-headings:font-semibold prose-headings:text-foreground prose-headings:first:mt-0 " +
  "prose-p:my-2 prose-p:leading-relaxed prose-p:first:mt-0 prose-p:last:mb-0 " +
  "prose-strong:text-foreground prose-strong:font-semibold " +
  "prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 " +
  "prose-a:text-primary prose-a:underline " +
  "prose-code:rounded prose-code:bg-background/80 prose-code:px-1 prose-code:py-px prose-code:text-foreground " +
  "prose-pre:my-2 prose-pre:border prose-pre:border-border prose-pre:bg-background prose-pre:text-foreground " +
  "prose-hr:border-border";

export default function ChatPage() {
  const [mounted, setMounted] = useState(false);
  const [encryptedKey, setEncryptedKey] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const pendingRef = useRef(pendingImage);
  messagesRef.current = messages;
  pendingRef.current = pendingImage;

  useEffect(() => {
    setMounted(true);
    setEncryptedKey(getStoredEncryptedApiKey()?.trim() ?? null);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    return () => {
      revokeMessageImages(messagesRef.current);
      if (pendingRef.current?.previewUrl) URL.revokeObjectURL(pendingRef.current.previewUrl);
    };
  }, []);

  const appendMessage = useCallback((msg: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...msg, id: crypto.randomUUID() }]);
  }, []);

  async function submitTextMessage() {
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

  async function submitImageMessage() {
    if (!pendingImage || loading) return;
    setError(null);
    const key = encryptedKey?.trim();
    if (!key) {
      setError("No API key configured. Visit setup first.");
      return;
    }
    const caption = draft.trim();
    const { file, previewUrl } = pendingImage;
    appendMessage({
      role: "user",
      content: caption || "📷 Food photo",
      imagePreviewUrl: previewUrl,
    });
    setDraft("");
    setPendingImage(null);
    setLoading(true);
    try {
      const data = await sendChatImage({
        encryptedApiKey: key,
        image: file,
        message: caption || undefined,
        conversationId: conversationId ?? undefined,
        fileName: file.name,
      });
      appendMessage({ role: "assistant", content: data.reply });
      setConversationId(data.conversation_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }

  async function submitOutgoing() {
    if (pendingImage) {
      await submitImageMessage();
    } else {
      await submitTextMessage();
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setPendingImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return { file: f, previewUrl: URL.createObjectURL(f) };
    });
  }

  function clearPendingImage() {
    setPendingImage((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  async function handleReset() {
    setError(null);
    const key = encryptedKey?.trim();
    revokeMessageImages(messages);
    clearPendingImage();
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
  const canSend =
    !loading && (Boolean(draft.trim()) || Boolean(pendingImage));

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
            <section className="flex-1 overflow-y-auto px-4 py-4" aria-label="Conversation">
              {messages.length === 0 ? (
                <p className="mx-auto max-w-xl text-center text-sm text-muted-foreground">
                  Ask about nutrition or attach a photo of food for analysis — thread stays until you reset or refresh.
                </p>
              ) : (
                <ul className="mx-auto flex max-w-xl flex-col gap-3">
                  {messages.map((m) => (
                    <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
                            : "max-w-[85%] rounded-2xl rounded-bl-md bg-muted px-3 py-2 text-foreground"
                        }
                      >
                        {m.role === "user" && m.imagePreviewUrl ? (
                          <div className="mb-2 overflow-hidden rounded-lg">
                            {/* Blob URLs — next/image optimizer not applicable */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img alt="" src={m.imagePreviewUrl} className="max-h-56 w-full object-cover" />
                          </div>
                        ) : null}
                        {m.role === "assistant" ? (
                          <div className={assistantMarkdownClass}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                          </div>
                        ) : (
                          m.content
                        )}
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
                void submitOutgoing();
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="sr-only"
                accept="image/*"
                aria-label="Choose food photo"
                onChange={onPickFile}
              />
              <div className="mx-auto flex max-w-xl flex-col gap-2">
                {pendingImage ? (
                  <div className="relative flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      src={pendingImage.previewUrl}
                      className="h-20 w-20 shrink-0 rounded-md border border-border object-cover"
                    />
                    <div className="min-w-0 flex-1 text-xs text-muted-foreground">
                      <p className="truncate font-medium text-foreground">{pendingImage.file.name}</p>
                      <p>Uses vision endpoint. Add an optional caption below, then send.</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={clearPendingImage}>
                      Remove
                    </Button>
                  </div>
                ) : null}
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={
                    pendingImage ? "Optional caption (e.g. rough portion size)" : "Type a message…"
                  }
                  rows={3}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (canSend) void submitOutgoing();
                    }
                  }}
                  className="resize-none"
                  aria-label="Message"
                />
                <div className="flex flex-wrap justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Photo
                  </Button>
                  <Button type="submit" disabled={!canSend}>
                    {loading ? "Sending…" : pendingImage ? "Send photo" : "Send"}
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
