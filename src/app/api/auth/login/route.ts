import { NextRequest, NextResponse } from "next/server";
import { getBusinessByEmail, createSession } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";
import { verifyEmailOtp } from "@/lib/emailAuth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, otp } = body ?? {};
  if (!email || !otp) {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  const biz = await getBusinessByEmail(String(email));
  if (!biz) {
    return NextResponse.json({ error: "No account found for that email." }, { status: 404 });
  }

  const verified = await verifyEmailOtp(String(email), String(otp));
  if (!verified) {
    return NextResponse.json({ error: "That code is incorrect or expired. Request a new one." }, { status: 401 });
  }

  const token = await createSession(biz.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
