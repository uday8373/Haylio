import { NextRequest, NextResponse } from "next/server";
import { getEngagement, getNumberByBusiness, updateEngagement } from "@/lib/store";
import { sendTrackedSms, voiceTwiml, DEFAULT_GREETING } from "@/lib/engagement";
import { getBusiness } from "@/lib/store";
import { baseUrl, validateTwilioSignature } from "@/lib/telephony";

function xml(body: string) {
  return new NextResponse(body, { headers: { "content-type": "text/xml" } });
}

/**
 * Dial action callback: fires after the forwarded call attempt ends.
 * Answered → just log it. Missed/busy/failed → greeting + tracked SMS fallback.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  const url = `${baseUrl()}${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (!validateTwilioSignature(url, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const engId = req.nextUrl.searchParams.get("eng");
  const eng = engId ? await getEngagement(engId) : undefined;
  if (!eng) return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);

  const status = params.DialCallStatus; // completed | no-answer | busy | failed | canceled

  if (status === "completed") {
    const duration = parseInt(params.DialCallDuration ?? "0", 10) || 0;
    await updateEngagement(eng.id, { callOutcome: "forwarded_answered", callDuration: duration });
    return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);
  }

  // Missed → fall back to the text-back flow.
  await updateEngagement(eng.id, { callOutcome: "forwarded_missed" });
  const vn = await getNumberByBusiness(eng.businessId);
  if (!vn) return xml(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`);

  await sendTrackedSms(vn, eng);
  const biz = await getBusiness(eng.businessId);
  return xml(voiceTwiml(vn.greeting || DEFAULT_GREETING(biz?.name ?? "the business"), vn.voice));
}
