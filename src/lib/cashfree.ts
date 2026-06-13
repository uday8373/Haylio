/**
 * Cashfree payment gateway — subscriptions (paywall).
 *
 * Uses the PG Subscriptions API. Indian merchant; international cards are
 * supported via Standing Instructions (Visa/Mastercard), settled in INR.
 *
 * Env:
 *   CASHFREE_APP_ID, CASHFREE_SECRET_KEY   — use SANDBOX keys when env=sandbox.
 *   CASHFREE_ENV         sandbox | production   (default sandbox)
 *   CASHFREE_API_VERSION default 2025-01-01
 *   PLAN_NAME, PLAN_PRICE_USD                (default "Haylio Pro", 19)
 *
 * The exact request schema lives in one place (here) so it's easy to adjust to
 * your account's API version if a field name differs.
 */

import crypto from "crypto";

const APP_ID = process.env.CASHFREE_APP_ID;
const SECRET = process.env.CASHFREE_SECRET_KEY;
const ENV = (process.env.CASHFREE_ENV || "sandbox").toLowerCase();
const API_VERSION = process.env.CASHFREE_API_VERSION || "2025-01-01";

export const cashfreeEnabled = Boolean(APP_ID && SECRET);
export const cashfreeMode: "sandbox" | "production" = ENV === "production" ? "production" : "sandbox";

export const PLAN_NAME = process.env.PLAN_NAME || "Haylio Pro";
export const PLAN_PRICE_USD = Number(process.env.PLAN_PRICE_USD || "19");
// USD needs International Payments enabled on the account. Set PLAN_CURRENCY=INR
// to test the flow without that activation.
export const PLAN_CURRENCY = (process.env.PLAN_CURRENCY || "USD").toUpperCase();

const BASE = cashfreeMode === "production" ? "https://api.cashfree.com" : "https://sandbox.cashfree.com";

function headers(): Record<string, string> {
  return {
    "x-client-id": APP_ID!,
    "x-client-secret": SECRET!,
    "x-api-version": API_VERSION,
    "content-type": "application/json",
  };
}

async function cfFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, { ...init, cache: "no-store", headers: { ...headers(), ...(init.headers ?? {}) } });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.message as string) || (data.error_description as string) || JSON.stringify(data).slice(0, 300);
    throw new Error(`Cashfree ${res.status}: ${msg}`);
  }
  return data;
}

export type PlanStatus = "active" | "pending" | "inactive";

export interface SubscriptionResult {
  subscriptionId: string;
  subscriptionSessionId?: string;
  status: PlanStatus;
}

/** Map Cashfree subscription_status onto our model. */
function mapStatus(raw: unknown): PlanStatus {
  switch (String(raw)) {
    case "ACTIVE":
    case "COMPLETED":
      return "active";
    case "INITIALIZED":
    case "BANK_APPROVAL_PENDING":
    case "ON_HOLD":
      return "pending";
    default:
      // CANCELLED, FAILED, etc.
      return "inactive";
  }
}

/**
 * Create a subscription with an inline monthly plan. Returns a
 * subscription_session_id the frontend SDK uses to collect the mandate.
 */
export async function createSubscription(opts: {
  subscriptionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;
}): Promise<SubscriptionResult> {
  // Field names match Cashfree's PG subscriptions schema exactly. Note:
  // customer_details has NO customer_id field — sending one is rejected.
  const body = {
    subscription_id: opts.subscriptionId,
    customer_details: {
      customer_name: opts.customerName,
      customer_email: opts.customerEmail,
      customer_phone: opts.customerPhone,
    },
    plan_details: {
      plan_name: PLAN_NAME,
      plan_type: "PERIODIC",
      plan_currency: PLAN_CURRENCY,
      plan_amount: PLAN_PRICE_USD,
      plan_max_amount: PLAN_PRICE_USD,
      plan_intervals: 1,
      plan_interval_type: "MONTH",
    },
    authorization_details: {
      authorization_amount: 1,
      authorization_amount_refund: true,
      payment_methods: ["card"],
    },
    subscription_meta: {
      return_url: opts.returnUrl,
    },
  };
  const data = await cfFetch("/pg/subscriptions", { method: "POST", body: JSON.stringify(body) });
  return {
    subscriptionId: (data.subscription_id as string) ?? opts.subscriptionId,
    subscriptionSessionId: data.subscription_session_id as string | undefined,
    status: mapStatus(data.subscription_status),
  };
}

/** Fetch a subscription's current status from Cashfree. */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
  if (!cashfreeEnabled) return null;
  const data = await cfFetch(`/pg/subscriptions/${encodeURIComponent(subscriptionId)}`);
  return {
    subscriptionId: (data.subscription_id as string) ?? subscriptionId,
    status: mapStatus(data.subscription_status),
  };
}

/**
 * Verify a Cashfree webhook signature.
 * Signature = base64( HMAC-SHA256( timestamp + rawBody, secret ) ).
 */
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
  if (!SECRET || !signature || !timestamp) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(timestamp + rawBody).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
