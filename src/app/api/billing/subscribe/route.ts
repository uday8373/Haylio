import { NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { setBusinessPlan } from "@/lib/store";
import { baseUrl } from "@/lib/telephony";
import { paypalEnabled, createSubscription } from "@/lib/paypal";

/** Create a PayPal subscription and return its approval URL for redirect. */
export async function POST() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (biz.planStatus === "active") {
    return NextResponse.json({ alreadyActive: true });
  }

  // No provider configured → activate immediately (dev / self-hosted).
  if (!paypalEnabled) {
    await setBusinessPlan(biz.id, { planStatus: "active", planActivatedAt: Date.now() });
    return NextResponse.json({ bypassed: true });
  }

  const returnUrl = `${baseUrl()}/dashboard/billing`;
  const cancelUrl = `${baseUrl()}/dashboard/billing?cancelled=1`;

  try {
    const sub = await createSubscription({
      businessId: biz.id,
      customerName: biz.name || "Haylio customer",
      customerEmail: biz.email,
      returnUrl,
      cancelUrl,
    });
    // Remember the pending subscription so we can verify it on return.
    await setBusinessPlan(biz.id, { planStatus: "inactive", planSubscriptionId: sub.subscriptionId });
    if (!sub.approveUrl) throw new Error("PayPal did not return an approval URL.");
    return NextResponse.json({ approveUrl: sub.approveUrl, subscriptionId: sub.subscriptionId });
  } catch (err) {
    console.error("PayPal subscribe failed:", err);
    const msg = err instanceof Error ? err.message : "Couldn't start checkout.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
