import { NextRequest, NextResponse } from "next/server";
import { getBusinessByEmail, hashPassword, createSession } from "@/lib/store";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { email, password } = body ?? {};
  const biz = email ? await getBusinessByEmail(email) : undefined;
  if (!biz || biz.passwordHash !== hashPassword(password ?? "")) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const token = await createSession(biz.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
