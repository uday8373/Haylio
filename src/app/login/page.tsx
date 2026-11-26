"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BotIcon, MicIcon, PhoneIcon, ZapIcon } from "@/components/icons";

const DEMO_EMAIL = "demo@haylio.app";
const RESEND_SECONDS = 30;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [resent, setResent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [invited, setInvited] = useState(false);

  // Prefill from the invite-accept redirect (?email=…&invited=1).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const e = params.get("email");
    if (e) setEmail(e);
    if (params.get("invited") === "1") setInvited(true);
  }, []);

  // Count down before "Resend code" is available again.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(address: string = email) {
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: address, intent: "login" }),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function startLogin(address: string) {
    setBusy(true);
    setError("");
    const { ok, data } = await requestCode(address).catch(() => ({ ok: false, data: {} as Record<string, string> }));
    setBusy(false);
    if (!ok) {
      setError(data.error ?? "Couldn't send the code. Try again in a moment.");
      return;
    }
    const demo = Boolean(data.demo);
    setIsDemo(demo);
    setDevCode(data.devCode ?? null);
    // The demo code is shown on the page, so fill it in too.
    setOtp(demo && data.devCode ? String(data.devCode) : "");
    setCooldown(RESEND_SECONDS);
    setStep("code");
  }

  function sendCode(e: React.FormEvent) {
    e.preventDefault();
    startLogin(email);
  }

  function startDemo() {
    setEmail(DEMO_EMAIL);
    startLogin(DEMO_EMAIL);
  }

  async function resendCode() {
    if (cooldown > 0) return;
    setError("");
    const { ok, data } = await requestCode().catch(() => ({ ok: false, data: {} as Record<string, string> }));
    if (!ok) {
      setError(data.error ?? "Couldn't resend the code. Try again in a moment.");
      return;
    }
    setDevCode(data.devCode ?? null);
    if (data.demo && data.devCode) setOtp(String(data.devCode));
    setCooldown(RESEND_SECONDS);
    setResent(true);
    setTimeout(() => setResent(false), 2500);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, otp }),
    }).catch(() => null);
    if (res?.ok) {
      router.push("/dashboard");
      return;
    }
    const data = res ? await res.json().catch(() => ({})) : {};
    setError(data.error ?? "Couldn't log you in. Try again in a moment.");
    setBusy(false);
  }

  return (
    <main className="lp min-h-screen grid lg:grid-cols-[1fr_minmax(420px,0.9fr)]">
      {/* ===================== FORM ===================== */}
      <section className="flex flex-col px-6 sm:px-10 py-8">
        <Link href="/" className="flex items-center gap-2 w-fit" aria-label="Haylio home">
          <span className="w-8 h-8 rounded-full bg-[var(--signal)] text-white flex items-center justify-center">
            <ZapIcon size={15} />
          </span>
          <span className="lp-display text-[1.35rem] font-bold">haylio</span>
        </Link>

        <div className="flex-1 flex items-center py-12">
          <div className="w-full max-w-[400px] mx-auto">
            {step === "email" ? (
              <>
                <h1 className="lp-display text-[2.25rem] leading-[1.1] font-semibold">
                  {invited ? "Invitation accepted" : "Log in to Haylio"}
                </h1>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[var(--muted)]">
                  {invited
                    ? "You're on the team. Enter your email and we'll send you a 6-digit code to log in."
                    : "Enter the email you signed up with and we'll send you a 6-digit code. No password needed."}
                </p>

                <form onSubmit={sendCode} className="mt-8 space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-[14px] font-medium mb-2">
                      Work email
                    </label>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourbusiness.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="lp-field"
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>
                  {error && (
                    <p id="login-error" role="alert" className="lp-error">
                      {error}
                    </p>
                  )}
                  <button className="lp-btn lp-btn-primary w-full !py-3.5" disabled={busy || !email}>
                    {busy ? "Sending code…" : "Send code"}
                  </button>
                </form>

                <div className="mt-6 flex items-center gap-3 text-[13px] text-[var(--muted)]">
                  <span className="h-px flex-1 bg-[var(--line)]" />
                  or
                  <span className="h-px flex-1 bg-[var(--line)]" />
                </div>
                <button type="button" onClick={startDemo} disabled={busy} className="lp-btn lp-btn-ghost w-full mt-6 !py-3.5">
                  Use the demo account
                </button>
                <p className="mt-2 text-[13px] text-[var(--muted)] text-center">
                  Explore a sample café&apos;s dashboard. No email needed.
                </p>

                <p className="mt-8 text-[14.5px] text-[var(--muted)]">
                  New to Haylio?{" "}
                  <Link href="/register" className="font-semibold text-[var(--ink)] underline underline-offset-4 decoration-[var(--signal)] decoration-2">
                    Create your free link
                  </Link>
                </p>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setError("");
                  }}
                  className="text-[14px] font-medium text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
                >
                  Use a different email
                </button>
                <h1 className="mt-4 lp-display text-[2.25rem] leading-[1.1] font-semibold">
                  {isDemo ? "Your demo code is ready" : "Check your email"}
                </h1>
                <p className="mt-3 text-[15.5px] leading-[1.6] text-[var(--muted)]">
                  {isDemo ? (
                    <>The demo account doesn&apos;t receive email, so here&apos;s its code. It expires in 10 minutes.</>
                  ) : (
                    <>
                      We sent a 6-digit code to <span className="font-semibold text-[var(--ink)] break-all">{email}</span>. It
                      expires in 10 minutes.
                    </>
                  )}
                </p>

                {devCode && (
                  <div className="mt-6 rounded-2xl border border-[#f6d3c6] bg-[#fdf1ec] px-4 py-3.5 text-[14px] text-[var(--signal-ink)]">
                    {isDemo ? "Demo code, already filled in below:" : "Test mode, no email provider is set up. Your code is:"}
                    <span className="block mt-1 text-[1.5rem] font-semibold tracking-[0.3em] tabular-nums text-[var(--ink)]">{devCode}</span>
                  </div>
                )}

                <form onSubmit={verify} className="mt-8 space-y-4">
                  <div>
                    <label htmlFor="otp" className="block text-[14px] font-medium mb-2">
                      Verification code
                    </label>
                    <input
                      id="otp"
                      className="lp-field lp-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      required
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>
                  {error && (
                    <p id="login-error" role="alert" className="lp-error">
                      {error}
                    </p>
                  )}
                  <button className="lp-btn lp-btn-primary w-full !py-3.5" disabled={busy || otp.length < 6}>
                    {busy ? "Logging in…" : "Log in"}
                  </button>
                </form>

                <p className="mt-6 text-[14.5px] text-[var(--muted)]" aria-live="polite">
                  {isDemo ? "Code expired? " : "Didn't get it? Check your spam folder, or "}
                  {cooldown > 0 ? (
                    <span>{isDemo ? "New code" : "resend"} in {cooldown}s</span>
                  ) : (
                    <button type="button" onClick={resendCode} className="font-semibold text-[var(--ink)] underline underline-offset-4">
                      {isDemo ? "Get a new code" : "resend the code"}
                    </button>
                  )}
                  {resent && <span className="ml-2 font-semibold text-[var(--safe)]">Sent</span>}
                </p>
              </>
            )}
          </div>
        </div>

        <Link href="/" className="text-[13px] text-[var(--muted)] hover:text-[var(--ink)] transition-colors w-fit">
          Back to the Haylio home page
        </Link>
      </section>

      {/* ===================== CONTEXT PANEL ===================== */}
      <aside className="hidden lg:flex flex-col justify-between bg-[var(--ink)] text-white px-12 xl:px-16 py-12">
        <p className="text-[14px] text-white/60">Your business inbox</p>

        <div>
          <h2 className="lp-display text-[2.4rem] leading-[1.1] font-semibold max-w-[16ch]">
            Pick up where your customers left off.
          </h2>
          <p className="mt-4 text-[16px] leading-[1.6] text-white/65 max-w-[40ch]">
            Chats your assistant answered, voice notes and callback requests are waiting in one place.
          </p>

          <ul className="mt-10 space-y-3 max-w-[420px]" aria-label="Example inbox">
            {[
              { icon: PhoneIcon, who: "Marco", what: "Callback request", detail: "Catering quote, today after 4 pm" },
              { icon: MicIcon, who: "Sam", what: "Voice note", detail: "0:42 about a leaking water heater" },
              { icon: BotIcon, who: "Priya", what: "Answered by your assistant", detail: "Open on public holidays, 8 am to 3 pm" },
            ].map((r) => (
              <li key={r.who} className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3.5">
                <span className="w-9 h-9 shrink-0 rounded-full bg-white/10 text-[#ffb59e] flex items-center justify-center">
                  <r.icon size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">
                    {r.who} <span className="font-normal text-white/55">{r.what}</span>
                  </p>
                  <p className="text-[13px] text-white/65 truncate">{r.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-[13px] text-white/45">Your personal number stays private, always.</p>
      </aside>
    </main>
  );
}
