"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InviteAccept({
  token,
  email,
  role,
  businessName,
}: {
  token: string;
  email: string;
  role: string;
  businessName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function accept() {
    setBusy(true);
    setError("");
    const res = await fetch("/api/team/accept", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn't accept the invitation.");
      setBusy(false);
      return;
    }
    router.push(`/login?email=${encodeURIComponent(email)}&invited=1`);
  }

  return (
    <>
      <h1 className="mt-7 text-3xl font-semibold tracking-tight">You're invited</h1>
      <p className="text-sm text-[#8a897f] mt-2">
        Join <span className="font-semibold text-[#1b1a14]">{businessName}</span> on Haylio as{" "}
        <span className="font-semibold text-[#1b1a14]">{role === "admin" ? "an admin" : "a member"}</span>.
      </p>

      <div className="mt-5 rounded-2xl border border-[#ececea] bg-[#faf9f6] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a6a59c]">Your login email</p>
        <p className="text-sm font-semibold text-[#232219] mt-1">{email}</p>
      </div>

      {error && <p className="mt-4 text-sm text-[#e8552f]">{error}</p>}

      <button onClick={accept} disabled={busy} className="btn-primary mt-6 w-full justify-center !rounded-full">
        {busy ? "Accepting…" : "Accept invitation"}
      </button>
      <p className="mt-4 text-xs text-[#8a897f] text-center">
        After accepting, you'll log in with a one-time code sent to your email.
      </p>
    </>
  );
}
