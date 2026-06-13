import crypto from "crypto";

/**
 * Telephony provider abstraction.
 * - With TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN set → real Twilio (REST, no SDK).
 * - Without → simulator: fake toll-free numbers, SMS "delivered" instantly.
 * The rest of the app only talks to `telephony()` — swapping providers is config.
 */

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;

export const twilioEnabled = Boolean(SID && TOKEN);

export function baseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Twilio rejects non-public webhook URLs (error 21402). Returns the base URL
 * only when it's publicly reachable; null for localhost/private hosts.
 */
export function publicWebhookBase(): string | null {
  const b = baseUrl();
  return /^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\]|192\.168\.|10\.)/i.test(b) ? null : b;
}

export interface PurchasedNumber {
  phoneNumber: string;
  sid?: string;
  /** active immediately (voice) but SMS pends toll-free verification on Twilio */
  status: "simulated" | "pending_verification";
  provider: "simulator" | "twilio";
}

export interface SmsResult {
  sid: string;
  status: "sent" | "delivered" | "failed";
  error?: string;
}

interface TelephonyProvider {
  name: "twilio" | "simulator";
  /** Search + purchase a toll-free number, configured with our webhooks. */
  provisionTollFree(): Promise<PurchasedNumber>;
  sendSms(opts: { from: string; to: string; body: string }): Promise<SmsResult>;
}

// ------------------------------------------------------------- Twilio REST

const TW = "https://api.twilio.com/2010-04-01";

async function twilioFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${TW}/Accounts/${SID}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const twilioProvider: TelephonyProvider = {
  name: "twilio",
  async provisionTollFree() {
    const search = await twilioFetch(
      "/AvailablePhoneNumbers/US/TollFree.json?SmsEnabled=true&VoiceEnabled=true&PageSize=1"
    );
    const candidates = search.available_phone_numbers as { phone_number: string }[];
    if (!candidates?.length) throw new Error("No toll-free numbers available right now.");

    const body = new URLSearchParams({ PhoneNumber: candidates[0].phone_number });
    // Twilio rejects localhost webhook URLs — attach them only when public.
    const wb = publicWebhookBase();
    if (wb) {
      body.set("VoiceUrl", `${wb}/api/twilio/voice`);
      body.set("VoiceMethod", "POST");
      body.set("SmsUrl", `${wb}/api/twilio/inbound-sms`);
      body.set("SmsMethod", "POST");
    }
    const bought = await twilioFetch("/IncomingPhoneNumbers.json", { method: "POST", body });
    return {
      phoneNumber: bought.phone_number as string,
      sid: bought.sid as string,
      status: "pending_verification" as const,
      provider: "twilio" as const,
    };
  },
  async sendSms({ from, to, body }) {
    const params = new URLSearchParams({ From: from, To: to, Body: body });
    const wb = publicWebhookBase();
    if (wb) params.set("StatusCallback", `${wb}/api/twilio/sms-status`);
    const msg = await twilioFetch("/Messages.json", { method: "POST", body: params });
    return { sid: msg.sid as string, status: "sent" };
  },
};

// ------------------------------------------------ toll-free verification

const MESSAGING_BASE = "https://messaging.twilio.com/v1";

/** Fields we send to Twilio's Toll-Free Verification API. */
export interface TollFreeVerificationInput {
  businessName: string;
  businessWebsite: string;
  notificationEmail: string;
  useCaseCategories: string[];
  useCaseSummary: string;
  productionMessageSample: string;
  optInImageUrls: string[];
  optInType: string;
  messageVolume: string;
  tollfreePhoneNumberSid: string;
  additionalInformation?: string;
  businessStreetAddress?: string;
  businessContactFirstName?: string;
  businessContactLastName?: string;
  businessContactEmail?: string;
  businessContactPhone?: string;
}

export type TollFreeVerificationStatus = "pending" | "verified" | "rejected";

export interface TollFreeVerificationResult {
  sid: string;
  status: TollFreeVerificationStatus;
  rejectionReason?: string;
}

/** Map Twilio's verification status strings onto our three-state model. */
function mapTfvStatus(raw: unknown): TollFreeVerificationStatus {
  switch (String(raw)) {
    case "TWILIO_APPROVED":
      return "verified";
    case "TWILIO_REJECTED":
      return "rejected";
    default:
      // PENDING_REVIEW, IN_REVIEW, TWILIO_DRAFT, etc.
      return "pending";
  }
}

async function messagingFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${MESSAGING_BASE}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64"),
      "content-type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const msg = (data.message as string) || JSON.stringify(data).slice(0, 300);
    throw new Error(`Twilio ${res.status}: ${msg}`);
  }
  return data;
}

