/**
 * Prebuilt SMS templates the business can send to a customer's US number to
 * share their support/contact link. No free-text option — only these presets.
 * Pure (no node/server deps) so it can be imported on the client and server.
 *
 * Placeholders: {business} → business name, {link} → support contact link.
 */

export interface SupportTemplate {
  id: string;
  label: string;
  description: string;
  body: string;
}

export const SUPPORT_TEMPLATES: SupportTemplate[] = [
  {
    id: "missed",
    label: "Missed you / follow-up",
    description: "Warm follow-up after a missed call or visit.",
    body: "{business}: Sorry we missed you! Reach us instantly here: {link} — chat, leave a voice note, or request a callback. Reply STOP to opt out.",
  },
  {
    id: "help",
    label: "How can we help",
    description: "General support invite.",
    body: "{business}: Need a hand? Chat with us, leave a voice note, or request a callback here: {link}. Reply STOP to opt out.",
  },
  {
    id: "order",
    label: "Order / appointment support",
    description: "Help with an order or booking.",
    body: "{business}: Questions about your order or appointment? We're here to help: {link}. Reply STOP to opt out.",
  },
  {
    id: "review",
    label: "Review / feedback",
    description: "Ask for feedback.",
    body: "{business}: We'd love your feedback! Tell us how we did here: {link}. Reply STOP to opt out.",
  },
];

export function getSupportTemplate(id: string): SupportTemplate | undefined {
  return SUPPORT_TEMPLATES.find((t) => t.id === id);
}

/** Fill {business} and {link} placeholders. */
export function renderSupport(body: string, businessName: string, link: string): string {
  return body.replaceAll("{business}", businessName).replaceAll("{link}", link);
}
