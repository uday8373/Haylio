"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheckIcon, CheckIcon, ShieldCheckIcon } from "@/components/icons";

declare global {
  interface Window {
    Cashfree?: (opts: { mode: "sandbox" | "production" }) => {
      subscriptionsCheckout: (opts: { subscriptionSessionId: string; redirectTarget?: string }) => Promise<unknown>;
    };
  }
}

function loadCashfreeSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Cashfree) return resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(s);
  });
}

export default function BillingClient({
  planName,
  priceUsd,
  initialActive,
  returnedSubscriptionId,
}: {
  planName: string;
  priceUsd: number;
  initialActive: boolean;
  returnedSubscriptionId?: string;
}) {
  const router = useRouter();
  const [active, setActive] = useState(initialActive);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(Boolean(returnedSubscriptionId) && !initialActive);

  // Coming back from Cashfree checkout — confirm the subscription is active.
  useEffect(() => {
    if (!returnedSubscriptionId || initialActive) return;
    (async () => {
      const res = await fetch(`/api/billing/status?subscription_id=${encodeURIComponent(returnedSubscriptionId)}`);
      const data = await res.json().catch(() => ({}));
      setChecking(false);
      if (data.planStatus === "active") {
        setActive(true);
        router.refresh();
      } else {
        setError("Payment not confirmed yet. If you completed it, give it a moment and refresh.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscribe", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't start checkout.");

      if (data.alreadyActive || data.bypassed) {
        setActive(true);
        router.refresh();
        return;
      }
      if (!data.subscriptionSessionId) throw new Error("No checkout session returned.");

      await loadCashfreeSdk();
      const cashfree = window.Cashfree!({ mode: data.mode === "production" ? "production" : "sandbox" });
      await cashfree.subscriptionsCheckout({
        subscriptionSessionId: data.subscriptionSessionId,
        redirectTarget: "_self",
      });
      // On redirect flows the browser navigates away; nothing more to do here.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (active) {
    return (
      <div className="mt-7 card p-6 md:p-8 border-[#cfe3c6] bg-[#f4faf1]">
        <p className="text-sm font-semibold text-[#3e7d3a] flex items-center gap-2">
          <BadgeCheckIcon size={16} /> Your {planName} plan is active
        </p>
        <p className="text-sm text-[#5d8a55] mt-1.5">
          Billing is set up — you can purchase your toll-free number and use the full service.
        </p>
        <a href="/dashboard/calls" className="btn-primary mt-5 inline-flex">Go to Calls →</a>
      </div>
    );
  }

  const perks = [
    "Your own private toll-free number (with a dedicated Twilio subaccount)",
    "Call intercept + tracked SMS link to your contact page",
    "AI receptionist, inbox, and call-to-click analytics",
    "Toll-free SMS verification handled in-app",
  ];

  return (
    <div className="mt-7 grid lg:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
      <div className="card p-6 md:p-8">
        <h2 className="font-bold text-[#232219] text-lg">What you get</h2>
        <ul className="mt-4 space-y-3">
          {perks.map((p) => (
            <li key={p} className="flex items-start gap-3 text-sm text-[#4b4a42]">
              <span className="w-5 h-5 rounded-full bg-[#eaf3e6] text-[#3e7d3a] flex items-center justify-center shrink-0 mt-0.5">
                <CheckIcon size={12} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[11px] text-[#a6a59c] flex items-center gap-1.5">
          <ShieldCheckIcon size={13} /> Secure checkout by Cashfree. Cancel anytime. Card charged monthly.
        </p>
      </div>

      <aside className="card p-6 md:p-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#a6a59c]">{planName}</p>
        <p className="mt-2 flex items-end gap-1">
          <span className="text-4xl font-extrabold text-[#232219]">${priceUsd}</span>
          <span className="text-sm text-[#8a897f] mb-1">/ month</span>
        </p>
        {checking ? (
          <p className="mt-5 text-sm text-[#8a897f]">Confirming your payment…</p>
        ) : (
          <button onClick={subscribe} className="btn-primary w-full mt-5" disabled={busy}>
            {busy ? "Opening checkout…" : "Subscribe & activate"}
          </button>
        )}
        {error && <p className="mt-3 text-sm text-[#e8552f]">{error}</p>}
        <p className="mt-3 text-[11px] text-[#a6a59c]">
          You'll authorize a recurring mandate on your card. Billed in your local currency.
        </p>
      </aside>
    </div>
  );
}
