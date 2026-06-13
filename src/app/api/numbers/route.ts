import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { createVirtualNumber, getNumberByBusiness, updateVirtualNumber } from "@/lib/store";
import { syncNumberWebhooks, telephony, twilioEnabled } from "@/lib/telephony";
import { DEFAULT_GREETING, DEFAULT_SMS_TEMPLATE, FORWARD_MINUTES_LIMIT, forwardMinutesUsed } from "@/lib/engagement";

/** Current business's virtual number (or null). */
export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vn = await getNumberByBusiness(biz.id);
  const minutesUsed = vn ? await forwardMinutesUsed(biz.id) : 0;
  return NextResponse.json({ number: vn ?? null, live: twilioEnabled, minutesUsed, minutesLimit: FORWARD_MINUTES_LIMIT });
}

/**
 * Provision a toll-free number for the current business.
 * If the business holds a simulated number and Twilio is now configured,
 * this upgrades it in place to a real Twilio number.
 */
export async function POST() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await getNumberByBusiness(biz.id);
  if (existing && !(existing.provider === "simulator" && twilioEnabled)) {
    return NextResponse.json({ error: "You already have a number." }, { status: 400 });
  }

  try {
    const bought = await telephony().provisionTollFree();
    if (existing) {
      // Upgrade simulated → real, keeping greeting/template and engagement history.
      await updateVirtualNumber(existing.id, {
        phoneNumber: bought.phoneNumber,
        twilioSid: bought.sid,
        provider: bought.provider,
        status: bought.status,
      });
      return NextResponse.json({ number: { ...existing, ...bought } });
    }
    const vn = await createVirtualNumber({
      businessId: biz.id,
      phoneNumber: bought.phoneNumber,
      twilioSid: bought.sid,
      provider: bought.provider,
      status: bought.status,
      greeting: DEFAULT_GREETING(biz.name),
      smsTemplate: DEFAULT_SMS_TEMPLATE,
    });
    return NextResponse.json({ number: vn });
  } catch (err) {
    console.error("Number provisioning failed:", err);
    const detail = err instanceof Error ? err.message.match(/"message":"([^"]+)"/)?.[1] : undefined;
    const msg = detail
      ? `Twilio: ${detail}`
      : "Could not provision a number — try again shortly.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

/** Update greeting / SMS template. */
export async function PATCH(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vn = await getNumberByBusiness(biz.id);
  if (!vn) return NextResponse.json({ error: "No number yet" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const patch: {
    greeting?: string; smsTemplate?: string; forwardingEnabled?: boolean; forwardToNumber?: string;
    forwardStart?: string; forwardEnd?: string; dndEnabled?: boolean; dndStart?: string; dndEnd?: string;
    tzOffsetMinutes?: number;
  } = {};
  const isHHMM = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  if (typeof body?.greeting === "string") patch.greeting = body.greeting.slice(0, 500);
  if (typeof body?.smsTemplate === "string") patch.smsTemplate = body.smsTemplate.slice(0, 320);
  if (typeof body?.forwardingEnabled === "boolean") patch.forwardingEnabled = body.forwardingEnabled;
  if (isHHMM(body?.forwardStart)) patch.forwardStart = body.forwardStart;
  if (isHHMM(body?.forwardEnd)) patch.forwardEnd = body.forwardEnd;
  if (typeof body?.dndEnabled === "boolean") patch.dndEnabled = body.dndEnabled;
  if (isHHMM(body?.dndStart)) patch.dndStart = body.dndStart;
  if (isHHMM(body?.dndEnd)) patch.dndEnd = body.dndEnd;
  if (typeof body?.tzOffsetMinutes === "number" && Math.abs(body.tzOffsetMinutes) <= 14 * 60) {
    patch.tzOffsetMinutes = Math.round(body.tzOffsetMinutes);
  }
  if (typeof body?.forwardToNumber === "string") {
    const raw = body.forwardToNumber.replace(/[^\d+]/g, "");
    if (raw && !/^\+[1-9]\d{7,14}$/.test(raw)) {
      return NextResponse.json(
        { error: "Forwarding number must be in international format, e.g. +1 415 555 0134." },
        { status: 400 }
      );
    }
    patch.forwardToNumber = raw;
  }
  const enabling = patch.forwardingEnabled ?? vn.forwardingEnabled;
  const target = patch.forwardToNumber ?? vn.forwardToNumber;
  if (enabling && !target) {
    return NextResponse.json({ error: "Add the number to forward calls to before enabling forwarding." }, { status: 400 });
  }
  await updateVirtualNumber(vn.id, patch);

  // Keep the Twilio number's webhooks pointed at PUBLIC_BASE_URL once it's public.
  if (vn.provider === "twilio" && vn.twilioSid) {
    try {
      await syncNumberWebhooks(vn.twilioSid);
    } catch (err) {
      console.error("Webhook sync failed:", err);
    }
  }
  return NextResponse.json({ ok: true });
}
