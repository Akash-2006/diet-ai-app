/**
 * Backend text chat, image upload, and reset.
 */

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
  return raw.replace(/\/$/, "");
}

export function getAppPassword(): string | undefined {
  const p = process.env.NEXT_PUBLIC_APP_PASSWORD?.trim();
  return p || undefined;
}

function stringifyDetail(data: unknown): string {
  if (data === null || data === undefined) return "";
  if (typeof data === "string") return data;
  if (typeof data === "number" || typeof data === "boolean") return String(data);
  try {
    return JSON.stringify(data);
  } catch {
    return String(data);
  }
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw) return res.statusText || `HTTP ${res.status}`;
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((item: { msg?: string }) => item?.msg ?? JSON.stringify(item))
        .join("; ");
    }
    if (d !== undefined) return stringifyDetail(d);
    return raw;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

async function postAppFormData<T>(path: string, formData: FormData): Promise<T> {
  const pwd = getAppPassword();
  if (!pwd) {
    throw new Error(
      "NEXT_PUBLIC_APP_PASSWORD is not set. It must match the backend APP_PASSWORD (see frontend/.env.example)."
    );
  }
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "X-App-Password": pwd,
    },
    body: formData,
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

async function postAppJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const pwd = getAppPassword();
  if (!pwd) {
    throw new Error(
      "NEXT_PUBLIC_APP_PASSWORD is not set. It must match the backend APP_PASSWORD (see frontend/.env.example)."
    );
  }
  const url = `${getApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-App-Password": pwd,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await parseErrorResponse(res);
    throw new Error(msg || `Request failed (${res.status})`);
  }
  return (await res.json()) as T;
}

export type ChatPostResponse = { reply: string; conversation_id: string };

export async function sendChatMessage(args: {
  encryptedApiKey: string;
  message: string;
  conversationId?: string | null;
}): Promise<ChatPostResponse> {
  const body: Record<string, unknown> = {
    encrypted_api_key: args.encryptedApiKey.trim(),
    message: args.message,
  };
  const cid = args.conversationId?.trim();
  if (cid) body.conversation_id = cid;
  return postAppJson<ChatPostResponse>("/api/chat", body);
}

/** Multipart upload to `POST /api/chat/image` (vision). */
export async function sendChatImage(args: {
  encryptedApiKey: string;
  image: File | Blob;
  message?: string | null;
  conversationId?: string | null;
  fileName?: string;
}): Promise<ChatPostResponse> {
  const fd = new FormData();
  fd.append("encrypted_api_key", args.encryptedApiKey.trim());
  const cid = args.conversationId?.trim();
  if (cid) fd.append("conversation_id", cid);
  fd.append("message", (args.message ?? "").trim());
  const name =
    args.fileName ??
    (args.image instanceof File ? args.image.name : "upload");
  fd.append("image", args.image, name);
  return postAppFormData<ChatPostResponse>("/api/chat/image", fd);
}

export async function resetConversation(
  encryptedApiKey: string,
  conversationId: string
): Promise<{ ok: boolean; conversation_id: string }> {
  return postAppJson<{ ok: boolean; conversation_id: string }>("/api/chat/reset", {
    encrypted_api_key: encryptedApiKey.trim(),
    conversation_id: conversationId.trim(),
  });
}
