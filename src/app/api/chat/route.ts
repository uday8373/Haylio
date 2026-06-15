import { NextRequest, NextResponse } from "next/server";
import { aiReply } from "@/lib/ai";
import { buildVisitorMeta } from "@/lib/visitor";
import { getAvailableSlots, googleCalendarEnabled } from "@/lib/googleCalendar";
import {
  addMessage,
  createConversation,
  getBusinessByHandle,
  getCalendarAccount,
  getConversation,
  getEngagementByToken,
  updateEngagement,
} from "@/lib/store";

/** Heuristic: is the visitor trying to book / schedule something? */
const BOOKING_INTENT = /\b(appoint|book(ing)?|schedule|reschedul|meeting|reserve|availab|slot|consultation|come in|visit|drop by|see you|set up a time)\b/i;

/**
 * Public widget AI chat.
 * Creates/continues a "chat" conversation, appends the visitor message,
 * generates an AI reply, persists both, and returns the reply.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { handle, message, conversationId, visitorKey, visitorName, clientMeta } = body ?? {};
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
      visitorMeta: buildVisitorMeta(req, clientMeta),
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

  // If the visitor wants to book and a calendar is connected, offer real slots
  // instead of letting the AI invent times.
  let slots: Awaited<ReturnType<typeof getAvailableSlots>> = [];
  if (googleCalendarEnabled && BOOKING_INTENT.test(message)) {
    const acc = await getCalendarAccount(biz.id);
    if (acc) {
      try {
        slots = await getAvailableSlots(acc, { count: 3, days: 10 });
      } catch {
        slots = [];
      }
    }
  }

  const reply = slots.length
    ? "I'd be happy to help you book a time! Here are a few openings — tap one to reserve it:"
    : await aiReply(biz, history);
  await addMessage(conv.id, { role: "ai", kind: "text", text: reply });

  const res = NextResponse.json({
    reply,
    slots,
    conversationId: conv.id,
    visitorKey: conv.visitorKey,
  });
  // Persist the chat token so a returning visitor resumes this thread.
  res.cookies.set(`haylio_chat_${biz.handle}`, `${conv.id}.${conv.visitorKey}`, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
