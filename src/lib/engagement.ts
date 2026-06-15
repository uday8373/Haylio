import { baseUrl, providerFor } from "./telephony";
import {
  createEngagement,
  getBusiness,
  getNumberByPhone,
  listEngagements,
  updateEngagement,
} from "./store";
import type { Business, Engagement, VirtualNumber } from "./types";
// (Engagement used in CallResult and helpers below)

export const DEFAULT_GREETING = (name: string) =>
  `Thanks for calling ${name}! We've just sent you a text with a link where you can reach us instantly. Talk soon!`;

export const DEFAULT_SMS_TEMPLATE =
  "{business}: Sorry we missed your call! Reach us instantly here: {link} — chat, leave a voice note, or request a callback. Reply STOP to opt out.";

export function renderSms(template: string, business: Business, link: string): string {
  return template.replaceAll("{business}", business.name).replaceAll("{link}", link);
}

export interface CallResult {
  greeting: string;
  engagement: Engagement;
  smsBody: string;
  link: string;
  smsError?: string;
}

/** Record an intercepted call (creates the funnel entry + tracked token). */
export async function startEngagement(vn: VirtualNumber, callerNumber: string): Promise<Engagement> {
  return createEngagement({ businessId: vn.businessId, callerNumber });
}

/** Send the tracked link SMS for an existing engagement. */
export async function sendTrackedSms(
  vn: VirtualNumber,
  engagement: Engagement
): Promise<{ smsBody: string; link: string; smsError?: string; patch: Parameters<typeof updateEngagement>[1] }> {
  const business = (await getBusiness(vn.businessId))!;
  const link = `${baseUrl()}/c/${engagement.token}`;
  const smsBody = renderSms(vn.smsTemplate || DEFAULT_SMS_TEMPLATE, business, link);

  let patch: Parameters<typeof updateEngagement>[1];
  let smsError: string | undefined;
  try {
    const sms = await providerFor(vn.provider).sendSms({
      from: vn.phoneNumber,
      to: engagement.callerNumber,
      body: smsBody,
      accountSid: vn.subaccountSid,
    });
    patch = { smsSid: sms.sid, smsStatus: sms.status, smsBody };
  } catch (err) {
    console.error("SMS send failed:", err);
    smsError = err instanceof Error ? (err.message.match(/"message":\s*"([^"]+)"/)?.[1] ?? err.message) : "SMS send failed";
    patch = { smsStatus: "failed", smsBody };
  }
  await updateEngagement(engagement.id, patch);
  return { smsBody, link, smsError, patch };
}

/**
 * The text-back pipeline, used by the Twilio voice webhook (forwarding off),
 * the missed-call fallback, and the dashboard test: record the call, send the
 * tracked SMS, return the greeting.
 */
export async function handleIncomingCall(vn: VirtualNumber, callerNumber: string): Promise<CallResult> {
  const business = (await getBusiness(vn.businessId))!;
  const engagement = await startEngagement(vn, callerNumber);
  await updateEngagement(engagement.id, { callOutcome: "texted" });
  const { smsBody, link, smsError, patch } = await sendTrackedSms(vn, engagement);

  return {
    greeting: vn.greeting || DEFAULT_GREETING(business.name),
    engagement: { ...engagement, ...patch, callOutcome: "texted" },
    smsBody,
    link,
    smsError,
  };
}

/** Monthly forwarding allowance (minutes). Beyond this, callers get the SMS link. */
export const FORWARD_MINUTES_LIMIT = 30;

/** Minutes of answered forwarded calls in the current calendar month. */
export async function forwardMinutesUsed(businessId: string): Promise<number> {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const engs = await listEngagements(businessId);
  const seconds = engs
    .filter((e) => e.callAt >= monthStart.getTime() && e.callDuration)
    .reduce((sum, e) => sum + (e.callDuration ?? 0), 0);
  return Math.round((seconds / 60) * 10) / 10;
}

/** Minutes-of-day in the owner's local time. */
function localMinutes(now: Date, tzOffsetMinutes: number): number {
  const shifted = new Date(now.getTime() - tzOffsetMinutes * 60000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/** Is `m` inside [start, end)? Handles overnight windows (e.g. 21:00–08:00). */
function withinWindow(start: string, end: string, m: number): boolean {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = sh * 60 + (sm || 0);
  const e = eh * 60 + (em || 0);
  if (s === e) return true; // degenerate window = always
  return s < e ? m >= s && m < e : m >= s || m < e;
}

export interface RoutingDecision {
  forward: boolean;
  reason: "forwarding_off" | "dnd" | "outside_hours" | "minutes_cap" | "forwarding";
}

/** Decide whether this call rings the owner's phone or goes straight to the SMS link. */
export function decideRouting(vn: VirtualNumber, minutesUsed: number, now = new Date()): RoutingDecision {
  if (!vn.forwardingEnabled || !vn.forwardToNumber) return { forward: false, reason: "forwarding_off" };
  const m = localMinutes(now, vn.tzOffsetMinutes);
  if (vn.dndEnabled && withinWindow(vn.dndStart, vn.dndEnd, m)) return { forward: false, reason: "dnd" };
  if (!withinWindow(vn.forwardStart, vn.forwardEnd, m)) return { forward: false, reason: "outside_hours" };
  if (minutesUsed >= FORWARD_MINUTES_LIMIT) return { forward: false, reason: "minutes_cap" };
  return { forward: true, reason: "forwarding" };
}

/** TwiML that rings the owner's real phone; missed calls fall back to dial-status. */
export function forwardTwiml(vn: VirtualNumber, engagementId: string): string {
  const action = `${baseUrl()}/api/twilio/dial-status?eng=${encodeURIComponent(engagementId)}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${vn.phoneNumber}" timeout="20" action="${action}" method="POST">${vn.forwardToNumber}</Dial>
</Response>`;
}

/** Resolve the called virtual number ("To" on the webhook) to its record. */
export async function resolveVirtualNumber(to: string): Promise<VirtualNumber | undefined> {
  return getNumberByPhone(to);
}

/** TwiML for the intercept: professional greeting, then hang up. */
export function voiceTwiml(greeting: string): string {
  const safe = greeting.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Say voice="Polly.Joanna">${safe}</Say>
  <Hangup/>
</Response>`;
}

const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Neutral greeting for the press-1 flow (the SMS hasn't been sent yet). */
export const DEFAULT_CONFIRM_GREETING = (name: string) => `Thanks for calling ${name}!`;

/**
 * TwiML for the confirmation intercept: greet the caller, then ask them to
 * press 1 to receive the support link by text. The keypress is posted to
 * `actionUrl`, which sends the SMS (see /api/twilio/voice/confirm).
 */
export function confirmGatherTwiml(greeting: string, actionUrl: string): string {
  const prompt = "To get a text message with a link to reach us instantly, press 1.";
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
  <Gather numDigits="1" timeout="7" action="${xmlEscape(actionUrl)}" method="POST">
    <Say voice="Polly.Joanna">${xmlEscape(greeting)}</Say>
    <Pause length="1"/>
    <Say voice="Polly.Joanna">${xmlEscape(prompt)}</Say>
  </Gather>
  <Say voice="Polly.Joanna">We didn't catch that. Goodbye.</Say>
  <Hangup/>
</Response>`;
}

/** TwiML spoken after the caller confirms (pressed 1) or declines. */
export function confirmResultTwiml(sent: boolean): string {
  const msg = sent
    ? "Great! We've just sent you a text with a link to reach us. Talk soon!"
    : "No problem. Goodbye.";
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">${xmlEscape(msg)}</Say>
  <Hangup/>
</Response>`;
}
