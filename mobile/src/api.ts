import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * API client for the FieldOps backend.
 * - Token in SecureStore, server URL + offline queue in AsyncStorage.
 * - Writes (checklist/parts/time/report/status/position) queue when offline
 *   and flush on next success or manual Sync.
 */

const URL_KEY = "fop_api_url";
const TOKEN_KEY = "fop_token";
const USER_KEY = "fop_user";
const QUEUE_KEY = "fop_queue";
const JOBS_CACHE = "fop_jobs_cache";

export const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:3000";

export async function getBase(): Promise<string> {
  return (await AsyncStorage.getItem(URL_KEY)) ?? DEFAULT_URL;
}
export async function setBase(url: string) {
  await AsyncStorage.setItem(URL_KEY, url.replace(/\/$/, ""));
}

export type Session = { token: string; user: { id: string; name: string; email: string; role: string; technicianId: string | null } };

export async function getSession(): Promise<Session | null> {
  const [token, user] = await Promise.all([SecureStore.getItemAsync(TOKEN_KEY), AsyncStorage.getItem(USER_KEY)]);
  if (!token || !user) return null;
  return { token, user: JSON.parse(user) };
}

export async function login(base: string, email: string, password: string, tenant?: string): Promise<Session> {
  await setBase(base);
  const res = await fetch(`${base}/api/mobile/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password, tenant }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Connexion impossible.");
  await SecureStore.setItemAsync(TOKEN_KEY, data.token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
  return { token: data.token, user: data.user };
}

export async function logout() {
  const s = await getSession();
  if (s) {
    try {
      const base = await getBase();
      await fetch(`${base}/api/mobile/login`, { method: "DELETE", headers: { Authorization: `Bearer ${s.token}` } });
    } catch { /* offline: local logout anyway */ }
  }
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}

type QueuedOp = { id: string; path: string; method: string; body: unknown; ts: number };

async function readQueue(): Promise<QueuedOp[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? "[]"); } catch { return []; }
}

export async function queueLength(): Promise<number> {
  return (await readQueue()).length;
}

async function enqueue(path: string, method: string, body: unknown) {
  const q = await readQueue();
  q.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, path, method, body, ts: Date.now() });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q));
  return { queued: true as const, pending: q.length };
}

/** Flush offline queue in order. Returns remaining count. */
export async function syncQueue(): Promise<{ sent: number; remaining: number }> {
  const s = await getSession();
  if (!s) return { sent: 0, remaining: 0 };
  const base = await getBase();
  const q = await readQueue();
  let sent = 0;
  const rest: QueuedOp[] = [];
  for (const op of q) {
    try {
      const res = await fetch(`${base}${op.path}`, {
        method: op.method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
        body: JSON.stringify(op.body),
      });
      if (!res.ok) rest.push(op);
      else sent++;
    } catch {
      rest.push(op);
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(rest));
  return { sent, remaining: rest.length };
}

async function call(path: string, method: string, body?: unknown, opts?: { queueable?: boolean }) {
  const s = await getSession();
  if (!s) throw new Error("Non connecté.");
  const base = await getBase();
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.token}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string }).error ?? `Erreur ${res.status}`);
    await syncQueue().catch(() => {});
    return data;
  } catch (e) {
    if (opts?.queueable && (e instanceof TypeError || (e as Error).message.includes("Network"))) {
      return enqueue(path, method, body);
    }
    throw e;
  }
}

export const api = {
  jobs: () => call("/api/mobile/jobs", "GET"),
  notifications: () => call("/api/mobile/notifications", "GET"),
  markNotifications: (ids?: string[]) =>
    call("/api/mobile/notifications", "POST", ids ? { ids } : {}),
  job: (id: string) => call(`/api/mobile/jobs/${id}`, "GET"),
  status: (id: string, status: string, note = "") => call(`/api/mobile/jobs/${id}`, "PATCH", { status, note }, { queueable: true }),
  checklist: (id: string, body: object) => call(`/api/mobile/jobs/${id}/checklist`, "POST", body, { queueable: true }),
  parts: (id: string, body: object) => call(`/api/mobile/jobs/${id}/parts`, "POST", body, { queueable: true }),
  time: (id: string, minutes: number) => call(`/api/mobile/jobs/${id}/time`, "POST", { minutes }, { queueable: true }),
  report: (id: string, body: object) => call(`/api/mobile/jobs/${id}/report`, "POST", body, { queueable: true }),
  partSearch: (q: string) => call(`/api/mobile/parts?q=${encodeURIComponent(q)}`, "GET"),
  position: (lat: number, lng: number, speed = 0) =>
    call("/api/mobile/position", "POST", { lat, lng, speed }, { queueable: true }),
  cacheJobs: (items: unknown) => AsyncStorage.setItem(JOBS_CACHE, JSON.stringify({ at: Date.now(), items })),
  cachedJobs: async () => {
    try { return JSON.parse((await AsyncStorage.getItem(JOBS_CACHE)) ?? "null"); } catch { return null; }
  },
};