/**
 * Submit a Toll-Free Verification request to Twilio (live) or fake one
 * (simulator). The number is referenced by its Phone Number SID — no
 * Messaging Service SID is required by this API.
 */
export async function submitTollFreeVerification(
  input: TollFreeVerificationInput
): Promise<TollFreeVerificationResult> {
  if (!twilioEnabled) {
    return { sid: "TFVsim_" + crypto.randomBytes(8).toString("hex"), status: "pending" };
  }
  const body = new URLSearchParams();
  body.set("BusinessName", input.businessName);
  body.set("BusinessWebsite", input.businessWebsite);
  body.set("NotificationEmail", input.notificationEmail);
  for (const c of input.useCaseCategories) body.append("UseCaseCategories", c);
  body.set("UseCaseSummary", input.useCaseSummary);
  body.set("ProductionMessageSample", input.productionMessageSample);
  for (const u of input.optInImageUrls) body.append("OptInImageUrls", u);
  body.set("OptInType", input.optInType);
  body.set("MessageVolume", input.messageVolume);
  body.set("TollfreePhoneNumberSid", input.tollfreePhoneNumberSid);
  if (input.additionalInformation) body.set("AdditionalInformation", input.additionalInformation);
  if (input.businessStreetAddress) body.set("BusinessStreetAddress", input.businessStreetAddress);
  if (input.businessContactFirstName) body.set("BusinessContactFirstName", input.businessContactFirstName);
  if (input.businessContactLastName) body.set("BusinessContactLastName", input.businessContactLastName);
  if (input.businessContactEmail) body.set("BusinessContactEmail", input.businessContactEmail);
  if (input.businessContactPhone) body.set("BusinessContactPhone", input.businessContactPhone);

  const data = await messagingFetch("/Tollfree/Verifications", { method: "POST", body });
  return {
    sid: data.sid as string,
    status: mapTfvStatus(data.status),
    rejectionReason: (data.rejection_reason as string) || undefined,
  };
}

/** Fetch the latest status of a previously submitted verification. */
export async function fetchTollFreeVerification(
  verificationSid: string
): Promise<TollFreeVerificationResult | null> {
  if (!twilioEnabled || !verificationSid.startsWith("TFV")) return null;
  if (verificationSid.startsWith("TFVsim_")) return null; // simulated — nothing to poll
  const data = await messagingFetch(`/Tollfree/Verifications/${verificationSid}`);
  return {
    sid: data.sid as string,
    status: mapTfvStatus(data.status),
    rejectionReason: (data.rejection_reason as string) || undefined,
  };
}

/** Point an owned Twilio number's webhooks at the current public base URL. */
export async function syncNumberWebhooks(twilioSid: string): Promise<boolean> {
  const wb = publicWebhookBase();
  if (!twilioEnabled || !wb) return false;
  const body = new URLSearchParams({
    VoiceUrl: `${wb}/api/twilio/voice`,
    VoiceMethod: "POST",
    SmsUrl: `${wb}/api/twilio/inbound-sms`,
    SmsMethod: "POST",
  });
  await twilioFetch(`/IncomingPhoneNumbers/${twilioSid}.json`, { method: "POST", body });
  return true;
}

// -------------------------------------------------------------- simulator

const simulatorProvider: TelephonyProvider = {
  name: "simulator",
  async provisionTollFree() {
    const suffix = String(Math.floor(1000000 + Math.random() * 8999999));
    return { phoneNumber: `+1888${suffix}`, status: "simulated", provider: "simulator" };
  },
  async sendSms() {
    return { sid: "sim_" + crypto.randomBytes(8).toString("hex"), status: "delivered" };
  },
};

export function telephony(): TelephonyProvider {
  return twilioEnabled ? twilioProvider : simulatorProvider;
}

/**
 * Provider for an existing number. A simulated number keeps using the
 * simulator even when Twilio credentials are present (Twilio doesn't own it),
 * until the business upgrades to a real number.
 */
export function providerFor(numberProvider: "simulator" | "twilio"): TelephonyProvider {
  return numberProvider === "twilio" && twilioEnabled ? twilioProvider : simulatorProvider;
}

/**
 * Validate X-Twilio-Signature on webhooks (HMAC-SHA1 of url + sorted form params).
 * Always passes in simulator mode (no auth token configured).
 */
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null
): boolean {
  if (!twilioEnabled) return true;
  if (!signature) return false;
  const data = url + Object.keys(params).sort().map((k) => k + params[k]).join("");
  const expected = crypto.createHmac("sha1", TOKEN!).update(Buffer.from(data, "utf-8")).digest("base64");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
