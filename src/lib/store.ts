import crypto from "crypto";
import { sbDelete, sbInsert, sbSelect, sbUpdate, supabaseEnabled } from "./supabase";
import type { Business, Conversation, Engagement, Message, PublicBusiness, Channel, VirtualNumber, SmsVerification } from "./types";

/**
 * Data layer. Uses Supabase (PostgREST) when SUPABASE_URL/SUPABASE_ANON_KEY
 * are configured; otherwise falls back to an in-memory store seeded with a
 * demo café so the prototype works out of the box.
 * All functions are async so the backing store is swappable.
 */

// ---------------------------------------------------------------- utilities

function uid(prefix = ""): string {
  return prefix + crypto.randomBytes(8).toString("hex");
}

export function hashPassword(pw: string): string {
  return crypto.createHash("sha256").update("haylio:" + pw).digest("hex");
}

export function normalizeHandle(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

// ------------------------------------------------------------- row mapping

type BizRow = {
  id: string; handle: string; name: string; email: string; password_hash: string;
  category: string; description: string; hours: string; location: string;
  website: string; phone: string; google_place_id: string | null; verified: boolean;
  logo_url: string; cover_image_url: string; background_image_url: string;
  ai_instructions: string;
  faqs: Business["faqs"]; widget: Business["widget"]; created_at: number;
};

type ConvRow = {
  id: string; business_id: string; channel: Channel; visitor_name: string | null;
  visitor_contact: string | null; visitor_key: string; unread: boolean;
  messages: Message[]; created_at: number; updated_at: number;
};

function rowToBiz(r: BizRow): Business {
  return {
    id: r.id, handle: r.handle, name: r.name, email: r.email, passwordHash: r.password_hash,
    category: r.category, description: r.description, hours: r.hours, location: r.location,
    website: r.website, phone: r.phone, googlePlaceId: r.google_place_id ?? undefined,
    verified: r.verified,
    logoUrl: r.logo_url ?? "", coverImageUrl: r.cover_image_url ?? "",
    backgroundImageUrl: r.background_image_url ?? "", aiInstructions: r.ai_instructions ?? "",
    faqs: r.faqs ?? [], widget: r.widget, createdAt: Number(r.created_at),
  };
}

function bizToRow(b: Business): BizRow {
  return {
    id: b.id, handle: b.handle, name: b.name, email: b.email, password_hash: b.passwordHash,
    category: b.category, description: b.description, hours: b.hours, location: b.location,
    website: b.website, phone: b.phone, google_place_id: b.googlePlaceId ?? null,
    verified: b.verified,
    logo_url: b.logoUrl, cover_image_url: b.coverImageUrl,
    background_image_url: b.backgroundImageUrl, ai_instructions: b.aiInstructions,
    faqs: b.faqs, widget: b.widget, created_at: b.createdAt,
  };
}

function rowToConv(r: ConvRow): Conversation {
  return {
    id: r.id, businessId: r.business_id, channel: r.channel,
    visitorName: r.visitor_name ?? undefined, visitorContact: r.visitor_contact ?? undefined,
    visitorKey: r.visitor_key, unread: r.unread, messages: r.messages ?? [],
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
  };
}

// --------------------------------------------------------- in-memory store

interface MemStore {
  businesses: Map<string, Business>;
  conversations: Map<string, Conversation>;
  sessions: Map<string, string>;
  virtualNumbers: Map<string, VirtualNumber>;
  engagements: Map<string, Engagement>;
  smsVerifications: Map<string, SmsVerification>;
  optinUploads: Map<string, OptinUpload>;
}

/** A temporary opt-in proof image, hosted publicly until verification finalises. */
export interface OptinUpload {
  id: string;
  businessId: string;
  contentType: string;
  /** base64-encoded image bytes */
  data: string;
  createdAt: number;
}

const g = globalThis as unknown as { __haylio?: MemStore };

function seed(): MemStore {
  const store: MemStore = {
    businesses: new Map(),
    conversations: new Map(),
    sessions: new Map(),
    virtualNumbers: new Map(),
    engagements: new Map(),
    smsVerifications: new Map(),
    optinUploads: new Map(),
  };
  const demo: Business = {
    id: "biz_demo",
    handle: "demo-cafe",
    name: "Bluebird Café",
    email: "demo@haylio.app",
    passwordHash: hashPassword("demo1234"),
    category: "Café & Bakery",
    description:
      "Neighbourhood specialty coffee and fresh-baked goods. Breakfast and lunch, dine-in or takeaway. We also take custom cake orders.",
    hours: "Mon–Fri 7:00–17:00, Sat–Sun 8:00–15:00",
    location: "12 Harbour Lane, Sydney NSW",
    website: "https://bluebirdcafe.example.com",
    phone: "",
    verified: true,
    logoUrl: "https://picsum.photos/seed/bluebird-logo/200/200",
    coverImageUrl: "https://picsum.photos/seed/bluebird-cover/800/300",
    backgroundImageUrl: "",
    aiInstructions:
      "Always be warm and upbeat. If someone asks about cakes or catering, encourage them to leave a callback request so we can discuss details. Mention our loyalty card (buy 9 coffees, get the 10th free) when relevant.",
    faqs: [
      { q: "Do you take cake orders?", a: "Yes! Custom cakes need 48 hours notice. Send us a message with your date and design ideas." },
      { q: "Do you have vegan options?", a: "We have vegan banana bread, salads, and oat/soy/almond milk for all coffees." },
      { q: "Is there parking?", a: "Free 2-hour street parking on Harbour Lane, plus a paid lot one block away." },
      { q: "Do you do catering?", a: "We cater events of 10–100 people. Leave a callback request and we'll call you to discuss." },
    ],
    widget: {
      themeColor: "#8b5cf6",
      greeting: "Hi! 👋 How can we help you today?",
      channels: { aiChat: true, message: true, voicemail: true, callback: true },
    },
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
  };
  store.businesses.set(demo.id, demo);

  const now = Date.now();
  const convos: Conversation[] = [
    {
      id: "conv_seed1", businessId: demo.id, channel: "chat", visitorName: "Priya",
      visitorKey: uid("vk_"), unread: true, createdAt: now - 5400000, updatedAt: now - 5100000,
      messages: [
        { id: uid("m_"), role: "visitor", kind: "text", text: "Hi, are you open on public holidays?", at: now - 5400000 },
        { id: uid("m_"), role: "ai", kind: "text", text: "We're usually open 8:00–15:00 on public holidays, but it can vary — would you like to leave a message and the team will confirm?", at: now - 5340000 },
        { id: uid("m_"), role: "visitor", kind: "text", text: "Yes please — is the café open this Monday?", at: now - 5100000 },
      ],
    },
    {
      id: "conv_seed2", businessId: demo.id, channel: "callback", visitorName: "Marco",
      visitorContact: "+61 400 123 456", visitorKey: uid("vk_"), unread: true,
      createdAt: now - 18000000, updatedAt: now - 18000000,
      messages: [
        { id: uid("m_"), role: "visitor", kind: "callback", phone: "+61 400 123 456", preferredTime: "Today after 4pm", text: "Catering quote for office event, ~30 people.", at: now - 18000000 },
      ],
    },
  ];
  for (const c of convos) store.conversations.set(c.id, c);
  return store;
}

function mem(): MemStore {
  if (!g.__haylio) g.__haylio = seed();
  return g.__haylio;
}

// -------------------------------------------------------------- businesses

export interface NewBusinessInput {
  name: string;
  email: string;
  password: string;
  handle: string;
  category?: string;
  description?: string;
  hours?: string;
  location?: string;
  website?: string;
  phone?: string;
  googlePlaceId?: string;
  verified?: boolean;
}

export async function createBusiness(input: NewBusinessInput): Promise<Business | { error: string }> {
  const handle = normalizeHandle(input.handle);
  if (!handle || handle.length < 3) return { error: "Handle must be at least 3 characters (letters, numbers, dashes)." };
  if (await getBusinessByHandle(handle)) return { error: "That link handle is already taken." };
  if (await getBusinessByEmail(input.email)) return { error: "An account with that email already exists." };

  const biz: Business = {
    id: uid("biz_"),
    handle,
    name: input.name,
    email: input.email,
    passwordHash: hashPassword(input.password),
    category: input.category ?? "",
    description: input.description ?? "",
    hours: input.hours ?? "",
    location: input.location ?? "",
    website: input.website ?? "",
    phone: input.phone ?? "",
    googlePlaceId: input.googlePlaceId,
    verified: input.verified ?? false,
    logoUrl: "",
    coverImageUrl: "",
    backgroundImageUrl: "",
    aiInstructions: "",
    faqs: [],
    widget: {
      themeColor: "#8b5cf6",
      greeting: `Hi! 👋 Welcome to ${input.name}. How can we help?`,
      channels: { aiChat: true, message: true, voicemail: true, callback: true },
    },
    createdAt: Date.now(),
  };

  if (supabaseEnabled) {
    await sbInsert("businesses", bizToRow(biz));
  } else {
    mem().businesses.set(biz.id, biz);
  }
  return biz;
}

export async function getBusiness(id: string): Promise<Business | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<BizRow>("businesses", `id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? rowToBiz(rows[0]) : undefined;
  }
  return mem().businesses.get(id);
}

export async function getBusinessByHandle(handle: string): Promise<Business | undefined> {
  const h = handle.toLowerCase();
  if (supabaseEnabled) {
    const rows = await sbSelect<BizRow>("businesses", `handle=eq.${encodeURIComponent(h)}&limit=1`);
    return rows[0] ? rowToBiz(rows[0]) : undefined;
  }
  return [...mem().businesses.values()].find((b) => b.handle === h);
}

export async function getBusinessByEmail(email: string): Promise<Business | undefined> {
  const e = email.toLowerCase();
  if (supabaseEnabled) {
    const rows = await sbSelect<BizRow>("businesses", `email=eq.${encodeURIComponent(e)}&limit=1`);
    return rows[0] ? rowToBiz(rows[0]) : undefined;
  }
  return [...mem().businesses.values()].find((b) => b.email.toLowerCase() === e);
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business | undefined> {
  const biz = await getBusiness(id);
  if (!biz) return undefined;
  // Fields that can never change via a generic patch. A Google-verified
  // business name is locked to its Google listing.
  const { id: _i, passwordHash: _p, email: _e, createdAt: _c, verified: _v, googlePlaceId: _g, handle: _h, ...safe } =
    patch as Business;
  if (biz.verified) delete (safe as Partial<Business>).name;

  const updated = { ...biz, ...safe };
  if (supabaseEnabled) {
    await sbUpdate("businesses", `id=eq.${encodeURIComponent(id)}`, bizToRow(updated));
  } else {
    mem().businesses.set(id, updated);
  }
  return updated;
}

export function toPublic(b: Business): PublicBusiness {
  return {
    handle: b.handle,
    name: b.name,
    category: b.category,
    description: b.description,
    hours: b.hours,
    location: b.location,
    website: b.website,
    verified: b.verified,
    logoUrl: b.logoUrl,
    coverImageUrl: b.coverImageUrl,
    backgroundImageUrl: b.backgroundImageUrl,
    widget: b.widget,
  };
}

// ---------------------------------------------------------------- sessions

export async function createSession(businessId: string): Promise<string> {
  const token = uid("sess_");
  if (supabaseEnabled) {
    await sbInsert("sessions", { token, business_id: businessId, created_at: Date.now() });
  } else {
    mem().sessions.set(token, businessId);
  }
  return token;
}

export async function getSessionBusiness(token: string | undefined): Promise<Business | undefined> {
  if (!token) return undefined;
  if (supabaseEnabled) {
    const rows = await sbSelect<{ business_id: string }>("sessions", `token=eq.${encodeURIComponent(token)}&limit=1`);
    return rows[0] ? getBusiness(rows[0].business_id) : undefined;
  }
  const bizId = mem().sessions.get(token);
  return bizId ? getBusiness(bizId) : undefined;
}

export async function destroySession(token: string | undefined): Promise<void> {
  if (!token) return;
  if (supabaseEnabled) {
    await sbDelete("sessions", `token=eq.${encodeURIComponent(token)}`);
  } else {
    mem().sessions.delete(token);
  }
}

// ----------------------------------------------------------- conversations

export async function createConversation(input: {
  businessId: string;
  channel: Channel;
  visitorName?: string;
  visitorContact?: string;
  firstMessage: Omit<Message, "id" | "at">;
}): Promise<Conversation> {
  const now = Date.now();
  const conv: Conversation = {
    id: uid("conv_"),
    businessId: input.businessId,
    channel: input.channel,
    visitorName: input.visitorName,
    visitorContact: input.visitorContact,
    visitorKey: uid("vk_"),
    unread: true,
    createdAt: now,
    updatedAt: now,
    messages: [{ ...input.firstMessage, id: uid("m_"), at: now }],
  };
  if (supabaseEnabled) {
    await sbInsert("conversations", {
      id: conv.id, business_id: conv.businessId, channel: conv.channel,
      visitor_name: conv.visitorName ?? null, visitor_contact: conv.visitorContact ?? null,
      visitor_key: conv.visitorKey, unread: true, messages: conv.messages,
      created_at: now, updated_at: now,
    });
  } else {
    mem().conversations.set(conv.id, conv);
  }
  return conv;
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<ConvRow>("conversations", `id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? rowToConv(rows[0]) : undefined;
  }
  return mem().conversations.get(id);
}

