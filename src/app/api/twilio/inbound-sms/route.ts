import { NextRequest, NextResponse } from "next/server";
import { createConversation, listEngagements } from "@/lib/store";
import { resolveVirtualNumber } from "@/lib/engagement";
import { baseUrl, validateTwilioSignature } from "@/lib/telephony";

function xml(body: string) {
  return new NextResponse(body, { headers: { "content-type": "text/xml" } });
}

/**
 * Inbound SMS to a virtual number.
 * - STOP/UNSUBSCRIBE → Twilio's default opt-out already blocks future sends;
 *   we just acknowledge silently and mark the latest engagement.
 * - Anything else → lands in the business inbox as a message conversation.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  if (!validateTwilioSignature(`${baseUrl()}/api/twilio/inbound-sms`, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const vn = params.To ? await resolveVirtualNumber(params.To) : undefined;
  const from = params.From;
  const body = (params.Body || "").trim();
  if (!vn || !from) return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);

  const upper = body.toUpperCase();
  if (["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(upper)) {
    // Twilio handles the actual block; reflect it on this caller's engagements.
    const { updateEngagement } = await import("@/lib/store");
    const engs = await listEngagements(vn.businessId);
    const theirs = engs.find((e) => e.callerNumber === from);
    if (theirs) await updateEngagement(theirs.id, { smsStatus: "opted_out" });
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  }

  if (body) {
    await createConversation({
      businessId: vn.businessId,
      channel: "message",
      visitorName: `SMS ${from.slice(-4)}`,
      visitorContact: from,
      firstMessage: { role: "visitor", kind: "text", text: body },
    });
  }
  return xml(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
}
