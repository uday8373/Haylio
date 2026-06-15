export type Channel = "chat" | "message" | "voicemail" | "callback";

export interface Faq {
  q: string;
  a: string;
}

export interface WidgetConfig {
  themeColor: string;
  greeting: string;
  channels: {
    aiChat: boolean;
    message: boolean;
    voicemail: boolean;
    callback: boolean;
  };
}

export interface Business {
  id: string;
  handle: string;
  name: string;
  email: string;
  passwordHash: string;
  category: string;
  description: string;
  hours: string;
  location: string;
  website: string;
  phone: string;
  googlePlaceId?: string;
  /** true when the business identity was picked from Google Business listings */
  verified: boolean;
  /** Twilio subaccount that owns this business's number(s). One per business. */
  twilioSubaccountSid?: string;
  /** Paywall: "active" once a Cashfree subscription is authorized. */
  planStatus: "inactive" | "active";
  /** Cashfree subscription id backing the active plan. */
  planSubscriptionId?: string;
  planActivatedAt?: number;
  /** Brand images — external URLs (no upload in prototype) */
  logoUrl: string;
  coverImageUrl: string;
  backgroundImageUrl: string;
  /** Extra owner-written guidance used to train the AI receptionist */
  aiInstructions: string;
  faqs: Faq[];
  widget: WidgetConfig;
  createdAt: number;
}

export interface Message {
  id: string;
  role: "visitor" | "business" | "ai";
  kind: "text" | "audio" | "callback";
  text?: string;
  audioDataUrl?: string;
  phone?: string;
  preferredTime?: string;
  at: number;
}

/** Everything we can learn about a widget visitor at first contact. */
export interface VisitorMeta {
  // Network / geo (server-derived)
  ip?: string;
  country?: string; // ISO 3166-1 alpha-2
  region?: string;
  city?: string;
  // Device / browser
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: "mobile" | "tablet" | "desktop";
  userAgent?: string;
  // Locale / display (mostly client-provided)
  language?: string;
  languages?: string[];
  timezone?: string;
  screen?: string; // "1920×1080"
  viewport?: string; // "1280×800"
  devicePixelRatio?: number;
  platform?: string;
  deviceMemory?: number; // GB
  cpuCores?: number;
  touch?: boolean;
  connection?: string; // effective connection type, e.g. "4g"
  colorScheme?: "light" | "dark";
  // Source
  referrer?: string;
  pageUrl?: string;
  collectedAt?: number;
}

/** Owner-set category for a conversation. "none" = untagged. */
export type ConversationTag = "none" | "query" | "complaint" | "request" | "spam";

export interface Conversation {
  id: string;
  businessId: string;
  channel: Channel;
  visitorName?: string;
  visitorContact?: string;
  visitorKey: string;
  messages: Message[];
  unread: boolean;
  /** Owner-assigned category (query/complaint/request/spam). */
  tag?: ConversationTag;
  /** Visitor analytics captured when the conversation began. */
  visitorMeta?: VisitorMeta;
  createdAt: number;
  updatedAt: number;
}

// ------------------------------------------------------------------ team

/** Roles a teammate can hold within a business. Owner is always an admin. */
export type TeamRole = "admin" | "member";

/** Lifecycle of an invited teammate. */
export type TeamMemberStatus = "invited" | "active";

/**
 * A teammate invited to view and manage a business. The business owner is the
 * implicit admin and is not stored as a member. Each invited email is unique
 * across the app — once invited/accepted it can't be used to sign up a new
 * business.
 */
export interface TeamMember {
  id: string;
  businessId: string;
  /** Normalized (lowercase) email the invite was sent to. */
  email: string;
  role: TeamRole;
  status: TeamMemberStatus;
  /** Name of the admin who sent the invite (for display). */
  invitedByName?: string;
  /** Single-use-ish token embedded in the accept link. */
  token: string;
  invitedAt: number;
  acceptedAt?: number;
}

