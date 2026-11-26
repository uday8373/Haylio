import { NextRequest, NextResponse } from "next/server";
import { getBusinessByEmail, getTeamMemberByEmail, createSession } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";
import { DEMO_OTP_COOKIE, isDemoEmail, verifyDemoOtp, verifyEmailOtp } from "@/lib/emailAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, otp } = body ?? {};
  if (!email || !otp) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  const e = String(email);
  // Resolve to either the owner's business or an accepted teammate's business.
  const owner = await getBusinessByEmail(e);
  const member = owner ? undefined : await getTeamMemberByEmail(e);
  if (!owner && !member) {
    return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
  }
  if (!owner && member && member.status !== "active") {
    return NextResponse.json({ error: "Accept your team invitation first, then log in." }, { status: 403 });
  }

  const demo = isDemoEmail(e);
  const verified = demo
    ? verifyDemoOtp(req.cookies.get(DEMO_OTP_COOKIE)?.value, String(otp))
    : await verifyEmailOtp(e, String(otp));
  if (!verified) {
    return NextResponse.json({ error: "That code is incorrect or expired. Request a new one." }, { status: 401 });
  }

  const businessId = owner ? owner.id : member!.businessId;
  const actor = owner
    ? { role: "admin" as const, email: owner.email }
    : { role: member!.role, email: member!.email, memberId: member!.id };
  const token = await createSession(businessId, actor);
  const res = NextResponse.json({ ok: true });
  // A demo code works once.
  if (demo) res.cookies.set(DEMO_OTP_COOKIE, "", { path: "/api/auth", maxAge: 0 });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days — persists across browser restarts
  });
  return res;
}
