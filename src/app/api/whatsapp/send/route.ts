import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { createWhatsAppMessage, getNumberByBusiness } from "@/lib/store";
import { baseUrl, providerFor } from "@/lib/telephony";
import { getSupportTemplate, renderSupport } from "@/lib/supportTemplates";
import { isUsingSandbox, resolveWhatsAppFrom, toWhatsAppAddress } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Normalize input to international E.164 (+<country><number>), or null if invalid. */
function toE164(input: string): string | null {
  let raw = input.replace(/[^\d+]/g, "");
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`; // accept "00" intl prefix
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  return null;
}

/**
 * Send a WhatsApp message to a customer's number via Twilio. The body is either
 * a free-form message or one of the prebuilt support-link templates. The send is
 * logged either way (including failures) so it shows in the WhatsApp tab.
 */
export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vn = await getNumberByBusiness(biz.id);
  if (!vn) return NextResponse.json({ error: "Purchase your number first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const to = toE164(String(body.to || ""));
  if (!to) {
    return NextResponse.json(
      { error: "Enter the customer's WhatsApp number in international format, e.g. +1 415 555 0134 or +44 7700 900123." },
      { status: 400 }
    );
  }

  // Resolve the message: a template fills the support link, otherwise free-form text.
  let message: string;
  let link: string | undefined;
  if (body.templateId) {
    const template = getSupportTemplate(String(body.templateId));
    if (!template) return NextResponse.json({ error: "Unknown message template." }, { status: 400 });
    link = `${baseUrl()}/b/${biz.handle}`;
    message = renderSupport(template.body, biz.name, link);
  } else {
    message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Type a message or pick a template." }, { status: 400 });
    if (message.length > 1500) return NextResponse.json({ error: "Message is too long (max 1500 characters)." }, { status: 400 });
  }

  const from = resolveWhatsAppFrom(vn.whatsAppFrom);
  // The sandbox sender belongs to the main Twilio account; a saved sender lives
  // under the business's subaccount.
  const accountSid = isUsingSandbox(vn.whatsAppFrom) ? undefined : vn.subaccountSid;

  try {
    const res = await providerFor(vn.provider).sendWhatsApp({
      from,
      to: toWhatsAppAddress(to),
      body: message,
      accountSid,
    });
    const logged = await createWhatsAppMessage({
      businessId: biz.id,
      toNumber: to,
      body: message,
      status: res.status === "delivered" ? "delivered" : "sent",
      sid: res.sid,
    });
    return NextResponse.json({ ok: true, to, message, link, status: logged.status, id: logged.id });
  } catch (err) {
    const detail =
      err instanceof Error ? (err.message.match(/"message":\s*"([^"]+)"/)?.[1] ?? err.message) : "WhatsApp send failed";
    await createWhatsAppMessage({
      businessId: biz.id,
      toNumber: to,
      body: message,
      status: "failed",
      error: detail,
    });
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
