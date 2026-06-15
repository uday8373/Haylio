"use client";

import { useEffect, useRef, useState } from "react";
import {
  BadgeCheckIcon,
  ClockIcon,
  LightbulbIcon,
  ShieldCheckIcon,
  ShieldIcon,
} from "@/components/icons";
import type {
  OptInType,
  SmsUseCase,
  SmsVerification,
  SmsVerificationStatus,
} from "@/lib/types";
import { US_CITIES, US_STATES } from "@/lib/usGeo";

type FormState = {
  businessName: string;
  website: string;
  addressStreet: string;
  addressStreet2: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string;
  businessType: string;
  registrationNumber: string;
  registrationAuthority: string;
  registrationCountry: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  tollFreeNumber: string;
  useCase: SmsUseCase;
  useCaseSummary: string;
  sampleMessage: string;
  optInType: OptInType;
  optInDetails: string;
  optInImageUrl: string;
  monthlyVolume: string;
};

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  PRIVATE_PROFIT: "Private (for-profit) company",
  PUBLIC_PROFIT: "Public (for-profit) company",
  NON_PROFIT: "Non-profit",
  SOLE_PROPRIETOR: "Sole proprietor / individual",
  GOVERNMENT: "Government",
};

const REG_AUTHORITY_LABELS: Record<string, string> = {
  EIN: "EIN (US)",
  CRN: "CRN (UK company number)",
  CBN: "CBN (Canada)",
  ABN: "ABN (Australia)",
  ACN: "ACN (Australia)",
  NZBN: "NZBN (New Zealand)",
  VAT: "VAT number",
  "USt-IdNr": "USt-IdNr (Germany)",
  SIREN: "SIREN (France)",
  SIRET: "SIRET (France)",
  CIF: "CIF (Spain)",
  NIF: "NIF (Portugal/Spain)",
  CNPJ: "CNPJ (Brazil)",
  BRN: "BRN",
  PROVINCIAL_NUMBER: "Provincial number",
  UID: "UID",
  NEQ: "NEQ (Quebec)",
  OTHER: "Other (e.g. India CIN/GST, etc.)",
};

const OPT_IN_LABELS: Record<OptInType, string> = {
  web_form: "Website form",
  verbal: "Verbal / over the phone",
  paper_form: "Paper form",
  in_store: "In store",
  qr_code: "QR code",
  other: "Other",
};

// Twilio's allowed monthly-volume buckets.
const VOLUME_BUCKETS = [
  "10",
  "100",
  "1,000",
  "10,000",
  "100,000",
  "250,000",
  "500,000",
  "750,000",
  "1,000,000",
  "5,000,000",
  "10,000,000+",
];

