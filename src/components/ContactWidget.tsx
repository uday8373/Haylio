"use client";

import { useEffect, useRef, useState } from "react";
import type { BookingSlot, PublicBusiness } from "@/lib/types";
import { collectClientMeta } from "@/lib/visitorClient";
import {
  ArrowUpIcon,
  ChannelIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  MicIcon,
  SparklesIcon,
  SquareIcon,
} from "@/components/icons";

type Panel = "home" | "chat" | "message" | "voicemail" | "callback" | "done";

interface ChatMsg {
  role: "visitor" | "ai";
  text: string;
  slots?: BookingSlot[];
}

interface Resume {
  conversationId: string;
  visitorKey: string;
}

export default function ContactWidget({ business, resume }: { business: PublicBusiness; resume?: Resume }) {
  const [panel, setPanel] = useState<Panel>("home");
  const [doneText, setDoneText] = useState("");
  const color = business.widget.themeColor || "#e8552f";

  return (
    <div className="w-full max-w-md rounded-[2rem] border border-[#ebebe8] bg-white shadow-[0_8px_40px_rgba(25,25,18,0.12)] overflow-hidden text-[#232219]">
      {/* Header — brand banner */}
      <div
        className="relative px-6 pt-6 pb-5 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
      >
        {business.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.coverImageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(135deg, ${color}cc, ${color}55)` }}
        />
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-3.5">
          {business.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt={`${business.name} logo`}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white/60 shadow-lg bg-white"
            />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-white/25 backdrop-blur flex items-center justify-center text-2xl font-bold text-white shadow-lg">
              {business.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg leading-tight text-white flex items-center gap-1.5">
              {business.name}
              {business.verified && (
                <span title="Verified on Google" className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full bg-white/30 text-white">
                  <CheckIcon size={11} />
                </span>
              )}
            </h1>
            {business.category && <p className="text-white/80 text-xs mt-0.5">{business.category}</p>}
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" /> online
          </span>
        </div>
        {panel === "home" && (
          <p className="relative mt-4 text-sm text-white/95 animate-fade-up">{business.widget.greeting}</p>
        )}
      </div>

      {/* Body — keyed so each panel animates in */}
      <div className="p-5" key={panel}>
        {panel === "home" && <Home business={business} color={color} onPick={setPanel} />}
        {panel === "chat" && business.widget.channels.aiChat && (
          <ChatPanel business={business} color={color} onBack={() => setPanel("home")} resume={resume} />
        )}
        {panel === "message" && (
          <MessageForm
            business={business} color={color}
            onBack={() => setPanel("home")}
            onDone={() => { setDoneText("Message sent! The team will reply soon."); setPanel("done"); }}
          />
        )}
        {panel === "voicemail" && (
          <VoicemailPanel
            business={business} color={color}
            onBack={() => setPanel("home")}
            onDone={() => { setDoneText("Voice message sent! The team will listen and get back to you."); setPanel("done"); }}
          />
        )}
        {panel === "callback" && (
          <CallbackForm
            business={business} color={color}
            onBack={() => setPanel("home")}
            onDone={() => { setDoneText("Callback requested! The team will call you at a good time."); setPanel("done"); }}
          />
        )}
        {panel === "done" && (
          <div className="text-center py-10 animate-scale-in">
            <div className="mx-auto w-20 h-20 rounded-full bg-[#eaf3e6] border border-[#cfe3c6] flex items-center justify-center text-[#3e7d3a] animate-float">
              <CheckIcon size={36} />
            </div>
            <p className="mt-5 font-semibold text-[#1b1a14]">{doneText}</p>
            <button className="btn-secondary mt-7 !rounded-full" onClick={() => setPanel("home")}>← Back</button>
          </div>
        )}
      </div>
    </div>
  );
}

function Home({ business, color, onPick }: { business: PublicBusiness; color: string; onPick: (p: Panel) => void }) {
  const ch = business.widget.channels;
  const options: { key: Panel; on: boolean; chan: string; title: string; desc: string }[] = [
    { key: "chat", on: ch.aiChat, chan: "chat", title: "Chat with us", desc: "Instant answers, powered by AI" },
    { key: "message", on: ch.message, chan: "message", title: "Leave a message", desc: "We'll reply as soon as we can" },
    { key: "voicemail", on: ch.voicemail, chan: "voicemail", title: "Send a voice message", desc: "Record right here — no call needed" },
    { key: "callback", on: ch.callback, chan: "callback", title: "Request a callback", desc: "We'll call you at a good time" },
  ];
  return (
    <div>
      <div className="space-y-2.5">
        {options.filter((o) => o.on).map((o, i) => (
          <button
            key={o.key}
            onClick={() => onPick(o.key)}
            className="w-full flex items-center gap-3.5 rounded-2xl border border-[#ebebe8] bg-[#fafaf8] p-3.5 text-left transition-all duration-300 hover:border-[#21201a] hover:bg-white hover:-translate-y-0.5 hover:shadow-md group animate-fade-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110 text-white"
              style={{ background: color }}
            >
              <ChannelIcon channel={o.chan} size={19} />
            </span>
            <span>
              <span className="block font-semibold text-sm text-[#1b1a14]">{o.title}</span>
              <span className="block text-xs text-[#8a897f] mt-0.5">{o.desc}</span>
            </span>
            <span className="ml-auto text-[#c9c9c3] group-hover:translate-x-1 group-hover:text-[#4b4a42] transition-all duration-300">
              <ChevronRightIcon size={15} />
            </span>
          </button>
        ))}
      </div>

      {(business.hours || business.location || business.website) && (
        <div className="mt-5 pt-4 border-t border-[#f0f0ec] space-y-2 text-xs text-[#6b6a60] animate-fade-up delay-300">
          {business.hours && <p className="flex items-center gap-2"><ClockIcon size={13} className="text-[#a6a59c]" /> {business.hours}</p>}
          {business.location && <p className="flex items-center gap-2"><MapPinIcon size={13} className="text-[#a6a59c]" /> {business.location}</p>}
          {business.website && (
            <p className="flex items-center gap-2">
              <GlobeIcon size={13} className="text-[#a6a59c]" />
              <a href={business.website} className="underline underline-offset-2 decoration-[#d8d8d3] hover:text-[#1b1a14] transition" target="_blank" rel="noreferrer">
                {business.website.replace(/^https?:\/\//, "")}
              </a>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2.5 mb-4 animate-fade-up">
      <button
        onClick={onBack}
        className="w-8 h-8 rounded-full border border-[#e8e8e4] bg-white text-[#4b4a42] hover:bg-[#f4f4f1] transition flex items-center justify-center"
      >
        <ChevronLeftIcon size={14} />
      </button>
      <h2 className="font-semibold text-sm text-[#1b1a14]">{title}</h2>
    </div>
  );
}

function ChatPanel({ business, color, onBack, resume }: { business: PublicBusiness; color: string; onBack: () => void; resume?: Resume }) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(Boolean(resume?.conversationId));
  const convRef = useRef<{ id?: string; key?: string }>({});
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy]);

  // Resume the conversation identified by the visitor's token (cookie-derived).
  // Fetches the persisted thread from the server so it survives reloads and
  // shows any replies the business sent meanwhile.
  useEffect(() => {
    if (!resume?.conversationId) return;
    convRef.current = { id: resume.conversationId, key: resume.visitorKey };
    fetch(`/api/chat/history?conversationId=${encodeURIComponent(resume.conversationId)}&visitorKey=${encodeURIComponent(resume.visitorKey)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (Array.isArray(d?.messages)) setMsgs(d.messages);
      })
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "visitor", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: business.handle,
          message: text,
          conversationId: convRef.current.id,
          visitorKey: convRef.current.key,
          clientMeta: convRef.current.id ? undefined : collectClientMeta(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        convRef.current = { id: data.conversationId, key: data.visitorKey };
        setMsgs((m) => [...m, { role: "ai", text: data.reply, slots: data.slots }]);
      } else {
        setMsgs((m) => [...m, { role: "ai", text: data.error ?? "Something went wrong — please try again." }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Network error — please try again." }]);
    } finally {
      setBusy(false);
    }
  }

  async function bookSlot(slot: BookingSlot) {
    if (booking) return;
    setBooking(true);
    try {
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          handle: business.handle,
          startISO: slot.startISO,
          endISO: slot.endISO,
          label: slot.label,
          conversationId: convRef.current.id,
          visitorKey: convRef.current.key,
        }),
      });
      if (res.ok) {
        setBooked(slot.label);
        setMsgs((m) => [
          ...m.map((x) => (x.slots ? { ...x, slots: undefined } : x)),
          { role: "ai", text: `✅ You're booked for ${slot.label}. It's on our calendar — see you then!` },
        ]);
      } else {
        const d = await res.json().catch(() => ({}));
        setMsgs((m) => [...m, { role: "ai", text: d.error ?? "Couldn't book that slot — please try another." }]);
      }
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Network error — please try again." }]);
    } finally {
      setBooking(false);
    }
  }

  async function clearChat() {
    // Forget the resumable thread on the server (clears the chat cookie).
    fetch(`/api/chat/history?handle=${encodeURIComponent(business.handle)}`, { method: "DELETE" }).catch(() => {});
    convRef.current = {};
    setMsgs([]);
    setBooked(null);
    setInput("");
  }

  return (
    <div className="animate-fade-up">
      <div className="flex items-center justify-between gap-2">
        <BackBar title="Chat with us" onBack={onBack} />
        {msgs.length > 0 && (
          <button
            onClick={clearChat}
            className="mb-4 text-[11px] font-semibold text-[#a6a59c] hover:text-[#1b1a14] transition shrink-0"
          >
            New chat
          </button>
        )}
      </div>
      <div className="h-72 overflow-y-auto space-y-2.5 pr-1">
        {msgs.length === 0 && loadingHistory && (
          <div className="flex justify-center pt-16 gap-1.5">
            <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
          </div>
        )}
        {msgs.length === 0 && !loadingHistory && (
          <div className="text-center pt-12 animate-fade-up delay-150">
            <p className="animate-float text-[#a6a59c] flex justify-center"><SparklesIcon size={28} /></p>
            <p className="mt-3 text-xs text-[#8a897f]">
              Ask anything — hours, services, location…
              <br />
              Answers are instant.
            </p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`flex flex-col animate-msg-in ${m.role === "visitor" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                m.role === "visitor"
                  ? "text-white rounded-br-md shadow-md"
                  : "bg-[#f1f1ee] text-[#3c3b33] rounded-bl-md"
              }`}
              style={m.role === "visitor" ? { background: `linear-gradient(135deg, ${color}, ${color}cc)` } : undefined}
            >
              {m.text}
            </div>
            {m.role === "ai" && m.slots && m.slots.length > 0 && !booked && (
              <div className="mt-2 flex flex-col gap-1.5 w-[85%]">
                {m.slots.map((s) => (
                  <button
                    key={s.startISO}
                    onClick={() => bookSlot(s)}
                    disabled={booking}
                    className="rounded-xl border border-[#e3e3df] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#232219] text-left transition hover:border-[#21201a] hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2"
                  >
                    <span style={{ color }}>📅</span> {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <div className="flex justify-start animate-msg-in">
            <div className="bg-[#f1f1ee] rounded-2xl rounded-bl-md px-4 py-3 flex gap-1.5 items-center">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="mt-3 flex gap-2">
        <input
          className="input !rounded-full"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button
          onClick={send}
          disabled={busy || !input.trim()}
          className="btn-primary shrink-0 !rounded-full !px-4"
          style={{ background: color }}
        >
          <ArrowUpIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function MessageForm({ business, color, onBack, onDone }: { business: PublicBusiness; color: string; onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: business.handle, channel: "message", visitorName: name, visitorContact: contact, text, clientMeta: collectClientMeta() }),
    });
    if (res.ok) onDone();
    else {
      setError((await res.json()).error ?? "Failed to send");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-fade-up">
      <BackBar title="Leave a message" onBack={onBack} />
      <div className="space-y-3">
        <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Email or phone (for our reply)" value={contact} onChange={(e) => setContact(e.target.value)} required />
        <textarea className="input min-h-28" placeholder="Your message…" value={text} onChange={(e) => setText(e.target.value)} required />
        {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
        <button className="btn-primary w-full !rounded-full" style={{ background: color }} disabled={busy}>
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}

function VoicemailPanel({ business, color, onBack, onDone }: { business: PublicBusiness; color: string; onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [recording, setRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function startRecording() {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioUrl(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      rec.start();
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s >= 59) stopRecording();
          return s + 1;
        });
      }, 1000);
    } catch {
      setError("Microphone access denied. Please allow the mic and try again.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recRef.current?.stop();
    setRecording(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!audioUrl) {
      setError("Record a voice message first.");
      return;
    }
    setBusy(true);
    setError("");
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: business.handle, channel: "voicemail", visitorName: name, visitorContact: contact, audioDataUrl: audioUrl, clientMeta: collectClientMeta() }),
    });
    if (res.ok) onDone();
    else {
      setError((await res.json()).error ?? "Failed to send");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-fade-up">
      <BackBar title="Send a voice message" onBack={onBack} />
      <div className="space-y-3">
        <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" placeholder="Email or phone (for our reply)" value={contact} onChange={(e) => setContact(e.target.value)} required />

        <div className="rounded-2xl border border-[#ebebe8] bg-[#fafaf8] p-5 text-center">
          {!recording && !audioUrl && (
            <button
              type="button"
              onClick={startRecording}
              className="relative mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white transition-transform hover:scale-110"
              style={{ background: color, boxShadow: `0 4px 24px ${color}55` }}
            >
              <MicIcon size={24} />
            </button>
          )}
          {recording && (
            <div className="animate-scale-in">
              <div
                className="pulse-ring relative mx-auto w-16 h-16 rounded-full flex items-center justify-center text-white"
                style={{ background: "#e11d48" }}
              >
                <MicIcon size={24} className="relative" />
              </div>
              <p className="mt-3 text-sm font-bold text-[#e11d48] tabular-nums">
                Recording… 0:{String(seconds).padStart(2, "0")}
              </p>
              <button type="button" onClick={stopRecording} className="btn-secondary mt-3 !py-2 !rounded-full">
                <SquareIcon size={13} /> Stop
              </button>
            </div>
          )}
          {audioUrl && !recording && (
            <div className="space-y-3 animate-scale-in">
              <audio controls src={audioUrl} className="w-full" />
              <button
                type="button"
                onClick={() => { setAudioUrl(null); startRecording(); }}
                className="text-xs text-[#8a897f] underline underline-offset-2 hover:text-[#1b1a14] transition"
              >
                Re-record
              </button>
            </div>
          )}
          <p className="mt-3 text-[11px] text-[#a6a59c]">Up to 60 seconds</p>
        </div>

        {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
        <button className="btn-primary w-full !rounded-full" style={{ background: color }} disabled={busy || !audioUrl}>
          {busy ? "Sending…" : "Send voice message"}
        </button>
      </div>
    </form>
  );
}

function CallbackForm({ business, color, onBack, onDone }: { business: PublicBusiness; color: string; onBack: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ handle: business.handle, channel: "callback", visitorName: name, phone, preferredTime, text, clientMeta: collectClientMeta() }),
    });
    if (res.ok) onDone();
    else {
      setError((await res.json()).error ?? "Failed to send");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-fade-up">
      <BackBar title="Request a callback" onBack={onBack} />
      <div className="space-y-3">
        <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input" type="tel" placeholder="Your phone number" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input className="input" placeholder="Best time to call (e.g. weekdays after 4pm)" value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)} />
        <textarea className="input min-h-20" placeholder="What's it about? (optional)" value={text} onChange={(e) => setText(e.target.value)} />
        <p className="text-[11px] text-[#a6a59c]">
          Your number is only shared with {business.name} — never published anywhere.
        </p>
        {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
        <button className="btn-primary w-full !rounded-full" style={{ background: color }} disabled={busy}>
          {busy ? "Sending…" : "Request callback"}
        </button>
      </div>
    </form>
  );
}
