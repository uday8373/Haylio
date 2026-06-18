"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { SmsVerificationStatus, VirtualNumber } from "@/lib/types";
import { CheckIcon, PhoneIcon, SearchIcon, SendIcon, SparklesIcon } from "@/components/icons";
import SmsStatusBadges from "@/components/dashboard/SmsStatusBadges";
import { SUPPORT_TEMPLATES, renderSupport } from "@/lib/supportTemplates";
import { IVR_VOICES, IVR_SCRIPTS, DEFAULT_VOICE, DEFAULT_IVR_SCRIPT_ID, getIvrScript, CALL_MODES, DEFAULT_CALL_MODE, getCallMode, type CallHandlingModeId } from "@/lib/ivr";

interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  region?: string;
}

// Name hints to approximate gender when matching the browser's TTS voices to a
// chosen Polly voice (browser voices don't expose a gender field).
const FEMALE_HINTS = ["female", "samantha", "victoria", "karen", "moira", "tessa", "fiona", "zira", "susan", "linda", "heera", "veena", "kajal", "joanna", "amy", "danielle", "aria", "sonia"];
const MALE_HINTS = ["male", "daniel", "alex", "fred", "rishi", "matthew", "brian", "george", "guy", "oliver", "ravi"];

/**
 * Browser-side approximate preview of the chosen IVR voice. The real call uses
 * Amazon Polly via Twilio; this just reads the sample with the closest local
 * voice (matched by accent/locale, then a gender hint) so the user can compare.
 */
function speakSample(text: string, lang: string, gender: "male" | "female", onEnd: () => void) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  if (!synth) { onEnd(); return; }
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.97;
  const voices = synth.getVoices();
  const localeMatches = voices.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(lang.toLowerCase()));
  const pool = localeMatches.length ? localeMatches : voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const hints = gender === "female" ? FEMALE_HINTS : MALE_HINTS;
  const match = pool.find((v) => hints.some((h) => v.name.toLowerCase().includes(h))) ?? pool[0];
  if (match) u.voice = match;
  u.onend = onEnd;
  u.onerror = onEnd;
  synth.speak(u);
}

