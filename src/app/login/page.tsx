"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ZapIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("demo@haylio.app");
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, intent: "login" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the code.");
      return;
    }
    setDevCode(data.devCode ?? null);
    setOtp("");
    setStep("code");
  }

  async function resendCode() {
    setError("");
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, intent: "login" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't resend the code.");
      return;
    }
    setDevCode(data.devCode ?? null);
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
    });
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError((await res.json()).error ?? "Login failed");
      setBusy(false);
    }
  }

  return (
    <main className="light min-h-screen bg-[#a9b0bb] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md p-9 animate-scale-in !rounded-[2rem]">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-[#e8552f] text-white flex items-center justify-center"><ZapIcon size={16} /></span>
          <span className="font-bold tracking-wide text-sm uppercase">Haylio</span>
        </Link>

        {step === "email" ? (
          <>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight">Welcome back</h1>
            <p className="text-sm text-[#8a897f] mt-2">Enter your email and we'll send you a 6-digit code.</p>
            <form onSubmit={sendCode} className="mt-7 space-y-4">
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
              <button className="btn-primary w-full !rounded-full" disabled={busy}>
                {busy ? "Sending code…" : "Send code"}
              </button>
            </form>
          </>
        ) : (
          <>
            <button
              onClick={() => { setStep("email"); setError(""); }}
              className="mt-6 text-sm text-[#8a897f] hover:text-[#1b1a14] transition"
            >
              ‹ Back
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Enter your code</h1>
            <p className="text-sm text-[#8a897f] mt-2">
              We sent a 6-digit code to <span className="font-semibold text-[#1b1a14]">{email}</span>.
            </p>

            {devCode && (
              <div className="mt-4 rounded-2xl border border-[#f3d9cf] bg-[#fdf0eb] p-3 text-[13px] text-[#9a4a2e]">
                Dev mode (no email provider configured): your code is{" "}
                <span className="font-mono font-bold tracking-widest">{devCode}</span>.
              </div>
            )}

            <form onSubmit={verify} className="mt-6 space-y-4">
              <div>
                <label className="label">Verification code</label>
                <input
                  className="input text-center !text-xl !tracking-[0.5em] font-mono"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoFocus
                  required
                />
              </div>
              {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
              <button className="btn-primary w-full !rounded-full" disabled={busy || otp.length < 6}>
                {busy ? "Verifying…" : "Log in"}
              </button>
            </form>

            <p className="mt-5 text-sm text-[#8a897f] text-center">
              Didn't get it?{" "}
              <button onClick={resendCode} className="text-[#1b1a14] font-semibold underline underline-offset-4">
                Resend code
              </button>
              {resent && <span className="ml-2 text-[#3e7d3a] font-semibold">Sent ✓</span>}
            </p>
          </>
        )}

        {step === "email" && (
          <p className="mt-5 text-sm text-[#8a897f] text-center">
            No account?{" "}
            <Link href="/register" className="text-[#1b1a14] font-semibold underline underline-offset-4">
              Create your link
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
