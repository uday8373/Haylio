import { NextRequest, NextResponse } from "next/server";
import { getBusinessByEmail } from "@/lib/store";
import { sendEmailOtp } from "@/lib/emailAuth";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Send an email OTP for either signup ("register") or sign-in ("login").
 * The intent gates against our own accounts:
 *   register → email must NOT already have an account
 *   login    → email MUST already have an account
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const intent = body?.intent === "login" ? "login" : "register";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const existing = await getBusinessByEmail(email);
  if (intent === "register" && existing) {
    return NextResponse.json({ error: "That email already has an account — log in instead." }, { status: 409 });
  }
  if (intent === "login" && !existing) {
    return NextResponse.json({ error: "No account found for that email — sign up first." }, { status: 404 });
  }

  try {
    const { devCode } = await sendEmailOtp(email);
    return NextResponse.json({ ok: true, devCode });
  } catch {
    return NextResponse.json({ error: "Couldn't send the code. Try again in a moment." }, { status: 502 });
  }
}