// Field-by-field guidance shown in the side panel when an input is focused.
const GUIDE: Record<string, { title: string; body: string }> = {
  businessName: {
    title: "Business name",
    body: "Use your legal or registered trading name, exactly as it appears on official documents. The carrier matches this against public records.",
  },
  website: {
    title: "Website",
    body: "Your public website (optional but recommended). It helps the carrier confirm your business is real and lowers the chance of rejection.",
  },
  addressStreet: {
    title: "Street address",
    body: "The street line of your registered business address. Carriers need each part of the address separately.",
  },
  addressCity: { title: "City", body: "Start typing to pick a US city. You can also type one that isn't listed." },
  addressState: { title: "State", body: "Choose the US state of your business address." },
  addressPostal: { title: "ZIP code", body: "US ZIP code, e.g. 90001." },
  addressCountry: { title: "Country", body: "Fixed to the United States for toll-free verification." },
  businessType: {
    title: "Business type",
    body: "Carriers require this. Sole proprietor/individual needs nothing further; companies, non-profits and government must add registration details.",
  },
  registrationNumber: {
    title: "Registration number",
    body: "Your official company/registration number — EIN (US), company number, or in India your CIN or GSTIN.",
  },
  registrationAuthority: {
    title: "Registration authority",
    body: "Who issued the number. If your country isn't listed (e.g. India), choose OTHER.",
  },
  registrationCountry: {
    title: "Registration country",
    body: "Two-letter ISO country code where the business is registered, e.g. IN for India, US for the United States.",
  },
  contactName: {
    title: "Authorized contact",
    body: "A real person at your business the carrier can reach about this request — usually the owner or manager.",
  },
  contactEmail: {
    title: "Contact email",
    body: "A monitored inbox. Approval, rejection and any follow-up questions are sent here.",
  },
  contactPhone: {
    title: "Contact phone",
    body: "A phone number the carrier can call, with country code (e.g. +1 555 000 0000).",
  },
  tollFreeNumber: {
    title: "Toll-free number",
    body: "This is the number you purchased — it's the one being verified, so it's locked. Voice already works on it; this unlocks SMS.",
  },
  useCaseSummary: {
    title: "How you'll use it",
    body: "Describe in plain words why you text customers. Example: \"After a missed call we text the caller a secure link to chat with us.\"",
  },
  sampleMessage: {
    title: "Sample message",
    body: "A real example of a text you'll send. Keep \"Reply STOP to opt out\". {link} and {business} are filled in automatically when sent.",
  },
  optInImageUrl: {
    title: "Opt-in proof",
    body: "A publicly reachable image (https://…) showing your opt-in — a screenshot of your form with its consent checkbox, or a photo of the sign-up sign. Twilio requires this and reviewers look at it closely.",
  },
  monthlyVolume: {
    title: "Monthly volume",
    body: "Pick the bucket closest to how many texts you'll send per month. Twilio only accepts these set values.",
  },
  optInType: {
    title: "Opt-in method",
    body: "How customers agree to be texted — a form on your site, a sign at the counter, a verbal yes on a call, etc.",
  },
  optInDetails: {
    title: "Opt-in details",
    body: "This is the field carriers scrutinise most. Describe exactly where and how customers consent — e.g. \"a checkbox on our contact form at /b/your-handle.\"",
  },
};

function emptyForm(d: Partial<FormState>): FormState {
  return {
    businessName: d.businessName ?? "",
    website: d.website ?? "",
    addressStreet: d.addressStreet ?? "",
    addressStreet2: d.addressStreet2 ?? "",
    addressCity: d.addressCity ?? "",
    addressState: d.addressState ?? "",
    addressPostal: d.addressPostal ?? "",
    addressCountry: d.addressCountry || "US",
    businessType: d.businessType ?? "",
    registrationNumber: d.registrationNumber ?? "",
    registrationAuthority: d.registrationAuthority ?? "",
    registrationCountry: d.registrationCountry ?? "",
    contactName: d.contactName ?? "",
    contactEmail: d.contactEmail ?? "",
    contactPhone: d.contactPhone ?? "",
    tollFreeNumber: d.tollFreeNumber ?? "",
    useCase: d.useCase ?? "customer_care",
    useCaseSummary: d.useCaseSummary ?? "",
    sampleMessage: d.sampleMessage ?? "",
    optInType: d.optInType ?? "web_form",
    optInDetails: d.optInDetails ?? "",
    optInImageUrl: d.optInImageUrl ?? "",
    monthlyVolume: d.monthlyVolume ?? "",
  };
}

