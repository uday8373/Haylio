"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lead, LeadTag } from "@/lib/types";
import { timeAgo } from "@/lib/ui";
import { ChannelIcon, CheckIcon, MessageIcon, PhoneIcon } from "@/components/icons";
import { TAG_META, TAG_ORDER, scoreColor } from "@/components/dashboard/leadTag";
import LeadTagSelect from "@/components/dashboard/LeadTagSelect";

function ChannelDots({ channels }: { channels: string[] }) {
  const seen = new Set(channels);
  const items: { k: string; node: React.ReactNode }[] = [];
  if (seen.has("call")) items.push({ k: "call", node: <PhoneIcon size={11} /> });
  if (seen.has("sms")) items.push({ k: "sms", node: <MessageIcon size={11} /> });
  for (const c of ["chat", "message", "voicemail", "callback"]) {
    if (seen.has(c)) items.push({ k: c, node: <ChannelIcon channel={c} size={11} /> });
  }
  return (
    <span className="flex items-center gap-1 text-[#8a897f]">
      {items.map((i) => (
        <span key={i.k} className="w-5 h-5 rounded-md bg-[#f1f1ee] flex items-center justify-center">{i.node}</span>
      ))}
    </span>
  );
}

export default function LeadsClient({ initial }: { initial: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initial);
  const [filter, setFilter] = useState<LeadTag | "all">("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length };
    for (const t of TAG_ORDER) c[t] = 0;
    for (const l of leads) c[l.tag] = (c[l.tag] ?? 0) + 1;
    return c;
  }, [leads]);

  const shown = filter === "all" ? leads : leads.filter((l) => l.tag === filter);

  function updateTag(key: string, tag: LeadTag) {
    setLeads((ls) => ls.map((l) => (l.key === key ? { ...l, tag } : l)));
  }

  const filters: { key: LeadTag | "all"; label: string }[] = [
    { key: "all", label: "All" },
    ...TAG_ORDER.map((t) => ({ key: t, label: TAG_META[t].label })),
  ];

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold border transition ${
                active ? "bg-[#21201a] text-white border-[#21201a]" : "bg-white text-[#6b6a60] border-[#e8e8e4] hover:border-[#c9c9c3]"
              }`}
            >
              {f.label}
              <span className={`text-[10px] ${active ? "text-white/70" : "text-[#a6a59c]"}`}>{counts[f.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 space-y-3">
        {shown.length === 0 && (
          <div className="card p-6 text-sm text-[#8a897f]">No leads here yet — they appear as people call or message you.</div>
        )}
        {shown.map((l, i) => (
          <div
            key={l.key}
            onClick={() => router.push(`/dashboard/leads/${encodeURIComponent(l.key)}`)}
            className="card card-hover flex items-center gap-4 px-5 py-4 cursor-pointer animate-fade-up"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <span className="w-11 h-11 rounded-full bg-[#f1f1ee] border border-[#e8e8e4] flex items-center justify-center font-semibold text-sm text-[#6b6a60] shrink-0">
              {l.name.charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm">
                <span className="font-semibold truncate text-[#1b1a14]">{l.name}</span>
                {l.contact && <span className="text-[#a6a59c] font-normal truncate hidden sm:inline">· {l.contact}</span>}
              </span>
              <span className="mt-1.5 flex items-center gap-3">
                <ChannelDots channels={l.channels} />
                {l.clicked && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#3e7d3a] font-semibold"><CheckIcon size={10} /> clicked</span>
                )}
              </span>
            </span>

            {/* Score */}
            <span className="hidden md:flex flex-col items-end gap-1 w-24 shrink-0">
              <span className="text-[10px] text-[#a6a59c]">score {l.score}</span>
              <span className="w-full h-1.5 rounded-full bg-[#f1f1ee] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${l.score}%`, background: scoreColor(l.score) }} />
              </span>
            </span>

            <span className="text-xs text-[#a6a59c] shrink-0 tabular-nums hidden sm:block w-20 text-right">{timeAgo(l.lastAt)}</span>
            <LeadTagSelect leadKey={l.key} tag={l.tag} onChange={(t) => updateTag(l.key, t)} />
          </div>
        ))}
      </div>
    </>
  );
}
