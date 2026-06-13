"use client";

import { useEffect, useState } from "react";
import { LightbulbIcon } from "@/components/icons";

export default function SharePage() {
  const [handle, setHandle] = useState("");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    fetch("/api/business").then(async (r) => {
      const b = await r.json();
      setHandle(b.handle);
    });
  }, []);

  const url = origin && handle ? `${origin}/b/${handle}` : "";
  const embed = url
    ? `<iframe src="${url}?embed=1" style="width:100%;max-width:440px;height:640px;border:0;border-radius:24px;overflow:hidden" title="Contact us"></iframe>`
    : "";

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(""), 2000);
  }

  if (!url)
    return (
      <div className="flex items-center gap-3 text-sm text-[#8a897f]">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    );

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-extrabold text-[#232219] tracking-tight">Share your link</h1>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Put this everywhere you'd otherwise put a phone number — Google Business Profile, website, social bios, flyers, invoices.
      </p>

      <section className="mt-7 card p-5 md:p-7 animate-fade-up">
        <h2 className="font-bold text-[#232219]">Your contact link</h2>
        <div className="mt-4 flex gap-2">
          <input className="input font-mono !text-[#e8552f]" readOnly value={url} />
          <button className="btn-primary shrink-0" onClick={() => copy(url, "link")}>
            {copied === "link" ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-4 text-sm font-semibold text-[#e8552f] hover:text-[#c8431f] transition">
          Open public page ↗
        </a>
      </section>

      <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-150">
        <h2 className="font-bold text-[#232219]">QR code</h2>
        <p className="text-xs text-[#8a897f] mt-1">For storefronts, flyers, packaging, vehicle decals.</p>
        <div className="mt-5 flex items-center gap-6">
          <div className="p-3 rounded-2xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
              alt="QR code for your contact link"
              width={160}
              height={160}
              className="rounded-lg"
            />
          </div>
          <div className="text-xs text-[#8a897f] leading-relaxed">
            Right-click → save image.
            <br />
            Scanning opens your contact page — no number revealed.
          </div>
        </div>
      </section>

      <section className="mt-5 card p-5 md:p-7 animate-fade-up delay-200">
        <h2 className="font-bold text-[#232219]">Embed on your website</h2>
        <p className="text-xs text-[#8a897f] mt-1">Paste this where you want the contact widget to appear.</p>
        <textarea className="input font-mono !text-xs mt-4 min-h-28 !text-[#8a897f]" readOnly value={embed} />
        <button className="btn-secondary mt-3" onClick={() => copy(embed, "embed")}>
          {copied === "embed" ? "Copied ✓" : "Copy embed code"}
        </button>
      </section>

      <section className="mt-5 card p-5 md:p-7 !border-[#f3d9cf] !bg-[#fdf0eb] animate-fade-up delay-300">
        <h2 className="font-bold text-[#9a4a2e] flex items-center gap-2"><LightbulbIcon size={16} /> Replace your number on Google</h2>
        <p className="text-sm text-[#b06a4d] mt-2 leading-relaxed">
          In Google Business Profile, remove your personal mobile from the phone field and add this link as your website or
          appointment link. Customers still reach you instantly — spammers get nothing to autodial.
        </p>
      </section>
    </div>
  );
}
