"use client";

import { useEffect, useState } from "react";
import { LightbulbIcon } from "@/components/icons";

export default function SharePanel({ initialHandle }: { initialHandle?: string }) {
  const [handle, setHandle] = useState(initialHandle ?? "");
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    if (initialHandle) return; // already loaded on the server
    fetch("/api/business").then(async (r) => {
      const b = await r.json();
      setHandle(b.handle);
    });
  }, [initialHandle]);

  const url = origin && handle ? `${origin}/b/${handle}` : "";
  const embed = url
    ? `<iframe src="${url}?embed=1" style="width:100%;max-width:440px;height:640px;border:0;border-radius:24px;overflow:hidden" title="Contact us"></iframe>`
    : "";

  function copy(text: string, which: string) {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(""), 2000);
  }

  return (
    <aside className="lg:sticky lg:top-6">
      <div className="flex items-center justify-between px-1 mb-3">
        <h2 className="text-sm font-semibold text-[#1b1a14]">Share your link</h2>
        <span className="pill-soft">put it everywhere</span>
      </div>

      {!url ? (
        <div className="card p-5 flex items-center gap-3 text-sm text-[#8a897f]">
          <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
        </div>
      ) : (
        <div className="space-y-4">
          <section className="card p-5 animate-fade-up">
            <h3 className="font-bold text-[#232219] text-sm">Your contact link</h3>
            <div className="mt-3 flex gap-2">
              <input className="input font-mono !text-xs !text-[#e8552f]" readOnly value={url} />
              <button className="btn-primary shrink-0 !px-4" onClick={() => copy(url, "link")}>
                {copied === "link" ? "✓" : "Copy"}
              </button>
            </div>
            <a href={url} target="_blank" rel="noreferrer" className="inline-block mt-3 text-xs font-semibold text-[#e8552f] hover:text-[#c8431f] transition">
              Open public page ↗
            </a>
          </section>

          <section className="card p-5 animate-fade-up delay-150">
            <h3 className="font-bold text-[#232219] text-sm">QR code</h3>
            <p className="text-[11px] text-[#8a897f] mt-1">Storefronts, flyers, packaging, decals.</p>
            <div className="mt-4 flex justify-center p-3 rounded-2xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}`}
                alt="QR code for your contact link"
                width={160}
                height={160}
                className="rounded-lg"
              />
            </div>
          </section>

          <section className="card p-5 animate-fade-up delay-200">
            <h3 className="font-bold text-[#232219] text-sm">Embed on your website</h3>
            <textarea className="input font-mono !text-[10px] mt-3 min-h-24 !text-[#8a897f]" readOnly value={embed} />
            <button className="btn-secondary mt-3 !text-xs" onClick={() => copy(embed, "embed")}>
              {copied === "embed" ? "Copied ✓" : "Copy embed code"}
            </button>
          </section>

          <section className="card p-5 !border-[#f3d9cf] !bg-[#fdf0eb] animate-fade-up delay-300">
            <h3 className="font-bold text-[#9a4a2e] flex items-center gap-2 text-sm"><LightbulbIcon size={15} /> Replace your number on Google</h3>
            <p className="text-xs text-[#b06a4d] mt-2 leading-relaxed">
              In Google Business Profile, remove your personal mobile and add this link as your website or appointment link.
              Customers reach you instantly — spammers get nothing to autodial.
            </p>
          </section>
        </div>
      )}
    </aside>
  );
}