export async function listConversations(businessId: string): Promise<Conversation[]> {
  if (supabaseEnabled) {
    const rows = await sbSelect<ConvRow>(
      "conversations",
      `business_id=eq.${encodeURIComponent(businessId)}&order=updated_at.desc`
    );
    return rows.map(rowToConv);
  }
  return [...mem().conversations.values()]
    .filter((c) => c.businessId === businessId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function addMessage(
  conversationId: string,
  message: Omit<Message, "id" | "at">
): Promise<Conversation | undefined> {
  const conv = await getConversation(conversationId);
  if (!conv) return undefined;
  const full: Message = { ...message, id: uid("m_"), at: Date.now() };
  conv.messages.push(full);
  conv.updatedAt = full.at;
  if (message.role === "visitor") conv.unread = true;

  if (supabaseEnabled) {
    await sbUpdate("conversations", `id=eq.${encodeURIComponent(conversationId)}`, {
      messages: conv.messages,
      updated_at: conv.updatedAt,
      unread: conv.unread,
    });
  }
  return conv;
}

export async function markRead(conversationId: string): Promise<void> {
  if (supabaseEnabled) {
    await sbUpdate("conversations", `id=eq.${encodeURIComponent(conversationId)}`, { unread: false });
    return;
  }
  const conv = mem().conversations.get(conversationId);
  if (conv) conv.unread = false;
}

// --------------------------------------------------------- virtual numbers

type VnRow = {
  id: string; business_id: string; phone_number: string; twilio_sid: string | null;
  provider: VirtualNumber["provider"]; status: VirtualNumber["status"];
  greeting: string; sms_template: string;
  forwarding_enabled: boolean | null; forward_to_number: string | null;
  forward_start: string | null; forward_end: string | null;
  dnd_enabled: boolean | null; dnd_start: string | null; dnd_end: string | null;
  tz_offset_minutes: number | null;
  created_at: number;
};

function rowToVn(r: VnRow): VirtualNumber {
  return {
    id: r.id, businessId: r.business_id, phoneNumber: r.phone_number,
    twilioSid: r.twilio_sid ?? undefined, provider: r.provider, status: r.status,
    greeting: r.greeting, smsTemplate: r.sms_template,
    forwardingEnabled: r.forwarding_enabled ?? false,
    forwardToNumber: r.forward_to_number ?? "",
    forwardStart: r.forward_start ?? "09:00",
    forwardEnd: r.forward_end ?? "18:00",
    dndEnabled: r.dnd_enabled ?? false,
    dndStart: r.dnd_start ?? "21:00",
    dndEnd: r.dnd_end ?? "08:00",
    tzOffsetMinutes: r.tz_offset_minutes ?? 0,
    createdAt: Number(r.created_at),
  };
}

export async function getNumberByBusiness(businessId: string): Promise<VirtualNumber | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<VnRow>("virtual_numbers", `business_id=eq.${encodeURIComponent(businessId)}&limit=1`);
    return rows[0] ? rowToVn(rows[0]) : undefined;
  }
  return [...mem().virtualNumbers.values()].find((v) => v.businessId === businessId);
}

