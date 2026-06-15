"use client";

import { useEffect, useState } from "react";
import type { Faq, PublicBusiness, WidgetConfig } from "@/lib/types";
import { ChannelIcon, PlusIcon } from "@/components/icons";
import ContactWidget from "@/components/ContactWidget";

interface BizState {
  handle: string;
  name: string;
  category: string;
  description: string;
  hours: string;
  location: string;
  website: string;
  verified: boolean;
  logoUrl: string;
  coverImageUrl: string;
  backgroundImageUrl: string;
  faqs: Faq[];
  widget: WidgetConfig;
}

export default function WidgetSections() {
  const [biz, setBiz] = useState<BizState | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/business").then(async (r) => setBiz(await r.json()));
  }, []);

  async function save() {
    if (!biz) return;
    setBusy(true);
    await fetch("/api/business", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ faqs: biz.faqs, widget: biz.widget }),
    });
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  if (!biz)
    return (
      <div className="flex items-center gap-3 text-sm text-[#8a897f]">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    );

  const ch = biz.widget.channels;
  const setWidget = (patch: Partial<WidgetConfig>) => setBiz({ ...biz, widget: { ...biz.widget, ...patch } });
  const toggles: { key: keyof WidgetConfig["channels"]; chan: string; title: string; desc: string }[] = [
    { key: "aiChat", chan: "chat", title: "AI Chat", desc: "Instant AI answers from your business profile" },
    { key: "message", chan: "message", title: "Messages", desc: "Text messages into your inbox" },
    { key: "voicemail", chan: "voicemail", title: "Voice messages", desc: "Browser voice notes — no phone line needed" },
    { key: "callback", chan: "callback", title: "Callback requests", desc: "Visitors leave a number; you call back" },
  ];

  const preview: PublicBusiness = {
    handle: biz.handle,
    name: biz.name,
    category: biz.category,
    description: biz.description,
    hours: biz.hours,
    location: biz.location,
    website: biz.website,
    verified: biz.verified,
    logoUrl: biz.logoUrl,
    coverImageUrl: biz.coverImageUrl,
    backgroundImageUrl: biz.backgroundImageUrl,
    widget: biz.widget,
  };

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-8 items-start">
      <div className="max-w-2xl min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-extrabold text-[#232219] tracking-tight">Widget &amp; AI</h2>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-[#3e7d3a] font-semibold animate-msg-in">Saved ✓</span>}
            <button onClick={save} className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
          </div>
        </div>
        <p className="text-sm text-[#8a897f] mt-1.5">
          Channels, appearance and FAQs for your public page at <span className="font-mono text-[#e8552f]">/b/{biz.handle}</span>.
        </p>

        {/* Channels */}
        <section className="mt-6 card p-5 md:p-7 animate-fade-up">
          <h3 className="font-bold text-[#232219]">Contact channels</h3>
          <p className="text-xs text-[#8a897f] mt-1">Choose how customers can reach you.</p>
          <div className="mt-5 space-y-2.5">
            {toggles.map((t) => (
              <label
                key={t.key}
                className={`flex items-center gap-4 cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
                  ch[t.key] ? "border-[#21201a] bg-[#f6f6f3]" : "border-[#ebebe8] bg-[#fafaf8] opacity-60 hover:opacity-90"
                }`}
              >
                <input type="checkbox" className="peer sr-only" checked={ch[t.key]} onChange={(e) => setWidget({ channels: { ...ch, [t.key]: e.target.checked } })} />
                <span className={`relative w-11 h-6 rounded-full transition-colors duration-300 shrink-0 ${ch[t.key] ? "bg-[#e8552f]" : "bg-[#ececea]"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${ch[t.key] ? "left-[22px]" : "left-0.5"}`} />
                </span>
                <span className="w-9 h-9 rounded-xl bg-white border border-[#e8e8e4] flex items-center justify-center text-[#4b4a42] shrink-0">
                  <ChannelIcon channel={t.chan} size={16} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#232219]">{t.title}</span>
                  <span className="block text-xs text-[#8a897f] mt-0.5">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Appearance */}
        <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-150">
          <h3 className="font-bold text-[#232219]">Appearance</h3>
          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Greeting</label>
              <input className="input" value={biz.widget.greeting} onChange={(e) => setWidget({ greeting: e.target.value })} />
            </div>
            <div>
              <label className="label">Theme color</label>
              <div className="flex items-center gap-3">
                <input type="color" className="h-12 w-16 rounded-2xl border border-[#e3e3df] bg-transparent cursor-pointer" value={biz.widget.themeColor} onChange={(e) => setWidget({ themeColor: e.target.value })} />
                <span className="font-mono text-sm text-[#8a897f]">{biz.widget.themeColor}</span>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-200">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-bold text-[#232219]">
              FAQs <span className="text-xs font-normal text-[#8a897f]">— the AI answers these word-for-word</span>
            </h3>
            <button className="btn-secondary !text-xs !px-4 !py-2" onClick={() => setBiz({ ...biz, faqs: [...biz.faqs, { q: "", a: "" }] })}>
              <PlusIcon size={13} /> Add FAQ
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {biz.faqs.length === 0 && <p className="text-xs text-[#8a897f]">No FAQs yet — add the questions customers always ask.</p>}
            {biz.faqs.map((f, i) => (
              <div key={i} className="rounded-2xl border border-[#ebebe8] bg-[#fafaf8] p-4 space-y-2.5 animate-scale-in">
                <input
                  className="input"
                  placeholder="Question, e.g. Do you take cake orders?"
                  value={f.q}
                  onChange={(e) => {
                    const faqs = [...biz.faqs];
                    faqs[i] = { ...f, q: e.target.value };
                    setBiz({ ...biz, faqs });
                  }}
                />
                <textarea
                  className="input"
                  placeholder="Answer"
                  value={f.a}
                  onChange={(e) => {
                    const faqs = [...biz.faqs];
                    faqs[i] = { ...f, a: e.target.value };
                    setBiz({ ...biz, faqs });
                  }}
                />
                <button className="text-xs text-[#e8552f] hover:text-[#c8431f] transition" onClick={() => setBiz({ ...biz, faqs: biz.faqs.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-7 flex justify-end">
          <button onClick={save} className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button>
        </div>
      </div>

      {/* Live preview */}
      <aside className="hidden lg:block lg:sticky lg:top-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-sm font-semibold text-[#1b1a14]">Live preview</h2>
          <span className="pill-soft">updates as you edit</span>
        </div>
        <div className="rounded-[2.2rem] bg-[#a9b0bb] p-3 shadow-xl">
          <ContactWidget business={preview} />
        </div>
        <p className="mt-3 text-[11px] text-[#a6a59c] text-center">
          This is your real widget — try the panels. Visitors see it at /b/{biz.handle}.
        </p>
      </aside>
    </div>
  );
}