function StatusBadge({ status }: { status: SmsVerificationStatus }) {
  const map: Record<
    SmsVerificationStatus,
    { label: string; cls: string; icon: React.ReactNode }
  > = {
    not_submitted: {
      label: "NOT VERIFIED",
      cls: "bg-[#f3f3ef] border-[#e3e3df] text-[#8a897f]",
      icon: <ShieldIcon size={11} />,
    },
    pending: {
      label: "UNDER REVIEW",
      cls: "bg-[#fff4e5] border-[#f6dcb0] text-[#a96a16]",
      icon: <ClockIcon size={11} />,
    },
    verified: {
      label: "VERIFIED",
      cls: "bg-[#eaf3e6] border-[#cfe3c6] text-[#3e7d3a]",
      icon: <BadgeCheckIcon size={11} />,
    },
    rejected: {
      label: "ACTION NEEDED",
      cls: "bg-[#fdecea] border-[#f3c8c0] text-[#c0392b]",
      icon: <ShieldIcon size={11} />,
    },
  };
  const s = map[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${s.cls}`}
    >
      {s.icon} {s.label}
    </span>
  );
}

export default function SmsVerificationCard({
  defaults,
  lockedTollFree,
  live = false,
}: {
  defaults: Partial<FormState>;
  /** When set, the toll-free number field is read-only and pinned to this value. */
  lockedTollFree?: string;
  /** True when Twilio is configured — submissions go to the real carrier. */
  live?: boolean;
}) {
  const [record, setRecord] = useState<SmsVerification | { status: "not_submitted" } | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

  // Field guide
  const formRef = useRef<HTMLDivElement>(null);
  const [guide, setGuide] = useState<{ key: string; top: number } | null>(null);

  // Opt-in screenshot upload
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"upload" | "url">("upload");

  async function uploadOptinImage(file: File) {
    if (!form) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (form.optInImageUrl) fd.append("replaces", form.optInImageUrl);
    const res = await fetch("/api/sms-verification/optin-image", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setUploadError(data.error ?? "Upload failed.");
      return;
    }
    set("optInImageUrl", data.url);
  }

  async function removeOptinImage() {
    if (!form) return;
    const url = form.optInImageUrl;
    set("optInImageUrl", "");
    if (url) {
      fetch(`/api/sms-verification/optin-image?url=${encodeURIComponent(url)}`, { method: "DELETE" }).catch(() => {});
    }
  }

  useEffect(() => {
    fetch("/api/sms-verification").then(async (r) => {
      const data = await r.json();
      setRecord(data);
      const seed = data && data.status !== "not_submitted" ? data : defaults;
      const f = emptyForm(seed);
      // The toll-free number is always the purchased one.
      if (lockedTollFree) f.tollFreeNumber = lockedTollFree;
      // Pre-fill the sample message from the template if the record has none.
      if (!f.sampleMessage && defaults.sampleMessage) f.sampleMessage = defaults.sampleMessage;
      // Pre-fill the use-case summary from our purpose if the record has none.
      if (!f.useCaseSummary && defaults.useCaseSummary) f.useCaseSummary = defaults.useCaseSummary;
      setForm(f);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: SmsVerificationStatus = record?.status ?? "not_submitted";
  const showForm = editing || status === "not_submitted" || status === "rejected";

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    if (!form) return;
    setForm({ ...form, [key]: val });
    setMissing((m) => m.filter((x) => x !== key));
  }

  function onFieldFocus(e: React.FocusEvent<HTMLElement>) {
    const el = e.target as HTMLElement;
    const key = el.dataset.guide;
    if (!key || !formRef.current) return;
    const top = el.getBoundingClientRect().top - formRef.current.getBoundingClientRect().top;
    setGuide({ key, top: Math.max(0, top) });
  }

  async function submit() {
    if (!form) return;
    setBusy(true);
    setError(null);
    setMissing([]);
    const res = await fetch("/api/sms-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      // Validation (422) or carrier rejection (502): show the message, highlight
      // the field, and keep the form open — do NOT mark it under review.
      setError(data.error ?? "Something went wrong.");
      setMissing(Array.isArray(data.missing) ? data.missing : []);
      return;
    }
    setRecord(data);
    setEditing(false);
  }

  // Demo-only: exercise a carrier decision without a live Twilio integration.
  async function simulate(decision: "verified" | "rejected") {
    setBusy(true);
    const res = await fetch("/api/sms-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "simulate_review",
        decision,
        rejectionReason:
          decision === "rejected"
            ? "The opt-in workflow didn't show clear consent. Add where and how customers agree to receive texts, then resubmit."
            : undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.ok) setRecord(data);
  }

  if (!form || !record) {
    return (
      <section className="mt-5 card p-5 md:p-7">
        <div className="flex items-center gap-3 text-sm text-[#8a897f]">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </section>
    );
  }

  const isMissing = (k: string) => missing.includes(k);
  const full = record as SmsVerification;
  const activeGuide = guide ? GUIDE[guide.key] : null;

  return (
    <div className="mt-5 grid lg:grid-cols-[minmax(0,1fr)_280px] gap-6 items-start">
      <section className="card p-5 md:p-7 animate-fade-up" ref={formRef}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <span className="w-9 h-9 rounded-xl bg-[#f6f6f3] border border-[#e8e8e4] flex items-center justify-center text-[#4b4a42] shrink-0">
              <ShieldCheckIcon size={17} />
            </span>
            <div>
              <h2 className="font-bold text-[#232219]">Toll-free SMS verification</h2>
              <p className="text-xs text-[#8a897f] mt-0.5 max-w-md">
                Carriers require your toll-free number to be verified before it can text
                customers. Submit your business and opt-in details once — review usually
                takes a few business days.
              </p>
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        {/* Status banners */}
        {status === "pending" && !editing && (
          <div className="mt-5 rounded-2xl border border-[#f6dcb0] bg-[#fffaf2] p-4">
            <p className="text-sm font-semibold text-[#a96a16] flex items-center gap-2">
              <ClockIcon size={14} /> Your toll-free number is under carrier review
            </p>
            <p className="text-xs text-[#9a7438] mt-1">
              {full.tollFreeNumber ? <span className="font-mono">{full.tollFreeNumber}</span> : "Your number"}{" "}
              was submitted {full.submittedAt ? new Date(full.submittedAt).toLocaleDateString() : ""}.
              SMS replies switch on automatically once it&apos;s approved.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button className="text-xs font-semibold text-[#4b4a42] underline" onClick={() => setEditing(true)}>
                Edit &amp; resubmit
              </button>
              {!live && (
                <>
                  <span className="text-[10px] text-[#c0bfb6]">·</span>
                  <span className="text-[10px] text-[#c0bfb6]">Demo:</span>
                  <button className="text-[11px] font-semibold text-[#3e7d3a]" disabled={busy} onClick={() => simulate("verified")}>
                    Simulate approval
                  </button>
                  <button className="text-[11px] font-semibold text-[#c0392b]" disabled={busy} onClick={() => simulate("rejected")}>
                    Simulate rejection
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {status === "verified" && !editing && (
          <div className="mt-5 rounded-2xl border border-[#cfe3c6] bg-[#f4faf1] p-4">
            <p className="text-sm font-semibold text-[#3e7d3a] flex items-center gap-2">
              <BadgeCheckIcon size={15} /> {full.tollFreeNumber || "Your toll-free number"} is verified for SMS
            </p>
            <p className="text-xs text-[#5d8a55] mt-1">
              Approved {full.reviewedAt ? new Date(full.reviewedAt).toLocaleDateString() : ""}.
              Outbound texts to customers are now enabled.
            </p>
            <button className="mt-3 text-xs font-semibold text-[#4b4a42] underline" onClick={() => setEditing(true)}>
              Update details
            </button>
          </div>
        )}

        {status === "rejected" && !editing && (
          <div className="mt-5 rounded-2xl border border-[#f3c8c0] bg-[#fdf3f1] p-4">
            <p className="text-sm font-semibold text-[#c0392b]">Verification needs changes</p>
            <p className="text-xs text-[#a85044] mt-1">
              {full.rejectionReason ?? "Some details could not be verified."} Update the form
              below and resubmit.
            </p>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="mt-6 space-y-5" onFocusCapture={onFieldFocus}>
            {error && (
              <div className="rounded-xl border border-[#f3c8c0] bg-[#fdf3f1] px-4 py-3 text-sm text-[#c0392b]">
                {error}
              </div>
            )}

            {/* Business */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#a6a59c] mb-3">Business</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Business name *</label>
                  <input
                    data-guide="businessName"
                    className={`input ${isMissing("businessName") ? "!border-[#e8552f]" : ""}`}
                    value={form.businessName}
                    onChange={(e) => set("businessName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Website</label>
                  <input
                    data-guide="website"
                    className="input"
                    placeholder="https://"
                    value={form.website}
                    onChange={(e) => set("website", e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Street address *</label>
                <input
                  data-guide="addressStreet"
                  className={`input ${isMissing("addressStreet") ? "!border-[#e8552f]" : ""}`}
                  placeholder="Street address"
                  value={form.addressStreet}
                  onChange={(e) => set("addressStreet", e.target.value)}
                />
              </div>
              <div className="mt-3">
                <input
                  data-guide="addressStreet"
                  className="input"
                  placeholder="Apartment, suite, unit (optional)"
                  value={form.addressStreet2}
                  onChange={(e) => set("addressStreet2", e.target.value)}
                />
              </div>
              <div className="mt-3 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">City *</label>
                  <input
                    data-guide="addressCity"
                    list="us-cities"
                    className={`input ${isMissing("addressCity") ? "!border-[#e8552f]" : ""}`}
                    placeholder="Start typing a US city…"
                    value={form.addressCity}
                    onChange={(e) => set("addressCity", e.target.value)}
                  />
                  <datalist id="us-cities">
                    {US_CITIES.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="label">State *</label>
                  <select
                    data-guide="addressState"
                    className={`input ${isMissing("addressState") ? "!border-[#e8552f]" : ""}`}
                    value={form.addressState}
                    onChange={(e) => set("addressState", e.target.value)}
                  >
                    <option value="">Select a state…</option>
                    {US_STATES.map((s) => (
                      <option key={s.code} value={s.code}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">ZIP code *</label>
                  <input
                    data-guide="addressPostal"
                    className={`input ${isMissing("addressPostal") ? "!border-[#e8552f]" : ""}`}
                    placeholder="e.g. 90001"
                    value={form.addressPostal}
                    onChange={(e) => set("addressPostal", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input
                    className="input !bg-[#f3f3ef] !text-[#8a897f] cursor-not-allowed"
                    value="United States (US)"
                    readOnly
                  />
                </div>
              </div>
              <div className="mt-4 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Business type *</label>
                  <select
                    data-guide="businessType"
                    className={`input ${isMissing("businessType") ? "!border-[#e8552f]" : ""}`}
                    value={form.businessType}
                    onChange={(e) => set("businessType", e.target.value)}
                  >
                    <option value="">Select…</option>
                    {Object.keys(BUSINESS_TYPE_LABELS).map((k) => (
                      <option key={k} value={k}>{BUSINESS_TYPE_LABELS[k]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Registration — required unless sole proprietor */}
              {form.businessType && form.businessType !== "SOLE_PROPRIETOR" && (
                <div className="mt-4 grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Registration number *</label>
                    <input
                      data-guide="registrationNumber"
                      className={`input ${isMissing("registrationNumber") ? "!border-[#e8552f]" : ""}`}
                      placeholder="e.g. CIN / EIN / company no."
                      value={form.registrationNumber}
                      onChange={(e) => set("registrationNumber", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Registration authority *</label>
                    <select
                      data-guide="registrationAuthority"
                      className={`input ${isMissing("registrationAuthority") ? "!border-[#e8552f]" : ""}`}
                      value={form.registrationAuthority}
                      onChange={(e) => set("registrationAuthority", e.target.value)}
                    >
                      <option value="">Select…</option>
                      {Object.keys(REG_AUTHORITY_LABELS).map((k) => (
                        <option key={k} value={k}>{REG_AUTHORITY_LABELS[k]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Registration country *</label>
                    <input
                      data-guide="registrationCountry"
                      className={`input ${isMissing("registrationCountry") ? "!border-[#e8552f]" : ""}`}
                      placeholder="ISO code, e.g. IN, US"
                      maxLength={2}
                      value={form.registrationCountry}
                      onChange={(e) => set("registrationCountry", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                    />
                  </div>
                </div>
              )}
              {form.businessType && form.businessType !== "SOLE_PROPRIETOR" && (
                <p className="mt-2 text-[11px] text-[#a6a59c]">
                  In India, pick authority <span className="font-semibold">OTHER</span> and enter your CIN or GSTIN, country <span className="font-mono">IN</span>.
                  Not registered? Choose <span className="font-semibold">Sole proprietor</span> above.
                </p>
              )}
            </div>

            {/* Contact */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#a6a59c] mb-3">Authorized contact</p>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    data-guide="contactName"
                    className={`input ${isMissing("contactName") ? "!border-[#e8552f]" : ""}`}
                    value={form.contactName}
                    onChange={(e) => set("contactName", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    data-guide="contactEmail"
                    className={`input ${isMissing("contactEmail") ? "!border-[#e8552f]" : ""}`}
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) => set("contactEmail", e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    data-guide="contactPhone"
                    className={`input ${isMissing("contactPhone") ? "!border-[#e8552f]" : ""}`}
                    placeholder="+1 555 000 0000"
                    value={form.contactPhone}
                    onChange={(e) => set("contactPhone", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Messaging */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#a6a59c] mb-3">Messaging</p>
              <div>
                <label className="label">Toll-free number</label>
                <input
                  data-guide="tollFreeNumber"
                  className="input !bg-[#f3f3ef] !text-[#8a897f] cursor-not-allowed font-mono"
                  value={form.tollFreeNumber}
                  readOnly
                  aria-readonly="true"
                />
                <p className="mt-1.5 text-[11px] text-[#a6a59c]">
                  Your purchased number — locked to the one being verified.
                </p>
              </div>
              <div className="mt-4">
                <label className="label">How will you use the number?</label>
                <textarea
                  data-guide="useCaseSummary"
                  className="input"
                  rows={2}
                  placeholder="e.g. We text customers a secure link to chat with us after a missed call."
                  value={form.useCaseSummary}
                  onChange={(e) => set("useCaseSummary", e.target.value)}
                />
              </div>
              <div className="mt-4">
                <label className="label">Sample message *</label>
                <textarea
                  data-guide="sampleMessage"
                  className={`input ${isMissing("sampleMessage") ? "!border-[#e8552f]" : ""}`}
                  rows={3}
                  placeholder="Hi {name}, it's Bluebird Café — tap to chat with us: {link}. Reply STOP to opt out."
                  value={form.sampleMessage}
                  onChange={(e) => set("sampleMessage", e.target.value)}
                />
                <p className="mt-1.5 text-[11px] text-[#a6a59c]">
                  Pre-filled from your SMS template — edit if you like.
                </p>
              </div>
              <div className="mt-4">
                <label className="label">Estimated messages / month *</label>
                <select
                  data-guide="monthlyVolume"
                  className={`input md:max-w-[220px] ${isMissing("monthlyVolume") ? "!border-[#e8552f]" : ""}`}
                  value={form.monthlyVolume}
                  onChange={(e) => set("monthlyVolume", e.target.value)}
                >
                  <option value="">Select a range…</option>
                  {VOLUME_BUCKETS.map((b) => (
                    <option key={b} value={b}>
                      Up to {b} messages
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Opt-in */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-[#a6a59c] mb-3">Customer opt-in (consent)</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="label">How do customers opt in?</label>
                  <select
                    data-guide="optInType"
                    className="input"
                    value={form.optInType}
                    onChange={(e) => set("optInType", e.target.value as OptInType)}
                  >
                    {(Object.keys(OPT_IN_LABELS) as OptInType[]).map((k) => (
                      <option key={k} value={k}>
                        {OPT_IN_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Describe the opt-in flow *</label>
                <textarea
                  data-guide="optInDetails"
                  className={`input ${isMissing("optInDetails") ? "!border-[#e8552f]" : ""}`}
                  rows={2}
                  placeholder="Where and how customers agree to be texted — e.g. a checkbox on our contact form at /b/your-handle, or a sign at the counter."
                  value={form.optInDetails}
                  onChange={(e) => set("optInDetails", e.target.value)}
                />
              </div>
              <div className="mt-4" data-guide="optInImageUrl" tabIndex={-1}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <label className="label !mb-0">Opt-in proof screenshot *</label>
                  <div className="inline-flex rounded-full border border-[#e8e8e4] bg-white p-0.5 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setImageMode("upload")}
                      className={`px-3 py-1 rounded-full transition ${imageMode === "upload" ? "bg-[#21201a] text-white" : "text-[#6b6a60]"}`}
                    >
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode("url")}
                      className={`px-3 py-1 rounded-full transition ${imageMode === "url" ? "bg-[#21201a] text-white" : "text-[#6b6a60]"}`}
                    >
                      Paste URL
                    </button>
                  </div>
                </div>

                <div className="mt-2">
                  {imageMode === "url" ? (
                    <>
                      <input
                        className={`input ${isMissing("optInImageUrl") ? "!border-[#e8552f]" : ""}`}
                        placeholder="https://…/optin-screenshot.png"
                        value={form.optInImageUrl}
                        onChange={(e) => set("optInImageUrl", e.target.value.trim())}
                      />
                      {form.optInImageUrl && /^https?:\/\//i.test(form.optInImageUrl) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={form.optInImageUrl}
                          alt="Opt-in proof"
                          className="mt-2 w-16 h-16 rounded-lg object-cover border border-[#e8e8e4] bg-white"
                        />
                      )}
                    </>
                  ) : form.optInImageUrl ? (
                    <div
                      className={`flex items-center gap-3 rounded-2xl border p-3 ${
                        isMissing("optInImageUrl") ? "border-[#e8552f]" : "border-[#ebebe8] bg-[#fafaf8]"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={form.optInImageUrl}
                        alt="Opt-in proof"
                        className="w-14 h-14 rounded-lg object-cover border border-[#e8e8e4] bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[#232219]">Screenshot attached</p>
                        <p className="text-[11px] text-[#a6a59c] truncate font-mono">{form.optInImageUrl}</p>
                      </div>
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#e8552f] hover:text-[#c8431f] transition shrink-0"
                        disabled={uploading}
                        onClick={removeOptinImage}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label
                      className={`flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed p-5 cursor-pointer transition hover:bg-[#fafaf8] ${
                        isMissing("optInImageUrl") ? "border-[#e8552f]" : "border-[#d8d8d3]"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="sr-only"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadOptinImage(f);
                          e.target.value = "";
                        }}
                      />
                      <span className="text-sm font-semibold text-[#4b4a42]">
                        {uploading ? "Uploading…" : "Upload screenshot"}
                      </span>
                      <span className="text-[11px] text-[#a6a59c]">PNG, JPG or WebP · up to 5 MB</span>
                    </label>
                  )}
                </div>

                {uploadError && <p className="mt-1.5 text-[11px] text-[#e8552f]">{uploadError}</p>}
                <p className="mt-1.5 text-[11px] text-[#a6a59c]">
                  {imageMode === "url"
                    ? "Paste a public link to a screenshot/photo showing customers consenting."
                    : "Upload a screenshot/photo showing customers consenting. We host it on a temporary link for the carrier and delete it once verification finishes."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              {editing && status !== "not_submitted" && (
                <button className="btn-secondary" disabled={busy} onClick={() => setEditing(false)}>
                  Cancel
                </button>
              )}
              <button className="btn-primary" disabled={busy} onClick={submit}>
                {busy ? "Submitting…" : status === "rejected" ? "Resubmit for review" : "Submit for verification"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Field guide — points at the focused input */}
      {showForm && (
        <aside className="hidden lg:block self-stretch">
          <div className="relative h-full min-h-[160px]">
            <div
              className="absolute left-0 right-0 transition-[top] duration-200 ease-out"
              style={{ top: activeGuide ? guide!.top : 0 }}
            >
              <div className="relative rounded-2xl bg-[#1b1a14] text-white p-4 shadow-lg">
                {/* arrow pointing left toward the field */}
                <span className="absolute -left-1.5 top-5 w-3 h-3 rotate-45 bg-[#1b1a14]" />
                <p className="text-[10px] font-bold uppercase tracking-wide text-[#f0b88f] flex items-center gap-1.5">
                  <LightbulbIcon size={12} />
                  {activeGuide ? activeGuide.title : "Field guide"}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-white/80">
                  {activeGuide
                    ? activeGuide.body
                    : "Click any field on the left and a tip will appear here showing how to fill it in."}
                </p>
              </div>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}
