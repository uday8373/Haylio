/**
 * WhatsApp (Twilio) configuration helpers. Pure module — no node/server deps —
 * so it imports cleanly on both client and server.
 *
 * Sending uses the same Twilio Messages API as SMS, with the From/To addresses
 * prefixed "whatsapp:". A business can save its own approved WhatsApp sender on
 * its number; if it hasn't, we fall back to Twilio's shared WhatsApp Sandbox.
 */

/**
 * Twilio's shared WhatsApp Sandbox sender. Customers must first message this
 * number with the sandbox join code before they can receive messages from it.
 * Override per-environment with TWILIO_WHATSAPP_FROM (e.g. a registered sender).
 */
export const WHATSAPP_SANDBOX_NUMBER = "+14155238886";

/** The sandbox's display join code is account-specific; this is the default. */
export const WHATSAPP_SANDBOX_JOIN_HINT =
  'In WhatsApp, send "join <your-sandbox-code>" to ' + WHATSAPP_SANDBOX_NUMBER + " to opt in (find your code in Twilio Console → Messaging → Try it out → WhatsApp sandbox).";

/** Strip any "whatsapp:" prefix and surrounding whitespace; keep the raw address. */
export function stripWhatsAppPrefix(addr: string): string {
  return addr.replace(/^\s*whatsapp:/i, "").trim();
}

/** Ensure an address carries the "whatsapp:" prefix Twilio expects. */
export function toWhatsAppAddress(e164: string): string {
  const bare = stripWhatsAppPrefix(e164);
  return `whatsapp:${bare}`;
}

/**
 * Resolve the sender to use for a business: its saved WhatsApp sender if set,
 * otherwise the platform sandbox (env override or the shared sandbox number).
 * Always returned with the "whatsapp:" prefix.
 */
export function resolveWhatsAppFrom(saved?: string): string {
  const fromSaved = saved && stripWhatsAppPrefix(saved);
  if (fromSaved) return toWhatsAppAddress(fromSaved);
  const envFrom = (typeof process !== "undefined" && process.env.TWILIO_WHATSAPP_FROM) || "";
  if (envFrom) return toWhatsAppAddress(envFrom);
  return toWhatsAppAddress(WHATSAPP_SANDBOX_NUMBER);
}

/** True when a business is relying on the shared sandbox rather than its own sender. */
export function isUsingSandbox(saved?: string): boolean {
  const envFrom = (typeof process !== "undefined" && process.env.TWILIO_WHATSAPP_FROM) || "";
  return !(saved && stripWhatsAppPrefix(saved)) && !envFrom;
}

/** Validate a WhatsApp sender address: optional "whatsapp:" + E.164 number. */
export function isValidWhatsAppSender(addr: unknown): addr is string {
  if (typeof addr !== "string") return false;
  if (addr.trim() === "") return true; // empty = use sandbox/default
  return /^\+[1-9]\d{7,14}$/.test(stripWhatsAppPrefix(addr));
}