export async function getNumberByPhone(phoneNumber: string): Promise<VirtualNumber | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<VnRow>("virtual_numbers", `phone_number=eq.${encodeURIComponent(phoneNumber)}&limit=1`);
    return rows[0] ? rowToVn(rows[0]) : undefined;
  }
  return [...mem().virtualNumbers.values()].find((v) => v.phoneNumber === phoneNumber);
}

type VnDefaults = "forwardingEnabled" | "forwardToNumber" | "forwardStart" | "forwardEnd" | "dndEnabled" | "dndStart" | "dndEnd" | "tzOffsetMinutes";

export async function createVirtualNumber(vn: Omit<VirtualNumber, "id" | "createdAt" | VnDefaults>): Promise<VirtualNumber> {
  const full: VirtualNumber = {
    ...vn,
    forwardingEnabled: false,
    forwardToNumber: "",
    forwardStart: "09:00",
    forwardEnd: "18:00",
    dndEnabled: false,
    dndStart: "21:00",
    dndEnd: "08:00",
    tzOffsetMinutes: 0,
    id: uid("vn_"),
    createdAt: Date.now(),
  };
  if (supabaseEnabled) {
    await sbInsert("virtual_numbers", {
      id: full.id, business_id: full.businessId, phone_number: full.phoneNumber,
      twilio_sid: full.twilioSid ?? null, provider: full.provider, status: full.status,
      greeting: full.greeting, sms_template: full.smsTemplate,
      forwarding_enabled: false, forward_to_number: "",
      forward_start: full.forwardStart, forward_end: full.forwardEnd,
      dnd_enabled: false, dnd_start: full.dndStart, dnd_end: full.dndEnd,
      tz_offset_minutes: 0,
      created_at: full.createdAt,
    });
  } else {
    mem().virtualNumbers.set(full.id, full);
  }
  return full;
}

