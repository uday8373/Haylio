import { NextRequest, NextResponse } from "next/server";
import { getEngagementBySmsSid, updateEngagement } from "@/lib/store";
import { baseUrl, validateTwilioSignature } from "@/lib/telephony";
import type { SmsStatus } from "@/lib/types";

/** Twilio delivery callbacks → keep the funnel's SMS status accurate. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  if (!validateTwilioSignature(`${baseUrl()}/api/twilio/sms-status`, params, req.headers.get("x-twilio-signature"))) {
    return new NextResponse("Invalid signature", { status: 403 });
  }

  const sid = params.MessageSid || params.SmsSid;
  const status = params.MessageStatus; // queued|sent|delivered|undelivered|failed
  if (sid && status) {
    const eng = await getEngagementBySmsSid(sid);
    if (eng) {
      const mapped: SmsStatus =
        status === "delivered" ? "delivered" : status === "failed" || status === "undelivered" ? "failed" : "sent";
      await updateEngagement(eng.id, { smsStatus: mapped });
    }
  }
  return new NextResponse(null, { status: 204 });
}
