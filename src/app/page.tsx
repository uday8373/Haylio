"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BotIcon, ChannelIcon, MicIcon, ShieldCheckIcon, ZapIcon } from "@/components/icons";

const PURPLE = "#5747c8";

const logos = ["✦ Northwind", "◆ Bluebird Café", "● Kindred Co.", "▲ Summit Plumbing", "✺ Lumen Salon", "■ Harbor Dental", "✦ Brightside Gym"];

const heroTabs = [
  { chan: "chat", label: "AI chat" },
  { chan: "voicemail", label: "Voice message" },
  { chan: "callback", label: "Callback" },
];

const bentoTop = [
  {
    title: "AI Chat",
    desc: "Your AI receptionist answers hours, services and prices instantly — trained on your profile.",
    visual: (
      <div className="mt-5 space-y-2">
        <div className="flex justify-end">
          <span className="rounded-2xl rounded-br-md bg-[#5747c8] text-white text-xs px-3.5 py-2">Do you do same-day repairs?</span>
        </div>
        <div className="flex justify-start items-end gap-1.5">
          <span className="rounded-2xl rounded-bl-md bg-white border border-slate-200 text-slate-600 text-xs px-3.5 py-2 shadow-sm">
            Yes! Book before 11am and we'll come today.
          </span>
        </div>
      </div>
    ),
  },
  {
    title: "Voice Messages",
    desc: "Customers record a voice note right in the browser. You listen when you're free.",
    visual: (
      <div className="mt-6 flex items-center justify-center gap-1">
        {[14, 26, 18, 34, 22, 40, 16, 30, 20, 36, 14, 24, 32, 18, 26].map((h, i) => (
          <span key={i} className="w-1.5 rounded-full bg-[#5747c8]/60" style={{ height: h, animation: `float-y 1.6s ease-in-out ${i * 0.08}s infinite` }} />
        ))}
        <span className="ml-3 w-11 h-11 rounded-full bg-[#5747c8] text-white flex items-center justify-center shadow-lg shadow-indigo-300"><MicIcon size={18} /></span>
      </div>
    ),
  },
  {
    title: "Smart FAQs",
    desc: "Teach the AI your common questions once — it answers them word-for-word, forever.",
    visual: (
      <div className="mt-5 flex flex-wrap gap-2">
        {["Opening hours", "Parking?", "Vegan options", "Cake orders", "Catering"].map((c, i) => (
          <span key={c} className={`text-xs px-3 py-1.5 rounded-full border ${i === 0 ? "bg-[#5747c8] text-white border-transparent" : "bg-white border-slate-200 text-slate-600"}`}>
            {c}
          </span>
        ))}
      </div>
    ),
  },
];

const bentoBottom = [
  {
    title: "Callback Requests",
    desc: "Serious customers leave their number and a good time. You call back on your schedule — your caller ID stays yours.",
    visual: (
      <div className="mt-5 rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
        <p className="text-[10px] font-bold text-emerald-600">REQUESTED</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5">Catering quote — Marco</p>
        <p className="text-xs text-slate-500 mt-1">+61 400 ··· ··· · Today after 4pm</p>
      </div>
    ),
  },
  {
    title: "Spam Shield",
    desc: "Your real number is never published anywhere. Nothing to scrape, nothing to autodial, nothing to leak.",
    visual: (
      <div className="mt-5 flex items-center gap-4">
        <span className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600"><ShieldCheckIcon size={22} /></span>
        <div>
          <p className="text-2xl font-extrabold text-slate-900 font-display">0</p>
          <p className="text-xs text-slate-500">spam calls since switching</p>
        </div>
      </div>
    ),
  },
];

