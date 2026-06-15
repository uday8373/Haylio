/**
 * PayPal subscriptions (standalone billing provider for the paywall).
 *
 * Flow: OAuth token → ensure a Product + monthly Plan exist → create a
 * Subscription → redirect the user to PayPal's approval URL → on return, verify
 * the subscription is ACTIVE.
 *
 * Env:
 *   PAYPAL_CLIENT_ID, PAYPAL_SECRET   (sandbox or live)
 *   PAYPAL_ENV       sandbox | live   (default sandbox)
 *   PAYPAL_PLAN_ID   optional P-… to reuse an existing plan
 *   PLAN_NAME, PLAN_PRICE_USD, PLAN_CURRENCY (shared with the rest of billing)
 */

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const SECRET = process.env.PAYPAL_SECRET;
const ENV = (process.env.PAYPAL_ENV || "sandbox").toLowerCase();

export const paypalEnabled = Boolean(CLIENT_ID && SECRET);
export const paypalMode: "sandbox" | "live" = ENV === "live" ? "live" : "sandbox";

export const PLAN_NAME = process.env.PLAN_NAME || "Haylio Pro";
export const PLAN_PRICE_USD = Number(process.env.PLAN_PRICE_USD || "19");
export const PLAN_CURRENCY = (process.env.PLAN_CURRENCY || "USD").toUpperCase();

const BASE = paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

// ----------------------------------------------------------- access token

const g = globalThis as unknown as {
  __paypalToken?: { value: string; expiresAt: number };
  __paypalPlanId?: string;
};

async function accessToken(): Promise<string> {
  const cached = g.__paypalToken;
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: "Basic " + Buffer.from(`${CLIENT_ID}:${SECRET}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`PayPal auth ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const value = data.access_token as string;
  const ttl = Number(data.expires_in ?? 3000) * 1000;
  g.__paypalToken = { value, expiresAt: Date.now() + ttl };
  return value;
}

async function ppFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const token = await accessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.message as string) || JSON.stringify(data).slice(0, 300);
    throw new Error(`PayPal ${res.status}: ${msg}`);
  }
  return data;
}

// --------------------------------------------------------- product + plan

/** Ensure a monthly billing plan exists; returns its plan id (cached). */
async function ensurePlanId(): Promise<string> {
  if (process.env.PAYPAL_PLAN_ID) return process.env.PAYPAL_PLAN_ID;
  if (g.__paypalPlanId) return g.__paypalPlanId;

  // 1. Product (catalog item).
  const product = await ppFetch("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({ name: PLAN_NAME, type: "SERVICE", category: "SOFTWARE" }),
  });

  // 2. Monthly plan with a fixed price.
  const plan = await ppFetch("/v1/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      product_id: product.id,
      name: PLAN_NAME,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0, // 0 = until cancelled
          pricing_scheme: {
            fixed_price: { value: PLAN_PRICE_USD.toFixed(2), currency_code: PLAN_CURRENCY },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: { value: "0", currency_code: PLAN_CURRENCY },
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 3,
      },
    }),
  });
  g.__paypalPlanId = plan.id as string;
  return g.__paypalPlanId;
}

// ------------------------------------------------------------ subscription

export type PlanStatus = "active" | "pending" | "inactive";

export interface SubscriptionResult {
  subscriptionId: string;
  approveUrl?: string;
  status: PlanStatus;
}

function mapStatus(raw: unknown): PlanStatus {
  switch (String(raw)) {
    case "ACTIVE":
      return "active";
    case "APPROVAL_PENDING":
    case "APPROVED":
      return "pending";
    default:
      // SUSPENDED, CANCELLED, EXPIRED
      return "inactive";
  }
}

/** Create a subscription and return PayPal's approval URL for the customer. */
export async function createSubscription(opts: {
  businessId: string;
  customerName: string;
  customerEmail: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<SubscriptionResult> {
  const planId = await ensurePlanId();
  const data = await ppFetch("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      custom_id: opts.businessId,
      subscriber: {
        name: { given_name: opts.customerName.slice(0, 140) || "Haylio" },
        email_address: opts.customerEmail,
      },
      application_context: {
        brand_name: "Haylio",
        locale: "en-US",
        user_action: "SUBSCRIBE_NOW",
        shipping_preference: "NO_SHIPPING",
        payment_method: { payer_selected: "PAYPAL", payee_preferred: "IMMEDIATE_PAYMENT_REQUIRED" },
        return_url: opts.returnUrl,
        cancel_url: opts.cancelUrl,
      },
    }),
  });
  const links = (data.links as { rel: string; href: string }[]) ?? [];
  return {
    subscriptionId: data.id as string,
    approveUrl: links.find((l) => l.rel === "approve")?.href,
    status: mapStatus(data.status),
  };
}

/** Fetch a subscription's current status. */
export async function getSubscription(subscriptionId: string): Promise<SubscriptionResult | null> {
  if (!paypalEnabled) return null;
  const data = await ppFetch(`/v1/billing/subscriptions/${encodeURIComponent(subscriptionId)}`);
  return {
    subscriptionId: (data.id as string) ?? subscriptionId,
    status: mapStatus(data.status),
  };
}
