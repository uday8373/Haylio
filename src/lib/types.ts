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

export interface Conversation {
  id: string;
  businessId: string;
  channel: Channel;
  visitorName?: string;
  visitorContact?: string;
  visitorKey: string;
  messages: Message[];
  unread: boolean;
  createdAt: number;
  updatedAt: number;
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
  provider: "simulator" | "twilio";
  status: "simulated" | "pending_verification" | "active";
  greeting: string;
  smsTemplate: string;
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

export interface SmsVerification {
  id: string;
  businessId: string;
  /** Business name as it should appear to the carrier. */
  businessName: string;
  website: string;
  /** Business address. */
  address: string;
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
