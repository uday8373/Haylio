import Link from "next/link";
import { currentBusiness } from "@/lib/session";
import { listConversations } from "@/lib/store";
import { timeAgo } from "@/lib/ui";
import { countryFlag } from "@/lib/visitor";
import { ChannelIcon, ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function Inbox({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string }>;
}) {
  const biz = (await currentBusiness())!;
  const { channel } = await searchParams;
  let convos = await listConversations(biz.id);
  if (channel) convos = convos.filter((c) => c.channel === channel);

  const filters: { key: string; label: string }[] = [
    { key: "", label: "All" },
    { key: "chat", label: "Chats" },
    { key: "message", label: "Messages" },
    { key: "voicemail", label: "Voice" },
    { key: "callback", label: "Callbacks" },
  ];

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Inbox</h1>
      <div className="mt-5 flex gap-2 flex-wrap">
        {filters.map((f) => {
          const active = (channel ?? "") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key ? `/dashboard/inbox?channel=${f.key}` : "/dashboard/inbox"}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border transition-all duration-300 ${
                active
                  ? "bg-[#21201a] text-white border-[#21201a]"
                  : "bg-white text-[#6b6a60] border-[#e8e8e4] hover:border-[#c9c9c3]"
              }`}
            >
              {f.key && <ChannelIcon channel={f.key} size={13} />}
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {convos.length === 0 && <div className="card p-6 text-sm text-[#8a897f]">No conversations here yet.</div>}
        {convos.map((c, i) => {
          const last = c.messages[c.messages.length - 1];
          return (
            <Link
              key={c.id}
              href={`/dashboard/inbox/${c.id}`}
              className="card card-hover flex items-center gap-4 p-4.5 px-5 py-4 animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span
                className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shrink-0"
                style={{ background: c.channel === "callback" ? "#e8552f" : c.channel === "chat" ? "#7c97c9" : "#21201a" }}
              >
                <ChannelIcon channel={c.channel} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm">
                  <span className={`truncate ${c.unread ? "font-bold" : "font-medium"}`}>
                    {c.visitorName || "Visitor"}
                  </span>
                  {c.visitorContact && <span className="text-[#a6a59c] font-normal truncate hidden sm:inline">· {c.visitorContact}</span>}
                  {c.visitorMeta?.country && (
                    <span className="shrink-0" title={c.visitorMeta.country}>{countryFlag(c.visitorMeta.country)}</span>
                  )}
                  {c.visitorMeta?.deviceType && (
                    <span className="text-[10px] text-[#a6a59c] font-normal capitalize hidden sm:inline">{c.visitorMeta.deviceType}</span>
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
              <span className="text-xs text-[#a6a59c] shrink-0 tabular-nums">{timeAgo(c.updatedAt)}</span>
              <span className="icon-btn !w-9 !h-9 shrink-0"><ChevronRightIcon size={15} /></span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
