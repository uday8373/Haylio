import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { authUrl, googleCalendarEnabled } from "@/lib/googleCalendar";

/** Kick off Google OAuth. ?tz=<minutes> carries the owner's UTC offset. */
export async function GET(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!googleCalendarEnabled) {
    return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 503 });
  }
  const tz = new URL(req.url).searchParams.get("tz") ?? "0";
  // State carries the business id + tz offset; verified on callback via session.
  const state = Buffer.from(JSON.stringify({ b: biz.id, tz: Number(tz) || 0 })).toString("base64url");
  return NextResponse.redirect(authUrl(state));
}