export async function updateVirtualNumber(
  id: string,
  patch: Partial<
    Pick<
      VirtualNumber,
      | "greeting" | "smsTemplate" | "status" | "twilioSid" | "phoneNumber" | "provider"
      | "forwardingEnabled" | "forwardToNumber" | "forwardStart" | "forwardEnd"
      | "dndEnabled" | "dndStart" | "dndEnd" | "tzOffsetMinutes"
    >
  >
): Promise<void> {
  if (supabaseEnabled) {
    const row: Record<string, unknown> = {};
    if (patch.greeting !== undefined) row.greeting = patch.greeting;
    if (patch.smsTemplate !== undefined) row.sms_template = patch.smsTemplate;
    if (patch.status !== undefined) row.status = patch.status;
    if (patch.twilioSid !== undefined) row.twilio_sid = patch.twilioSid;
    if (patch.phoneNumber !== undefined) row.phone_number = patch.phoneNumber;
    if (patch.provider !== undefined) row.provider = patch.provider;
    if (patch.forwardingEnabled !== undefined) row.forwarding_enabled = patch.forwardingEnabled;
    if (patch.forwardToNumber !== undefined) row.forward_to_number = patch.forwardToNumber;
    if (patch.forwardStart !== undefined) row.forward_start = patch.forwardStart;
    if (patch.forwardEnd !== undefined) row.forward_end = patch.forwardEnd;
    if (patch.dndEnabled !== undefined) row.dnd_enabled = patch.dndEnabled;
    if (patch.dndStart !== undefined) row.dnd_start = patch.dndStart;
    if (patch.dndEnd !== undefined) row.dnd_end = patch.dndEnd;
    if (patch.tzOffsetMinutes !== undefined) row.tz_offset_minutes = patch.tzOffsetMinutes;
    await sbUpdate("virtual_numbers", `id=eq.${encodeURIComponent(id)}`, row);
    return;
  }
  const vn = mem().virtualNumbers.get(id);
  if (vn) mem().virtualNumbers.set(id, { ...vn, ...patch });
}