export function NumberCard({
  vn,
  live,
  minutesUsed = 0,
  minutesLimit = 30,
  verificationStatus = "not_submitted",
  paywall = false,
}: {
  vn: VirtualNumber | null;
  live: boolean;
  minutesUsed?: number;
  minutesLimit?: number;
  verificationStatus?: SmsVerificationStatus;
  paywall?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [greeting, setGreeting] = useState(vn?.greeting ?? "");
  const [smsTemplate, setSmsTemplate] = useState(vn?.smsTemplate ?? "");
  const [voice, setVoice] = useState(vn?.voice ?? DEFAULT_VOICE);
  const [ivrScriptId, setIvrScriptId] = useState(vn?.ivrScriptId ?? DEFAULT_IVR_SCRIPT_ID);
  const [previewing, setPreviewing] = useState(false);
  const [callMode, setCallMode] = useState<CallHandlingModeId>(vn?.callMode ?? DEFAULT_CALL_MODE);
  const [forwardToNumber, setForwardToNumber] = useState(vn?.forwardToNumber ?? "");
  const [forwardStart, setForwardStart] = useState(vn?.forwardStart ?? "09:00");
  const [forwardEnd, setForwardEnd] = useState(vn?.forwardEnd ?? "18:00");
  const [dndEnabled, setDndEnabled] = useState(vn?.dndEnabled ?? false);
  const [dndStart, setDndStart] = useState(vn?.dndStart ?? "21:00");
  const [dndEnd, setDndEnd] = useState(vn?.dndEnd ?? "08:00");

  // Number picker (shown when the business has no number yet)
  const [available, setAvailable] = useState<AvailableNumber[]>([]);
  const [areaCode, setAreaCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState("");

  async function searchNumbers(e?: React.FormEvent) {
    e?.preventDefault();
    setSearching(true);
    setError("");
    const qs = areaCode ? `?areaCode=${encodeURIComponent(areaCode)}` : "";
    const res = await fetch(`/api/numbers/available${qs}`);
    const data = await res.json().catch(() => ({}));
    setSearching(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't load numbers.");
      return;
    }
    setAvailable(data.numbers ?? []);
    setSelected(data.numbers?.[0]?.phoneNumber ?? "");
  }

  // Auto-load options when the picker first appears (skip behind the paywall).
  useEffect(() => {
    if (!vn && !paywall) searchNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buyNumber() {
    if (!selected) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/numbers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phoneNumber: selected }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (res.status === 402 || data.paywall) {
      router.push("/dashboard/billing");
      return;
    }
    setError(data.error ?? "Failed — try again.");
  }

  async function save() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/numbers", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        greeting,
        smsTemplate,
        voice,
        ivrScriptId,
        callMode,
        forwardToNumber,
        forwardStart,
        forwardEnd,
        dndEnabled,
        dndStart,
        dndEnd,
        tzOffsetMinutes: new Date().getTimezoneOffset(),
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError((await res.json()).error ?? "Save failed");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    router.refresh();
  }

  if (!vn && paywall) {
    return (
      <div className="card p-5 md:p-7 text-center">
        <span className="mx-auto w-14 h-14 rounded-2xl bg-[#fdf0eb] border border-[#f3d9cf] flex items-center justify-center text-[#e8552f]">
          <PhoneIcon size={22} />
        </span>
        <h2 className="mt-4 text-lg font-semibold">Activate your account to get a number</h2>
        <p className="mt-2 text-xs text-[#8a897f] max-w-xs mx-auto leading-relaxed">
          Your toll-free number, call intercept, AI receptionist and inbox unlock with a
          subscription. Set up billing to choose and provision your number.
        </p>
        <a href="/dashboard/billing" className="btn-primary mt-5 inline-flex">Set up billing →</a>
      </div>
    );
  }

  if (!vn) {
    return (
      <div className="card p-5 md:p-7">
        <div className="text-center">
          <span className="mx-auto w-14 h-14 rounded-2xl bg-[#fdf0eb] border border-[#f3d9cf] flex items-center justify-center text-[#e8552f]">
            <PhoneIcon size={22} />
          </span>
          <h2 className="mt-4 text-lg font-semibold">Choose your toll-free number</h2>
          <p className="mt-2 text-xs text-[#8a897f] max-w-xs mx-auto leading-relaxed">
            Pick a number to put on Google instead of your mobile. It gets its own Twilio
            subaccount — callers hear your greeting and get a tracked link; your real number stays private.
          </p>
        </div>

        {/* Search by area code */}
        <form onSubmit={searchNumbers} className="mt-5 flex items-center gap-2">
          <input
            className="input"
            inputMode="numeric"
            maxLength={3}
            placeholder="Prefix / area code (e.g. 833) — optional"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
          />
          <button type="submit" className="btn-secondary shrink-0 !px-4" disabled={searching}>
            <SearchIcon size={15} /> {searching ? "…" : "Search"}
          </button>
        </form>

        {/* Options */}
        <div className="mt-4 space-y-2 max-h-72 overflow-y-auto">
          {searching && available.length === 0 && (
            <p className="text-sm text-[#8a897f] py-4 text-center">Finding available numbers…</p>
          )}
          {!searching && available.length === 0 && (
            <p className="text-sm text-[#8a897f] py-4 text-center">No numbers found — try a different area code.</p>
          )}
          {available.map((n) => {
            const active = selected === n.phoneNumber;
            return (
              <button
                key={n.phoneNumber}
                onClick={() => setSelected(n.phoneNumber)}
                className={`w-full flex items-center gap-3 rounded-2xl border p-3.5 text-left transition ${
                  active ? "border-[#21201a] bg-[#f6f6f3]" : "border-[#ebebe8] bg-[#fafaf8] hover:border-[#cfcfca]"
                }`}
              >
                <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${active ? "border-[#e8552f] bg-[#e8552f] text-white" : "border-[#cfcfca]"}`}>
                  {active && <CheckIcon size={12} />}
                </span>
                <span className="min-w-0">
                  <span className="block font-mono font-semibold text-sm text-[#232219]">{n.friendlyName}</span>
                  {n.region && <span className="block text-[11px] text-[#a6a59c] mt-0.5">{n.region}</span>}
                </span>
                <span className="ml-auto pill-soft shrink-0">Toll-free</span>
              </button>
            );
          })}
        </div>

        <button onClick={buyNumber} className="btn-primary w-full mt-5" disabled={busy || !selected}>
          {busy ? "Setting up your number…" : "Get this number"}
        </button>
        <p className="mt-3 text-[11px] text-[#a6a59c] text-center">
          ~$2.15/mo · billed to the connected Twilio account · its own subaccount · ready in seconds
        </p>
        {error && <p className="mt-3 text-sm text-[#e8552f] text-center">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card p-5 md:p-7">
      <div>
        <p className="text-xs text-[#8a897f]">Your public number</p>
        <p className="text-2xl font-bold font-mono tracking-tight mt-1">{vn.phoneNumber}</p>
        <SmsStatusBadges status={verificationStatus} className="mt-3" />
      </div>


      <div className="mt-6 space-y-5">
        {/* Call-handling mode selector */}
        <div>
          <label className="label">How calls are handled</label>
          <div className="grid gap-2">
            {CALL_MODES.map((m) => {
              const active = m.id === callMode;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCallMode(m.id)}
                  className={`text-left rounded-2xl border p-3.5 transition ${
                    active ? "border-[#21201a] bg-[#f6f6f3]" : "border-[#e8e8e4] bg-[#fafaf8] hover:border-[#c9c9c3]"
                  }`}
                >
                  <span className="flex items-start gap-2.5">
                    <span className={`w-4 h-4 rounded-full border-[3px] shrink-0 mt-0.5 ${active ? "border-[#e8552f] bg-white" : "border-[#d8d8d3] bg-white"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#232219]">{m.label}</span>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${m.chargeable ? "bg-[#fdf0eb] text-[#9a4a2e] border-[#f3d9cf]" : "bg-[#eef6ea] text-[#3e7d3a] border-[#cfe3c6]"}`}>
                          {m.chargeable ? "Chargeable" : "Non-chargeable"}
                        </span>
                      </span>
                      <span className="block text-xs text-[#8a897f] mt-1">{m.description}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 rounded-xl bg-[#faf9f6] border border-[#ececea] px-3 py-2.5">
            <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">WHAT THE CALLER EXPERIENCES</p>
            <p className="mt-1 text-sm text-[#4b4a42]">{getCallMode(callMode).callerExperience}</p>
          </div>
        </div>

        {/* Forward settings — only in Forward mode */}
        {callMode === "forward" && (
          <div className="rounded-2xl border border-[#21201a] bg-[#f6f6f3] p-4 space-y-3 animate-scale-in">
            <p className="text-sm font-semibold text-[#232219]">Forwarding details</p>
            <input
              className="input"
              type="tel"
              placeholder="Your phone, e.g. +1 415 555 0134"
              value={forwardToNumber}
              onChange={(e) => setForwardToNumber(e.target.value)}
            />
            <div className="flex items-center gap-2 flex-wrap text-sm text-[#55544c]">
              Ring my phone from
              <input type="time" className="input !w-auto !py-2" value={forwardStart} onChange={(e) => setForwardStart(e.target.value)} />
              to
              <input type="time" className="input !w-auto !py-2" value={forwardEnd} onChange={(e) => setForwardEnd(e.target.value)} />
            </div>
            <p className="text-[11px] text-[#a6a59c]">
              Outside these hours callers get your support link by text instead. Your number is never shown to callers.
            </p>

            {/* DND */}
            <div className="rounded-xl border border-[#ebebe8] bg-white p-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="peer sr-only" checked={dndEnabled} onChange={(e) => setDndEnabled(e.target.checked)} />
                <span className={`relative w-9 h-5 rounded-full transition-colors duration-300 shrink-0 ${dndEnabled ? "bg-[#21201a]" : "bg-[#ececea]"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${dndEnabled ? "left-[18px]" : "left-0.5"}`} />
                </span>
                <span className="text-sm font-semibold text-[#232219]">Do not disturb hours</span>
              </label>
              {dndEnabled && (
                <div className="mt-2.5 flex items-center gap-2 flex-wrap text-sm text-[#55544c] animate-scale-in">
                  Never ring me between
                  <input type="time" className="input !w-auto !py-2" value={dndStart} onChange={(e) => setDndStart(e.target.value)} />
                  and
                  <input type="time" className="input !w-auto !py-2" value={dndEnd} onChange={(e) => setDndEnd(e.target.value)} />
                </div>
              )}
            </div>

            {/* Minutes meter */}
            <div className="rounded-xl border border-[#ebebe8] bg-white p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[#232219]">Forwarding minutes this month</span>
                <span className={`font-mono ${minutesUsed >= minutesLimit ? "text-[#e8552f] font-bold" : "text-[#6b6a60]"}`}>
                  {minutesUsed} / {minutesLimit} min
                </span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-[#f1f1ee] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (minutesUsed / minutesLimit) * 100)}%`,
                    background: minutesUsed >= minutesLimit ? "#e8552f" : minutesUsed / minutesLimit > 0.8 ? "#d97706" : "#3e7d3a",
                  }}
                />
              </div>
              {minutesUsed >= minutesLimit ? (
                <p className="mt-2 text-[11px] font-semibold text-[#e8552f]">
                  Limit reached — callers get the support link by text until next month.
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#a6a59c]">
                  Forwarded calls use talk-time. Beyond this monthly cap, callers automatically get the support link by text instead.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Missed-call explainer — only in Missed-call mode */}
        {callMode === "missed_call" && (
          <div className="rounded-2xl border border-[#cfe3c6] bg-[#f1f7ee] p-4 animate-scale-in">
            <p className="text-sm font-semibold text-[#2c5e29]">No talk-time, ever</p>
            <p className="mt-1 text-xs text-[#4f6b4a] leading-relaxed">
              Calls are disconnected the instant they come in — no greeting, no ringing your phone, so you're never
              billed for a forwarded minute. Every caller is automatically texted the support link below, where they
              can chat, leave a voice note, or request a callback.
            </p>
          </div>
        )}

        {/* Voice greeting — spoken in IVR mode (and as the forward-missed voicemail) */}
        {(callMode === "ivr" || callMode === "forward") && (
          <>
            <div>
              <label className="label">Voice greeting <span className="text-[#a6a59c] font-normal">{callMode === "forward" ? "(played when you miss a forwarded call)" : "(played to every caller, then we ask them to press 1)"}</span></label>
              <textarea className="input min-h-20" value={greeting} onChange={(e) => setGreeting(e.target.value)} maxLength={500} />
            </div>

            {/* IVR voice (tone / accent) */}
            <div>
              <label className="label">Voice & tone <span className="text-[#a6a59c] font-normal">— how the greeting is spoken</span></label>
              <div className="flex items-center gap-2">
                <select className="input" value={voice} onChange={(e) => setVoice(e.target.value)}>
                  {IVR_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>{v.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-secondary shrink-0 !px-4"
                  onClick={() => {
                    if (previewing) { window.speechSynthesis?.cancel(); setPreviewing(false); return; }
                    const v = IVR_VOICES.find((x) => x.id === voice) ?? IVR_VOICES[0];
                    const sample = callMode === "ivr"
                      ? `${greeting || "Thanks for calling!"} ${getIvrScript(ivrScriptId).prompt}`
                      : (greeting || "Thanks for calling! We've just texted you a link to reach us.");
                    setPreviewing(true);
                    speakSample(sample, v.lang, v.gender, () => setPreviewing(false));
                  }}
                >
                  {previewing ? "■ Stop" : "▶ Preview"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-[#a6a59c]">
                Preview uses your browser's voices as an approximation. On a real call, Twilio speaks
                with Amazon Polly's more natural "{(IVR_VOICES.find((x) => x.id === voice) ?? IVR_VOICES[0]).label.split(" · ")[1]}" voice.
              </p>
            </div>
          </>
        )}

        {/* IVR script (press-1 wording) — only in IVR mode */}
        {callMode === "ivr" && (
          <div>
            <label className="label">Press-1 prompt wording</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {IVR_SCRIPTS.map((s) => {
                const active = s.id === ivrScriptId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setIvrScriptId(s.id)}
                    className={`text-left rounded-2xl border p-3 transition ${
                      active ? "border-[#21201a] bg-[#faf9f6]" : "border-[#e8e8e4] hover:border-[#c9c9c3]"
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-[#232219]">
                      <span className={`w-3.5 h-3.5 rounded-full border-[3px] shrink-0 ${active ? "border-[#e8552f] bg-white" : "border-[#d8d8d3] bg-white"}`} />
                      {s.label}
                    </span>
                    <span className="block text-[11px] text-[#8a897f] mt-1 ml-[22px]">{s.description}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2.5">
              <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">CALLER HEARS (AFTER GREETING)</p>
              <p className="mt-1 text-sm text-[#4b4a42] italic">"{getIvrScript(ivrScriptId).prompt}"</p>
            </div>
          </div>
        )}
        <div>
          <label className="label">
            SMS template <span className="text-[#a6a59c] font-normal">— use {"{business}"} and {"{link}"}</span>
          </label>
          <textarea className="input min-h-24" value={smsTemplate} onChange={(e) => setSmsTemplate(e.target.value)} maxLength={320} />
          <p className="mt-1.5 text-[11px] text-[#a6a59c]">
            Keep "Reply STOP to opt out" in the message — it's required for toll-free compliance.
          </p>
        </div>
        <div className="flex items-center gap-3 justify-end flex-wrap">
          {error && <span className="text-sm text-[#e8552f] animate-msg-in mr-auto">{error}</span>}
          {saved && <span className="text-sm text-[#3e7d3a] font-semibold animate-msg-in">Saved ✓</span>}
          <button onClick={save} className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SimulateCall({ hasNumber }: { hasNumber: boolean }) {
  const router = useRouter();
  const [caller, setCaller] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ callMode?: CallHandlingModeId; greeting: string; smsBody: string; link: string; smsStatus?: string; smsError?: string; forwardingNote?: string } | null>(null);
  const [error, setError] = useState("");

  async function simulate() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/simulate/call", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ callerNumber: caller }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) {
      setResult(data);
      router.refresh();
    } else {
      setError(data.error ?? "Simulation failed");
    }
  }

  return (
    <div className="card p-5 md:p-7">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <SparklesIcon size={17} className="text-[#e8552f]" /> Test your number
      </h2>
      <p className="mt-1.5 text-xs text-[#8a897f]">
        Runs the production flow end-to-end: logs the call, then texts the tracked link to the number you enter.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <input
          className="input"
          placeholder="Your mobile with country code, e.g. +91 98765 43210"
          value={caller}
          onChange={(e) => setCaller(e.target.value)}
        />
        <button onClick={simulate} className="btn-primary shrink-0" disabled={busy || !hasNumber}>
          {busy ? "Sending…" : "Send test call"}
        </button>
      </div>
      {!hasNumber && <p className="mt-2 text-[11px] text-[#a6a59c]">Purchase your number first.</p>}
      {error && <p className="mt-3 text-sm text-[#e8552f]">{error}</p>}

      {result && (
        <div className="mt-5 rounded-2xl border border-[#ebebe8] bg-[#fafaf8] p-5 space-y-4 animate-scale-in">
          {result.forwardingNote && (
            <p className="text-[11px] text-[#9a4a2e] bg-[#fdf0eb] border border-[#f3d9cf] rounded-xl px-3 py-2">{result.forwardingNote}</p>
          )}
          {result.callMode === "missed_call" ? (
            <div>
              <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">CALLER HEARS</p>
              <p className="mt-1 text-sm text-[#4b4a42] italic">Nothing — the call is disconnected instantly (no audio).</p>
            </div>
          ) : (
            <div>
              <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">CALLER HEARS</p>
              <p className="mt-1 text-sm text-[#4b4a42] italic">"{result.greeting}"</p>
            </div>
          )}
          <div>
            <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">CALLER RECEIVES (SMS)</p>
            <div className="mt-2 max-w-sm rounded-2xl rounded-bl-md bg-[#e9e9eb] px-4 py-3 text-sm text-[#1b1a14]">
              {result.smsBody}
            </div>
            {result.smsError ? (
              <p className="mt-2 text-xs font-semibold text-[#e8552f]">SMS failed: {result.smsError}</p>
            ) : (
              <p className="mt-2 text-xs font-semibold text-[#3e7d3a]">
                SMS {result.smsStatus === "delivered" ? "delivered" : "accepted by Twilio"} — check the phone.
              </p>
            )}
          </div>
          <a href={result.link} target="_blank" rel="noreferrer" className="btn-secondary !py-2.5 !text-xs">
            Open the tracked link (registers the click) ↗
          </a>
          <p className="text-[11px] text-[#a6a59c]">
            On a trial Twilio account, SMS only delivers to verified numbers — and toll-free SMS requires the number's
            verification to be approved.
          </p>
        </div>
      )}
    </div>
  );
}

export function SendSupportLink({
  hasNumber,
  businessName,
  supportLink,
}: {
  hasNumber: boolean;
  businessName: string;
  supportLink: string;
}) {
  const [to, setTo] = useState("");
  const [templateId, setTemplateId] = useState(SUPPORT_TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<{ to: string; message: string; status?: string } | null>(null);

  const template = SUPPORT_TEMPLATES.find((t) => t.id === templateId) ?? SUPPORT_TEMPLATES[0];
  const preview = renderSupport(template.body, businessName, supportLink);

  async function send() {
    setBusy(true);
    setError("");
    setSent(null);
    const res = await fetch("/api/support-sms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ to, templateId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the message.");
      return;
    }
    setSent({ to: data.to, message: data.message, status: data.status });
    setTo("");
  }

  return (
    <div className="card p-5 md:p-7">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <SendIcon size={17} className="text-[#e8552f]" /> Send a support link
      </h2>
      <p className="mt-1.5 text-xs text-[#8a897f]">
        Text your contact link to any mobile. Pick a ready-made message — the link is added automatically.
      </p>

      <div className="mt-4">
        <label className="label">Send to (mobile, with country code)</label>
        <input
          className="input"
          placeholder="+1 415 555 0134"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <label className="label">Message template</label>
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
                  <span
                    className={`w-3.5 h-3.5 rounded-full border-[3px] shrink-0 ${
                      active ? "border-[#e8552f] bg-white" : "border-[#d8d8d3] bg-white"
                    }`}
                  />
                  {t.label}
                </span>
                <span className="block text-[11px] text-[#8a897f] mt-1 ml-[22px]">{t.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-bold text-[#a6a59c] tracking-wide">PREVIEW</p>
        <div className="mt-2 max-w-sm rounded-2xl rounded-bl-md bg-[#e9e9eb] px-4 py-3 text-sm text-[#1b1a14]">
          {preview}
        </div>
      </div>

      <button onClick={send} className="btn-primary mt-4 w-full justify-center" disabled={busy || !hasNumber || !to.trim()}>
        {busy ? "Sending…" : "Send support link"}
      </button>
      {!hasNumber && <p className="mt-2 text-[11px] text-[#a6a59c]">Purchase your number first.</p>}
      {error && <p className="mt-3 text-sm text-[#e8552f]">{error}</p>}

      {sent && (
        <div className="mt-4 rounded-2xl border border-[#cfe3c6] bg-[#f1f7ee] p-4 animate-scale-in">
          <p className="text-xs font-semibold text-[#3e7d3a] flex items-center gap-1.5">
            <CheckIcon size={13} /> Sent to {sent.to}
            {sent.status ? ` — ${sent.status === "delivered" ? "delivered" : "accepted by Twilio"}` : ""}.
          </p>
          <div className="mt-2 max-w-sm rounded-2xl rounded-bl-md bg-[#e9e9eb] px-4 py-3 text-sm text-[#1b1a14]">
            {sent.message}
          </div>
        </div>
      )}
    </div>
  );
}
