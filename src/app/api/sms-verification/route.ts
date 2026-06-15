import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import {
  getNumberByBusiness,
  getSmsVerification,
  submitSmsVerification,
  setSmsVerificationStatus,
  applySmsVerificationResult,
  type SmsVerificationInput,
} from "@/lib/store";
import {
  twilioEnabled,
  submitTollFreeVerification,
  fetchTollFreeVerification,
} from "@/lib/telephony";
import type { OptInType, SmsUseCase, SmsVerification } from "@/lib/types";

const USE_CASES: SmsUseCase[] = [
  "customer_care",
  "appointment_reminders",
  "two_factor",
  "account_notifications",
  "delivery_notifications",
  "marketing",
];
const OPT_IN_TYPES: OptInType[] = [
  "web_form",
  "verbal",
  "paper_form",
  "in_store",
  "qr_code",
  "other",
];

const BUSINESS_TYPES = ["PRIVATE_PROFIT", "PUBLIC_PROFIT", "NON_PROFIT", "SOLE_PROPRIETOR", "GOVERNMENT"];
const REG_AUTHORITIES = [
  "EIN", "CBN", "CRN", "PROVINCIAL_NUMBER", "VAT", "ACN", "ABN", "BRN", "SIREN", "SIRET",
  "NZBN", "USt-IdNr", "CIF", "NIF", "CNPJ", "UID", "NEQ", "OTHER",
];

// Our enums → Twilio Toll-Free Verification enums.
const TWILIO_USE_CASE: Record<SmsUseCase, string> = {
  customer_care: "CUSTOMER_CARE",
  appointment_reminders: "ACCOUNT_NOTIFICATIONS",
  two_factor: "TWO_FACTOR_AUTHENTICATION",
  account_notifications: "ACCOUNT_NOTIFICATIONS",
  delivery_notifications: "DELIVERY_NOTIFICATIONS",
  marketing: "MARKETING",
};
const TWILIO_OPT_IN: Record<OptInType, string> = {
  web_form: "WEB_FORM",
  verbal: "VERBAL",
  paper_form: "PAPER_FORM",
  in_store: "PAPER_FORM",
  qr_code: "MOBILE_QR_CODE",
  other: "VERBAL",
};

const EMPTY_STATUS = { status: "not_submitted" as const };

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Map a raw Twilio error into a clear message + the form field at fault. */
function friendlyCarrierError(raw: string): { message: string; field?: string } {
  const detail = raw.replace(/^Twilio\s+\d+:\s*/i, "").trim();
  const m = detail.toLowerCase();
  if (/contact phone|business.*phone|phone/.test(m))
    return { message: "Twilio rejected the contact phone. Use international format with country code, e.g. +14155550134.", field: "contactPhone" };
  if (/website/.test(m))
    return { message: "Twilio rejected the business website. Use a complete, reachable https:// URL.", field: "website" };
  if (/opt.?in|image/.test(m))
    return { message: "Twilio rejected the opt-in proof. Use a public https image URL Twilio can open.", field: "optInImageUrl" };
  if (/email/.test(m))
    return { message: "Twilio rejected the email address.", field: "contactEmail" };
  if (/postal|zip/.test(m))
    return { message: "Twilio rejected the postal/ZIP code.", field: "addressPostal" };
  if (/city/.test(m))
    return { message: "Twilio rejected the city.", field: "addressCity" };
  if (/state|province|region/.test(m))
    return { message: "Twilio rejected the state/province.", field: "addressState" };
  if (/country/.test(m) && !/registration/.test(m))
    return { message: "Twilio rejected the country. Use a 2-letter ISO code, e.g. IN, US.", field: "addressCountry" };
  if (/address|street/.test(m))
    return { message: "Twilio rejected the street address.", field: "addressStreet" };
  if (/registration number/.test(m))
    return { message: "Twilio rejected the business registration number.", field: "registrationNumber" };
  if (/registration authority/.test(m))
    return { message: "Twilio rejected the registration authority. Pick the one for your country (or OTHER).", field: "registrationAuthority" };
  if (/registration country/.test(m))
    return { message: "Twilio rejected the registration country.", field: "registrationCountry" };
  if (/business type/.test(m))
    return { message: "Select a business type. Non–sole-proprietors must add registration details.", field: "businessType" };
  if (/volume/.test(m))
    return { message: "Twilio rejected the message volume.", field: "monthlyVolume" };
  if (/message|sample/.test(m))
    return { message: "Twilio rejected the sample message.", field: "sampleMessage" };
  return { message: `Carrier rejected the request: ${detail}` };
}

