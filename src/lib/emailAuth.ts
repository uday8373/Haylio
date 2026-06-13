/**
 * Email OTP authentication.
 *
 * Uses Supabase Auth (GoTrue) to send and verify a 6-digit email code when
 * SUPABASE_URL + SUPABASE_ANON_KEY are configured. Supabase delivers the email,
 * so no separate SMTP/provider is needed — just make sure the project's
 * "Magic Link" email template includes the {{ .Token }} variable so recipients
 * get the numeric code (not only a magic link).
 *
 * Without Supabase configured, falls back to a dev OTP: a code is generated
 * server-side and returned to the caller so the prototype still works offline.
 */

import crypto from "crypto";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;

export const emailAuthEnabled = Boolean(URL && KEY);

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface Challenge {
  code: string;
  expiresAt: number;
}

// Survives hot-reloads / multiple imports within a single server instance.
const g = globalThis as unknown as { __haylioOtp?: Map<string, Challenge> };
function challenges(): Map<string, Challenge> {
  if (!g.__haylioOtp) g.__haylioOtp = new Map();
  return g.__haylioOtp;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Send a one-time code to the email. Returns `{ devCode }` only in the
 * Supabase-less dev fallback so the UI can surface it.
 */
export async function sendEmailOtp(email: string): Promise<{ devCode?: string }> {
  const key = normalize(email);

  if (emailAuthEnabled) {
    const res = await fetch(`${URL}/auth/v1/otp`, {
      method: "POST",
      headers: { apikey: KEY!, "content-type": "application/json" },
      // create_user:true lets us send a code to any address; whether an account
      // exists in *our* system is enforced separately by the calling route.
      body: JSON.stringify({ email, create_user: true }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Supabase auth ${res.status}: ${body.slice(0, 200)}`);
    }
    return {};
  }

  // Dev fallback — no Supabase configured.
  const code = String(crypto.randomInt(100000, 1000000));
  challenges().set(key, { code, expiresAt: Date.now() + CODE_TTL_MS });
  return { devCode: code };
}

/** Verify a code for the email. Returns true when valid. */
export async function verifyEmailOtp(email: string, token: string): Promise<boolean> {
  const key = normalize(email);
  const code = (token ?? "").trim();
  if (!code) return false;

  if (emailAuthEnabled) {
    const res = await fetch(`${URL}/auth/v1/verify`, {
      method: "POST",
      headers: { apikey: KEY!, "content-type": "application/json" },
      body: JSON.stringify({ email, token: code, type: "email" }),
    });
    return res.ok;
  }

  const ch = challenges().get(key);
  if (!ch || ch.expiresAt < Date.now()) return false;
  const ok = ch.code === code;
  if (ok) challenges().delete(key);
  return ok;
}
