/**
 * Registration, login, and analytics APIs (Bearer JWT where required).
 */

import { getApiBaseUrl, getAppPassword } from "./chatApi";
import { getStoredAccessToken } from "./authToken";

function requirePwdHeaders(): Record<string, string> {
  const pwd = getAppPassword();
  if (!pwd) {
    throw new Error(
      "NEXT_PUBLIC_APP_PASSWORD is not set. It must match the backend APP_PASSWORD (see frontend/.env.example)."
    );
  }
  return { "X-App-Password": pwd };
}

function authBearerHeaders(): Record<string, string> {
  const pwd = requirePwdHeaders();
  const t = getStoredAccessToken();
  if (!t) throw new Error("Not logged in.");
  return { ...pwd, Authorization: `Bearer ${t}` };
}

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const raw = await res.text();
    if (!raw) return res.statusText || `HTTP ${res.status}`;
    const j = JSON.parse(raw) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d.map((item: { msg?: string }) => item?.msg ?? JSON.stringify(item)).join("; ");
    }
    if (d !== undefined) return typeof d === "string" ? d : JSON.stringify(d);
    return raw;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function registerAccount(email: string, password: string): Promise<{ ok: boolean; email: string }> {
  const url = `${getApiBaseUrl()}/api/auth/register`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...requirePwdHeaders() },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return (await res.json()) as { ok: boolean; email: string };
}

export async function loginAccount(
  email: string,
  password: string
): Promise<{ access_token: string; email: string }> {
  const url = `${getApiBaseUrl()}/api/auth/login`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...requirePwdHeaders() },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = (await res.json()) as { access_token: string; email: string };
  return data;
}

export type ConversationSummary = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export async function listConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/conversations`, {
    headers: authBearerHeaders(),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return (await res.json()) as ConversationSummary[];
}

export type ServerMessage = {
  role: string;
  content: string;
  has_image: boolean;
  created_at: string;
};

export async function fetchConversationMessages(conversationId: string): Promise<ServerMessage[]> {
  const res = await fetch(`${getApiBaseUrl()}/api/conversations/${conversationId}/messages`, {
    headers: authBearerHeaders(),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  const data = (await res.json()) as { messages: ServerMessage[] };
  return data.messages;
}

export type ActivityBar = { date: string; user_messages: number };
export type NutritionBar = { date: string; calories: number };

export async function fetchActivityAnalytics(days = 14): Promise<{ days: number; bars: ActivityBar[] }> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/analytics/activity?days=${encodeURIComponent(String(days))}`,
    { headers: authBearerHeaders() }
  );
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return (await res.json()) as { days: number; bars: ActivityBar[] };
}

export async function fetchNutritionAnalytics(days = 14): Promise<{ days: number; bars: NutritionBar[] }> {
  const res = await fetch(
    `${getApiBaseUrl()}/api/analytics/nutrition?days=${encodeURIComponent(String(days))}`,
    { headers: authBearerHeaders() }
  );
  if (!res.ok) throw new Error(await parseErrorResponse(res));
  return (await res.json()) as { days: number; bars: NutritionBar[] };
}

export async function createNutritionLog(entry: {
  logged_on: string;
  calories?: number | null;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
  notes?: string | null;
}): Promise<void> {
  const res = await fetch(`${getApiBaseUrl()}/api/nutrition/logs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authBearerHeaders() },
    body: JSON.stringify(entry),
  });
  if (!res.ok) throw new Error(await parseErrorResponse(res));
}