/** Business shape safe to send to the public widget. */
export interface PublicBusiness {
  handle: string;
  name: string;
  category: string;
  description: string;
  hours: string;
  location: string;
  website: string;
  verified: boolean;
  logoUrl: string;
  coverImageUrl: string;
  backgroundImageUrl: string;
  widget: WidgetConfig;
}

/** A toll-free virtual number assigned to a business (the Privacy Wrapper). */
export interface VirtualNumber {
  id: string;
  businessId: string;
  phoneNumber: string;
  twilioSid?: string;
  /** Twilio subaccount this number was purchased under. */
  subaccountSid?: string;
  provider: "simulator" | "twilio";
  status: "simulated" | "pending_verification" | "active";
  greeting: string;
  smsTemplate: string;
  /** Amazon Polly voice for the IVR (see IVR_VOICES). */
  voice: string;
  /** Predefined IVR wording preset (see IVR_SCRIPTS). */
  ivrScriptId: string;
  /** Ring the owner's real number first (caller ID = the toll-free number). */
  forwardingEnabled: boolean;
  forwardToNumber: string;
  /** Daily window when forwarding is active (HH:MM, owner's local time). */
  forwardStart: string;
  forwardEnd: string;
  /** Do-not-disturb window — always send the SMS link instead of ringing. */
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  /** Owner's timezone offset (minutes, as from Date.getTimezoneOffset()). */
  tzOffsetMinutes: number;
  createdAt: number;
}

export type CallOutcome = "texted" | "forwarded_answered" | "forwarded_missed";

export type SmsStatus = "pending" | "sent" | "delivered" | "failed" | "opted_out";

/** One call → SMS → click → conversation funnel record. */
export interface Engagement {
  id: string;
  businessId: string;
  callerNumber: string;
  callerLast4: string;
  token: string;
  callAt: number;
  smsStatus: SmsStatus;
  smsSid?: string;
  smsBody?: string;
  clickedAt?: number;
  conversationId?: string;
  callOutcome?: CallOutcome;
  /** Seconds the forwarded call lasted (answered calls only). */
  callDuration?: number;
  createdAt: number;
}

/**
 * Toll-Free Verification. Before a toll-free number can send SMS, the carrier
 * (via Twilio) requires the business and its messaging use case — including how
 * customers opt in — to be reviewed. One record per business.
 */
export type SmsVerificationStatus =
  | "not_submitted"
  | "pending"
  | "verified"
  | "rejected";

export type SmsUseCase =
  | "customer_care"
  | "appointment_reminders"
  | "two_factor"
  | "account_notifications"
  | "delivery_notifications"
  | "marketing";

/** How customers consent to receive texts (carrier requires this). */
export type OptInType =
  | "web_form"
  | "verbal"
  | "paper_form"
  | "in_store"
  | "qr_code"
  | "other";

/** Twilio business-type enum (required for toll-free verification). */
export type BusinessType =
  | "PRIVATE_PROFIT"
  | "PUBLIC_PROFIT"
  | "NON_PROFIT"
  | "SOLE_PROPRIETOR"
  | "GOVERNMENT";

/** Twilio business-registration authority enum (OTHER covers anything unlisted). */
export type RegistrationAuthority =
  | "EIN" | "CBN" | "CRN" | "PROVINCIAL_NUMBER" | "VAT" | "ACN" | "ABN" | "BRN"
  | "SIREN" | "SIRET" | "NZBN" | "USt-IdNr" | "CIF" | "NIF" | "CNPJ" | "UID" | "NEQ" | "OTHER";

