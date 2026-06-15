"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/types";
import { BotIcon, PhoneIcon, RotateIcon } from "@/components/icons";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Deterministic format — avoids server/client locale hydration mismatches. */
function fmtTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}, ${hh}:${mm}`;
}

export default function ConversationThread({ initial }: { initial: Conversation }) {
  const [conv, setConv] = useState<Conversation>(initial);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/conversations/${conv.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: reply.trim() }),
    });
    if (res.ok) {
      setConv(await res.json());
      setReply("");
    }
    setBusy(false);
  }

  async function refresh() {
    const res = await fetch(`/api/conversations/${conv.id}`);
    if (res.ok) setConv(await res.json());
  }

  return (
    <div>
      <div className="card p-5 space-y-3">
        {conv.messages.map((m, i) => (
          <div
            key={m.id}
            className={`flex animate-msg-in ${m.role === "business" ? "justify-end" : "justify-start"}`}
            style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === "business"
                  ? "bg-[#21201a] text-white rounded-br-md"
                  : m.role === "ai"
                    ? "bg-[#fdf0eb] text-[#4b4a42] border border-[#f3d9cf] rounded-bl-md"
                    : "bg-[#f1f1ee] text-[#3c3b33] rounded-bl-md"
              }`}
            >
              {m.role === "ai" && (
                <p className="text-[10px] font-bold text-[#e8552f] mb-1.5 flex items-center gap-1.5">
                  <BotIcon size={13} /> AI ASSISTANT
                </p>
              )}
              {m.kind === "audio" && m.audioDataUrl ? (
                <audio controls src={m.audioDataUrl} className="max-w-full" />
              ) : m.kind === "callback" ? (
                <span>
                  <span className="font-semibold flex items-center gap-1.5"><PhoneIcon size={13} /> Callback request</span>
                  <span className="block mt-1.5">Number: <span className="font-mono">{m.phone}</span></span>
                  {m.preferredTime && <span className="block">Best time: {m.preferredTime}</span>}
                  {m.text && <span className="block mt-1.5 opacity-70 italic">"{m.text}"</span>}
                </span>
              ) : (
                <span className="whitespace-pre-wrap">{m.text}</span>
              )}
              <span className={`block text-[10px] mt-2 ${m.role === "business" ? "text-white/50" : "text-[#a6a59c]"}`}>
                {fmtTime(m.at)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="input !rounded-full"
          placeholder={conv.channel === "callback" ? "Add a note or reply…" : "Write a reply…"}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <button className="btn-primary !rounded-full shrink-0" disabled={busy || !reply.trim()}>
          {busy ? "…" : "Reply"}
        </button>
        <button type="button" onClick={refresh} className="icon-btn shrink-0" title="Refresh">
          <RotateIcon size={15} />
        </button>
      </form>
      <p className="mt-2.5 text-[11px] text-[#a6a59c]">
        Replies appear in the visitor's chat if they kept the page open. Email/SMS notification delivery ships in phase 2.
      </p>
    </div>
  );
}
