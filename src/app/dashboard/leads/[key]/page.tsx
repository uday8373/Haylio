import Link from "next/link";
import { notFound } from "next/navigation";
import { currentBusiness } from "@/lib/session";
import { getLead } from "@/lib/leads";
import { timeAgo } from "@/lib/ui";
import {
  ChannelIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  MailIcon,
  MessageIcon,
  PhoneIcon,
} from "@/components/icons";
import { scoreColor } from "@/components/dashboard/leadTag";
import LeadTagSelect from "@/components/dashboard/LeadTagSelect";
import LeadNameEdit from "@/components/dashboard/LeadNameEdit";
import type { LeadTimelineKind } from "@/lib/types";

export const dynamic = "force-dynamic";

function kindIcon(kind: LeadTimelineKind) {
  if (kind === "call") return <PhoneIcon size={14} />;
  if (kind === "sms") return <MessageIcon size={14} />;
  if (kind === "click") return <CheckIcon size={14} />;
  return <ChannelIcon channel={kind} size={14} />;
}

function kindColor(kind: LeadTimelineKind) {
  if (kind === "call") return "#21201a";
  if (kind === "sms") return "#7c97c9";
  if (kind === "click") return "#3e7d3a";
  if (kind === "callback") return "#e8552f";
  return "#4b4a42";
}

export default async function LeadPage({ params }: { params: Promise<{ key: string }> }) {
  const biz = (await currentBusiness())!;
  const { key } = await params;
  const lead = await getLead(biz.id, decodeURIComponent(key));
  if (!lead) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/dashboard/leads" className="text-sm text-[#8a897f] hover:text-[#1b1a14] transition">
        ‹ Back to leads
      </Link>

      {/* Header */}
      <div className="mt-4 card p-5 md:p-7">
        <div className="flex items-start gap-4 flex-wrap">
          <span className="w-14 h-14 rounded-full bg-[#f1f1ee] border border-[#e8e8e4] flex items-center justify-center font-bold text-xl text-[#6b6a60] shrink-0">
            {lead.name.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <LeadNameEdit leadKey={lead.key} name={lead.name} />
              <LeadTagSelect leadKey={lead.key} tag={lead.tag} />
            </div>
            <div className="mt-2 flex flex-col gap-1 text-sm text-[#6b6a60]">
              {lead.phone && <span className="flex items-center gap-2"><PhoneIcon size={13} className="text-[#a6a59c]" /> {lead.phone}</span>}
              {lead.email && <span className="flex items-center gap-2"><MailIcon size={13} className="text-[#a6a59c]" /> {lead.email}</span>}
              <span className="flex items-center gap-2 text-xs text-[#a6a59c]">
                <ClockIcon size={12} /> First seen {timeAgo(lead.firstAt)} · last active {timeAgo(lead.lastAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-4 border-t border-[#f0f0ec] pt-5">
          <div>
            <p className="text-[10px] text-[#8a897f] uppercase tracking-wide">Engagement</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: scoreColor(lead.score) }}>{lead.score}</p>
            <span className="mt-1.5 block w-full h-1.5 rounded-full bg-[#f1f1ee] overflow-hidden">
              <span className="block h-full rounded-full" style={{ width: `${lead.score}%`, background: scoreColor(lead.score) }} />
            </span>
          </div>
          <div>
            <p className="text-[10px] text-[#8a897f] uppercase tracking-wide">Calls</p>
            <p className="text-2xl font-bold mt-0.5 text-[#232219]">{lead.callCount}</p>
          </div>
          <div>
            <p className="text-[10px] text-[#8a897f] uppercase tracking-wide">Messages</p>
            <p className="text-2xl font-bold mt-0.5 text-[#232219]">{lead.messageCount}</p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <h2 className="mt-7 font-bold text-[#232219]">Interaction timeline</h2>
      <div className="mt-4 relative pl-2">
        {lead.timeline.map((item, i) => {
          const color = kindColor(item.kind);
          const inner = (
            <div className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0" style={{ background: color }}>
                  {kindIcon(item.kind)}
                </span>
                {i < lead.timeline.length - 1 && <span className="w-px flex-1 bg-[#ebebe8] my-1" />}
              </div>
              <div className="pb-5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-[#232219]">{item.title}</p>
                  {item.status && item.status !== "texted" && (
                    <span className="pill-soft !text-[9px] !px-2 !py-0.5 uppercase">{item.status.replace(/_/g, " ")}</span>
                  )}
                  {item.conversationId && <ChevronRightIcon size={13} className="text-[#c9c9c3]" />}
                </div>
                {item.detail && <p className="text-xs text-[#6b6a60] mt-1 line-clamp-2">{item.detail}</p>}
                <p className="text-[11px] text-[#a6a59c] mt-1">{timeAgo(item.at)}</p>
              </div>
            </div>
          );
          return item.conversationId ? (
            <Link key={item.id} href={`/dashboard/inbox/${item.conversationId}`} className="block hover:opacity-80 transition">
              {inner}
            </Link>
          ) : (
            <div key={item.id}>{inner}</div>
          );
        })}
        {lead.timeline.length === 0 && <p className="text-sm text-[#8a897f]">No interactions recorded.</p>}
      </div>
    </div>
  );
}
