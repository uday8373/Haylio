"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheckIcon,
  BotIcon,
  CheckIcon,
  ClockIcon,
  InboxIcon,
  MapPinIcon,
  MessageIcon,
  MicIcon,
  PhoneIcon,
  PlusIcon,
  QrCodeIcon,
  SendIcon,
  ShieldCheckIcon,
  UsersIcon,
  ZapIcon,
  type IconProps,
} from "@/components/icons";

type Mode = "mobile" | "haylio";
type Icon = (p: IconProps) => React.ReactElement;

/* ------------------------------------------------------------------ */
/* Content                                                             */
/* ------------------------------------------------------------------ */

const day: Record<Mode, { icon: Icon; time: string; title: string; detail: string; good?: boolean }[]> = {
  mobile: [
    { icon: PhoneIcon, time: "9:12 am", title: "Spam likely", detail: "Third robocall this week about your business listing." },
    { icon: PhoneIcon, time: "1:40 pm", title: "Missed call", detail: "You were on a job. They didn't leave a voicemail and called someone else." },
    { icon: MessageIcon, time: "4:05 pm", title: "Unknown WhatsApp", detail: "A bulk promo sent to every number scraped from Google." },
    { icon: PhoneIcon, time: "11:42 pm", title: "Incoming call", detail: "Someone asking if you're open tomorrow." },
  ],
  haylio: [
    { icon: BotIcon, time: "9:12 am", title: "Robocall stopped", detail: "It didn't press 1 at your greeting, so your phone never rang.", good: true },
    { icon: SendIcon, time: "1:40 pm", title: "Missed call, link sent", detail: "The caller got your contact page by text and booked a callback.", good: true },
    { icon: MicIcon, time: "4:05 pm", title: "Voice note", detail: "38 seconds about a leaking water heater, waiting in your inbox.", good: true },
    { icon: BotIcon, time: "11:42 pm", title: "Answered by your assistant", detail: "“Yes, we open at 8 am. Want me to ask for a callback?”", good: true },
  ],
};

const parts: { icon: Icon; title: string; body: string; items: string[] }[] = [
  {
    icon: QrCodeIcon,
    title: "A contact page",
    body: "One link you can put on Google, your website, Instagram and a QR code on your van. Customers chat with your AI assistant, send a message or voice note, or ask for a callback.",
    items: ["AI chat", "Messages", "Voice notes", "Callback requests"],
  },
  {
    icon: PhoneIcon,
    title: "A business phone number",
    body: "A separate number for your listing, so your mobile stays private. You decide what happens when it rings: text the caller your link, play a short greeting, or forward the call to you.",
    items: ["Missed-call text back", "Call greeting", "Call forwarding"],
  },
  {
    icon: InboxIcon,
    title: "One inbox",
    body: "Every chat, voice note, callback, text and WhatsApp message lands in one place, with the caller's details and a tag for where each lead stands.",
    items: ["SMS and WhatsApp", "Lead tags", "Bookings", "Team access"],
  },
];

const steps: { title: string; body: string }[] = [
  {
    title: "Find your business",
    body: "Search for it on Google and Haylio imports your name, address, hours and website. Not on Google? Add the details yourself.",
  },
  {
    title: "Teach your assistant",
    body: "Add your services, prices and common questions. Choose how customers can reach you and how calls to your number are handled.",
  },
  {
    title: "Share your link and number",
    body: "Replace your mobile on Google, your website, flyers and invoices. Download a QR code, or embed the contact widget on your site.",
  },
  {
    title: "Reply to real enquiries",
    body: "The assistant handles routine questions. Callbacks, voice notes and new leads wait in your inbox until you're ready.",
  },
];

