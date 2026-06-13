import { currentBusiness } from "@/lib/session";
import { PLAN_NAME, PLAN_PRICE_USD } from "@/lib/cashfree";
import BillingClient from "@/components/dashboard/BillingClient";

export const dynamic = "force-dynamic";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ subscription_id?: string }>;
}) {
  const biz = (await currentBusiness())!;
  const { subscription_id } = await searchParams;
  const active = biz.planStatus === "active";

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-extrabold text-[#232219] tracking-tight">Billing</h1>
      <p className="text-sm text-[#8a897f] mt-1.5 max-w-xl">
        {active
          ? "Your subscription is active — manage your number and service in the Calls tab."
          : "Activate your subscription to get a toll-free number and start using Haylio."}
      </p>

      <BillingClient
        planName={PLAN_NAME}
        priceUsd={PLAN_PRICE_USD}
        initialActive={active}
        returnedSubscriptionId={subscription_id}
      />
    </div>
  );
}
