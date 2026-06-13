/**
 * Minimal fetch-based client for Supabase PostgREST.
 * Server-side only (API routes / server components) — the anon key never
 * ships to the browser. No SDK dependency needed.
 */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(URL && KEY);

class SupabaseError extends Error {
  constructor(public status: number, message: string) {
    super(`Supabase ${status}: ${message}`);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      apikey: KEY!,
      Authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new SupabaseError(res.status, body.slice(0, 500));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** SELECT — `query` is a PostgREST query string, e.g. "handle=eq.demo-cafe&select=*" */
export function sbSelect<T>(table: string, query: string): Promise<T[]> {
  return request<T[]>(`${table}?${query}`);
}

export async function sbInsert<T>(table: string, row: object): Promise<T> {
  const rows = await request<T[]>(table, { method: "POST", body: JSON.stringify(row) });
  return rows[0];
}

export async function sbUpdate<T>(table: string, query: string, patch: object): Promise<T[]> {
  return request<T[]>(`${table}?${query}`, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function sbDelete(table: string, query: string): Promise<void> {
  await request(`${table}?${query}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
