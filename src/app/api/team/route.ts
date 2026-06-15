import { NextRequest, NextResponse } from "next/server";
import { currentActor } from "@/lib/session";
import { createInvite, removeTeamMember } from "@/lib/store";
import { sendTeamInvite } from "@/lib/email";
import { baseUrl } from "@/lib/telephony";
import type { TeamRole } from "@/lib/types";

export const dynamic = "force-dynamic";

function inviteUrl(token: string) {
  return `${baseUrl()}/invite/${token}`;
}

/** POST — invite a teammate (admins only). */
export async function POST(req: NextRequest) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") {
    return NextResponse.json({ error: "Only admins can invite teammates." }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email : "";
  const role: TeamRole = body.role === "admin" ? "admin" : "member";

  const result = await createInvite({
    businessId: actor.business.id,
    email,
    role,
    invitedByName: actor.business.name,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const url = inviteUrl(result.token);
  const { delivered } = await sendTeamInvite({
    to: result.email,
    businessName: actor.business.name,
    inviterName: actor.business.name,
    role: result.role,
    url,
  });

  return NextResponse.json({
    ok: true,
    member: { id: result.id, email: result.email, role: result.role, status: result.status },
    inviteUrl: url,
    delivered,
  });
}

/** DELETE — remove a teammate (admins only). Body: { id }. */
export async function DELETE(req: NextRequest) {
  const actor = await currentActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (actor.role !== "admin") {
    return NextResponse.json({ error: "Only admins can remove teammates." }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const ok = await removeTeamMember(actor.business.id, id);
  if (!ok) return NextResponse.json({ error: "Teammate not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
