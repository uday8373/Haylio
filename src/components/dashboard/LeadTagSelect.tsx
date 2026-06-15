"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeadTag } from "@/lib/types";
import { TAG_META, TAG_ORDER } from "@/components/dashboard/leadTag";

export default function LeadTagSelect({
  leadKey,
  tag,
  onChange,
}: {
  leadKey: string;
  tag: LeadTag;
  onChange?: (tag: LeadTag) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState<LeadTag>(tag);
  const [busy, setBusy] = useState(false);

  async function set(next: LeadTag) {
    setValue(next);
    setBusy(true);
    onChange?.(next);
    await fetch(`/api/leads/${encodeURIComponent(leadKey)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tag: next }),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  const m = TAG_META[value];
  return (
    <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <select
        aria-label="Lead status"
        className={`appearance-none cursor-pointer rounded-full border pl-3 pr-7 py-1 text-[10px] font-bold uppercase tracking-wide outline-none ${m.cls} ${busy ? "opacity-60" : ""}`}
        value={value}
        disabled={busy}
        onChange={(e) => set(e.target.value as LeadTag)}
      >
        {TAG_ORDER.map((t) => (
          <option key={t} value={t}>
            {TAG_META[t].label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-current opacity-60 text-[8px]">▼</span>
    </div>
  );
}
