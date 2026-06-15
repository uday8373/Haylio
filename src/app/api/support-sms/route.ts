import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness } from "@/lib/store";
import { baseUrl, providerFor } from "@/lib/telephony";
import { getSupportTemplate, renderSupport } from "@/lib/supportTemplates";

export const dynamic = "force-dynamic";

/** Normalize input to an international E.164 number (+<country><number>), or null if invalid. */
function toE164(input: string): string | null {
  let raw = input.replace(/[^\d+]/g, "");
  // Accept the "00" international dialing prefix as an alias for "+".
  if (raw.startsWith("00")) raw = `+${raw.slice(2)}`;
  if (/^\+[1-9]\d{7,14}$/.test(raw)) return raw;
  return null;
}

/**
 * Send a support/contact link to a customer's US number using one of the
 * prebuilt templates. No custom message — templateId must match a preset.
 */
export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const vn = await getNumberByBusiness(biz.id);
  if (!vn) return NextResponse.json({ error: "Purchase your number first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const template = getSupportTemplate(String(body.templateId || ""));
  if (!template) return NextResponse.json({ error: "Pick a message template." }, { status: 400 });

  const to = toE164(String(body.to || ""));
  if (!to) {
    return NextResponse.json(
      { error: "Enter the number in international format with country code, e.g. +1 415 555 0134 or +44 7700 900123." },
      { status: 400 }
    );
  }

  const link = `${baseUrl()}/b/${biz.handle}`;
  const message = renderSupport(template.body, biz.name, link);

  try {
    const sms = await providerFor(vn.provider).sendSms({
      from: vn.phoneNumber,
      to,
      body: message,
      accountSid: vn.subaccountSid,
    });
    return NextResponse.json({ ok: true, to, message, link, status: sms.status });
  } catch (err) {
    const detail =
      err instanceof Error ? (err.message.match(/"message":\s*"([^"]+)"/)?.[1] ?? err.message) : "SMS send failed";
    return NextResponse.json({ error: detail }, { status: 502 });
  }
}
