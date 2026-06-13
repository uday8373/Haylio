import { NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { setBusinessPlan } from "@/lib/store";
import { baseUrl } from "@/lib/telephony";
import { cashfreeEnabled, cashfreeMode, createSubscription } from "@/lib/cashfree";

/** Create a Cashfree subscription and return the session id for the SDK. */
export async function POST() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (biz.planStatus === "active") {
    return NextResponse.json({ alreadyActive: true });
  }

  // No Cashfree configured → activate immediately (dev / self-hosted without billing).
  if (!cashfreeEnabled) {
    await setBusinessPlan(biz.id, { planStatus: "active", planActivatedAt: Date.now() });
    return NextResponse.json({ bypassed: true });
  }

  const subscriptionId = `sub_${biz.id}_${Date.now().toString(36)}`;
  const returnUrl = `${baseUrl()}/dashboard/billing?subscription_id=${subscriptionId}`;

  try {
    const sub = await createSubscription({
      subscriptionId,
      customerName: biz.name || "Haylio customer",
      customerEmail: biz.email,
      // Cashfree requires a phone; fall back to a placeholder if none on file.
      customerPhone: (biz.phone || "").replace(/[^\d]/g, "").slice(-15) || "9999999999",
      returnUrl,
    });
    // Remember which subscription is pending for this business.
    await setBusinessPlan(biz.id, { planStatus: "inactive", planSubscriptionId: sub.subscriptionId });
    return NextResponse.json({
      subscriptionId: sub.subscriptionId,
      subscriptionSessionId: sub.subscriptionSessionId,
      mode: cashfreeMode,
    });
  } catch (err) {
    console.error("Cashfree subscribe failed:", err);
    const msg = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
