import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness, getSmsVerification, listConversations } from "@/lib/store";
import { channelMeta, timeAgo } from "@/lib/ui";
import EnquiryTracker from "@/components/dashboard/EnquiryTracker";
import { SendSupportLink } from "@/components/dashboard/CallsClient";
import { baseUrl } from "@/lib/telephony";
import type { SmsVerificationStatus } from "@/lib/types";
import {
  CalendarIcon,
  ChannelIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  PlusIcon,
} from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Overview() {
  const biz = (await currentBusiness())!;
  const [convos, vn, verification] = await Promise.all([
    listConversations(biz.id),
    getNumberByBusiness(biz.id),
    getSmsVerification(biz.id),
  ]);
  const verificationStatus: SmsVerificationStatus = verification?.status ?? "not_submitted";

  // ---- Enquiry tracker: all createdAt timestamps (aggregated client-side per range) ----
  const enquiryTimestamps = convos.map((c) => c.createdAt);

  // ---- KPIs ----
  const aiAnswered = convos.filter((c) => c.channel === "chat").length;
  const callbacks = convos.filter((c) => c.channel === "callback").length;
  const kpis = [
    { label: "Enquiries received", value: convos.length, color: "#e8552f" },
    { label: "AI answered", value: aiAnswered, color: "#21201a" },
    { label: "Callbacks requested", value: callbacks, color: "#7c97c9" },
  ];

  // ---- Latest contacts ----
  const contacts = convos
    .filter((c) => c.visitorName)
    .slice(0, 2)
    .map((c) => ({
      id: c.id,
      name: c.visitorName!,
      sub: c.visitorContact || channelMeta[c.channel].label,
      channel: c.channel,
    }));

  const badge = (ch: string) =>
    ch === "callback" ? "pill-orange" : ch === "chat" ? "pill-blue" : "pill-dark";

  return (
    <div className="grid md:grid-cols-12 gap-5">
      {/* ============ Enquiry tracker ============ */}
      <EnquiryTracker
        phoneNumber={vn?.phoneNumber ?? null}
        verificationStatus={verificationStatus}
        timestamps={enquiryTimestamps}
      />

      {/* ============ Recent enquiries ============ */}
      <section className="md:col-span-5 md:row-span-2 min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">Your Recent Enquiries</h2>
          <Link href="/dashboard/inbox" className="text-xs text-[#8a897f] underline underline-offset-4 hover:text-[#1b1a14] transition">
            See all enquiries
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {convos.length === 0 && (
            <div className="card p-6 text-sm text-[#8a897f]">
              Nothing yet — share your link (see the <Link href="/dashboard/business" className="underline">Business</Link> page) to start receiving enquiries.
            </div>
          )}
          {convos.slice(0, 1).map((c, i) => {
            const last = c.messages[c.messages.length - 1];
            const expanded = i === 0;
            return (
              <Link
                key={c.id}
                href={`/dashboard/inbox/${c.id}`}
                className="card card-hover block p-5 animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-3.5">
                  <span
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                    style={{ background: c.channel === "callback" ? "#e8552f" : c.channel === "chat" ? "#7c97c9" : "#21201a" }}
                  >
                    <ChannelIcon channel={c.channel} size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <span className="truncate">{c.visitorName || "Visitor"} · {channelMeta[c.channel].label}</span>
                      <span className={c.unread ? "pill-dark" : "pill-soft"}>{c.unread ? "New" : "Replied"}</span>
                    </p>
                    <p className="text-xs text-[#8a897f] mt-0.5 truncate">
                      {last?.kind === "audio" ? "Voice message" : last?.kind === "callback" ? `Call back: ${last.phone}` : last?.text}
                    </p>
                  </div>
                  <span className="ml-auto icon-btn !w-9 !h-9 shrink-0">
                    {expanded ? <ChevronUpIcon size={15} /> : <ChevronDownIcon size={15} />}
                  </span>
                </div>

                {expanded && (
                  <div className="mt-4 pt-4 border-t border-[#f0f0ec]">
                    <div className="flex gap-2">
                      <span className="pill-soft !text-[11px] !px-3 !py-1.5">{channelMeta[c.channel].label}</span>
                      {c.visitorContact && <span className="pill-soft !text-[11px] !px-3 !py-1.5">{c.visitorContact}</span>}
                    </div>
                    {last?.text && (
                      <p className="mt-3 text-xs text-[#6b6a60] leading-relaxed line-clamp-2">{last.text}</p>
                    )}
                    <p className="mt-3 text-[11px] text-[#a6a59c] flex items-center gap-1.5">
                      <ClockIcon size={12} /> {timeAgo(c.updatedAt)}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Send support link — right column, below recent enquiries */}
        <div className="mt-5">
          <SendSupportLink hasNumber={Boolean(vn)} businessName={biz.name} supportLink={`${baseUrl()}/b/${biz.handle}`} />
        </div>
      </section>

      {/* ============ Latest contacts ============ */}
      <section className="md:col-span-4 min-w-0">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">Latest Contacts</h2>
          <Link href="/dashboard/inbox" className="text-xs text-[#8a897f] underline underline-offset-4 hover:text-[#1b1a14] transition">
            See all
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {contacts.length === 0 && <div className="card p-5 text-xs text-[#8a897f]">No contacts yet.</div>}
          {contacts.map((p) => (
            <div key={p.id} className="card p-4 flex items-center gap-3.5">
              <span className="w-11 h-11 rounded-full bg-[#f1f1ee] border border-[#e8e8e4] flex items-center justify-center font-semibold text-sm text-[#6b6a60]">
                {p.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-2">
                  {p.name} <span className={badge(p.channel)}>{channelMeta[p.channel as keyof typeof channelMeta].label}</span>
                </p>
                <p className="text-xs text-[#8a897f] truncate mt-0.5">{p.sub}</p>
              </div>
              <Link href={`/dashboard/inbox/${p.id}`} className="ml-auto icon-btn !w-9 !h-9 shrink-0">
                <PlusIcon size={15} />
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* ============ Premium ============ */}
      <section className="card md:col-span-4 p-6 relative overflow-hidden flex flex-col min-w-0">
        <div className="halftone absolute -right-8 -top-8 w-48 h-48 rounded-full opacity-60" />
        <h2 className="text-lg font-semibold relative">Unlock Call Proxy</h2>
        <p className="mt-2 text-xs text-[#8a897f] leading-relaxed relative max-w-[220px]">
          Get a masked number that forwards calls to your real phone — without ever revealing it.
        </p>
        <Link
          href="/dashboard/settings"
          className="relative mt-auto flex items-center justify-between bg-white border border-[#e3e3df] rounded-2xl px-5 py-3.5 text-sm font-semibold hover:bg-[#f6f6f3] transition group"
        >
          Upgrade now
          <span className="group-hover:translate-x-1 transition">›</span>
        </Link>
      </section>

      {/* ============ Lead progress ============ */}
      <section className="card md:col-span-4 p-6 min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold">Lead Progress</h2>
          <span className="pill-soft !px-3 !py-1.5">
            <CalendarIcon size={12} /> {new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {kpis.map((k) => (
            <div key={k.label} className="border-l border-[#ececea] first:border-0 pl-3 first:pl-0">
              <p className="text-[10px] text-[#8a897f] leading-tight min-h-[26px]">{k.label}</p>
              <p className="text-3xl font-semibold mt-1">{k.value}</p>
              <div className="mt-3 flex items-end gap-[3px] h-7">
                {Array.from({ length: 14 }).map((_, i) => (
                  <span
                    key={i}
                    className="w-[2px] rounded-full"
                    style={{
                      height: `${10 + ((i * 7) % 18)}px`,
                      background: i < Math.min(14, Math.max(1, k.value)) ? k.color : "#e3e3df",
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
