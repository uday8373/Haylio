import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { addMessage, getConversation, markRead, updateConversationMeta } from "@/lib/store";
import type { ConversationTag } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

const CONVERSATION_TAGS: ConversationTag[] = ["none", "query", "complaint", "request", "spam"];

/** Get a conversation — as the business owner, or as the visitor (with visitorKey). */
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const biz = await currentBusiness();
  const visitorKey = req.nextUrl.searchParams.get("visitorKey");
  const isOwner = biz?.id === conv.businessId;
  const isVisitor = visitorKey && visitorKey === conv.visitorKey;
  if (!isOwner && !isVisitor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(conv);
}

/** Add a message: business reply (session) or visitor follow-up (visitorKey). */
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { text, visitorKey } = body ?? {};
  if (!text) return NextResponse.json({ error: "Text required" }, { status: 400 });

  const biz = await currentBusiness();
  if (biz?.id === conv.businessId) {
    await addMessage(id, { role: "business", kind: "text", text });
    await markRead(id);
    return NextResponse.json(await getConversation(id));
  }
  if (visitorKey && visitorKey === conv.visitorKey) {
    await addMessage(id, { role: "visitor", kind: "text", text });
    return NextResponse.json(await getConversation(id));
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Owner-only: edit customer name / category tag, or mark read. */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const biz = await currentBusiness();
  if (biz?.id !== conv.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const patch: { visitorName?: string; tag?: ConversationTag } = {};
  if (typeof body?.visitorName === "string") patch.visitorName = body.visitorName.trim().slice(0, 120);
  if (body?.tag !== undefined) {
    if (!CONVERSATION_TAGS.includes(body.tag)) return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
    patch.tag = body.tag;
  }

  if (patch.visitorName !== undefined || patch.tag !== undefined) {
    const updated = await updateConversationMeta(id, patch);
    return NextResponse.json(updated);
  }

  // No fields → treat as mark-read.
  await markRead(id);
  return NextResponse.json({ ok: true });
}
