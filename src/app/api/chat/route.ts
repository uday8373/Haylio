import { NextRequest, NextResponse } from "next/server";
import { aiReply } from "@/lib/ai";
import {
  addMessage,
  createConversation,
  getBusinessByHandle,
  getConversation,
  getEngagementByToken,
  updateEngagement,
} from "@/lib/store";

/**
 * Public widget AI chat.
 * Creates/continues a "chat" conversation, appends the visitor message,
 * generates an AI reply, persists both, and returns the reply.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { handle, message, conversationId, visitorKey, visitorName } = body ?? {};
  const biz = handle ? await getBusinessByHandle(handle) : undefined;
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!biz.widget.channels.aiChat) return NextResponse.json({ error: "Chat is disabled" }, { status: 403 });
  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  let conv = conversationId ? await getConversation(conversationId) : undefined;
  if (conv && (conv.visitorKey !== visitorKey || conv.businessId !== biz.id)) conv = undefined;

  if (!conv) {
    const engToken = req.cookies.get("haylio_engagement")?.value;
    const eng = engToken ? await getEngagementByToken(engToken) : undefined;
    const fromCall = eng && eng.businessId === biz.id ? eng : undefined;

    conv = await createConversation({
      businessId: biz.id,
      channel: "chat",
      visitorName: visitorName || (fromCall ? `Caller •${fromCall.callerLast4}` : undefined),
      visitorContact: fromCall?.callerNumber,
      firstMessage: { role: "visitor", kind: "text", text: message },
    });
    if (fromCall && !fromCall.conversationId) {
      await updateEngagement(fromCall.id, { conversationId: conv.id });
    }
  } else {
    conv = (await addMessage(conv.id, { role: "visitor", kind: "text", text: message })) ?? conv;
  }

  const history = conv.messages
    .filter((m) => m.kind === "text" && m.text)
    .map((m) => ({ role: m.role, text: m.text! }));

  const reply = await aiReply(biz, history);
  await addMessage(conv.id, { role: "ai", kind: "text", text: reply });

  return NextResponse.json({
    reply,
    conversationId: conv.id,
    visitorKey: conv.visitorKey,
  });
}
