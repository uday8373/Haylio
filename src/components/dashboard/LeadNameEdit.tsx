"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeadNameEdit({ leadKey, name }: { leadKey: string; name: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);

  async function save() {
    const next = value.trim();
    if (!next || next === name) {
      setEditing(false);
      setValue(name);
      return;
    }
    setBusy(true);
    await fetch(`/api/leads/${encodeURIComponent(leadKey)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: next }),
    }).catch(() => {});
    setBusy(false);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-2">
        <input
          autoFocus
          className="input !py-1.5 !text-xl font-semibold !w-56"
          value={value}
          disabled={busy}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") {
              setEditing(false);
              setValue(name);
            }
          }}
        />
        <button onClick={save} disabled={busy} className="text-xs font-semibold text-[#3e7d3a] hover:underline">
          {busy ? "…" : "Save"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setValue(name);
          }}
          className="text-xs text-[#8a897f] hover:underline"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 group">
      <h1 className="text-2xl font-semibold tracking-tight">{name}</h1>
      <button
        onClick={() => setEditing(true)}
        title="Edit name"
        className="text-xs font-semibold text-[#8a897f] hover:text-[#1b1a14] underline underline-offset-2 opacity-0 group-hover:opacity-100 transition"
      >
        Edit
      </button>
    </span>
  );
}
