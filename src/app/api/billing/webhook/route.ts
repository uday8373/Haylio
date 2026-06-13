import { NextRequest, NextResponse } from "next/server";
import { getBusiness, setBusinessPlan } from "@/lib/store";
import { verifyWebhookSignature } from "@/lib/cashfree";

/**
 * Cashfree subscription webhook. Verifies the signature, then activates the
 * business when its subscription becomes ACTIVE. Configure this URL in the
 * Cashfree dashboard → Developers → Webhooks.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";

  if (!verifyWebhookSignature(raw, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Subscription id is echoed in the data; our id encodes the business: sub_<bizId>_<ts>.
  const data = (payload.data ?? payload) as Record<string, unknown>;
  const sub = (data.subscription ?? data) as Record<string, unknown>;
  const subscriptionId = String(sub.subscription_id ?? "");
  const status = String(sub.subscription_status ?? payload.type ?? "");

  const m = subscriptionId.match(/^sub_(biz_[0-9a-f]+)_/i);
  const businessId = m?.[1];
  if (businessId && (status === "ACTIVE" || status === "COMPLETED")) {
    const biz = await getBusiness(businessId);
    if (biz && biz.planStatus !== "active") {
      await setBusinessPlan(businessId, {
        planStatus: "active",
        planSubscriptionId: subscriptionId,
        planActivatedAt: Date.now(),
      });
    }
  }
  // Always 200 so Cashfree doesn't retry indefinitely.
  return NextResponse.json({ ok: true });
}
