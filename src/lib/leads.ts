import { listConversations, listEngagements, listLeadTags } from "./store";
import type { Conversation, Engagement, Lead, LeadTag, LeadTimelineItem, LeadTimelineKind } from "./types";

/**
 * Leads are derived on the fly by grouping every interaction (call/SMS
 * engagements + widget conversations) by a normalized contact key, then
 * overlaying the manual tag/note from `lead_tags`. This means leads update
 * retroactively as new interactions arrive — no per-message linking needed.
 */

/** Normalize a phone/email into a stable grouping key. */
export function contactKey(raw?: string): string | undefined {
  if (!raw) return undefined;
  const s = raw.trim();
  if (!s) return undefined;
  if (s.includes("@")) return "email:" + s.toLowerCase();
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 7) return "tel:" + digits.slice(-10);
  return undefined;
}

function channelTitle(channel: string): string {
  switch (channel) {
    case "chat": return "Live chat";
    case "message": return "Message";
    case "voicemail": return "Voice message";
    case "callback": return "Callback request";
    default: return channel;
  }
}

interface Accum {
  key: string;
  names: string[];
  contacts: string[];
  phone?: string;
  email?: string;
  channels: Set<LeadTimelineKind>;
  timeline: LeadTimelineItem[];
  callCount: number;
  messageCount: number;
  clicked: boolean;
}

function ensure(map: Map<string, Accum>, key: string): Accum {
  let a = map.get(key);
  if (!a) {
    a = { key, names: [], contacts: [], channels: new Set(), timeline: [], callCount: 0, messageCount: 0, clicked: false };
    map.set(key, a);
  }
  return a;
}

function addEngagement(map: Map<string, Accum>, e: Engagement) {
  const key = contactKey(e.callerNumber) ?? `eng:${e.id}`;
  const a = ensure(map, key);
  a.contacts.push(e.callerNumber);
  a.names.push(`Caller ••${e.callerLast4}`);
  if (!a.phone) a.phone = e.callerNumber;
  a.callCount++;
  a.channels.add("call");

  const outcome =
    e.callOutcome === "forwarded_answered" ? "Answered" :
    e.callOutcome === "forwarded_missed" ? "Missed → texted link" : "Texted link";
  a.timeline.push({
    id: `${e.id}-call`, kind: "call", at: e.callAt,
    title: `Inbound call · ${outcome}`,
    detail: e.callDuration ? `${Math.ceil(e.callDuration / 60)} min` : undefined,
    status: e.callOutcome,
  });

  if (e.smsBody || e.smsStatus !== "pending") {
    a.channels.add("sms");
    a.timeline.push({
      id: `${e.id}-sms`, kind: "sms", at: e.callAt + 1,
      title: "SMS link sent", detail: e.smsBody, status: e.smsStatus,
      conversationId: e.conversationId,
    });
  }
  if (e.clickedAt) {
    a.clicked = true;
    a.timeline.push({ id: `${e.id}-click`, kind: "click", at: e.clickedAt, title: "Clicked the tracked link", conversationId: e.conversationId });
  }
}

function addConversation(map: Map<string, Accum>, c: Conversation) {
  const key = contactKey(c.visitorContact) ?? `conv:${c.id}`;
  const a = ensure(map, key);
  if (c.visitorName) a.names.push(c.visitorName);
  if (c.visitorContact) {
    a.contacts.push(c.visitorContact);
    if (c.visitorContact.includes("@")) a.email = a.email ?? c.visitorContact;
    else if (!a.phone) a.phone = c.visitorContact;
  }
  a.messageCount += c.messages.length;
  a.channels.add(c.channel as LeadTimelineKind);

  const last = c.messages[c.messages.length - 1];
  const preview =
    last?.kind === "audio" ? "Voice message" :
    last?.kind === "callback" ? `Callback: ${last.phone ?? ""}${last.preferredTime ? ` (${last.preferredTime})` : ""}` :
    last?.text ?? "";
  a.timeline.push({
    id: `${c.id}-conv`, kind: c.channel as LeadTimelineKind, at: c.createdAt,
    title: channelTitle(c.channel),
    detail: preview,
    status: c.unread ? "unread" : undefined,
    conversationId: c.id,
  });
}

function pickName(a: Accum): string {
  // Prefer a real, non-generic name.
  const real = a.names.find((n) => n && !n.startsWith("Caller ••") && n !== "Visitor");
  return real ?? a.names[0] ?? "Visitor";
}

function pickContact(a: Accum): string | undefined {
  return a.contacts.find(Boolean);
}

function scoreLead(a: Accum, lastAt: number): number {
  let s = 10;
  const becameConversation = a.messageCount > 0;
  if (becameConversation) s += 25;
  if (a.clicked) s += 20;
  if (a.phone || a.email) s += 15;
  if (a.channels.has("callback")) s += 15;
  const interactions = a.timeline.length;
  s += Math.min(20, Math.max(0, interactions - 1) * 5);
  if (Date.now() - lastAt < 7 * 24 * 60 * 60 * 1000) s += 10;
  return Math.max(0, Math.min(100, s));
}

export async function buildLeads(businessId: string): Promise<Lead[]> {
  const [convos, engs, tags] = await Promise.all([
    listConversations(businessId),
    listEngagements(businessId),
    listLeadTags(businessId),
  ]);

  const map = new Map<string, Accum>();
  for (const e of engs) addEngagement(map, e);
  for (const c of convos) addConversation(map, c);

  const tagByKey = new Map(tags.map((t) => [t.contactKey, t]));

  const leads: Lead[] = [];
  for (const a of map.values()) {
    a.timeline.sort((x, y) => y.at - x.at);
    const lastAt = a.timeline[0]?.at ?? 0;
    const firstAt = a.timeline[a.timeline.length - 1]?.at ?? lastAt;
    const tagRec = tagByKey.get(a.key);
    leads.push({
      key: a.key,
      businessId,
      name: tagRec?.name?.trim() || pickName(a),
      contact: pickContact(a),
      phone: a.phone,
      email: a.email,
      channels: [...a.channels],
      tag: (tagRec?.tag ?? "none") as LeadTag,
      note: tagRec?.note,
      score: scoreLead(a, lastAt),
      firstAt,
      lastAt,
      callCount: a.callCount,
      messageCount: a.messageCount,
      clicked: a.clicked,
      timeline: a.timeline,
    });
  }
  leads.sort((x, y) => y.lastAt - x.lastAt);
  return leads;
}

export async function getLead(businessId: string, key: string): Promise<Lead | undefined> {
  const leads = await buildLeads(businessId);
  return leads.find((l) => l.key === key);
}
