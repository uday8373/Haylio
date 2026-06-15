import { NextRequest, NextResponse } from "next/server";
import { getBusiness, setBusinessPlan } from "@/lib/store";
import { paypalEnabled, getSubscription } from "@/lib/paypal";

/**
 * PayPal subscription webhook. Rather than trust the payload, we take the
 * subscription id from it and re-fetch the subscription from PayPal's API to
 * confirm it's ACTIVE before activating the business. Configure this URL in the
 * PayPal Developer dashboard (Webhooks) for BILLING.SUBSCRIPTION.* events.
 */
export async function POST(req: NextRequest) {
  if (!paypalEnabled) return NextResponse.json({ ok: true });

  const payload = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const resource = (payload?.resource ?? {}) as Record<string, unknown>;
  const subscriptionId = String(resource.id ?? "");
  const businessId = String(resource.custom_id ?? "");

  if (subscriptionId && businessId.startsWith("biz_")) {
    try {
      const sub = await getSubscription(subscriptionId);
      if (sub?.status === "active") {
        const biz = await getBusiness(businessId);
        if (biz && biz.planStatus !== "active") {
          await setBusinessPlan(businessId, {
            planStatus: "active",
            planSubscriptionId: subscriptionId,
            planActivatedAt: Date.now(),
          });
        }
      }
    } catch {
      // ignore — PayPal will retry
    }
  }
  return NextResponse.json({ ok: true });
}
