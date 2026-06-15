import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { getCalendarAccount, upsertCalendarAccount } from "@/lib/store";
import { exchangeCode, getGoogleEmail } from "@/lib/googleCalendar";
import { baseUrl } from "@/lib/telephony";

/** Google OAuth callback: store tokens + connect the calendar. */
export async function GET(req: NextRequest) {
  const biz = await currentBusiness();
  const url = new URL(req.url);
  const settings = `${baseUrl()}/dashboard/calendar`;

  if (!biz) return NextResponse.redirect(`${baseUrl()}/login`);

  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(`${settings}?error=${encodeURIComponent(error)}`);

  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state") ?? "";
  let tz = 0;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString());
    if (state.b !== biz.id) throw new Error("state mismatch");
    tz = Number(state.tz) || 0;
  } catch {
    return NextResponse.redirect(`${settings}?error=state`);
  }
  if (!code) return NextResponse.redirect(`${settings}?error=no_code`);

  try {
    const tokens = await exchangeCode(code);
    const email = tokens.access_token ? await getGoogleEmail(tokens.access_token) : "";
    const existing = await getCalendarAccount(biz.id);

    // Google only returns a refresh_token on first consent; keep the old one if absent.
    const refreshToken = tokens.refresh_token || existing?.refreshToken;
    if (!refreshToken) return NextResponse.redirect(`${settings}?error=no_refresh`);

    await upsertCalendarAccount({
      businessId: biz.id,
      provider: "google",
      email: email || existing?.email || "",
      calendarId: existing?.calendarId ?? "primary",
      refreshToken,
      accessToken: tokens.access_token,
      tokenExpiry: Date.now() + tokens.expires_in * 1000,
      slotMinutes: existing?.slotMinutes ?? 30,
      days: existing?.days ?? [1, 2, 3, 4, 5],
      startHour: existing?.startHour ?? 9,
      endHour: existing?.endHour ?? 17,
      tzOffsetMinutes: existing?.tzOffsetMinutes ?? tz,
    });
    return NextResponse.redirect(`${settings}?connected=1`);
  } catch (e) {
    console.error("Google calendar connect failed:", e);
    return NextResponse.redirect(`${settings}?error=exchange`);
  }
}
