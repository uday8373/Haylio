import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { listConversations } from "@/lib/store";
import { channelMeta } from "@/lib/ui";
import { countryFlag } from "@/lib/visitor";
import EnquiryRangeView from "@/components/dashboard/EnquiryRangeView";
import { ChannelIcon, ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { Channel } from "@/lib/types";

export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

const CHANNEL_COLOR: Record<Channel, string> = {
  callback: "#e8552f",
  chat: "#7c97c9",
  message: "#21201a",
  voicemail: "#6b6a60",
};

function keyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parse a YYYY-MM-DD key into a local Date (midnight). Falls back to today. */
function parseDate(key?: string): Date {
  const m = key?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export default async function EnquiriesByDate({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const biz = (await currentBusiness())!;
  const { date } = await searchParams;

  const convos = await listConversations(biz.id);
  const timestamps = convos.map((c) => c.createdAt);

  const day = parseDate(date);
  const dayStart = day.getTime();
  const dayEnd = dayStart + DAY;
  const dateKey = keyOf(day);

  const dayConvos = convos
    .filter((c) => c.createdAt >= dayStart && c.createdAt < dayEnd)
    .sort((a, b) => b.createdAt - a.createdAt);

  const prevKey = keyOf(new Date(dayStart - DAY));
  const nextKey = keyOf(new Date(dayStart + DAY));

  // ---- Day summary (right column) ----
  const channels = (Object.keys(channelMeta) as Channel[]).map((ch) => ({
    ch,
    label: channelMeta[ch].label,
    count: dayConvos.filter((c) => c.channel === ch).length,
  }));
  const chanMax = Math.max(1, ...channels.map((c) => c.count));
  const unread = dayConvos.filter((c) => c.unread).length;
  const contacts = new Set(dayConvos.filter((c) => c.visitorName).map((c) => c.visitorKey)).size;

  const hours = new Array<number>(24).fill(0);
  dayConvos.forEach((c) => hours[new Date(c.createdAt).getHours()]++);
  const peakHour = dayConvos.length ? hours.indexOf(Math.max(...hours)) : -1;
  const fmtHour = (h: number) => {
    const am = h < 12;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${am ? "am" : "pm"}`;
  };

  const niceDate = day.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="icon-btn !w-9 !h-9 shrink-0" aria-label="Back to home">
          <ChevronLeftIcon size={16} />
        </Link>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Enquiries</h1>
          <p className="text-xs text-[#8a897f] mt-0.5">{niceDate}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-5 items-start">
        {/* ---- Calendar + range picker (same design as home) ---- */}
        <section className="card md:col-span-8 p-5 md:p-6 min-w-0">
          <EnquiryRangeView
            timestamps={timestamps}
            initialView="month"
            initialMonth={{ year: day.getFullYear(), month: day.getMonth() }}
            selectedDate={dateKey}
          />
        </section>

        {/* ---- Day summary ---- */}
        <section className="card md:col-span-4 p-5 md:p-6 min-w-0">
          <h2 className="text-sm font-semibold text-[#8a897f]">Summary for this day</h2>
          <p className="mt-1 text-4xl font-semibold tracking-tight">{dayConvos.length}</p>
          <p className="text-xs text-[#8a897f]">enquir{dayConvos.length === 1 ? "y" : "ies"} received</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#ececea] p-3">
              <p className="text-2xl font-semibold leading-none">{unread}</p>
              <p className="text-[11px] text-[#8a897f] mt-1">New / unread</p>
            </div>
            <div className="rounded-2xl border border-[#ececea] p-3">
              <p className="text-2xl font-semibold leading-none">{contacts}</p>
              <p className="text-[11px] text-[#8a897f] mt-1">Named contacts</p>
            </div>
            <div className="rounded-2xl border border-[#ececea] p-3 col-span-2">
              <p className="text-2xl font-semibold leading-none">
                {peakHour >= 0 ? `${fmtHour(peakHour)}–${fmtHour((peakHour + 1) % 24)}` : "—"}
              </p>
              <p className="text-[11px] text-[#8a897f] mt-1">Busiest hour</p>
            </div>
          </div>

          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a6a59c]">By channel</p>
            <div className="mt-3 space-y-2.5">
              {channels.map((c) => (
                <div key={c.ch} className="flex items-center gap-2.5">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                    style={{ background: CHANNEL_COLOR[c.ch] }}
                  >
                    <ChannelIcon channel={c.ch} size={12} />
                  </span>
                  <span className="text-xs text-[#4a493f] w-20 shrink-0">{c.label}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-[#f1f1ee] overflow-hidden">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${c.count ? Math.max(8, (c.count / chanMax) * 100) : 0}%`, background: CHANNEL_COLOR[c.ch] }}
                    />
                  </span>
                  <span className="text-xs font-semibold tabular-nums w-5 text-right">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ---- Selected-day list ---- */}
      <div>
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">
            {dayConvos.length} enquir{dayConvos.length === 1 ? "y" : "ies"} on this day
          </h2>
          <div className="flex items-center gap-1.5">
            <Link href={`/dashboard/enquiries?date=${prevKey}`} className="icon-btn !w-8 !h-8" aria-label="Previous day">
              <ChevronLeftIcon size={15} />
            </Link>
            <Link href={`/dashboard/enquiries?date=${nextKey}`} className="icon-btn !w-8 !h-8" aria-label="Next day">
              <ChevronRightIcon size={15} />
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-3 max-w-3xl">
          {dayConvos.length === 0 && (
            <div className="card p-6 text-sm text-[#8a897f]">No enquiries on this day. Pick another date above.</div>
          )}
          {dayConvos.map((c, i) => {
            const last = c.messages[c.messages.length - 1];
            return (
              <Link
                key={c.id}
                href={`/dashboard/inbox/${c.id}`}
                className="card card-hover flex items-center gap-4 px-5 py-4 animate-fade-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <span
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: CHANNEL_COLOR[c.channel] }}
                >
                  <ChannelIcon channel={c.channel} size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm">
                    <span className={`truncate ${c.unread ? "font-bold" : "font-medium"}`}>
                      {c.visitorName || "Visitor"}
                    </span>
                    {c.visitorContact && (
                      <span className="text-[#a6a59c] font-normal truncate hidden sm:inline">· {c.visitorContact}</span>
                    )}
                    {c.visitorMeta?.country && (
                      <span className="shrink-0" title={c.visitorMeta.country}>{countryFlag(c.visitorMeta.country)}</span>
                    )}
                    <span className={c.unread ? "pill-dark" : "pill-soft"}>{c.unread ? "New" : "Replied"}</span>
                  </span>
                  <span className="block text-xs text-[#8a897f] truncate mt-1">
                    {last?.kind === "audio"
                      ? "Voice message"
                      : last?.kind === "callback"
                        ? `Call back: ${last.phone}${last.preferredTime ? ` (${last.preferredTime})` : ""}`
                        : last?.text || ""}
                  </span>
                </span>
                <span className="text-xs text-[#a6a59c] shrink-0 tabular-nums">
                  {new Date(c.createdAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
                <span className="icon-btn !w-9 !h-9 shrink-0">
                  <ChevronRightIcon size={15} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
