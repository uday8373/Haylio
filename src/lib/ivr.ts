/**
 * IVR voice + prompt configuration, chosen per-business from the dashboard.
 * Pure module (no node/server deps) so it imports cleanly on both client and
 * server. The Twilio TwiML builders live in engagement.ts and consume these.
 *
 * "Voice" = the Amazon Polly voice Twilio speaks with (tone/accent/gender).
 * "Script" = a preset set of spoken lines for the press-1 confirmation flow.
 */

export interface IvrVoice {
  /** Value passed to <Say voice="…">. Must be a Twilio-supported Polly voice. */
  id: string;
  label: string;
  /** BCP-47 locale — drives the browser preview's accent matching. */
  lang: string;
  gender: "male" | "female";
}

/** Curated set of Amazon Polly neural voices supported by Twilio <Say>. */
export const IVR_VOICES: IvrVoice[] = [
  { id: "Polly.Joanna-Neural", label: "English (US) · Joanna · Female", lang: "en-US", gender: "female" },
  { id: "Polly.Matthew-Neural", label: "English (US) · Matthew · Male", lang: "en-US", gender: "male" },
  { id: "Polly.Kajal-Neural", label: "English (Indian) · Kajal · Female", lang: "en-IN", gender: "female" },
  { id: "Polly.Amy-Neural", label: "English (British) · Amy · Female", lang: "en-GB", gender: "female" },
  { id: "Polly.Brian-Neural", label: "English (British) · Brian · Male", lang: "en-GB", gender: "male" },
  { id: "Polly.Danielle-Neural", label: "English (US) · Danielle · Female", lang: "en-US", gender: "female" },
];

export const DEFAULT_VOICE = IVR_VOICES[0].id;

export function isValidVoice(id: unknown): id is string {
  return typeof id === "string" && IVR_VOICES.some((v) => v.id === id);
}

/**
 * Call-handling modes offered in the dashboard. One is active per number.
 * Pure metadata (labels/copy/flags) consumed by the Call settings UI and the
 * PATCH validation; the actual TwiML branching lives in the voice webhook.
 */
export type CallHandlingModeId = "ivr" | "missed_call" | "forward";

export interface CallModeOption {
  id: CallHandlingModeId;
  label: string;
  /** One-line summary shown under the mode title. */
  description: string;
  /** What the caller experiences, shown in the selected-mode detail. */
  callerExperience: string;
  /** True if the mode can consume the owner's talk-time / forwarding minutes. */
  chargeable: boolean;
}

export const CALL_MODES: CallModeOption[] = [
  {
    id: "ivr",
    label: "IVR — press 1 for a link",
    description: "Caller hears your greeting and presses 1 to get the support link by text.",
    callerExperience: "Hears your greeting, presses 1, then receives the support link by SMS.",
    chargeable: false,
  },
  {
    id: "missed_call",
    label: "Missed call — auto-disconnect",
    description: "Call drops instantly and the caller is texted your support link. Your phone never rings.",
    callerExperience: "Call disconnects right away (no audio); your support link arrives by SMS moments later.",
    chargeable: false,
  },
  {
    id: "forward",
    label: "Forward to my phone",
    description: "Rings your real phone so you can talk to the caller directly.",
    callerExperience: "Hears ringing and is connected to you. If you miss it, they get the support link by text.",
    chargeable: true,
  },
];

export const DEFAULT_CALL_MODE: CallHandlingModeId = "ivr";

export function isValidCallMode(id: unknown): id is CallHandlingModeId {
  return id === "ivr" || id === "missed_call" || id === "forward";
}

export function getCallMode(id: string | undefined): CallModeOption {
  return CALL_MODES.find((m) => m.id === id) ?? CALL_MODES[0];
}

export interface IvrScript {
  id: string;
  label: string;
  description: string;
  /** Spoken after the greeting, inside the <Gather>. Asks the caller to press 1. */
  prompt: string;
  /** Spoken when the caller presses 1 and the SMS is on its way. */
  confirmSuccess: string;
  /** Spoken when the caller presses anything else / declines. */
  confirmDecline: string;
  /** Spoken when no key is pressed before the gather times out. */
  noInput: string;
}

/**
 * Predefined wordings for the confirmation flow. The greeting stays a separate
 * free-text field on the number; these cover the press-1 prompt and the lines
 * spoken after the keypress.
 */
export const IVR_SCRIPTS: IvrScript[] = [
  {
    id: "friendly",
    label: "Friendly & warm",
    description: "Casual, upbeat tone.",
    prompt: "To get a text with a link to reach us instantly, press 1.",
    confirmSuccess: "Great! We've just sent you a text with a link to reach us. Talk soon!",
    confirmDecline: "No problem. Goodbye.",
    noInput: "We didn't catch that. Goodbye.",
  },
  {
    id: "professional",
    label: "Professional",
    description: "Polished, formal tone.",
    prompt: "To receive a text message with a link to our team, please press 1.",
    confirmSuccess: "Thank you. A text message with your link is on its way.",
    confirmDecline: "Understood. Thank you for calling. Goodbye.",
    noInput: "We did not receive a response. Goodbye.",
  },
  {
    id: "support",
    label: "Support-focused",
    description: "Highlights chat, voice notes and callbacks.",
    prompt: "For a link to chat, leave a voice note, or request a callback, press 1.",
    confirmSuccess: "Perfect! We've texted you a link to reach our team. We'll talk soon.",
    confirmDecline: "No problem at all. Goodbye.",
    noInput: "Sorry, we didn't catch that. Goodbye.",
  },
  {
    id: "concise",
    label: "Short & direct",
    description: "Minimal wording, fastest call.",
    prompt: "Press 1 to get a text with our link.",
    confirmSuccess: "Done — check your phone for the link.",
    confirmDecline: "Okay, goodbye.",
    noInput: "No input received. Goodbye.",
  },
];

export const DEFAULT_IVR_SCRIPT_ID = IVR_SCRIPTS[0].id;

export function getIvrScript(id: string | undefined): IvrScript {
  return IVR_SCRIPTS.find((s) => s.id === id) ?? IVR_SCRIPTS[0];
}

export function isValidScriptId(id: unknown): id is string {
  return typeof id === "string" && IVR_SCRIPTS.some((s) => s.id === id);
}