// ------------------------------------------------------------- engagements

type EngRow = {
  id: string; business_id: string; caller_number: string; caller_last4: string;
  token: string; call_at: number; sms_status: Engagement["smsStatus"]; sms_sid: string | null;
  sms_body: string | null; clicked_at: number | null; conversation_id: string | null;
  call_outcome: Engagement["callOutcome"] | null; call_duration: number | null; created_at: number;
};

function rowToEng(r: EngRow): Engagement {
  return {
    id: r.id, businessId: r.business_id, callerNumber: r.caller_number, callerLast4: r.caller_last4,
    token: r.token, callAt: Number(r.call_at), smsStatus: r.sms_status, smsSid: r.sms_sid ?? undefined,
    smsBody: r.sms_body ?? undefined, clickedAt: r.clicked_at ? Number(r.clicked_at) : undefined,
    conversationId: r.conversation_id ?? undefined, callOutcome: r.call_outcome ?? undefined,
    callDuration: r.call_duration != null ? Number(r.call_duration) : undefined,
    createdAt: Number(r.created_at),
  };
}

export async function createEngagement(input: { businessId: string; callerNumber: string }): Promise<Engagement> {
  const now = Date.now();
  const eng: Engagement = {
    id: uid("eng_"),
    businessId: input.businessId,
    callerNumber: input.callerNumber,
    callerLast4: input.callerNumber.slice(-4),
    token: uid("tok_"),
    callAt: now,
    smsStatus: "pending",
    createdAt: now,
  };
  if (supabaseEnabled) {
    await sbInsert("engagements", {
      id: eng.id, business_id: eng.businessId, caller_number: eng.callerNumber,
      caller_last4: eng.callerLast4, token: eng.token, call_at: eng.callAt,
      sms_status: eng.smsStatus, sms_sid: null, sms_body: null,
      clicked_at: null, conversation_id: null, call_outcome: null, call_duration: null, created_at: eng.createdAt,
    });
  } else {
    mem().engagements.set(eng.id, eng);
  }
  return eng;
}

