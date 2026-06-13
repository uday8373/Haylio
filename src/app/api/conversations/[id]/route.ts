import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { addMessage, getConversation, markRead } from "@/lib/store";

type Params = { params: Promise<{ id: string }> };

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

/** Mark read (owner only). */
export async function PATCH(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conv = await getConversation(id);
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const biz = await currentBusiness();
  if (biz?.id !== conv.businessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await markRead(id);
  return NextResponse.json({ ok: true });
}
