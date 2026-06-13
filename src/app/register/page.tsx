"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PlaceCandidate } from "@/lib/types";
import { BadgeCheckIcon, BuildingIcon, ChevronRightIcon, GlobeIcon, PhoneIcon, ZapIcon } from "@/components/icons";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

type Mode = "search" | "details" | "verify";

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("search");

  // Google search state
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [placesConfigured, setPlacesConfigured] = useState(true);
  const [results, setResults] = useState<PlaceCandidate[]>([]);
  const [place, setPlace] = useState<PlaceCandidate | null>(null); // picked listing (locks the name)

  // Details state
  const [name, setName] = useState(""); // manual mode only
  const [category, setCategory] = useState("");
  const [handle, setHandle] = useState("");
  const [handleTouched, setHandleTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Email OTP state
  const [otp, setOtp] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function search(e?: React.FormEvent) {
    e?.preventDefault();
    if (query.trim().length < 2 || searching) return;
    setSearching(true);
    setError("");
    try {
      const res = await fetch("/api/places/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Search failed — you can still add your business manually.");
      } else {
        setPlacesConfigured(data.configured !== false);
        setResults(data.results ?? []);
      }
      setSearched(true);
    } catch {
      setError("Network error — you can still add your business manually.");
    } finally {
      setSearching(false);
    }
  }

  function pickPlace(p: PlaceCandidate) {
    setPlace(p);
    setHandle(slugify(p.name));
    setHandleTouched(false);
    if (p.category) setCategory(p.category);
    setMode("details");
  }

  function manualEntry() {
    setPlace(null);
    setMode("details");
  }

  // Step 2 → 3: send the verification code to the email.
  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, intent: "register" }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the code.");
      return;
    }
    setDevCode(data.devCode ?? null);
    setOtp("");
    setMode("verify");
  }

  async function resendCode() {
    setError("");
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, intent: "register" }),
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

  // Step 3: verify the code, then create the account.
  async function verifyAndRegister(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: place ? undefined : name,
        email,
        otp,
        handle,
        category,
        place: place ?? undefined,
      }),
    });
    if (res.ok) {
      router.push("/dashboard/profile?welcome=1");
    } else {
      setError((await res.json()).error ?? "Registration failed");
      setBusy(false);
    }
  }

  return (
    <main className="light min-h-screen bg-[#a9b0bb] flex items-center justify-center px-4 py-8">
      <div className="card w-full max-w-lg p-9 animate-scale-in !rounded-[2rem]">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-[#e8552f] text-white flex items-center justify-center"><ZapIcon size={16} /></span>
            <span className="font-bold tracking-wide text-sm uppercase">Haylio</span>
          </Link>
          {/* Step indicator */}
          <div className="flex items-center gap-1.5 text-[10px] font-semibold">
            <span className="pill-dark !px-3 !py-1.5">1 · Find</span>
            <span className={mode === "details" || mode === "verify" ? "pill-dark !px-3 !py-1.5" : "pill-soft !px-3 !py-1.5"}>2 · Details</span>
            <span className={mode === "verify" ? "pill-dark !px-3 !py-1.5" : "pill-soft !px-3 !py-1.5"}>3 · Verify</span>
          </div>
        </div>

        {mode === "search" && (
          <>
            <h1 className="mt-7 text-3xl font-semibold tracking-tight">Find your business</h1>
            <p className="text-sm text-[#8a897f] mt-2">
              We verify against Google Business listings — the name on your listing becomes your Haylio name.
            </p>

            <form onSubmit={search} className="mt-6 flex items-center gap-2 bg-[#f4f4f1] border border-[#e8e8e4] rounded-full p-1.5 pl-5 focus-within:bg-white focus-within:border-[#232219] transition">
              <input
                className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder-[#a6a59c]"
                placeholder="Business name and city, e.g. Bluebird Café Sydney"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn-primary !rounded-full !py-2.5 !px-5 shrink-0" disabled={searching || query.trim().length < 2}>
                {searching ? "…" : "Search"}
              </button>
            </form>

            {error && <p className="mt-4 text-sm text-[#e8552f] animate-msg-in">{error}</p>}

            {searched && !placesConfigured && (
              <div className="mt-5 rounded-2xl border border-[#f3d9cf] bg-[#fdf0eb] p-4 text-sm text-[#9a4a2e] animate-msg-in">
                Google Business search isn't configured yet. You can add your business manually below.
              </div>
            )}

            {searched && placesConfigured && results.length === 0 && !error && (
              <p className="mt-5 text-sm text-[#8a897f] animate-msg-in">
                No listings found — try adding a city, or add your business manually below.
              </p>
            )}

            {results.length > 0 && (
              <div className="mt-5 space-y-2.5">
                {results.map((r, i) => (
                  <button
                    key={r.placeId}
                    onClick={() => pickPlace(r)}
                    className="w-full flex items-start gap-3.5 rounded-2xl border border-[#ebebe8] bg-white p-4 text-left transition-all duration-300 hover:border-[#21201a] hover:-translate-y-0.5 hover:shadow-lg group animate-fade-up"
                    style={{ animationDelay: `${i * 70}ms` }}
                  >
                    <span className="w-10 h-10 rounded-xl bg-[#f1f1ee] flex items-center justify-center shrink-0 text-[#4b4a42]"><BuildingIcon size={17} /></span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-sm truncate">{r.name}</span>
                      <span className="block text-xs text-[#8a897f] truncate mt-0.5">{r.address}</span>
                      {r.category && <span className="pill-soft mt-1.5">{r.category}</span>}
                    </span>
                    <span className="ml-auto self-center icon-btn !w-8 !h-8 group-hover:translate-x-0.5 transition"><ChevronRightIcon size={14} /></span>
                  </button>
                ))}
              </div>
            )}

            <button onClick={manualEntry} className="btn-secondary w-full mt-6 !rounded-full">
              My business isn't on Google →
            </button>

            <p className="mt-5 text-sm text-[#8a897f] text-center">
              Already registered?{" "}
              <Link href="/login" className="text-[#1b1a14] font-semibold underline underline-offset-4">Log in</Link>
            </p>
          </>
        )}

        {mode === "details" && (
          <>
            <button
              onClick={() => { setMode("search"); setError(""); }}
              className="mt-6 text-sm text-[#8a897f] hover:text-[#1b1a14] transition"
            >
              ‹ Back to search
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              {place ? "Confirm your business" : "Add your business"}
            </h1>

            {place ? (
              <div className="mt-5 rounded-2xl border border-[#dbe5d4] bg-[#f3f8ef] p-5 animate-scale-in">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold">{place.name}</span>
                  <span className="pill-dark !bg-[#3e7d3a]"><BadgeCheckIcon size={11} /> GOOGLE VERIFIED</span>
                </div>
                <p className="text-xs text-[#6b6a60] mt-2">{place.address}</p>
                {place.website && <p className="text-xs text-[#6b6a60] mt-1 flex items-center gap-1.5"><GlobeIcon size={12} /> {place.website}</p>}
                {place.phone && <p className="text-xs text-[#6b6a60] mt-1 flex items-center gap-1.5"><PhoneIcon size={12} /> {place.phone}</p>}
                <p className="text-[11px] text-[#8a897f] mt-3 border-t border-[#e4ecdf] pt-3">
                  The name is locked to your Google listing. Website, address, hours and phone are imported automatically — edit them later in your dashboard.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#8a897f] mt-2">Not on Google yet — no problem. Enter your details manually.</p>
            )}

            <form onSubmit={sendCode} className="mt-6 space-y-4">
              {!place && (
                <>
                  <div>
                    <label className="label">Business name</label>
                    <input
                      className="input"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (!handleTouched) setHandle(slugify(e.target.value));
                      }}
                      placeholder="Bluebird Café"
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Category <span className="text-[#a6a59c] font-normal">(optional)</span></label>
                    <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Café & Bakery" />
                  </div>
                </>
              )}
              <div>
                <label className="label">Your link</label>
                <div className="flex items-center">
                  <span className="text-sm text-[#a6a59c] bg-[#f1f1ee] border border-r-0 border-[#e8e8e4] rounded-l-2xl px-3.5 py-3 font-mono">/b/</span>
                  <input
                    className="input !rounded-l-none"
                    value={handle}
                    onChange={(e) => {
                      setHandleTouched(true);
                      setHandle(slugify(e.target.value));
                    }}
                    placeholder="bluebird-cafe"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <p className="mt-1.5 text-[11px] text-[#a6a59c]">We'll email you a 6-digit code to verify it's you.</p>
              </div>
              {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
              <button className="btn-primary w-full !rounded-full" disabled={busy}>
                {busy ? "Sending code…" : "Send verification code"}
              </button>
            </form>
          </>
        )}

        {mode === "verify" && (
          <>
            <button
              onClick={() => { setMode("details"); setError(""); }}
              className="mt-6 text-sm text-[#8a897f] hover:text-[#1b1a14] transition"
            >
              ‹ Back
            </button>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Verify your email</h1>
            <p className="text-sm text-[#8a897f] mt-2">
              Enter the 6-digit code we sent to <span className="font-semibold text-[#1b1a14]">{email}</span>.
            </p>

            {devCode && (
              <div className="mt-4 rounded-2xl border border-[#f3d9cf] bg-[#fdf0eb] p-3 text-[13px] text-[#9a4a2e]">
                Dev mode (no email provider configured): your code is{" "}
                <span className="font-mono font-bold tracking-widest">{devCode}</span>.
              </div>
            )}

            <form onSubmit={verifyAndRegister} className="mt-6 space-y-4">
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
                {busy ? "Verifying…" : place ? "Verify & create my verified link" : "Verify & create my link"}
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
      </div>
    </main>
  );
}
