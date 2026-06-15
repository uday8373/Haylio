import { NextRequest, NextResponse } from "next/server";
import { createBusiness, createSession, getTeamMemberByEmail } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";
import { verifyEmailOtp } from "@/lib/emailAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { name, email, otp, handle, category, place } = body ?? {};
  if (!email || !handle) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // An invited/accepted teammate email can't be used to open a new account.
  if (await getTeamMemberByEmail(String(email))) {
    return NextResponse.json(
      { error: "This email was invited to a team. Accept your invitation and log in instead." },
      { status: 409 }
    );
  }

  // Verify the email OTP before creating any account.
  const verified = await verifyEmailOtp(String(email), String(otp ?? ""));
  if (!verified) {
    return NextResponse.json({ error: "That code is incorrect or expired. Request a new one." }, { status: 401 });
  }

  // If a Google Business listing was picked, its identity is authoritative:
  // the name comes from Google (not the form) and the profile is auto-filled.
  const fromGoogle = place && typeof place === "object" && place.placeId && place.name;
  if (!fromGoogle && !name) {
    return NextResponse.json({ error: "Business name is required." }, { status: 400 });
  }

  const result = await createBusiness({
    name: fromGoogle ? place.name : name,
    email,
    handle,
    category: (fromGoogle ? place.category || category : category) ?? "",
    location: fromGoogle ? place.address : undefined,
    website: fromGoogle ? place.website : undefined,
    phone: fromGoogle ? place.phone : undefined,
    hours: fromGoogle ? place.hours : undefined,
    googlePlaceId: fromGoogle ? place.placeId : undefined,
    verified: Boolean(fromGoogle),
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const token = await createSession(result.id, { role: "admin", email: result.email });
  const res = NextResponse.json({ ok: true, handle: result.handle, verified: result.verified });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days — persists across browser restarts
  });
  return res;
}
