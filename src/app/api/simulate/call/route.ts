import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { getNumberByBusiness } from "@/lib/store";
import { handleIncomingCall } from "@/lib/engagement";

/**
 * Dashboard simulator: runs the exact production pipeline (engagement record,
 * tracked link, SMS send via the active provider) for the owner's business.
 */
export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const vn = await getNumberByBusiness(biz.id);
  if (!vn) return NextResponse.json({ error: "Purchase your number first." }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const raw = String(body.callerNumber || "").replace(/[^\d+]/g, "");

  // Normalize to E.164: accept +<countrycode><number>, or a bare 10-digit US number.
  let caller: string;
  if (!raw) {
    caller = `+1555${Math.floor(1000000 + Math.random() * 8999999)}`; // log-only test entry
  } else if (raw.startsWith("+") && /^\+[1-9]\d{7,14}$/.test(raw)) {
    caller = raw;
  } else if (/^[2-9]\d{9}$/.test(raw)) {
    caller = `+1${raw}`;
  } else {
    return NextResponse.json(
      { error: "Enter the number in international format, e.g. +1 415 555 0134 or +91 98765 43210." },
      { status: 400 }
    );
  }

  const result = await handleIncomingCall(vn, caller);

  // Mode-aware explainer for the test result panel.
  let modeNote: string | undefined;
  if (vn.callMode === "forward" && vn.forwardToNumber) {
    modeNote = `Forward mode is ON — real calls ring ${vn.forwardToNumber} first; this test exercised the SMS fallback that fires when the call isn't answered.`;
  } else if (vn.callMode === "missed_call") {
    modeNote = "Missed-call mode — on a real call the caller is disconnected instantly with no audio; only the support-link SMS below is sent.";
  }

  return NextResponse.json({
    callMode: vn.callMode,
    greeting: result.greeting,
    smsBody: result.smsBody,
    link: result.link,
    engagementId: result.engagement.id,
    smsStatus: result.engagement.smsStatus,
    smsError: result.smsError,
    forwardingNote: modeNote,
  });
}
