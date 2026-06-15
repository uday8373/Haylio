"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon, PlusIcon, UsersIcon } from "@/components/icons";

type Role = "admin" | "member";

interface Member {
  id: string;
  email: string;
  role: Role;
  status: "invited" | "active";
  token?: string;
}

export default function TeamSettings({
  isAdmin,
  ownerEmail,
  ownerName,
  currentEmail,
  members,
  baseUrl,
  emailProviderEnabled,
}: {
  isAdmin: boolean;
  ownerEmail: string;
  ownerName: string;
  currentEmail: string;
  members: Member[];
  baseUrl: string;
  emailProviderEnabled: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [lastInvite, setLastInvite] = useState<{ url: string; delivered: boolean } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const inviteLink = (token?: string) => (token ? `${baseUrl}/invite/${token}` : "");

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setLastInvite(null);
    const res = await fetch("/api/team", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, role }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't send the invite.");
      return;
    }
    setLastInvite({ url: data.inviteUrl, delivered: Boolean(data.delivered) });
    setEmail("");
    setRole("member");
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch("/api/team", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) router.refresh();
  }

  const roleBadge = (r: Role) =>
    r === "admin"
      ? "bg-[#21201a] text-white"
      : "bg-[#eef2f7] text-[#41506a] border border-[#d6e0ec]";

  return (
    <section className="mt-5 card p-5 md:p-7 animate-fade-up">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-[#232219] flex items-center gap-2">
          <UsersIcon size={17} className="text-[#4b4a42]" /> Team
        </h2>
        {!isAdmin && <span className="pill-soft">View only</span>}
      </div>
      <p className="mt-1.5 text-xs text-[#8a897f]">
        Invite people to view and manage this business. Admins can manage the team; members get full
        access to the inbox and leads.
      </p>

      {/* Members list */}
      <div className="mt-5 space-y-2.5">
        {/* Owner */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#f0f0ec] p-3.5">
          <span className="w-9 h-9 rounded-full bg-[#f1f1ee] border border-[#e8e8e4] flex items-center justify-center text-sm font-bold text-[#6b6a60] shrink-0">
            {ownerName.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#232219] truncate">
              {ownerEmail}
              {ownerEmail === currentEmail && <span className="text-[#8a897f] font-normal"> · you</span>}
            </p>
            <p className="text-[11px] text-[#a6a59c]">Owner</p>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${roleBadge("admin")}`}>
            Admin
          </span>
        </div>

        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-[#f0f0ec] p-3.5">
            <span className="w-9 h-9 rounded-full bg-[#f1f1ee] border border-[#e8e8e4] flex items-center justify-center text-sm font-bold text-[#6b6a60] shrink-0">
              {m.email.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#232219] truncate">
                {m.email}
                {m.email === currentEmail && <span className="text-[#8a897f] font-normal"> · you</span>}
              </p>
              <p className="text-[11px] text-[#a6a59c]">
                {m.status === "active" ? "Active" : "Invitation pending"}
              </p>
            </div>
            {m.status === "invited" && (
              <span className="rounded-full bg-[#fff4e5] border border-[#f6dcb0] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#a96a16]">
                Pending
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${roleBadge(m.role)}`}>
              {m.role}
            </span>
            {isAdmin && (
              <div className="flex items-center gap-1.5 shrink-0">
                {m.status === "invited" && m.token && (
                  <button
                    onClick={() => copy(inviteLink(m.token), m.id)}
                    className="text-xs font-semibold text-[#41506a] hover:text-[#21201a] transition"
                  >
                    {copied === m.id ? "Copied ✓" : "Copy link"}
                  </button>
                )}
                <button
                  onClick={() => remove(m.id)}
                  className="text-xs font-semibold text-[#e8552f] hover:text-[#c8431f] transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invite form */}
      {isAdmin ? (
        <form onSubmit={invite} className="mt-5 rounded-2xl border border-[#ececea] p-4">
          <label className="label">Invite a teammate</label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              className="input flex-1"
              type="email"
              placeholder="teammate@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <select className="input sm:w-36" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button className="btn-primary !px-5 justify-center" disabled={busy}>
              <PlusIcon size={14} /> {busy ? "Inviting…" : "Invite"}
            </button>
          </div>
          {error && <p className="mt-3 text-xs text-[#c0392b]">{error}</p>}

          {lastInvite && (
            <div className="mt-4 rounded-xl border border-[#cfe3c6] bg-[#f1f7ee] p-3.5">
              <p className="text-xs font-semibold text-[#3e7d3a] flex items-center gap-1.5">
                <CheckIcon size={13} /> Invitation created
                {lastInvite.delivered ? " and emailed." : "."}
              </p>
              {!lastInvite.delivered && (
                <p className="text-[11px] text-[#6b6a60] mt-1">
                  {emailProviderEnabled
                    ? "Email couldn't be sent — share this link instead:"
                    : "No email provider is configured — share this invite link with them:"}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <input readOnly value={lastInvite.url} className="input !py-2 !text-xs flex-1 font-mono" />
                <button
                  type="button"
                  onClick={() => copy(lastInvite.url, "last")}
                  className="btn-secondary !py-2 !px-3 !text-xs shrink-0"
                >
                  {copied === "last" ? "Copied ✓" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </form>
      ) : (
        <p className="mt-5 text-xs text-[#8a897f]">Only admins can invite or remove teammates.</p>
      )}
    </section>
  );
}
