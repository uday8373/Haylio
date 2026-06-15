import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { getLead } from "@/lib/leads";
import { upsertLeadTag } from "@/lib/store";
import type { LeadTag } from "@/lib/types";

const TAGS: LeadTag[] = ["none", "hot", "warm", "qualified", "cold"];

/** Single lead with its unified timeline. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await params;
  const lead = await getLead(biz.id, decodeURIComponent(key));
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json(lead);
}

/** Set a lead's tag and/or note. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await params;
  const body = await req.json().catch(() => null);

  const patch: { tag?: LeadTag; note?: string; name?: string } = {};
  if (body?.tag !== undefined) {
    if (!TAGS.includes(body.tag)) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    patch.tag = body.tag;
  }
  if (typeof body?.note === "string") patch.note = body.note.slice(0, 2000);
  if (typeof body?.name === "string") patch.name = body.name.trim().slice(0, 120);
  if (patch.tag === undefined && patch.note === undefined && patch.name === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const record = await upsertLeadTag(biz.id, decodeURIComponent(key), patch);
  return NextResponse.json({ ok: true, tag: record.tag, note: record.note, name: record.name });
}