const benefits: { icon: Icon; title: string; body: string }[] = [
  {
    icon: ShieldCheckIcon,
    title: "No more spam on your personal phone",
    body: "Your mobile isn't published anywhere, so it can't be scraped, sold or autodialled. If your link is ever abused, make a new one.",
  },
  {
    icon: PhoneIcon,
    title: "Stop losing jobs to missed calls",
    body: "When you can't pick up, Haylio texts the caller your contact page within seconds, so they reach you instead of the next business on the list.",
  },
  {
    icon: BotIcon,
    title: "Answer the same questions less often",
    body: "Your assistant replies to questions about hours, prices, service areas and your FAQs at any hour, and hands real requests to you.",
  },
  {
    icon: ClockIcon,
    title: "Reply when it suits you",
    body: "Callback requests come with a name, a reason and a good time to call. Nothing rings at 11 pm unless you want it to.",
  },
  {
    icon: BadgeCheckIcon,
    title: "Look established from day one",
    body: "A Google-verified business name, a branded contact page and a dedicated number, without paying for an office line.",
  },
  {
    icon: UsersIcon,
    title: "Keep track of every lead",
    body: "Tag leads as they move along, book appointments into Google Calendar, and give your team access to the same inbox.",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "Do my customers need to install anything?",
    a: "No. Your contact page opens in any browser, and your Haylio number works like any other phone number.",
  },
  {
    q: "Will customers ever see my personal number?",
    a: "Not through Haylio. It isn't on your listing or contact page, and forwarded calls reach you without showing it to the caller. If you return a call from your mobile, the customer will see that number, as with any call.",
  },
  {
    q: "What can the AI assistant answer?",
    a: "Anything covered by your business profile: hours, services, prices, location and the FAQs you add. When it doesn't know, it offers to take a message or a callback request instead of guessing.",
  },
  {
    q: "What happens when someone calls my Haylio number?",
    a: "You choose one of three modes. Missed call: the call ends instantly and the caller gets your link by text. Greeting: a short message asks them to press 1 to get your link. Forwarding: the call rings your phone so you can talk.",
  },
  {
    q: "How much does it cost?",
    a: "Setting up your contact page is free. A business phone number is part of the paid plan, which you can add from your dashboard when you're ready.",
  },
];

const fitsFor = ["Plumbers", "Electricians", "Salons", "Clinics", "Cafés", "Cleaners", "Tutors", "Real estate agents", "Repair shops", "Gyms"];

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="Haylio home">
      <span className="w-8 h-8 rounded-full bg-[var(--signal)] text-white flex items-center justify-center">
        <ZapIcon size={15} />
      </span>
      <span className={`lp-display text-[1.35rem] font-bold ${light ? "text-white" : "text-[var(--ink)]"}`}>haylio</span>
    </Link>
  );
}

