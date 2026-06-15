import { NextRequest, NextResponse } from "next/server";
import { acceptInvite, getBusiness } from "@/lib/store";

export const dynamic = "force-dynamic";

/** POST — accept a team invitation by token. Public (token-gated). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) return NextResponse.json({ error: "Missing invite token." }, { status: 400 });

  const member = await acceptInvite(token);
  if (!member) return NextResponse.json({ error: "This invitation is invalid or has expired." }, { status: 404 });

  const business = await getBusiness(member.businessId);
  return NextResponse.json({
    ok: true,
    email: member.email,
    businessName: business?.name ?? "the team",
  });
}
