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
  /** The Twilio subaccount the number was bought under. */
  subaccountSid?: string;
  /** active immediately (voice) but SMS pends toll-free verification on Twilio */
  status: "simulated" | "pending_verification";
  provider: "simulator" | "twilio";
}

/** A toll-free number offered for purchase. */
export interface AvailableNumber {
  phoneNumber: string;
  friendlyName: string;
  region?: string;
  isoCountry?: string;
}

export interface SmsResult {
  sid: string;
  status: "sent" | "delivered" | "failed";
  error?: string;
}

interface TelephonyProvider {
  name: "twilio" | "simulator";
  /** Send an SMS, optionally from a specific subaccount. */
  sendSms(opts: { from: string; to: string; body: string; accountSid?: string }): Promise<SmsResult>;
}

// ------------------------------------------------------------- Twilio REST

const TW = "https://api.twilio.com/2010-04-01";

function twilioAuthHeader(): string {
  // Parent credentials can act on any of its subaccounts.
  return "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
}

/** REST call scoped to an account (defaults to the main account). */
async function twilioFetch(
  path: string,
  init: RequestInit = {},
  accountSid: string = SID!
): Promise<Record<string, unknown>> {
  const res = await fetch(`${TW}/Accounts/${accountSid}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: twilioAuthHeader(),
      "content-type": "application/x-www-form-urlencoded",
      ...(init.headers ?? {}),
    },
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

/** REST call against the API root (e.g. creating a subaccount). */
async function twilioRootFetch(path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const res = await fetch(`${TW}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: twilioAuthHeader(),
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
  async sendSms({ from, to, body, accountSid }) {
    const params = new URLSearchParams({ From: from, To: to, Body: body });
    const wb = publicWebhookBase();
    if (wb) params.set("StatusCallback", `${wb}/api/twilio/sms-status`);
    const msg = await twilioFetch("/Messages.json", { method: "POST", body: params }, accountSid ?? SID!);
    return { sid: msg.sid as string, status: "sent" };
  },
};

// -------------------------------------------- number search / subaccounts

/** Search available toll-free numbers (US). Filters are optional. */
export async function searchTollFreeNumbers(opts: {
  areaCode?: string;
  contains?: string;
  limit?: number;
}): Promise<AvailableNumber[]> {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 30);

  if (!twilioEnabled) {
    // Simulator: synthesise plausible toll-free numbers.
    const prefixes = ["833", "844", "855", "866", "877", "888"];
    return Array.from({ length: limit }, (_, i) => {
      const prefix = opts.areaCode && /^\d{3}$/.test(opts.areaCode) ? opts.areaCode : prefixes[i % prefixes.length];
      const line = String(1000000 + Math.floor(Math.random() * 8999999)).slice(0, 7);
      const phoneNumber = `+1${prefix}${line}`;
      return { phoneNumber, friendlyName: formatUsNumber(phoneNumber), region: "US (simulated)", isoCountry: "US" };
    });
  }

  const qs = new URLSearchParams({ PageSize: String(limit) });
  if (opts.areaCode) qs.set("AreaCode", opts.areaCode);
  if (opts.contains) qs.set("Contains", opts.contains);
  const data = await twilioFetch(`/AvailablePhoneNumbers/US/TollFree.json?${qs.toString()}`);
  const rows = (data.available_phone_numbers as Record<string, unknown>[]) ?? [];
  return rows.map((r) => ({
    phoneNumber: r.phone_number as string,
    friendlyName: (r.friendly_name as string) || formatUsNumber(r.phone_number as string),
    region: (r.region as string) || (r.iso_country as string),
    isoCountry: r.iso_country as string,
  }));
}

/** Create a Twilio subaccount for a business; returns its SID. */
export async function createTwilioSubaccount(friendlyName: string): Promise<string> {
  if (!twilioEnabled) return "ACsim_" + crypto.randomBytes(12).toString("hex");
  const body = new URLSearchParams({ FriendlyName: friendlyName.slice(0, 64) });
  const data = await twilioRootFetch("/Accounts.json", { method: "POST", body });
  return data.sid as string;
}

/** Buy a specific toll-free number under a subaccount, wiring our webhooks. */
export async function purchaseTollFreeNumber(opts: {
  subaccountSid: string;
  phoneNumber: string;
}): Promise<PurchasedNumber> {
  if (!twilioEnabled) {
    return {
      phoneNumber: opts.phoneNumber,
      sid: "PNsim_" + crypto.randomBytes(12).toString("hex"),
      subaccountSid: opts.subaccountSid,
      status: "simulated",
      provider: "simulator",
    };
  }
  const body = new URLSearchParams({ PhoneNumber: opts.phoneNumber });
  const wb = publicWebhookBase();
  if (wb) {
    body.set("VoiceUrl", `${wb}/api/twilio/voice`);
    body.set("VoiceMethod", "POST");
    body.set("SmsUrl", `${wb}/api/twilio/inbound-sms`);
    body.set("SmsMethod", "POST");
  }
  const bought = await twilioFetch("/IncomingPhoneNumbers.json", { method: "POST", body }, opts.subaccountSid);
  return {
    phoneNumber: bought.phone_number as string,
    sid: bought.sid as string,
    subaccountSid: opts.subaccountSid,
    status: "pending_verification",
    provider: "twilio",
  };
}

/** Format +18885550100 → "+1 (888) 555-0100" for display. */
function formatUsNumber(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `+1 (${m[1]}) ${m[2]}-${m[3]}` : e164;
}

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

/**
 * Point an owned Twilio number's webhooks at the current public base URL.
 * Pass the owning subaccount SID so we update it on the right account.
 */
export async function syncNumberWebhooks(twilioSid: string, accountSid?: string): Promise<boolean> {
  const wb = publicWebhookBase();
  if (!twilioEnabled || !wb) return false;
  const body = new URLSearchParams({
    VoiceUrl: `${wb}/api/twilio/voice`,
    VoiceMethod: "POST",
    SmsUrl: `${wb}/api/twilio/inbound-sms`,
    SmsMethod: "POST",
  });
  await twilioFetch(`/IncomingPhoneNumbers/${twilioSid}.json`, { method: "POST", body }, accountSid ?? SID!);
  return true;
}

// -------------------------------------------------------------- simulator

const simulatorProvider: TelephonyProvider = {
  name: "simulator",
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
