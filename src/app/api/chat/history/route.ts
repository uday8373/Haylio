import { NextRequest, NextResponse } from "next/server";
import { getConversation } from "@/lib/store";

/**
 * Public: return a conversation's messages so a returning visitor can resume
 * their chat. Authorized by the conversation's own visitorKey (the per-chat
 * token), not a login — so only someone holding that token sees the thread.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const conversationId = url.searchParams.get("conversationId") ?? "";
  const visitorKey = url.searchParams.get("visitorKey") ?? "";
  if (!conversationId || !visitorKey) {
    return NextResponse.json({ messages: [] });
  }

  const conv = await getConversation(conversationId);
  if (!conv || conv.visitorKey !== visitorKey) {
    return NextResponse.json({ messages: [] });
  }

  const messages = conv.messages
    .map((m) => ({
      role: m.role === "visitor" ? "visitor" : "ai",
      text:
        m.kind === "audio"
          ? "🎤 Voice message"
          : m.kind === "callback"
            ? `📞 Callback requested${m.phone ? `: ${m.phone}` : ""}`
            : m.text ?? "",
    }))
    .filter((m) => m.text);

  return NextResponse.json({ conversationId: conv.id, visitorKey: conv.visitorKey, messages });
}

/** Clear the resumable chat cookie so the next visit starts a fresh thread. */
export async function DELETE(req: NextRequest) {
  const handle = new URL(req.url).searchParams.get("handle") ?? "";
  const res = NextResponse.json({ ok: true });
  if (/^[a-z0-9-]+$/.test(handle)) {
    res.cookies.set(`haylio_chat_${handle}`, "", { path: "/", maxAge: 0 });
  }
  return res;
}