const showcase = [
  {
    title: "AI-Powered Answers",
    desc: "The AI deflects repetitive questions instantly and hands real intent to you.",
    grad: "linear-gradient(140deg, #ffb46e, #ff7eb3 45%, #b06ef5)",
    body: (
      <div className="rounded-2xl bg-white/95 p-4 shadow-xl">
        {[
          ["Priya", "Are you open on public holidays?"],
          ["AI", "Usually 8:00–15:00 — want me to confirm with the team?"],
          ["Priya", "Yes please!"],
        ].map(([who, text], i) => (
          <div key={i} className="flex items-start gap-2.5 py-1.5">
            <span className={`w-6 h-6 rounded-full text-[10px] flex items-center justify-center font-bold ${who === "AI" ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-600"}`}>
              {who === "AI" ? <BotIcon size={13} /> : "P"}
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: "Private by Design",
    desc: "One link everywhere — Google, website, QR codes. Regenerate it anytime; you can never regenerate your SIM.",
    grad: "linear-gradient(140deg, #b06ef5, #ff7eb3 50%, #ffb46e)",
    body: (
      <div className="rounded-2xl bg-white/95 p-4 shadow-xl text-center">
        <p className="font-mono text-sm text-violet-700">haylio.app/b/your-business</p>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
          <span className="rounded-lg bg-slate-100 py-2">Google Profile</span>
          <span className="rounded-lg bg-slate-100 py-2">Website embed</span>
          <span className="rounded-lg bg-slate-100 py-2">Storefront QR</span>
        </div>
      </div>
    ),
  },
  {
    title: "Your Inbox, Organized",
    desc: "Chats, voice notes and callbacks in one clean inbox — reply when it suits you.",
    grad: "linear-gradient(140deg, #6e8bf5, #b06ef5 50%, #ff7eb3)",
    body: (
      <div className="rounded-2xl bg-white/95 p-4 shadow-xl space-y-2">
        {[
          ["chat", "Priya · AI Chat", "Is the café open Monday?"],
          ["voicemail", "Sam · Voice message", "0:42"],
          ["callback", "Marco · Callback", "Today after 4pm"],
        ].map(([chan, who, what]) => (
          <div key={who as string} className="flex items-center gap-2.5">
            <span className="text-slate-500"><ChannelIcon channel={chan as string} size={14} /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-800 truncate">{who}</p>
              <p className="text-[10px] text-slate-500 truncate">{what}</p>
            </div>
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500" />
          </div>
        ))}
      </div>
    ),
  },
];

function Floor({ from }: { from: string }) {
  return (
    <div className="floor" style={{ ["--floor-from" as never]: from }}>
      <div className="floor-plane">
        <div className="floor-tile" style={{ left: "18%", top: "30%", animationDelay: "0s" }} />
        <div className="floor-tile" style={{ left: "62%", top: "55%", animationDelay: "1.2s" }} />
        <div className="floor-tile" style={{ left: "40%", top: "75%", animationDelay: "2.4s" }} />
        <div className="floor-tile" style={{ left: "78%", top: "25%", animationDelay: "3.1s" }} />
        <div className="floor-tile" style={{ left: "8%", top: "65%", animationDelay: "4s" }} />
      </div>
      <div className="floor-fade" />
    </div>
  );
}

export default function Landing() {
  const [tab, setTab] = useState(0);
  const [handle, setHandle] = useState("");
  const [active, setActive] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setActive((a) => (a + 1) % showcase.length), 3800);
    return () => clearInterval(t);
  }, []);

  // Reflect auth state: /api/business returns 200 when a valid session exists.
  useEffect(() => {
    fetch("/api/business").then((r) => setLoggedIn(r.ok)).catch(() => {});
  }, []);

  return (
    <main className="font-display bg-white text-slate-900 overflow-x-clip">
      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden" style={{ background: PURPLE }}>
        {/* Nav */}
        <nav className="relative z-20 max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2 text-white font-bold text-lg">
            <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"><ZapIcon size={15} /></span>
            haylio
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm text-white/85">
            {["Product", "Features", "Resources", "Pricing"].map((l) => (
              <a key={l} href="#how" className="px-3.5 py-2 rounded-full hover:bg-white/10 transition">
                {l} <span className="text-white/50 text-xs">⌄</span>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link
                href="/dashboard"
                className="text-sm font-semibold bg-white px-5 py-2 rounded-xl transition hover:scale-105 hover:shadow-lg"
                style={{ color: PURPLE }}
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-white/90 px-4 py-2 rounded-full hover:bg-white/10 transition">
                  Login
                </Link>
                <Link
                  href="/register"
                  className="text-sm font-semibold bg-white px-4 py-2 rounded-xl transition hover:scale-105 hover:shadow-lg"
                  style={{ color: PURPLE }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center px-6 pt-14 pb-56">
          <h1 className="text-4xl md:text-[3.5rem] font-bold text-white leading-[1.15] animate-fade-up">
            <span className="whitespace-nowrap">Reimagine business contact</span>
            <br />
            with <span className="text-pastel">zero spam</span>
          </h1>
          <p className="mt-6 text-white/80 text-sm md:text-base max-w-md mx-auto leading-relaxed animate-fade-up delay-150">
            Stop publishing your personal mobile everywhere. One smart link gives
            customers AI chat, voice notes and callbacks — and gives spammers nothing.
          </p>

          {/* Channel tabs */}
          <div className="mt-9 flex items-center justify-center gap-2 animate-fade-up delay-300">
            {heroTabs.map((t, i) => (
              <button
                key={t.label}
                onClick={() => setTab(i)}
                className={`flex items-center gap-2 text-sm px-4 py-2.5 rounded-full transition-all duration-300 ${
                  tab === i ? "bg-white/20 text-white shadow-inner" : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <ChannelIcon channel={t.chan} size={15} /> {t.label}
              </button>
            ))}
          </div>

          {/* Claim bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/register";
            }}
            className="mt-5 mx-auto max-w-xl flex items-center gap-2 bg-white rounded-2xl p-2 pl-4 shadow-2xl animate-fade-up delay-500"
          >
            <span className="text-sm text-slate-400 font-mono shrink-0">haylio.app/b/</span>
            <input
              className="flex-1 min-w-0 text-sm text-slate-800 outline-none placeholder-slate-300"
              placeholder="your-business"
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            />
            <button
              type="submit"
              className="shrink-0 text-sm font-semibold text-white px-5 py-3 rounded-xl transition hover:scale-105"
              style={{ background: PURPLE }}
            >
              Claim my link
            </button>
          </form>
          <p className="mt-4 text-xs text-white/50 animate-fade-up delay-700">
            Free to start · Google-verified businesses ·{" "}
            <Link href="/b/demo-cafe" className="underline underline-offset-2 hover:text-white/80 transition">
              see a live demo →
            </Link>
          </p>
        </div>

        <Floor from={PURPLE} />

        {/* Logo marquee */}
        <div className="relative z-10 border-t border-white/10 bg-[#4c3cb8]/70 backdrop-blur py-5">
          <div className="marquee">
            <div className="marquee-track">
              {[...logos, ...logos].map((l, i) => (
                <span key={i} className="px-10 text-white/60 text-sm font-semibold whitespace-nowrap">
                  {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold">How Haylio works</h2>
          <p className="mt-3 text-slate-500 text-sm max-w-xl mx-auto">
            Haylio sits between your customers and your phone — capturing every enquiry, answering the repetitive ones, and handing you only the real leads.
          </p>
        </div>

        <div className="mt-14 max-w-5xl mx-auto grid md:grid-cols-3 gap-5 items-stretch">
          {/* Card 1 */}
          <div className="rounded-3xl bg-slate-50 border border-slate-100 p-7 text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
            <h3 className="text-xl font-bold leading-snug">Capture every customer</h3>
            <div className="mt-6 space-y-2.5">
              {[
                ["chat", "AI chat"],
                ["voicemail", "Voice messages"],
                ["callback", "Callback requests"],
              ].map(([chan, l]) => (
                <div key={l} className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 px-4 py-3 shadow-sm text-sm font-medium">
                  <span className="text-[#5747c8]"><ChannelIcon channel={chan} size={16} /></span> {l}
                </div>
              ))}
            </div>
          </div>

          {/* Card 2 — gradient */}
          <div
            className="relative rounded-3xl p-7 text-left text-white overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
            style={{ background: "linear-gradient(150deg, #b06ef5, #ff7eb3 55%, #ffb46e)" }}
          >
            <h3 className="text-xl font-bold leading-snug">AI answers and triages</h3>
            <div className="mt-8 space-y-2.5">
              <div className="h-2.5 w-3/4 rounded-full bg-white/50" />
              <div className="h-2.5 w-1/2 rounded-full bg-white/40" />
              <div className="h-2.5 w-2/3 rounded-full bg-white/30" />
              <div className="mt-5 h-2.5 w-5/6 rounded-full bg-white/40" />
              <div className="h-2.5 w-2/5 rounded-full bg-white/30" />
            </div>
            <span className="absolute -right-5 -bottom-5 opacity-20"><BotIcon size={120} strokeWidth={1.5} /></span>
          </div>

          {/* Card 3 */}
          <div className="rounded-3xl bg-white border border-amber-200/70 p-7 text-left shadow-[0_8px_40px_rgba(255,180,110,0.15)] transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
            <h3 className="text-xl font-bold leading-snug">Get real leads only</h3>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Inbox", "Voice notes", "Callback queue", "QR code", "Website embed", "Spam shield", "and more"].map((c) => (
                <span key={c} className="text-xs px-3.5 py-2 rounded-xl border bg-violet-50 border-violet-100 text-violet-700 font-medium">
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== BENTO FEATURES ===================== */}
      <section className="py-10 px-6 pb-24">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-5">
          {bentoTop.map((b) => (
            <div key={b.title} className="rounded-3xl bg-slate-50 border border-slate-100 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <h3 className="text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              {b.visual}
            </div>
          ))}
        </div>
        <div className="mt-5 max-w-5xl mx-auto grid md:grid-cols-2 gap-5">
          {bentoBottom.map((b) => (
            <div key={b.title} className="rounded-3xl bg-slate-50 border border-slate-100 p-7 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl">
              <h3 className="text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{b.desc}</p>
              {b.visual}
            </div>
          ))}
        </div>
      </section>

      {/* ===================== ALL-IN-ONE ===================== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="inline-block text-xs font-semibold text-violet-700 bg-violet-50 border border-violet-100 rounded-full px-3.5 py-1.5">
              Simplify contact
            </span>
            <h2 className="mt-5 text-4xl md:text-5xl font-bold leading-[1.1]">
              All-in-One
              <br />
              platform for
              <br />
              customer contact
            </h2>
            <p className="mt-6 text-slate-500 text-sm leading-relaxed max-w-sm">
              Streamline how customers reach you with one comprehensive link.
              Simplify answering, screening, and calling back — effortlessly.
            </p>
          </div>

          <div className="relative flex gap-5 items-stretch">
            <div
              key={active}
              className="animate-card-enter flex-1 rounded-[2rem] p-8 text-white min-h-[420px] flex flex-col"
              style={{ background: showcase[active].grad }}
            >
              <h3 className="text-2xl font-bold text-center">{showcase[active].title}</h3>
              <p className="mt-3 text-sm text-white/85 text-center leading-relaxed">{showcase[active].desc}</p>
              <div className="mt-auto pt-6">{showcase[active].body}</div>
            </div>
            {/* progress rail */}
            <div className="flex flex-col items-center justify-between py-2 text-[10px] text-slate-400 font-semibold">
              <span>01</span>
              <div className="relative flex-1 w-1 my-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="absolute left-0 w-full rounded-full bg-violet-500 transition-all duration-700"
                  style={{ height: `${100 / showcase.length}%`, top: `${(active * 100) / showcase.length}%` }}
                />
              </div>
              <span>0{showcase.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CTA ===================== */}
      <section className="relative overflow-hidden pt-24 pb-0" style={{ background: PURPLE }}>
        <span className="sparkle text-white/60 text-2xl" style={{ left: "12%", top: "18%" }}>✦</span>
        <span className="sparkle text-white/40 text-lg" style={{ left: "85%", top: "14%", animationDelay: "1.3s" }}>✦</span>
        <span className="sparkle text-white/50 text-xl" style={{ left: "70%", top: "40%", animationDelay: "2.2s" }}>✧</span>
        <span className="sparkle text-white/40 text-base" style={{ left: "22%", top: "48%", animationDelay: "3s" }}>✧</span>

        <div className="relative z-10 max-w-3xl mx-auto text-center px-6">
          <span className="inline-block text-xs font-semibold text-white bg-white/15 border border-white/20 rounded-full px-4 py-1.5 animate-fade-up">
            Let's get started!
          </span>
          <h2 className="mt-6 text-4xl md:text-5xl font-bold text-white leading-[1.15] animate-fade-up delay-150">
            Make your number
            <br />
            <span className="text-pastel">impossible to spam</span>
          </h2>
          <Link
            href={loggedIn ? "/dashboard" : "/register"}
            className="inline-block mt-9 bg-white text-sm font-semibold px-7 py-3.5 rounded-2xl transition hover:scale-105 hover:shadow-2xl animate-fade-up delay-300"
            style={{ color: PURPLE }}
          >
            {loggedIn ? "Go to your Dashboard" : "Get Started for Free"}
          </Link>
        </div>

        {/* Widget preview */}
        <div className="relative z-10 max-w-2xl mx-auto mt-16 px-6 animate-fade-up delay-500">
          <div className="rounded-t-[2rem] bg-[#16122e]/90 border border-white/15 border-b-0 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center text-lg font-bold text-white">B</span>
              <div>
                <p className="text-sm font-bold text-white flex items-center gap-1.5">
                  Bluebird Café <span className="text-[9px] bg-white/20 rounded-full px-1.5 py-0.5">✓</span>
                </p>
                <p className="text-[10px] text-white/50">Café & Bakery · replies instantly</p>
              </div>
              <span className="ml-auto text-[10px] text-emerald-300">● online</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {heroTabs.map((t) => (
                <div key={t.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-center transition hover:bg-white/[0.12]">
                  <p className="flex justify-center text-white/80"><ChannelIcon channel={t.chan} size={20} /></p>
                  <p className="mt-1.5 text-[11px] font-semibold text-white">{t.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative h-32">
          <Floor from={PURPLE} />
        </div>

        <footer className="relative z-10 border-t border-white/10 py-8 text-center text-xs text-white/50">
          haylio — your business's front door, without your personal number. ·{" "}
          <Link href="/b/demo-cafe" className="underline underline-offset-2 hover:text-white/80">live demo</Link> ·{" "}
          <Link href={loggedIn ? "/dashboard" : "/login"} className="underline underline-offset-2 hover:text-white/80">
            {loggedIn ? "dashboard" : "log in"}
          </Link>
        </footer>
      </section>
    </main>
  );
}
