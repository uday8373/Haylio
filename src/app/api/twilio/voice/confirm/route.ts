import { NextRequest, NextResponse } from "next/server";
import { confirmResultTwiml, resolveVirtualNumber, sendTrackedSms } from "@/lib/engagement";
import { getEngagement, updateEngagement } from "@/lib/store";
import { getIvrScript } from "@/lib/ivr";
import { baseUrl, validateTwilioSignature } from "@/lib/telephony";

function xml(body: string, status = 200) {
  return new NextResponse(body, { status, headers: { "content-type": "text/xml" } });
}

/**
 * Gather callback for the voice intercept. Twilio posts the caller's keypress
 * here after the greeting. Press 1 → send the tracked support link by SMS;
 * anything else → polite goodbye, no text.
 */
export async function POST(req: NextRequest) {
  const eng = new URL(req.url).searchParams.get("eng") ?? "";
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // Twilio signs the full URL it called, including the ?eng=… query string.
  const sigUrl = `${baseUrl()}/api/twilio/voice/confirm?eng=${encodeURIComponent(eng)}`;
  if (!validateTwilioSignature(sigUrl, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const vn = params.To ? await resolveVirtualNumber(params.To) : undefined;
  const script = getIvrScript(vn?.ivrScriptId);
  const voice = vn?.voice;

  // Caller declined or didn't press 1.
  if (params.Digits !== "1") return xml(confirmResultTwiml({ sent: false, voice, script }));

  const engagement = eng ? await getEngagement(eng) : undefined;
  if (!engagement || !vn) return xml(confirmResultTwiml({ sent: false, voice, script }));

  await updateEngagement(engagement.id, { callOutcome: "texted" });
  const { smsError } = await sendTrackedSms(vn, engagement);
  return xml(confirmResultTwiml({ sent: !smsError, voice, script }));
}