/** The hero's before/after: a public business listing and the day it produces. */
function ListingDemo() {
  const [mode, setMode] = useState<Mode>("mobile");
  const touched = useRef(false);

  // One orchestrated moment: show the "before", then switch to Haylio once.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setMode("haylio");
      return;
    }
    const t = setTimeout(() => {
      if (!touched.current) setMode("haylio");
    }, 3200);
    return () => clearTimeout(t);
  }, []);

  const pick = (m: Mode) => {
    touched.current = true;
    setMode(m);
  };
  const haylio = mode === "haylio";

  return (
    <div className="min-w-0 w-full max-w-[460px] mx-auto lg:mx-0">
      <div className="lp-switch" role="group" aria-label="Compare a business listing">
        <button type="button" aria-pressed={!haylio} onClick={() => pick("mobile")}>
          With your mobile number
        </button>
        <button type="button" aria-pressed={haylio} onClick={() => pick("haylio")}>
          With Haylio
        </button>
      </div>

      {/* Listing */}
      <div className="mt-4 rounded-[20px] bg-white border border-[var(--line)] p-5 shadow-[0_1px_0_rgba(19,26,42,0.04),0_12px_32px_-16px_rgba(19,26,42,0.25)]">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-xl bg-[#e4eefc] text-[#2457a6] lp-display font-bold text-lg flex items-center justify-center">
            S
          </span>
          <div>
            <p className="font-semibold text-[15px] leading-tight">Summit Plumbing</p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">Plumber in Denver, Colorado</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2.5 text-[13.5px]">
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <MapPinIcon size={15} />
            <dd>2140 Larimer St, Denver</dd>
          </div>
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <ClockIcon size={15} />
            <dd>Open today until 6 pm</dd>
          </div>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 text-[var(--muted)]">
              <PhoneIcon size={15} />
            </span>
            {haylio ? (
              <dd key="h" className="lp-feed-item">
                <span className="lp-strike text-[var(--muted)] text-[12.5px]">(303) 555-0148</span>
                <span className="block font-semibold text-[var(--ink)] mt-1">haylio.app/b/summit-plumbing</span>
                <span className="block text-[var(--ink)]">
                  (833) 555-0192 <span className="text-[var(--safe)] font-medium">business number</span>
                </span>
              </dd>
            ) : (
              <dd key="m" className="lp-feed-item">
                <span className="font-semibold text-[var(--ink)]">(303) 555-0148</span>
                <span className="block text-[var(--signal-ink)] text-[12.5px] mt-0.5">Your personal mobile, public to anyone</span>
              </dd>
            )}
          </div>
        </dl>
      </div>

      {/* The day it produces */}
      <div
        className={`lp-feed mt-3 rounded-[20px] p-5 border min-h-[330px] ${
          haylio ? "bg-white border-[var(--line)] text-[var(--ink)]" : "bg-[var(--ink)] border-[var(--ink)] text-white"
        }`}
        aria-live="polite"
      >
        <p className={`text-[13px] font-semibold ${haylio ? "text-[var(--safe)]" : "text-[#ff9a7a]"}`}>
          {haylio ? "The same day with Haylio" : "A typical day on your mobile"}
        </p>
        <ul className="mt-3 space-y-3">
          {day[mode].map((e, i) => (
            <li key={mode + i} className="lp-feed-item flex gap-3" style={{ animationDelay: `${i * 70}ms` }}>
              <span
                className={`mt-0.5 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${
                  e.good ? "bg-[#e3f3ea] text-[var(--safe)]" : "bg-white/10 text-[#ff9a7a]"
                }`}
              >
                <e.icon size={14} />
              </span>
              <div className="min-w-0">
                <p className="text-[13.5px] font-semibold leading-snug">
                  {e.title} <span className={`font-normal ${haylio ? "text-[var(--muted)]" : "text-white/50"}`}>{e.time}</span>
                </p>
                <p className={`text-[13px] leading-snug mt-0.5 ${haylio ? "text-[var(--muted)]" : "text-white/70"}`}>{e.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** What a customer sees after opening the link. */
function WidgetPreview() {
  return (
    <div className="mx-auto w-[300px] rounded-[38px] bg-[var(--ink)] p-2.5 shadow-[0_30px_60px_-30px_rgba(19,26,42,0.6)]">
      <div className="rounded-[30px] bg-white overflow-hidden">
        <div className="px-5 pt-6 pb-4 bg-[#fdf1ec]">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[var(--signal)] text-white lp-display font-bold flex items-center justify-center">D</span>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1">
                Demo Café <BadgeCheckIcon size={14} className="text-[#2457a6]" />
              </p>
              <p className="text-[11.5px] text-[var(--muted)]">Usually replies in minutes</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-4 space-y-2.5 text-[12.5px]">
          <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-md bg-[var(--ink)] text-white px-3 py-2">
            Can I order a birthday cake for Saturday?
          </p>
          <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-md bg-[var(--paper)] px-3 py-2">
            Yes! Cakes need 48 hours&apos; notice. Want me to pass your order details to the team?
          </p>
        </div>
        <div className="px-4 pb-5 grid grid-cols-2 gap-2">
          {[
            [MessageIcon, "Chat"],
            [SendIcon, "Message"],
            [MicIcon, "Voice note"],
            [PhoneIcon, "Callback"],
          ].map(([I, label]) => {
            const Ico = I as Icon;
            return (
              <span key={label as string} className="flex items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 text-[12px] font-medium">
                <Ico size={14} className="text-[var(--signal)]" /> {label as string}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing() {
  const [handle, setHandle] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  // /api/business returns 200 when a valid session exists.
  useEffect(() => {
    fetch("/api/business")
      .then((r) => setLoggedIn(r.ok))
      .catch(() => {});
  }, []);

  const startHref = loggedIn ? "/dashboard" : "/register";

  return (
    <main className="lp min-h-screen overflow-x-clip">
      {/* ===================== NAV ===================== */}
      <header className="sticky top-0 z-30 bg-[var(--paper)]/85 backdrop-blur border-b border-[var(--line)]/70">
        <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 md:px-8 h-16">
          <Logo />
          <div className="hidden md:flex items-center gap-7 text-[14px] text-[var(--muted)]">
            <a href="#what" className="hover:text-[var(--ink)] transition-colors">What you get</a>
            <a href="#how" className="hover:text-[var(--ink)] transition-colors">How it works</a>
            <a href="#benefits" className="hover:text-[var(--ink)] transition-colors">Benefits</a>
            <a href="#faq" className="hover:text-[var(--ink)] transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            {loggedIn ? (
              <Link href="/dashboard" className="lp-btn lp-btn-primary !py-2.5 !text-[14px]">
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-3 py-2 text-[14px] font-medium text-[var(--ink)] hover:text-[var(--signal-ink)] transition-colors">
                  Log in
                </Link>
                <Link href="/register" className="lp-btn lp-btn-primary !py-2.5 !text-[14px]">
                  Get started
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* ===================== HERO ===================== */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 pt-14 md:pt-20 pb-20 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14 lg:gap-16 items-start">
        <div className="min-w-0 lg:pt-10">
          <h1 className="lp-display text-[2.6rem] leading-[1.04] md:text-[4rem] font-bold">
            Let customers reach you without giving out your mobile number.
          </h1>
          <p className="mt-6 text-[17px] leading-[1.6] text-[var(--muted)] max-w-[34rem]">
            Haylio gives your business a contact page and a business phone number to share instead. An AI assistant answers
            routine questions, missed callers get a text with your link, and every real enquiry lands in one inbox.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = startHref;
            }}
            className="mt-9 max-w-[34rem] flex flex-col sm:flex-row sm:items-center gap-2 rounded-[22px] sm:rounded-full bg-white border border-[var(--line)] p-2 sm:pl-5"
          >
            <label htmlFor="lp-handle" className="flex items-center min-w-0 flex-1 px-3 sm:px-0 py-2 sm:py-0">
              <span className="text-[15px] text-[var(--muted)] shrink-0">haylio.app/b/</span>
              <input
                id="lp-handle"
                className="flex-1 min-w-0 bg-transparent text-[15px] text-[var(--ink)] outline-none placeholder:text-[#a3a9b5]"
                placeholder="your-business"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                aria-label="Your business link"
              />
            </label>
            <button type="submit" className="lp-btn lp-btn-primary shrink-0">
              Claim your free link
            </button>
          </form>
          <p className="mt-4 text-[14px] text-[var(--muted)]">
            Free to set up. Want to see it first?{" "}
            <Link href="/b/demo-cafe" className="font-semibold text-[var(--ink)] underline underline-offset-4 decoration-[var(--signal)] decoration-2">
              Try the live demo
            </Link>
          </p>
        </div>

        <ListingDemo />
      </section>

      {/* ===================== WHO IT'S FOR ===================== */}
      <section className="border-y border-[var(--line)] bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
          <p className="text-[14px] font-semibold shrink-0">Made for businesses that list a phone number publicly</p>
          <ul className="flex flex-wrap gap-2">
            {fitsFor.map((f) => (
              <li key={f} className="text-[13px] text-[var(--muted)] rounded-full bg-[var(--paper)] px-3 py-1.5">
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===================== WHAT YOU GET ===================== */}
      <section id="what" className="scroll-mt-16 max-w-6xl mx-auto px-5 md:px-8 py-24">
        <div className="max-w-2xl">
          <h2 className="lp-display text-[2.1rem] md:text-[2.75rem] leading-[1.08] font-bold">
            What Haylio gives your business
          </h2>
          <p className="mt-4 text-[17px] leading-[1.6] text-[var(--muted)]">
            Three things that work together, so customers can always reach you and your personal number stays off the internet.
          </p>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-x-10 gap-y-12">
          {parts.map((p) => (
            <article key={p.title} className="border-t-2 border-[var(--ink)] pt-6">
              <span className="w-10 h-10 rounded-full bg-[#fde6dd] text-[var(--signal-ink)] flex items-center justify-center">
                <p.icon size={18} />
              </span>
              <h3 className="lp-display mt-5 text-[1.45rem] font-bold">{p.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.65] text-[var(--muted)]">{p.body}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {p.items.map((i) => (
                  <li key={i} className="text-[12.5px] font-medium rounded-full border border-[var(--line)] bg-white px-2.5 py-1">
                    {i}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ===================== HOW IT WORKS ===================== */}
      <section id="how" className="scroll-mt-16 bg-white border-y border-[var(--line)]">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-24">
          <div className="max-w-2xl">
            <h2 className="lp-display text-[2.1rem] md:text-[2.75rem] leading-[1.08] font-bold">How it works</h2>
            <p className="mt-4 text-[17px] leading-[1.6] text-[var(--muted)]">
              Most businesses are set up in about ten minutes. You don&apos;t need new hardware or a new SIM.
            </p>
          </div>

          <ol className="mt-14 grid md:grid-cols-4 gap-10 md:gap-6">
            {steps.map((s, i) => (
              <li key={s.title} className="relative">
                {i < steps.length - 1 && (
                  <span aria-hidden className="hidden md:block absolute left-12 -right-4 top-5 h-px bg-[var(--line)]" />
                )}
                <span className="relative z-10 w-10 h-10 rounded-full bg-white border-2 border-[var(--signal)] text-[var(--signal-ink)] lp-display font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <h3 className="mt-5 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.65] text-[var(--muted)] max-w-[30ch]">{s.body}</p>
              </li>
            ))}
          </ol>

          {/* Customer's side */}
          <div className="mt-24 rounded-[28px] bg-[var(--paper)] px-6 py-12 md:px-14 md:py-14 grid md:grid-cols-[1fr_auto] gap-12 items-center">
            <div className="max-w-md">
              <h3 className="lp-display text-[1.9rem] leading-[1.12] font-bold">What your customers see</h3>
              <p className="mt-4 text-[15.5px] leading-[1.65] text-[var(--muted)]">
                Your link opens a page with your name, hours and the ways you&apos;ve chosen to be reached. Nothing to download,
                and no phone number to copy.
              </p>
              <ul className="mt-6 space-y-3 text-[15px]">
                {[
                  "Ask a question and get an instant answer",
                  "Send a message or record a voice note",
                  "Leave a number and a good time for a callback",
                  "Book an appointment, if you turn bookings on",
                ].map((t) => (
                  <li key={t} className="flex gap-3">
                    <span className="mt-[3px] w-5 h-5 shrink-0 rounded-full bg-[#e3f3ea] text-[var(--safe)] flex items-center justify-center">
                      <CheckIcon size={12} strokeWidth={3} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <Link href="/b/demo-cafe" className="lp-btn lp-btn-ghost mt-8">
                Open the live demo
              </Link>
            </div>
            <WidgetPreview />
          </div>
        </div>
      </section>

      {/* ===================== BENEFITS ===================== */}
      <section id="benefits" className="scroll-mt-16 max-w-6xl mx-auto px-5 md:px-8 py-24 grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-20">
        <div className="lg:sticky lg:top-28 self-start">
          <h2 className="lp-display text-[2.1rem] md:text-[2.75rem] leading-[1.08] font-bold">What changes for your business</h2>
          <p className="mt-4 text-[17px] leading-[1.6] text-[var(--muted)] max-w-md">
            Fewer interruptions, fewer lost customers, and a clear list of who to get back to.
          </p>
          <Link href={startHref} className="lp-btn lp-btn-primary mt-8">
            {loggedIn ? "Open dashboard" : "Claim your free link"}
          </Link>
        </div>
        <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
          {benefits.map((b) => (
            <li key={b.title} className="py-7 grid grid-cols-[auto_1fr] gap-5">
              <span className="w-11 h-11 rounded-full bg-white border border-[var(--line)] text-[var(--ink)] flex items-center justify-center">
                <b.icon size={18} />
              </span>
              <div>
                <h3 className="text-[18px] font-semibold leading-snug">{b.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.65] text-[var(--muted)] max-w-[56ch]">{b.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ===================== FAQ ===================== */}
      <section id="faq" className="scroll-mt-16 bg-white border-y border-[var(--line)]">
        <div className="max-w-3xl mx-auto px-5 md:px-8 py-24">
          <h2 className="lp-display text-[2.1rem] md:text-[2.75rem] leading-[1.08] font-bold">Questions businesses ask</h2>
          <div className="lp-faq mt-10 border-t border-[var(--line)]">
            {faqs.map((f) => (
              <details key={f.q} className="border-b border-[var(--line)] group">
                <summary className="flex items-center justify-between gap-6 py-5 text-[17px] font-semibold">
                  {f.q}
                  <span className="lp-faq-mark w-8 h-8 shrink-0 rounded-full border border-[var(--line)] flex items-center justify-center text-[var(--muted)]">
                    <PlusIcon size={15} />
                  </span>
                </summary>
                <p className="pb-6 -mt-1 text-[15.5px] leading-[1.7] text-[var(--muted)] max-w-[62ch]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA + FOOTER ===================== */}
      <section className="bg-[var(--ink)] text-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 pt-24 pb-16">
          <h2 className="lp-display text-[2.4rem] md:text-[3.6rem] leading-[1.04] font-bold max-w-3xl">
            Take your mobile number off the internet.
          </h2>
          <p className="mt-5 text-[17px] leading-[1.6] text-white/70 max-w-xl">
            Set up your contact page for free, then add a business number when you&apos;re ready.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href={startHref} className="lp-btn lp-btn-primary">
              {loggedIn ? "Open dashboard" : "Claim your free link"}
            </Link>
            <Link href="/b/demo-cafe" className="lp-btn border border-white/25 text-white hover:border-white/60">
              Try the live demo
            </Link>
          </div>

          <footer className="mt-24 pt-8 border-t border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-5 text-[14px] text-white/60">
            <Logo light />
            <div className="flex flex-wrap gap-6">
              <a href="#what" className="hover:text-white transition-colors">What you get</a>
              <a href="#how" className="hover:text-white transition-colors">How it works</a>
              <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
              <Link href={loggedIn ? "/dashboard" : "/login"} className="hover:text-white transition-colors">
                {loggedIn ? "Dashboard" : "Log in"}
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}
