"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ZapIcon } from "@/components/icons";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@haylio.app");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
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
        <h1 className="mt-7 text-3xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-[#8a897f] mt-2">Demo account is pre-filled — just hit Log in.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-sm text-[#e8552f] animate-msg-in">{error}</p>}
          <button className="btn-primary w-full !rounded-full" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </button>
        </form>
        <p className="mt-5 text-sm text-[#8a897f] text-center">
          No account?{" "}
          <Link href="/register" className="text-[#1b1a14] font-semibold underline underline-offset-4">
            Create your link
          </Link>
        </p>
      </div>
    </main>
  );
}
