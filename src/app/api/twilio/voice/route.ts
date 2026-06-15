import { NextRequest, NextResponse } from "next/server";
import {
  confirmGatherTwiml,
  decideRouting,
  DEFAULT_CONFIRM_GREETING,
  DEFAULT_GREETING,
  forwardMinutesUsed,
  forwardTwiml,
  resolveVirtualNumber,
  startEngagement,
} from "@/lib/engagement";
import { getBusiness } from "@/lib/store";
import { getIvrScript } from "@/lib/ivr";
import { baseUrl, validateTwilioSignature } from "@/lib/telephony";

function xml(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { "content-type": "text/xml" } });
}

/** Twilio voice webhook: intercept the call, greet, trigger tracked SMS, hang up. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  if (!validateTwilioSignature(`${baseUrl()}/api/twilio/voice`, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const to = params.To;
  const from = params.From;
  const vn = to ? await resolveVirtualNumber(to) : undefined;
  if (!vn || !from) {
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>This number is not configured.</Say><Hangup/></Response>`);
  }

  // Route the call: ring the owner's real phone only inside the forwarding
  // window, outside DND hours, and under the monthly minutes cap — otherwise
  // (and on missed calls) the caller gets the greeting + tracked SMS link.
  const minutesUsed = await forwardMinutesUsed(vn.businessId);
  const routing = decideRouting(vn, minutesUsed);
  if (routing.forward) {
    const engagement = await startEngagement(vn, from);
    return xml(forwardTwiml(vn, engagement.id));
  }

  // Otherwise: greet the caller and ask them to press 1 to receive the support
  // link by text. The SMS is only sent once they confirm (see ./confirm).
  const engagement = await startEngagement(vn, from);
  const business = await getBusiness(vn.businessId);
  const bizName = business?.name ?? "our team";
  const greeting =
    vn.greeting && vn.greeting !== DEFAULT_GREETING(bizName)
      ? vn.greeting
      : DEFAULT_CONFIRM_GREETING(bizName);
  const action = `${baseUrl()}/api/twilio/voice/confirm?eng=${encodeURIComponent(engagement.id)}`;
  return xml(confirmGatherTwiml({ greeting, actionUrl: action, voice: vn.voice, script: getIvrScript(vn.ivrScriptId) }));
}
