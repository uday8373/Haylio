"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConversationTag } from "@/lib/types";

const TAG_META: Record<ConversationTag, { label: string; cls: string; dot: string }> = {
  none: { label: "Untagged", cls: "bg-[#f3f3ef] border-[#e3e3df] text-[#8a897f]", dot: "bg-[#b9b8ae]" },
  query: { label: "Query", cls: "bg-[#eef2f7] border-[#d6e0ec] text-[#5b6b80]", dot: "bg-[#7c97c9]" },
  complaint: { label: "Complaint", cls: "bg-[#fdecea] border-[#f3c8c0] text-[#c0392b]", dot: "bg-[#c0392b]" },
  request: { label: "Request", cls: "bg-[#fff4e5] border-[#f6dcb0] text-[#a96a16]", dot: "bg-[#d4912f]" },
  spam: { label: "Spam", cls: "bg-[#efeeea] border-[#dcdbd3] text-[#6b6a60]", dot: "bg-[#6b6a60]" },
};
const TAG_ORDER: ConversationTag[] = ["none", "query", "complaint", "request", "spam"];

export default function ConversationMeta({
  conversationId,
  channelLabel,
  contact,
  initialName,
  initialTag,
}: {
  conversationId: string;
  channelLabel: string;
  contact?: string;
  initialName: string;
  initialTag: ConversationTag;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [tag, setTag] = useState<ConversationTag>(initialTag);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialName);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  async function saveName() {
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    setName(next);
    setEditing(false);
    await patch({ visitorName: next });
  }

  function pickTag(next: ConversationTag) {
    setTag(next);
    patch({ tag: next });
  }

  return (
    <div className="min-w-0">
      {editing ? (
        <span className="inline-flex items-center gap-2">
          <input
            autoFocus
            className="input !py-1.5 !text-xl font-semibold !w-56"
            value={draft}
            disabled={busy}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveName();
              if (e.key === "Escape") { setEditing(false); setDraft(name); }
            }}
          />
          <button onClick={saveName} disabled={busy} className="text-xs font-semibold text-[#3e7d3a] hover:underline">Save</button>
          <button onClick={() => { setEditing(false); setDraft(name); }} className="text-xs text-[#8a897f] hover:underline">Cancel</button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2 group">
          <h1 className="text-2xl font-semibold tracking-tight">{name || "Visitor"}</h1>
          <button
            onClick={() => { setDraft(name); setEditing(true); }}
            className="text-xs font-semibold text-[#8a897f] hover:text-[#1b1a14] underline underline-offset-2 opacity-0 group-hover:opacity-100 transition"
          >
            Edit name
          </button>
        </span>
      )}

      <p className="text-xs text-[#8a897f] mt-0.5">
        {channelLabel}
        {contact && <> · {contact}</>}
      </p>

      {/* Category tag */}
      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {TAG_ORDER.filter((t) => t !== "none").map((t) => {
          const m = TAG_META[t];
          const active = tag === t;
          return (
            <button
              key={t}
              onClick={() => pickTag(active ? "none" : t)}
              disabled={busy}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                active ? m.cls : "bg-white border-[#e8e8e4] text-[#a6a59c] hover:border-[#c9c9c3]"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? m.dot : "bg-[#d8d8d3]"}`} /> {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