export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const v = await getSmsVerification(biz.id);
  if (!v) return NextResponse.json(EMPTY_STATUS);

  // If it's live and still in review, pull the latest status from Twilio.
  if (twilioEnabled && v.twilioVerificationSid && v.status === "pending") {
    try {
      const latest = await fetchTollFreeVerification(v.twilioVerificationSid);
      if (latest && latest.status !== v.status) {
        const refreshed = await applySmsVerificationResult(biz.id, {
          status: latest.status,
          rejectionReason: latest.rejectionReason,
        });
        if (refreshed) return NextResponse.json(refreshed);
      }
    } catch {
      // Network/Twilio hiccup — fall back to the stored record.
    }
  }
  return NextResponse.json(v);
}

export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  try {
  // Demo helper (simulator only): force a final state without a live carrier.
  if (body.action === "simulate_review") {
    const decision = body.decision === "rejected" ? "rejected" : "verified";
    const updated = await setSmsVerificationStatus(biz.id, decision, str(body.rejectionReason) || undefined);
    if (!updated) return NextResponse.json({ error: "No submission to review yet." }, { status: 404 });
    return NextResponse.json(updated);
  }

  const businessType = BUSINESS_TYPES.includes(str(body.businessType)) ? str(body.businessType) : "";
  const regAuthority = REG_AUTHORITIES.includes(str(body.registrationAuthority)) ? str(body.registrationAuthority) : "";

  const addressStreet = str(body.addressStreet);
  const addressStreet2 = str(body.addressStreet2);
  const addressCity = str(body.addressCity);
  const addressState = str(body.addressState);
  const addressPostal = str(body.addressPostal);
  const addressCountry = str(body.addressCountry).toUpperCase().slice(0, 2);
  const combinedAddress = [addressStreet, addressStreet2, addressCity, [addressState, addressPostal].filter(Boolean).join(" "), addressCountry]
    .filter(Boolean)
    .join(", ");

  const input: SmsVerificationInput = {
    businessName: str(body.businessName),
    website: str(body.website),
    address: combinedAddress,
    addressStreet,
    addressStreet2,
    addressCity,
    addressState,
    addressPostal,
    addressCountry,
    businessType: businessType as SmsVerificationInput["businessType"],
    registrationNumber: str(body.registrationNumber),
    registrationAuthority: regAuthority as SmsVerificationInput["registrationAuthority"],
    registrationCountry: str(body.registrationCountry).toUpperCase().slice(0, 2),
    contactName: str(body.contactName),
    contactEmail: str(body.contactEmail),
    contactPhone: str(body.contactPhone),
    tollFreeNumber: str(body.tollFreeNumber),
    useCase: USE_CASES.includes(body.useCase as SmsUseCase) ? (body.useCase as SmsUseCase) : "customer_care",
    useCaseSummary: str(body.useCaseSummary),
    sampleMessage: str(body.sampleMessage),
    optInType: OPT_IN_TYPES.includes(body.optInType as OptInType) ? (body.optInType as OptInType) : "web_form",
    optInDetails: str(body.optInDetails),
    optInImageUrl: str(body.optInImageUrl),
    monthlyVolume: str(body.monthlyVolume),
  };

  const needsRegistration = Boolean(input.businessType) && input.businessType !== "SOLE_PROPRIETOR";

  const missing: string[] = [];
  if (!input.businessName) missing.push("businessName");
  if (!input.website) missing.push("website");
  if (!input.addressStreet) missing.push("addressStreet");
  if (!input.addressCity) missing.push("addressCity");
  if (!input.addressState) missing.push("addressState");
  if (!input.addressPostal) missing.push("addressPostal");
  if (!input.addressCountry) missing.push("addressCountry");
  if (!input.businessType) missing.push("businessType");
  if (needsRegistration) {
    if (!input.registrationNumber) missing.push("registrationNumber");
    if (!input.registrationAuthority) missing.push("registrationAuthority");
    if (!input.registrationCountry) missing.push("registrationCountry");
  }
  if (!input.contactName) missing.push("contactName");
  if (!input.contactEmail) missing.push("contactEmail");
  if (!input.contactPhone) missing.push("contactPhone");
  if (!input.useCaseSummary) missing.push("useCaseSummary");
  if (!input.sampleMessage) missing.push("sampleMessage");
  if (!input.optInDetails) missing.push("optInDetails");
  if (!input.optInImageUrl) missing.push("optInImageUrl");
  if (!input.monthlyVolume) missing.push("monthlyVolume");
  if (missing.length) {
    return NextResponse.json({ error: "Please complete all required fields.", missing }, { status: 422 });
  }
  if (!/^\S+@\S+\.\S+$/.test(input.contactEmail)) {
    return NextResponse.json({ error: "Enter a valid contact email.", missing: ["contactEmail"] }, { status: 422 });
  }
  if (!/^https?:\/\//i.test(input.optInImageUrl)) {
    return NextResponse.json(
      { error: "Opt-in proof must be a public image URL (https://…).", missing: ["optInImageUrl"] },
      { status: 422 }
    );
  }
  // Twilio requires the contact phone in E.164 (e.g. +14155550134). Sanitize and
  // validate up front so we never send a malformed number to the carrier.
  const phoneE164 = input.contactPhone.replace(/[^\d+]/g, "");
  if (!/^\+[1-9]\d{7,14}$/.test(phoneE164)) {
    return NextResponse.json(
      {
        error: "Enter the contact phone in international format with country code, e.g. +14155550134 (India: +91…).",
        missing: ["contactPhone"],
      },
      { status: 422 }
    );
  }
  input.contactPhone = phoneE164;

  const vn = await getNumberByBusiness(biz.id);
  const canSubmitLive = twilioEnabled && vn?.provider === "twilio" && Boolean(vn?.twilioSid);

  if (canSubmitLive) {
    // Submit to the carrier FIRST. Only mark the record "under review" if Twilio
    // actually accepts it — a failed submission must not show as pending.
    const [firstName, ...rest] = input.contactName.split(/\s+/);
    let result;
    try {
      result = await submitTollFreeVerification({
        businessName: input.businessName,
        businessWebsite: input.website,
        notificationEmail: input.contactEmail,
        useCaseCategories: [TWILIO_USE_CASE[input.useCase]],
        useCaseSummary: input.useCaseSummary,
        productionMessageSample: input.sampleMessage,
        optInImageUrls: [input.optInImageUrl],
        optInType: TWILIO_OPT_IN[input.optInType],
        messageVolume: input.monthlyVolume,
        tollfreePhoneNumberSid: vn!.twilioSid!,
        additionalInformation: input.optInDetails,
        businessStreetAddress: input.addressStreet,
        businessStreetAddress2: input.addressStreet2 || undefined,
        businessCity: input.addressCity,
        businessStateProvinceRegion: input.addressState,
        businessPostalCode: input.addressPostal,
        businessCountry: input.addressCountry,
        businessContactFirstName: firstName || input.contactName,
        businessContactLastName: rest.join(" ") || "-",
        businessContactEmail: input.contactEmail,
        businessContactPhone: input.contactPhone,
        businessType: input.businessType || undefined,
        businessRegistrationNumber: needsRegistration ? input.registrationNumber : undefined,
        businessRegistrationAuthority: needsRegistration ? input.registrationAuthority : undefined,
        businessRegistrationCountry: needsRegistration ? input.registrationCountry : undefined,
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Twilio submission failed.";
      const { message, field } = friendlyCarrierError(raw);
      return NextResponse.json(
        { error: message, missing: field ? [field] : undefined },
        { status: 502 }
      );
    }
    // Carrier accepted it — now persist and record the verification SID/status.
    await submitSmsVerification(biz.id, input);
    const updated = await applySmsVerificationResult(biz.id, {
      twilioVerificationSid: result.sid,
      status: result.status,
      rejectionReason: result.rejectionReason,
    });
    return NextResponse.json({ ...updated, submittedToCarrier: true });
  }

  // Simulator / no live Twilio number — record locally as pending.
  const saved: SmsVerification = await submitSmsVerification(biz.id, input);
  return NextResponse.json({ ...saved, submittedToCarrier: false });
  } catch (err) {
    // Most often a Supabase schema issue (table/columns missing). Surface it
    // instead of a blank 500 so it's clear what to fix.
    console.error("SMS verification submit failed:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
