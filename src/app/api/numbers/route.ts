import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { createVirtualNumber, getNumberByBusiness, updateBusiness, updateVirtualNumber } from "@/lib/store";
import {
  createTwilioSubaccount,
  purchaseTollFreeNumber,
  syncNumberWebhooks,
  twilioEnabled,
} from "@/lib/telephony";
import { DEFAULT_GREETING, DEFAULT_SMS_TEMPLATE, FORWARD_MINUTES_LIMIT, forwardMinutesUsed } from "@/lib/engagement";
import { isValidScriptId, isValidVoice } from "@/lib/ivr";
import { billingEnabled } from "@/lib/billing";

/** Current business's virtual number (or null). */
export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vn = await getNumberByBusiness(biz.id);
  const minutesUsed = vn ? await forwardMinutesUsed(biz.id) : 0;
  return NextResponse.json({ number: vn ?? null, live: twilioEnabled, minutesUsed, minutesLimit: FORWARD_MINUTES_LIMIT });
}

/**
 * Provision a chosen toll-free number for the current business.
 * Each business gets its own Twilio subaccount; the number is bought under it.
 * Body: { phoneNumber: "+1888…" } — one of the options from /api/numbers/available.
 * A simulated number is upgraded in place when Twilio is now configured.
 */
export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Paywall: a paid plan is required before provisioning a number.
  if (billingEnabled && biz.planStatus !== "active") {
    return NextResponse.json(
      { error: "Subscribe to activate your account before getting a number.", paywall: true },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  const phoneNumber = typeof body?.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  if (!/^\+?[0-9]\d{6,15}$/.test(phoneNumber.replace(/[^\d+]/g, ""))) {
    return NextResponse.json({ error: "Pick a number from the list first." }, { status: 400 });
  }

  const existing = await getNumberByBusiness(biz.id);
  if (existing && !(existing.provider === "simulator" && twilioEnabled)) {
    return NextResponse.json({ error: "You already have a number." }, { status: 400 });
  }

  try {
    // 1. Ensure the business has its own Twilio subaccount.
    let subaccountSid = biz.twilioSubaccountSid;
    if (!subaccountSid) {
      subaccountSid = await createTwilioSubaccount(`Haylio · ${biz.name} (${biz.handle})`);
      await updateBusiness(biz.id, { twilioSubaccountSid: subaccountSid });
    }

    // 2. Buy the chosen number under that subaccount.
    const bought = await purchaseTollFreeNumber({ subaccountSid, phoneNumber });

    if (existing) {
      await updateVirtualNumber(existing.id, {
        phoneNumber: bought.phoneNumber,
        twilioSid: bought.sid,
        subaccountSid: bought.subaccountSid,
        provider: bought.provider,
        status: bought.status,
      });
      return NextResponse.json({ number: { ...existing, ...bought } });
    }

    const vn = await createVirtualNumber({
      businessId: biz.id,
      phoneNumber: bought.phoneNumber,
      twilioSid: bought.sid,
      subaccountSid: bought.subaccountSid,
      provider: bought.provider,
      status: bought.status,
      greeting: DEFAULT_GREETING(biz.name),
      smsTemplate: DEFAULT_SMS_TEMPLATE,
    });
    return NextResponse.json({ number: vn });
  } catch (err) {
    console.error("Number provisioning failed:", err);
    const detail = err instanceof Error ? err.message.match(/"message":"([^"]+)"/)?.[1] : undefined;
    const msg = detail ? `Twilio: ${detail}` : "Could not provision a number — try again shortly.";
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
    greeting?: string; smsTemplate?: string; voice?: string; ivrScriptId?: string;
    forwardingEnabled?: boolean; forwardToNumber?: string;
    forwardStart?: string; forwardEnd?: string; dndEnabled?: boolean; dndStart?: string; dndEnd?: string;
    tzOffsetMinutes?: number;
  } = {};
  const isHHMM = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  if (typeof body?.greeting === "string") patch.greeting = body.greeting.slice(0, 500);
  if (typeof body?.smsTemplate === "string") patch.smsTemplate = body.smsTemplate.slice(0, 320);
  if (isValidVoice(body?.voice)) patch.voice = body.voice;
  if (isValidScriptId(body?.ivrScriptId)) patch.ivrScriptId = body.ivrScriptId;
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
      await syncNumberWebhooks(vn.twilioSid, vn.subaccountSid);
    } catch (err) {
      console.error("Webhook sync failed:", err);
    }
  }
  return NextResponse.json({ ok: true });
}