export async function getEngagement(id: string): Promise<Engagement | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<EngRow>("engagements", `id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? rowToEng(rows[0]) : undefined;
  }
  return mem().engagements.get(id);
}

export async function getEngagementByToken(token: string): Promise<Engagement | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<EngRow>("engagements", `token=eq.${encodeURIComponent(token)}&limit=1`);
    return rows[0] ? rowToEng(rows[0]) : undefined;
  }
  return [...mem().engagements.values()].find((e) => e.token === token);
}

export async function getEngagementBySmsSid(sid: string): Promise<Engagement | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<EngRow>("engagements", `sms_sid=eq.${encodeURIComponent(sid)}&limit=1`);
    return rows[0] ? rowToEng(rows[0]) : undefined;
  }
  return [...mem().engagements.values()].find((e) => e.smsSid === sid);
}

export async function listEngagements(businessId: string): Promise<Engagement[]> {
  if (supabaseEnabled) {
    const rows = await sbSelect<EngRow>(
      "engagements",
      `business_id=eq.${encodeURIComponent(businessId)}&order=call_at.desc&limit=200`
    );
    return rows.map(rowToEng);
  }
  return [...mem().engagements.values()]
    .filter((e) => e.businessId === businessId)
    .sort((a, b) => b.callAt - a.callAt);
}

export async function updateEngagement(
  id: string,
  patch: Partial<Pick<Engagement, "smsStatus" | "smsSid" | "smsBody" | "clickedAt" | "conversationId" | "callOutcome" | "callDuration">>
): Promise<void> {
  if (supabaseEnabled) {
    const row: Record<string, unknown> = {};
    if (patch.smsStatus !== undefined) row.sms_status = patch.smsStatus;
    if (patch.smsSid !== undefined) row.sms_sid = patch.smsSid;
    if (patch.smsBody !== undefined) row.sms_body = patch.smsBody;
    if (patch.clickedAt !== undefined) row.clicked_at = patch.clickedAt;
    if (patch.conversationId !== undefined) row.conversation_id = patch.conversationId;
    if (patch.callOutcome !== undefined) row.call_outcome = patch.callOutcome;
    if (patch.callDuration !== undefined) row.call_duration = patch.callDuration;
    await sbUpdate("engagements", `id=eq.${encodeURIComponent(id)}`, row);
    return;
  }
  const eng = mem().engagements.get(id);
  if (eng) mem().engagements.set(id, { ...eng, ...patch });
}

// ------------------------------------------------------ sms verifications

type SvRow = {
  id: string; business_id: string; business_name: string; website: string; address: string;
  contact_name: string; contact_email: string; contact_phone: string; toll_free_number: string;
  use_case: SmsVerification["useCase"]; use_case_summary: string; sample_message: string;
  opt_in_type: SmsVerification["optInType"]; opt_in_details: string; opt_in_image_url: string;
  monthly_volume: string; status: SmsVerification["status"];
  twilio_verification_sid: string | null; rejection_reason: string | null;
  submitted_at: number | null; reviewed_at: number | null; created_at: number; updated_at: number;
};

function rowToSv(r: SvRow): SmsVerification {
  return {
    id: r.id, businessId: r.business_id, businessName: r.business_name, website: r.website,
    address: r.address, contactName: r.contact_name, contactEmail: r.contact_email,
    contactPhone: r.contact_phone, tollFreeNumber: r.toll_free_number, useCase: r.use_case,
    useCaseSummary: r.use_case_summary, sampleMessage: r.sample_message, optInType: r.opt_in_type,
    optInDetails: r.opt_in_details, optInImageUrl: r.opt_in_image_url ?? "",
    monthlyVolume: r.monthly_volume, status: r.status,
    twilioVerificationSid: r.twilio_verification_sid ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    submittedAt: r.submitted_at != null ? Number(r.submitted_at) : undefined,
    reviewedAt: r.reviewed_at != null ? Number(r.reviewed_at) : undefined,
    createdAt: Number(r.created_at), updatedAt: Number(r.updated_at),
  };
}

function svToRow(v: SmsVerification): SvRow {
  return {
    id: v.id, business_id: v.businessId, business_name: v.businessName, website: v.website,
    address: v.address, contact_name: v.contactName, contact_email: v.contactEmail,
    contact_phone: v.contactPhone, toll_free_number: v.tollFreeNumber, use_case: v.useCase,
    use_case_summary: v.useCaseSummary, sample_message: v.sampleMessage, opt_in_type: v.optInType,
    opt_in_details: v.optInDetails, opt_in_image_url: v.optInImageUrl,
    monthly_volume: v.monthlyVolume, status: v.status,
    twilio_verification_sid: v.twilioVerificationSid ?? null,
    rejection_reason: v.rejectionReason ?? null,
    submitted_at: v.submittedAt ?? null, reviewed_at: v.reviewedAt ?? null,
    created_at: v.createdAt, updated_at: v.updatedAt,
  };
}

export async function getSmsVerification(businessId: string): Promise<SmsVerification | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<SvRow>("sms_verifications", `business_id=eq.${encodeURIComponent(businessId)}&limit=1`);
    return rows[0] ? rowToSv(rows[0]) : undefined;
  }
  return [...mem().smsVerifications.values()].find((v) => v.businessId === businessId);
}

export type SmsVerificationInput = Pick<
  SmsVerification,
  | "businessName" | "website" | "address" | "contactName" | "contactEmail" | "contactPhone"
  | "tollFreeNumber" | "useCase" | "useCaseSummary" | "sampleMessage"
  | "optInType" | "optInDetails" | "optInImageUrl" | "monthlyVolume"
>;

/**
 * Create or update a business's SMS verification submission and move it into
 * "pending" carrier review. Returns the saved record.
 */
export async function submitSmsVerification(
  businessId: string,
  input: SmsVerificationInput
): Promise<SmsVerification> {
  const now = Date.now();
  const existing = await getSmsVerification(businessId);
  const record: SmsVerification = {
    id: existing?.id ?? uid("smsv_"),
    businessId,
    ...input,
    status: "pending",
    twilioVerificationSid: undefined,
    rejectionReason: undefined,
    submittedAt: now,
    reviewedAt: undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (supabaseEnabled) {
    if (existing) {
      await sbUpdate("sms_verifications", `id=eq.${encodeURIComponent(record.id)}`, svToRow(record));
    } else {
      await sbInsert("sms_verifications", svToRow(record));
    }
  } else {
    mem().smsVerifications.set(record.id, record);
  }
  return record;
}

/**
 * Record the outcome of a Twilio Toll-Free Verification submission/poll:
 * stores the TFV SID and maps the latest status onto our record.
 */
export async function applySmsVerificationResult(
  businessId: string,
  result: { twilioVerificationSid?: string; status: SmsVerification["status"]; rejectionReason?: string }
): Promise<SmsVerification | undefined> {
  const existing = await getSmsVerification(businessId);
  if (!existing) return undefined;
  const finalised = result.status === "verified" || result.status === "rejected";
  const updated: SmsVerification = {
    ...existing,
    status: result.status,
    twilioVerificationSid: result.twilioVerificationSid ?? existing.twilioVerificationSid,
    rejectionReason: result.status === "rejected" ? result.rejectionReason ?? existing.rejectionReason : undefined,
    reviewedAt: finalised ? existing.reviewedAt ?? Date.now() : existing.reviewedAt,
    updatedAt: Date.now(),
  };
  if (supabaseEnabled) {
    await sbUpdate("sms_verifications", `id=eq.${encodeURIComponent(updated.id)}`, svToRow(updated));
  } else {
    mem().smsVerifications.set(updated.id, updated);
  }
  // Carrier review is over — the opt-in proof image is no longer needed.
  if (finalised) {
    const uploadId = optinUploadIdFromUrl(updated.optInImageUrl);
    if (uploadId) await deleteOptinUpload(uploadId).catch(() => {});
  }
  return updated;
}

// -------------------------------------------------------- optin uploads

type OptinRow = {
  id: string; business_id: string; content_type: string; data: string; created_at: number;
};

export async function createOptinUpload(input: {
  businessId: string;
  contentType: string;
  data: string;
}): Promise<OptinUpload> {
  const upload: OptinUpload = {
    id: uid("optin_"),
    businessId: input.businessId,
    contentType: input.contentType,
    data: input.data,
    createdAt: Date.now(),
  };
  if (supabaseEnabled) {
    await sbInsert("optin_uploads", {
      id: upload.id, business_id: upload.businessId, content_type: upload.contentType,
      data: upload.data, created_at: upload.createdAt,
    });
  } else {
    mem().optinUploads.set(upload.id, upload);
  }
  return upload;
}

export async function getOptinUpload(id: string): Promise<OptinUpload | undefined> {
  if (supabaseEnabled) {
    const rows = await sbSelect<OptinRow>("optin_uploads", `id=eq.${encodeURIComponent(id)}&limit=1`);
    const r = rows[0];
    return r ? { id: r.id, businessId: r.business_id, contentType: r.content_type, data: r.data, createdAt: Number(r.created_at) } : undefined;
  }
  return mem().optinUploads.get(id);
}

export async function deleteOptinUpload(id: string): Promise<void> {
  if (supabaseEnabled) {
    await sbDelete("optin_uploads", `id=eq.${encodeURIComponent(id)}`);
  } else {
    mem().optinUploads.delete(id);
  }
}

/** Extract our upload id from a hosted opt-in URL (".../u/optin_xxx"); null if external. */
export function optinUploadIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/u\/(optin_[0-9a-f]+)(?:[/?#]|$)/i);
  return m ? m[1] : null;
}

/** Move a verification to a final state (used by the simulated carrier review). */
export async function setSmsVerificationStatus(
  businessId: string,
  status: Extract<SmsVerification["status"], "verified" | "rejected">,
  rejectionReason?: string
): Promise<SmsVerification | undefined> {
  const existing = await getSmsVerification(businessId);
  if (!existing) return undefined;
  const updated: SmsVerification = {
    ...existing,
    status,
    rejectionReason: status === "rejected" ? rejectionReason ?? "Could not verify the details provided." : undefined,
    reviewedAt: Date.now(),
    updatedAt: Date.now(),
  };
  if (supabaseEnabled) {
    await sbUpdate("sms_verifications", `id=eq.${encodeURIComponent(updated.id)}`, svToRow(updated));
  } else {
    mem().smsVerifications.set(updated.id, updated);
  }
  const uploadId = optinUploadIdFromUrl(updated.optInImageUrl);
  if (uploadId) await deleteOptinUpload(uploadId).catch(() => {});
  return updated;
}
