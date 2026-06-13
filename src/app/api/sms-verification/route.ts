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

  // Demo helper (simulator only): force a final state without a live carrier.
  if (body.action === "simulate_review") {
    const decision = body.decision === "rejected" ? "rejected" : "verified";
    const updated = await setSmsVerificationStatus(biz.id, decision, str(body.rejectionReason) || undefined);
    if (!updated) return NextResponse.json({ error: "No submission to review yet." }, { status: 404 });
    return NextResponse.json(updated);
  }

  const input: SmsVerificationInput = {
    businessName: str(body.businessName),
    website: str(body.website),
    address: str(body.address),
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

  const missing: string[] = [];
  if (!input.businessName) missing.push("businessName");
  if (!input.website) missing.push("website");
  if (!input.address) missing.push("address");
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

  // Always persist locally first (our system of record).
  const saved: SmsVerification = await submitSmsVerification(biz.id, input);

  // Then submit to Twilio when we have a real Twilio-owned toll-free number.
  const vn = await getNumberByBusiness(biz.id);
  const canSubmitLive = twilioEnabled && vn?.provider === "twilio" && Boolean(vn?.twilioSid);
  if (canSubmitLive) {
    const [firstName, ...rest] = input.contactName.split(/\s+/);
    try {
      const result = await submitTollFreeVerification({
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
        businessStreetAddress: input.address,
        businessContactFirstName: firstName || input.contactName,
        businessContactLastName: rest.join(" ") || "-",
        businessContactEmail: input.contactEmail,
        businessContactPhone: input.contactPhone,
      });
      const updated = await applySmsVerificationResult(biz.id, {
        twilioVerificationSid: result.sid,
        status: result.status,
        rejectionReason: result.rejectionReason,
      });
      return NextResponse.json({ ...(updated ?? saved), submittedToCarrier: true });
    } catch (e) {
      // Keep the saved record (pending) but tell the caller Twilio rejected the request.
      const message = e instanceof Error ? e.message : "Twilio submission failed.";
      return NextResponse.json(
        { ...saved, submittedToCarrier: false, carrierError: message },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ ...saved, submittedToCarrier: false });
}
