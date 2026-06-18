"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckIcon, MessageIcon, SendIcon, SmartphoneIcon } from "@/components/icons";
import { SUPPORT_TEMPLATES, renderSupport } from "@/lib/supportTemplates";

export interface WhatsAppLogEntry {
  id: string;
  toLast4: string;
  body: string;
  status: string;
  error?: string;
  createdAt: number;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    delivered: { label: "Delivered", cls: "bg-[#eef6ea] text-[#3e7d3a] border-[#cfe3c6]" },
    sent: { label: "Sent", cls: "bg-[#eef2fb] text-[#3a5a9c] border-[#d3ddf0]" },
    queued: { label: "Queued", cls: "bg-[#f4f4f1] text-[#6b6a60] border-[#e3e3df]" },
    failed: { label: "Failed", cls: "bg-[#fdecea] text-[#c0392b] border-[#f4cdc8]" },
  };
  const s = map[status] ?? map.queued;
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${s.cls}`}>{s.label}</span>;
}

function timeAgo(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Connection / sender configuration card. */
function SenderCard({
  whatsAppFrom,
  usingSandbox,
  sandboxNumber,
  sandboxHint,
}: {
  whatsAppFrom: string;
  usingSandbox: boolean;
  sandboxNumber: string;
  sandboxHint: string;
}) {
  const router = useRouter();
  const [sender, setSender] = useState(whatsAppFrom);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/numbers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ whatsAppFrom: sender.trim() }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Save failed");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  return (
    <div className="card p-5 md:p-7">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <SmartphoneIcon size={17} className="text-[#25D366]" /> WhatsApp sender
      </h2>
      <p className="mt-1.5 text-xs text-[#8a897f]">
        Messages are sent from this WhatsApp number via Twilio. Leave it blank to use Twilio's shared
        WhatsApp Sandbox while you test.
      </p>

      <div className={`mt-4 rounded-2xl border p-3.5 ${usingSandbox ? "border-[#f6dcb0] bg-[#fffaf2]" : "border-[#cfe3c6] bg-[#f1f7ee]"}`}>
        <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">CURRENT SENDER</p>
        <p className="mt-1 text-sm font-mono font-semibold text-[#232219]">
          {usingSandbox ? `${sandboxNumber} (Sandbox)` : whatsAppFrom}
        </p>
        {usingSandbox && (
          <p className="mt-2 text-[11px] text-[#9a4a2e] leading-relaxed">
            Sandbox mode: each customer must opt in first. {sandboxHint}
          </p>
        )}
      </div>

      <div className="mt-4">
        <label className="label">Your WhatsApp sender <span className="text-[#a6a59c] font-normal">— international format, optional</span></label>
        <input
          className="input font-mono"
          type="tel"
          placeholder="+1 415 523 8886"
          value={sender}
          onChange={(e) => setSender(e.target.value)}
        />
        <p className="mt-1.5 text-[11px] text-[#a6a59c]">
          Once you have a WhatsApp-approved Twilio sender, paste it here to send from your own number instead of the sandbox.
        </p>
      </div>

      <div className="mt-4 flex items-center gap-3 justify-end flex-wrap">
        {error && <span className="text-sm text-[#e8552f] mr-auto">{error}</span>}
        {saved && <span className="text-sm text-[#3e7d3a] font-semibold">Saved ✓</span>}
        <button onClick={save} className="btn-primary" disabled={busy}>
          {busy ? "Saving…" : "Save sender"}
        </button>
      </div>
    </div>
  );
}

/** Composer: free-form message or a support-link template. */
function Composer({
  hasNumber,
  businessName,
  supportLink,
}: {
  hasNumber: boolean;
  businessName: string;
  supportLink: string;
}) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [mode, setMode] = useState<"free" | "template">("free");
  const [text, setText] = useState("");
  const [templateId, setTemplateId] = useState(SUPPORT_TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ to: string; message: string; status?: string } | null>(null);

  const template = SUPPORT_TEMPLATES.find((t) => t.id === templateId) ?? SUPPORT_TEMPLATES[0];
  const templatePreview = renderSupport(template.body, businessName, supportLink);

  async function send() {
    setBusy(true);
    setError("");
    setSent(null);
    const payload: Record<string, string> = { to };
    if (mode === "template") payload.templateId = templateId;
    else payload.message = text;
    const res = await fetch("/api/whatsapp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the message.");
      return;
    }
    setSent({ to: data.to, message: data.message, status: data.status });
    setTo("");
    setText("");
    router.refresh();
  }

  const canSend = hasNumber && to.trim() !== "" && (mode === "template" || text.trim() !== "");

  return (
    <div className="card p-5 md:p-7">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <SendIcon size={17} className="text-[#25D366]" /> Send a WhatsApp message
      </h2>
      <p className="mt-1.5 text-xs text-[#8a897f]">
        Message a customer on WhatsApp — type your own note or drop in your support link.
      </p>

      <div className="mt-4">
        <label className="label">Customer WhatsApp number (with country code)</label>
        <input
          className="input"
          type="tel"
          placeholder="+1 415 555 0134"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      {/* Mode toggle */}
      <div className="mt-4 inline-flex rounded-full border border-[#e8e8e4] bg-[#fafaf8] p-1">
        {([["free", "Free message"], ["template", "Support link"]] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMode(id)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
              mode === id ? "bg-[#21201a] text-white" : "text-[#6b6a60] hover:text-[#232219]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "free" ? (
        <div className="mt-4">
          <label className="label">Message</label>
          <textarea
            className="input min-h-28"
            placeholder="Hi! Thanks for reaching out — how can we help?"
            value={text}
            maxLength={1500}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-1.5 text-[11px] text-[#a6a59c]">{text.length}/1500 characters</p>
        </div>
      ) : (
        <div className="mt-4">
          <label className="label">Template</label>
          <div className="grid sm:grid-cols-2 gap-2">
            {SUPPORT_TEMPLATES.map((t) => {
              const active = t.id === templateId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplateId(t.id)}
                  className={`text-left rounded-2xl border p-3 transition ${
                    active ? "border-[#21201a] bg-[#faf9f6]" : "border-[#e8e8e4] hover:border-[#c9c9c3]"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#232219]">
                    <span className={`w-3.5 h-3.5 rounded-full border-[3px] shrink-0 ${active ? "border-[#25D366] bg-white" : "border-[#d8d8d3] bg-white"}`} />
                    {t.label}
                  </span>
                  <span className="block text-[11px] text-[#8a897f] mt-1 ml-[22px]">{t.description}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">PREVIEW</p>
            <div className="mt-2 max-w-sm rounded-2xl rounded-bl-md bg-[#dcf8c6] px-4 py-3 text-sm text-[#1b1a14]">
              {templatePreview}
            </div>
          </div>
        </div>
      )}

      <button onClick={send} className="btn-primary mt-5 w-full justify-center" disabled={busy || !canSend}>
        {busy ? "Sending…" : "Send on WhatsApp"}
      </button>
      {!hasNumber && <p className="mt-2 text-[11px] text-[#a6a59c]">Purchase your number first.</p>}
      {error && <p className="mt-3 text-sm text-[#e8552f]">{error}</p>}

      {sent && (
        <div className="mt-4 rounded-2xl border border-[#cfe3c6] bg-[#f1f7ee] p-4 animate-scale-in">
          <p className="text-xs font-semibold text-[#3e7d3a] flex items-center gap-1.5">
            <CheckIcon size={13} /> Sent to {sent.to}
            {sent.status ? ` — ${sent.status === "delivered" ? "delivered" : "accepted by Twilio"}` : ""}.
          </p>
          <div className="mt-2 max-w-sm rounded-2xl rounded-bl-md bg-[#dcf8c6] px-4 py-3 text-sm text-[#1b1a14]">
            {sent.message}
          </div>
        </div>
      )}
    </div>
  );
}

