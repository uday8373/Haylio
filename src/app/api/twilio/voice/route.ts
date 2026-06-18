import { NextRequest, NextResponse } from "next/server";
import {
  confirmGatherTwiml,
  decideRouting,
  DEFAULT_CONFIRM_GREETING,
  DEFAULT_GREETING,
  forwardMinutesUsed,
  forwardTwiml,
  handleIncomingCall,
  MISSED_CALL_RING_SECONDS,
  rejectTwiml,
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

  // Forward mode: ring the owner's real phone only inside the forwarding
  // window, outside DND hours, and under the monthly minutes cap. Out-of-window
  // forward calls fall through to the instant missed-call link below.
  const minutesUsed = await forwardMinutesUsed(vn.businessId);
  const routing = decideRouting(vn, minutesUsed);
  if (routing.forward) {
    const engagement = await startEngagement(vn, from);
    return xml(forwardTwiml(vn, engagement.id));
  }

  // Missed-call mode: text the tracked support link, let the call ring for a
  // moment, then drop it. The call is never answered, so no talk-time is billed
  // and the owner's phone never rings — this is the non-chargeable path.
  if (vn.callMode === "missed_call") {
    await handleIncomingCall(vn, from); // logs the engagement + sends the tracked SMS
    // Hold the (still-ringing, un-answered) call briefly so the caller hears a
    // ring or two before we reject it.
    await new Promise((resolve) => setTimeout(resolve, MISSED_CALL_RING_SECONDS * 1000));
    return xml(rejectTwiml());
  }

  // Forward mode, but outside its active window (out of hours / DND / minutes
  // cap): fall back to the support-link text and drop the call immediately.
  if (vn.callMode === "forward") {
    await handleIncomingCall(vn, from); // logs the engagement + sends the tracked SMS
    return xml(rejectTwiml());
  }

  // IVR mode: greet the caller and ask them to press 1 to receive the support
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
