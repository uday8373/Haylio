import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { setBusinessPlan } from "@/lib/store";
import { cashfreeEnabled, getSubscription } from "@/lib/cashfree";

/**
 * Return the current plan status. If a subscription is pending, refresh it from
 * Cashfree first and flip the business to active once the mandate is authorized.
 */
export async function GET(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (biz.planStatus === "active") {
    return NextResponse.json({ planStatus: "active" });
  }

  const subId = new URL(req.url).searchParams.get("subscription_id") || biz.planSubscriptionId || undefined;
  if (cashfreeEnabled && subId) {
    try {
      const sub = await getSubscription(subId);
      if (sub?.status === "active") {
        await setBusinessPlan(biz.id, {
          planStatus: "active",
          planSubscriptionId: subId,
          planActivatedAt: Date.now(),
        });
        return NextResponse.json({ planStatus: "active" });
      }
      return NextResponse.json({ planStatus: "inactive", pending: sub?.status === "pending" });
    } catch {
      // fall through to stored status
    }
  }
  return NextResponse.json({ planStatus: biz.planStatus });
}