/** Recent sends log. */
function SendLog({ messages }: { messages: WhatsAppLogEntry[] }) {
  return (
    <div className="card p-5 md:p-7">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <MessageIcon size={17} className="text-[#25D366]" /> Recent WhatsApp sends
      </h2>
      {messages.length === 0 ? (
        <p className="mt-4 text-sm text-[#8a897f] py-6 text-center">No WhatsApp messages sent yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#f0f0ed]">
          {messages.map((m) => (
            <li key={m.id} className="py-3 flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-[#eef6ea] text-[#3e7d3a] flex items-center justify-center shrink-0 text-xs font-semibold">
                ••{m.toLast4}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#232219]">···{m.toLast4}</span>
                  <StatusBadge status={m.status} />
                  <span className="text-[11px] text-[#a6a59c] ml-auto">{timeAgo(m.createdAt)}</span>
                </div>
                <p className="mt-1 text-xs text-[#6b6a60] line-clamp-2">{m.body}</p>
                {m.error && <p className="mt-1 text-[11px] text-[#c0392b]">{m.error}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function WhatsAppPanel({
  hasNumber,
  businessName,
  supportLink,
  whatsAppFrom,
  usingSandbox,
  sandboxNumber,
  sandboxHint,
  messages,
}: {
  hasNumber: boolean;
  businessName: string;
  supportLink: string;
  whatsAppFrom: string;
  usingSandbox: boolean;
  sandboxNumber: string;
  sandboxHint: string;
  messages: WhatsAppLogEntry[];
}) {
  return (
    <div className="min-w-0">
      <h2 className="text-2xl font-extrabold text-[#232219] tracking-tight">WhatsApp</h2>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Connect a WhatsApp sender and message customers directly on WhatsApp via Twilio — free-form notes
        or your one-tap support link. Every send is logged below.
      </p>

      {!hasNumber ? (
        <div className="mt-6 card p-5 md:p-7 text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[#eef6ea] border border-[#cfe3c6] flex items-center justify-center text-[#25D366]">
            <SmartphoneIcon size={22} />
          </span>
          <h3 className="mt-4 text-lg font-semibold">Get your number first</h3>
          <p className="mt-2 text-xs text-[#8a897f] max-w-xs mx-auto leading-relaxed">
            WhatsApp sending is tied to your Haylio number. Pick a number in Call settings to enable it.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-2 gap-5 items-start">
          <div className="space-y-5">
            <SenderCard
              whatsAppFrom={whatsAppFrom}
              usingSandbox={usingSandbox}
              sandboxNumber={sandboxNumber}
              sandboxHint={sandboxHint}
            />
            <SendLog messages={messages} />
          </div>
          <Composer hasNumber={hasNumber} businessName={businessName} supportLink={supportLink} />
        </div>
      )}
    </div>
  );
}
