"use client";

import { useEffect, useState } from "react";
import { BUSINESS_CATEGORIES } from "@/lib/categories";
import {
  BadgeCheckIcon,
  BotIcon,
  ClockIcon,
  ExternalLinkIcon,
  GlobeIcon,
  ImageIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/icons";

interface ProfileState {
  name: string;
  verified: boolean;
  handle: string;
  category: string;
  description: string;
  hours: string;
  location: string;
  website: string;
  phone: string;
  logoUrl: string;
  coverImageUrl: string;
  backgroundImageUrl: string;
  aiInstructions: string;
}

function isValidImageUrl(u: string) {
  return u === "" || /^https?:\/\/\S+$/i.test(u);
}

function ImageUrlField({
  label,
  hint,
  value,
  onChange,
  previewClass,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  previewClass: string;
}) {
  const valid = isValidImageUrl(value);
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex gap-3 items-start">
        <div className="flex-1">
          <input
            className={`input font-mono !text-xs ${!valid ? "!border-[#e8552f]" : ""}`}
            placeholder="https://…/image.png"
            value={value}
            onChange={(e) => onChange(e.target.value.trim())}
          />
          <p className={`mt-1.5 text-[11px] ${valid ? "text-[#a6a59c]" : "text-[#e8552f]"}`}>
            {valid ? hint : "Must be a valid http(s) URL"}
          </p>
        </div>
        <div className={`shrink-0 overflow-hidden border border-[#e3e3df] bg-[#f4f4f1] flex items-center justify-center ${previewClass}`}>
          {value && valid ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={`${label} preview`} className="w-full h-full object-cover" />
          ) : (
            <ImageIcon size={18} className="text-[#c9c9c3]" />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProfileSections({ initial }: { initial?: ProfileState }) {
  const [p, setP] = useState<ProfileState | null>(initial ?? null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initial) return; // already loaded on the server
    fetch("/api/business").then(async (r) => setP(await r.json()));
  }, [initial]);

  async function save() {
    if (!p) return;
    if (![p.logoUrl, p.coverImageUrl, p.backgroundImageUrl].every(isValidImageUrl)) {
      setError("Fix the invalid image URLs before saving.");
      return;
    }
    setBusy(true);
    setError("");
    const { name, category, description, hours, location, website, phone, logoUrl, coverImageUrl, backgroundImageUrl, aiInstructions } = p;
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, category, description, hours, location, website, phone, logoUrl, coverImageUrl, backgroundImageUrl, aiInstructions }),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      setError("Save failed — check your connection and try again.");
    }
  }

  if (!p)
    return (
      <div className="flex items-center gap-3 text-sm text-[#8a897f]">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    );

  const set = (patch: Partial<ProfileState>) => setP({ ...p, ...patch });
  const categoryInList = (BUSINESS_CATEGORIES as readonly string[]).includes(p.category);

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
      <div className="max-w-2xl min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-extrabold text-[#232219] tracking-tight">Business profile</h2>
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-[#3e7d3a] font-semibold animate-msg-in">Saved ✓</span>}
            <button onClick={save} className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
          </div>
        </div>
        <p className="text-sm text-[#8a897f] mt-1.5">
          Shown on your public page at <span className="font-mono text-[#e8552f]">/b/{p.handle}</span> — and used to train your AI receptionist.
        </p>
        {error && <p className="mt-3 text-sm text-[#e8552f] animate-msg-in">{error}</p>}

        {/* Identity */}
        <section className="mt-6 card p-5 md:p-7 animate-fade-up">
          <h3 className="font-bold text-[#232219]">Identity</h3>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">
                Business name
                {p.verified && (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[#eaf3e6] border border-[#cfe3c6] px-2 py-0.5 text-[10px] font-bold text-[#3e7d3a]">
                    <BadgeCheckIcon size={11} /> GOOGLE VERIFIED — locked
                  </span>
                )}
              </label>
              <input
                className={`input ${p.verified ? "opacity-60 cursor-not-allowed" : ""}`}
                value={p.name}
                disabled={p.verified}
                title={p.verified ? "Name is locked to your Google Business listing" : undefined}
                onChange={(e) => set({ name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input appearance-none cursor-pointer"
                value={categoryInList ? p.category : p.category ? "Other" : ""}
                onChange={(e) => set({ category: e.target.value })}
              >
                <option value="" disabled className="bg-white">Select a category…</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-white">{c}</option>
                ))}
              </select>
              {!categoryInList && p.category && (
                <p className="mt-1.5 text-[11px] text-[#a6a59c]">Current value: "{p.category}" (imported) — pick a category above to standardise it.</p>
              )}
            </div>
            <div>
              <label className="label">Description</label>
              <textarea
                className="input min-h-28"
                value={p.description}
                onChange={(e) => set({ description: e.target.value })}
                placeholder="What you do, what you sell, opening specials, what makes you different…"
              />
              <p className="mt-1.5 text-[11px] text-[#a6a59c] flex items-center gap-1.5">
                <BotIcon size={13} /> The AI receptionist learns who you are from this description — the richer it is, the better the answers.
              </p>
            </div>
          </div>
        </section>

        {/* Brand images */}
        <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-150">
          <h3 className="font-bold text-[#232219]">
            Brand images <span className="text-xs font-normal text-[#8a897f]">— paste image URLs (uploads come later)</span>
          </h3>
          <div className="mt-5 space-y-5">
            <ImageUrlField label="Logo URL" hint="Square works best (e.g. 200×200). Shown as your avatar on the widget." value={p.logoUrl} onChange={(v) => set({ logoUrl: v })} previewClass="w-14 h-14 rounded-2xl" />
            <ImageUrlField label="Cover image URL" hint="Wide banner (e.g. 800×300). Shown behind your widget header." value={p.coverImageUrl} onChange={(v) => set({ coverImageUrl: v })} previewClass="w-28 h-14 rounded-xl" />
            <ImageUrlField label="Background image URL" hint="Full-page backdrop behind your public contact page." value={p.backgroundImageUrl} onChange={(v) => set({ backgroundImageUrl: v })} previewClass="w-24 h-14 rounded-xl" />
          </div>
        </section>

        {/* Contact details */}
        <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-200">
          <h3 className="font-bold text-[#232219]">Contact details</h3>
          <div className="mt-5 grid md:grid-cols-2 gap-4">
            <div>
              <label className="label">Hours</label>
              <input className="input" value={p.hours} onChange={(e) => set({ hours: e.target.value })} placeholder="Mon–Fri 9–5" />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={p.location} onChange={(e) => set({ location: e.target.value })} placeholder="Street address or area served" />
            </div>
            <div>
              <label className="label">Website</label>
              <input className="input" value={p.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" />
            </div>
            <div>
              <label className="label">Business phone <span className="text-[#8a897f] font-normal">(never shown publicly)</span></label>
              <input className="input" value={p.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+61 …" />
            </div>
          </div>
        </section>

        {/* AI training */}
        <section className="mt-5 card p-5 md:p-7 !border-[#f3d9cf] animate-fade-up delay-300">
          <h3 className="font-bold text-[#232219] flex items-center gap-2"><BotIcon size={17} /> AI receptionist training</h3>
          <p className="text-xs text-[#8a897f] mt-1.5 leading-relaxed">
            Your AI already learns from the <span className="text-[#55544c]">description</span> above, your contact details, and your
            FAQs (in the Widget &amp; AI tab). Use this field for extra instructions: tone of voice, things to always mention, offers to promote, situations to hand off to you.
          </p>
          <textarea
            className="input min-h-36 mt-4"
            value={p.aiInstructions}
            onChange={(e) => set({ aiInstructions: e.target.value })}
            placeholder={"e.g. Be friendly and brief. Always mention our winter promo (20% off first service). If someone sounds urgent or upset, ask them to request a callback so I can handle it personally. We don't do weekend jobs."}
          />
          <p className="mt-2 text-[11px] text-[#a6a59c]">Applied instantly to every new chat on your public page.</p>
        </section>

        <div className="mt-7 flex justify-end">
          <button onClick={save} className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
        </div>
      </div>

      {/* Business card preview */}
      <aside className="hidden lg:block lg:sticky lg:top-6">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-sm font-semibold text-[#1b1a14]">Business card</h2>
          <span className="pill-soft">updates as you edit</span>
        </div>

        <div className="card overflow-hidden !rounded-[1.75rem]">
          <div className="relative h-28 bg-gradient-to-br from-[#21201a] to-[#4b4a42]">
            {p.coverImageUrl && isValidImageUrl(p.coverImageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-8 relative w-16 h-16 rounded-2xl border-4 border-white bg-[#f1f1ee] overflow-hidden flex items-center justify-center shadow-md">
              {p.logoUrl && isValidImageUrl(p.logoUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt={`${p.name} logo`} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-[#6b6a60]">{p.name.charAt(0) || "?"}</span>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-[#1b1a14]">{p.name || "Your business"}</h3>
              {p.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf3e6] border border-[#cfe3c6] px-2 py-0.5 text-[10px] font-bold text-[#3e7d3a]">
                  <BadgeCheckIcon size={11} /> VERIFIED
                </span>
              )}
            </div>
            {p.category && <span className="pill-soft mt-1.5">{p.category}</span>}

            {p.description && <p className="mt-3 text-xs text-[#6b6a60] leading-relaxed line-clamp-3">{p.description}</p>}

            <div className="mt-4 pt-4 border-t border-[#f0f0ec] space-y-2.5 text-xs text-[#6b6a60]">
              {p.hours && <p className="flex items-start gap-2.5"><ClockIcon size={13} className="mt-0.5 text-[#a6a59c]" /> {p.hours}</p>}
              {p.location && <p className="flex items-start gap-2.5"><MapPinIcon size={13} className="mt-0.5 text-[#a6a59c]" /> {p.location}</p>}
              {p.website && <p className="flex items-start gap-2.5 break-all"><GlobeIcon size={13} className="mt-0.5 text-[#a6a59c]" /> {p.website.replace(/^https?:\/\//, "")}</p>}
              {p.phone && (
                <p className="flex items-start gap-2.5">
                  <PhoneIcon size={13} className="mt-0.5 text-[#a6a59c]" /> {p.phone}
                  <span className="pill-soft !py-0.5">private</span>
                </p>
              )}
              {!p.hours && !p.location && !p.website && !p.phone && <p className="text-[#a6a59c]">Add contact details to complete your card.</p>}
            </div>

            <a href={`/b/${p.handle}`} target="_blank" rel="noreferrer" className="mt-5 flex items-center justify-between bg-[#f4f4f1] border border-[#e8e8e4] rounded-2xl px-4 py-3 text-xs font-semibold text-[#1b1a14] hover:bg-[#ececea] transition">
              <span className="font-mono text-[#e8552f]">/b/{p.handle}</span>
              <ExternalLinkIcon size={13} />
            </a>
          </div>
        </div>
      </aside>
    </div>
  );
}