export interface SmsVerification {
  id: string;
  businessId: string;
  /** Business name as it should appear to the carrier. */
  businessName: string;
  website: string;
  /** Combined address (for our records/display). */
  address: string;
  /** Structured address (required by the carrier). */
  addressStreet: string;
  addressStreet2: string;
  addressCity: string;
  addressState: string;
  addressPostal: string;
  addressCountry: string; // ISO 3166-1 alpha-2
  /** Carrier-required business type. */
  businessType: BusinessType | "";
  /** Registration details — required unless businessType is SOLE_PROPRIETOR. */
  registrationNumber: string;
  registrationAuthority: RegistrationAuthority | "";
  registrationCountry: string; // ISO 3166-1 alpha-2, e.g. "US", "IN"
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  /** The toll-free number being verified, e.g. "+1 800 555 0100". */
  tollFreeNumber: string;
  useCase: SmsUseCase;
  /** Plain-language description of how the number will be used to text customers. */
  useCaseSummary: string;
  /** A representative message the business will send. */
  sampleMessage: string;
  optInType: OptInType;
  /** Description of the opt-in flow / link to where consent is collected. */
  optInDetails: string;
  /** Publicly hosted image showing the opt-in workflow (required by Twilio). */
  optInImageUrl: string;
  /** Estimated messages per month — one of Twilio's allowed buckets. */
  monthlyVolume: string;
  status: SmsVerificationStatus;
  /** Twilio Toll-Free Verification SID (TFV…) once submitted to the carrier. */
  twilioVerificationSid?: string;
  /** Set by the carrier review when status is "rejected". */
  rejectionReason?: string;
  submittedAt?: number;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

// ------------------------------------------------------------------- CRM

/** Manual lead status set by the business owner. "none" = untagged/new. */
export type LeadTag = "none" | "hot" | "warm" | "qualified" | "cold";

/** Persisted CRM overlay for a lead, keyed by business + contact key. */
export interface LeadTagRecord {
  businessId: string;
  contactKey: string;
  tag: LeadTag;
  note?: string;
  /** Owner-edited display name, overrides the derived one. */
  name?: string;
  updatedAt: number;
}

export type LeadTimelineKind =
  | "call"
  | "sms"
  | "click"
  | "chat"
  | "message"
  | "voicemail"
  | "callback";

/** One interaction in a lead's unified, cross-channel timeline. */
export interface LeadTimelineItem {
  id: string;
  kind: LeadTimelineKind;
  at: number;
  title: string;
  detail?: string;
  status?: string;
  conversationId?: string;
}

/** A lead = one person, aggregating every interaction across channels. */
export interface Lead {
  /** Stable contact key (also the id used in URLs/tagging). */
  key: string;
  businessId: string;
  name: string;
  contact?: string;
  phone?: string;
  email?: string;
  channels: LeadTimelineKind[];
  tag: LeadTag;
  note?: string;
  /** Heuristic 0–100 engagement score. */
  score: number;
  firstAt: number;
  lastAt: number;
  callCount: number;
  messageCount: number;
  clicked: boolean;
  timeline: LeadTimelineItem[];
}

/**
 * A connected calendar (Google) for appointment booking. Stored separately
 * from Business so OAuth tokens never leak through business API responses.
 */
export interface CalendarAccount {
  businessId: string;
  provider: "google";
  email: string;
  calendarId: string; // usually "primary"
  refreshToken: string;
  accessToken?: string;
  tokenExpiry?: number;
  // Availability config (owner's local working window).
  slotMinutes: number; // appointment length
  days: number[]; // workdays, 0=Sun … 6=Sat
  startHour: number; // e.g. 9
  endHour: number; // e.g. 17
  tzOffsetMinutes: number; // owner's UTC offset (as from Date.getTimezoneOffset)
  createdAt: number;
  updatedAt: number;
}

/** A bookable appointment slot offered to a lead. */
export interface BookingSlot {
  startISO: string; // RFC3339 with offset
  endISO: string;
  label: string; // human label in the owner's timezone, e.g. "Tue, Jun 17 · 2:30 PM"
}

/** A Google Business candidate returned by the places search. */
export interface PlaceCandidate {
  placeId: string;
  name: string;
  address: string;
  website: string;
  phone: string;
  hours: string;
  category: string;
}
