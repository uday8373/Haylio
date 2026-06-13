import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness, getSmsVerification, listEngagements } from "@/lib/store";
import { twilioEnabled } from "@/lib/telephony";
import { timeAgo } from "@/lib/ui";
import { CheckIcon, ChevronRightIcon, MessageIcon, PhoneIcon, ShieldCheckIcon, TrendingUpIcon } from "@/components/icons";
import { NumberCard, SimulateCall } from "@/components/dashboard/CallsClient";
import { FORWARD_MINUTES_LIMIT, forwardMinutesUsed } from "@/lib/engagement";
import type { SmsStatus, SmsVerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

function smsPill(status: SmsStatus) {
  switch (status) {
    case "delivered": return <span className="pill-dark !bg-[#3e7d3a]">DELIVERED</span>;
    case "sent": return <span className="pill-blue">SENT</span>;
    case "failed": return <span className="pill-orange">FAILED</span>;
    case "opted_out": return <span className="pill-dark">OPTED OUT</span>;
    default: return <span className="pill-soft">PENDING</span>;
  }
}

export default async function CallsPage() {
  const biz = (await currentBusiness())!;
  const vn = await getNumberByBusiness(biz.id);
  const engagements = await listEngagements(biz.id);
  const minutesUsed = vn ? await forwardMinutesUsed(biz.id) : 0;
  const verification = await getSmsVerification(biz.id);
  const verificationStatus: SmsVerificationStatus = verification?.status ?? "not_submitted";

  const calls = engagements.length;
  const delivered = engagements.filter((e) => e.smsStatus === "delivered" || e.smsStatus === "sent").length;
  const clicked = engagements.filter((e) => e.clickedAt).length;
  const converted = engagements.filter((e) => e.conversationId).length;
  const pct = (n: number) => (calls ? Math.round((n / calls) * 100) : 0);

  const funnel = [
    { label: "Calls intercepted", value: calls, sub: "100%", color: "#21201a" },
    { label: "SMS reached caller", value: delivered, sub: `${pct(delivered)}%`, color: "#7c97c9" },
    { label: "Clicked the link", value: clicked, sub: `${pct(clicked)}%`, color: "#e8552f" },
    { label: "Became a conversation", value: converted, sub: `${pct(converted)}%`, color: "#3e7d3a" },
  ];

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight">Calls</h1>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Your Privacy Wrapper: callers hear a greeting, get a tracked link by SMS, and land on your contact page — your
        personal number never rings, never leaks.
      </p>

      <div className="mt-7 grid lg:grid-cols-2 gap-5 items-start">
        <NumberCard vn={vn ?? null} live={twilioEnabled} minutesUsed={minutesUsed} minutesLimit={FORWARD_MINUTES_LIMIT} verificationStatus={verificationStatus} />
        <div className="space-y-5">
          <SimulateCall hasNumber={Boolean(vn)} />

          {/* Verify-business prompt — completes the SMS side of the integration */}
          {vn && verificationStatus !== "verified" && (
            <div className="card p-5 md:p-7 border-[#f6dcb0] bg-[#fffaf2]">
              <div className="flex items-start gap-3">
                <span className="w-11 h-11 rounded-2xl bg-white border border-[#f3d9cf] flex items-center justify-center text-[#e8552f] shrink-0">
                  <ShieldCheckIcon size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-[#232219] leading-snug">
                    {verificationStatus === "pending"
                      ? "Verification under review"
                      : verificationStatus === "rejected"
                        ? "Verification needs changes"
                        : "Verify your business to complete the integration"}
                  </h2>
                  <p className="mt-1 text-sm text-[#8a897f]">
                    {verificationStatus === "pending"
                      ? "Voice is live. Your toll-free number can't send SMS until the carrier approves your business — usually a few business days."
                      : verificationStatus === "rejected"
                        ? "The carrier couldn't approve your last submission. Update your details and resubmit to switch SMS on."
                        : "Voice is already live. Toll-free SMS needs a one-time business verification before you can text customers."}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/verification" className="btn-primary mt-4 w-full justify-center">
                {verificationStatus === "not_submitted" ? "Verify now" : "Review verification"}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Funnel */}
      <div className="mt-5 card p-5 md:p-7">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <TrendingUpIcon size={17} className="text-[#e8552f]" /> Call-to-click funnel
        </h2>
        <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {funnel.map((f, i) => (
            <div key={f.label} className={`pl-4 ${i > 0 ? "border-l border-[#ececea]" : ""}`}>
              <p className="text-[10px] text-[#8a897f] leading-tight min-h-[26px]">{f.label}</p>
              <p className="text-3xl font-semibold mt-1" style={{ color: f.color }}>{f.value}</p>
              <p className="text-[11px] text-[#a6a59c] mt-0.5">{f.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call log */}
      <div className="mt-5 card overflow-hidden">
        <div className="px-5 md:px-7 pt-6 pb-4 flex items-center gap-2">
          <PhoneIcon size={16} className="text-[#4b4a42]" />
          <h2 className="text-lg font-semibold">Call log</h2>
        </div>
        {engagements.length === 0 ? (
          <p className="px-5 md:px-7 pb-7 text-sm text-[#8a897f]">
            No calls yet. {vn ? "Send a test call above, or put your number on your Google Business Profile." : "Purchase your number to start."}
          </p>
        ) : (
          <div className="divide-y divide-[#f0f0ec]">
            {engagements.map((e) => (
              <div key={e.id} className="px-5 md:px-7 py-4 flex items-center gap-4 flex-wrap">
                <span className="w-10 h-10 rounded-2xl bg-[#21201a] text-white flex items-center justify-center shrink-0">
                  <PhoneIcon size={16} />
                </span>
                <div className="min-w-[140px]">
                  <p className="text-sm font-semibold font-mono">+• ••• ••• {e.callerLast4}</p>
                  <p className="text-[11px] text-[#a6a59c] mt-0.5">{timeAgo(e.callAt)}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-wrap">
                  {e.callOutcome === "forwarded_answered" && (
                    <span className="pill-dark !bg-[#3e7d3a]">
                      <PhoneIcon size={10} /> ANSWERED{e.callDuration ? ` · ${Math.ceil(e.callDuration / 60)} MIN` : ""}
                    </span>
                  )}
                  {e.callOutcome === "forwarded_missed" && <span className="pill-orange">MISSED → SMS</span>}
                  {e.callOutcome !== "forwarded_answered" && smsPill(e.smsStatus)}
                  {e.clickedAt ? (
                    <span className="pill-dark !bg-[#e8552f]"><CheckIcon size={10} /> CLICKED {timeAgo(e.clickedAt)}</span>
                  ) : (
                    <span className="pill-soft">NO CLICK YET</span>
                  )}
                  {e.conversationId ? (
                    <Link
                      href={`/dashboard/inbox/${e.conversationId}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e3e3df] px-3 py-1 text-[10px] font-semibold text-[#1b1a14] hover:bg-[#f4f4f1] transition"
                    >
                      <MessageIcon size={11} /> VIEW CONVERSATION <ChevronRightIcon size={10} />
                    </Link>
                  ) : (
                    <span className="pill-soft !bg-transparent !border !border-[#ececea]">NO CONVERSATION</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-[11px] text-[#a6a59c]">
        {twilioEnabled
          ? "Live mode: connected to Twilio. SMS delivery requires the number's toll-free verification to be approved."
          : "Simulator mode: add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env to go live — the pipeline is identical."}
      </p>
    </div>
  );
}
