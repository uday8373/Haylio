import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness, getSmsVerification, listEngagements, listWhatsAppMessages } from "@/lib/store";
import { twilioEnabled, baseUrl } from "@/lib/telephony";
import { ShieldCheckIcon, TrendingUpIcon } from "@/components/icons";
import { NumberCard, SimulateCall } from "@/components/dashboard/CallsClient";
import { WhatsAppPanel, type WhatsAppLogEntry } from "@/components/dashboard/WhatsAppClient";
import { Tabs } from "@/components/dashboard/Tabs";
import { CallLog, type CallLogEntry } from "@/components/dashboard/CallLog";
import { FORWARD_MINUTES_LIMIT, forwardMinutesUsed } from "@/lib/engagement";
import { WHATSAPP_SANDBOX_NUMBER, WHATSAPP_SANDBOX_JOIN_HINT, isUsingSandbox } from "@/lib/whatsapp";
import { billingEnabled } from "@/lib/billing";
import type { SmsVerificationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CallsPage() {
  const biz = (await currentBusiness())!;
  const vn = await getNumberByBusiness(biz.id);
  const engagements = await listEngagements(biz.id);
  const whatsAppMessages = await listWhatsAppMessages(biz.id);
  const minutesUsed = vn ? await forwardMinutesUsed(biz.id) : 0;
  const verification = await getSmsVerification(biz.id);
  const verificationStatus: SmsVerificationStatus = verification?.status ?? "not_submitted";
  const paywall = billingEnabled && biz.planStatus !== "active";

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

  // Display-only entries for the client log (no full phone numbers leave the server).
  const logEntries: CallLogEntry[] = engagements.map((e) => ({
    id: e.id,
    callerLast4: e.callerLast4,
    callAt: e.callAt,
    smsStatus: e.smsStatus,
    callOutcome: e.callOutcome,
    callDuration: e.callDuration,
    clickedAt: e.clickedAt,
    conversationId: e.conversationId,
  }));

  const settingsPanel = (
    <div className="min-w-0">
      <h2 className="text-2xl font-extrabold text-[#232219] tracking-tight">Call settings</h2>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Choose how calls are handled — an IVR press-1 prompt, an instant missed-call that texts your support
        link (non-chargeable), or live forwarding to your phone (chargeable). Your personal number never leaks.
      </p>

      <div className="mt-6 grid lg:grid-cols-2 gap-5 items-start">
        <NumberCard vn={vn ?? null} live={twilioEnabled} minutesUsed={minutesUsed} minutesLimit={FORWARD_MINUTES_LIMIT} verificationStatus={verificationStatus} paywall={paywall} />
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
    </div>
  );

  const logsPanel = (
    <div className="min-w-0">
      <h2 className="text-2xl font-extrabold text-[#232219] tracking-tight">Call logs</h2>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Every intercepted call, the SMS that followed, and whether it turned into a conversation.
      </p>

      {/* Funnel — top of the call logs */}
      <div className="mt-6 card p-5 md:p-7">
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

      {/* Call log — filters + pagination handled client-side */}
      <div className="mt-5">
        <CallLog entries={logEntries} hasNumber={Boolean(vn)} />
      </div>

      <p className="mt-4 text-[11px] text-[#a6a59c]">
        {twilioEnabled
          ? "Live mode: connected to Twilio. SMS delivery requires the number's toll-free verification to be approved."
          : "Simulator mode: add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env to go live — the pipeline is identical."}
      </p>
    </div>
  );

  // WhatsApp tab — connect a sender + message customers via Twilio WhatsApp.
  const whatsAppLog: WhatsAppLogEntry[] = whatsAppMessages.map((m) => ({
    id: m.id,
    toLast4: m.toLast4,
    body: m.body,
    status: m.status,
    error: m.error,
    createdAt: m.createdAt,
  }));

  const whatsAppPanel = (
    <WhatsAppPanel
      hasNumber={Boolean(vn)}
      businessName={biz.name}
      supportLink={`${baseUrl()}/b/${biz.handle}`}
      whatsAppFrom={vn?.whatsAppFrom ?? ""}
      usingSandbox={isUsingSandbox(vn?.whatsAppFrom)}
      sandboxNumber={WHATSAPP_SANDBOX_NUMBER}
      sandboxHint={WHATSAPP_SANDBOX_JOIN_HINT}
      messages={whatsAppLog}
    />
  );

  return (
    <div className="max-w-4xl">
      <Tabs
        tabs={[
          { id: "settings", label: "Call settings", content: settingsPanel },
          { id: "logs", label: "Call logs", content: logsPanel },
          { id: "whatsapp", label: "WhatsApp", content: whatsAppPanel },
        ]}
      />
    </div>
  );
}
