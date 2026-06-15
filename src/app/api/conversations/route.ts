import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import {
  createConversation,
  getBusinessByHandle,
  getEngagementByToken,
  listConversations,
  updateEngagement,
} from "@/lib/store";
import { buildVisitorMeta } from "@/lib/visitor";
import type { Channel } from "@/lib/types";

/** Dashboard: list my conversations. */
export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await listConversations(biz.id));
}

/** Public widget: start a conversation (message / voicemail / callback). */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { handle, channel, visitorName, visitorContact, text, audioDataUrl, phone, preferredTime, clientMeta } = body ?? {};
  const biz = handle ? await getBusinessByHandle(handle) : undefined;
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const allowed: Channel[] = ["message", "voicemail", "callback"];
  if (!allowed.includes(channel)) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 400 });
  }
  if (channel === "message" && !text) return NextResponse.json({ error: "Message text required" }, { status: 400 });
  if (channel === "voicemail" && !audioDataUrl) return NextResponse.json({ error: "Audio required" }, { status: 400 });
  if (channel === "callback" && !phone) return NextResponse.json({ error: "Phone number required" }, { status: 400 });
  if (audioDataUrl && (typeof audioDataUrl !== "string" || audioDataUrl.length > 8_000_000)) {
    return NextResponse.json({ error: "Voice message too long (max ~60s)" }, { status: 400 });
  }

  // Call-to-click attribution: if this visitor arrived via a post-call SMS
  // link, tie the conversation to that engagement and attach their number.
  const engToken = req.cookies.get("haylio_engagement")?.value;
  const eng = engToken ? await getEngagementByToken(engToken) : undefined;
  const fromCall = eng && eng.businessId === biz.id ? eng : undefined;

  const conv = await createConversation({
    businessId: biz.id,
    channel,
    visitorName: visitorName || (fromCall ? `Caller •${fromCall.callerLast4}` : undefined),
    visitorContact: visitorContact || phone || fromCall?.callerNumber,
    visitorMeta: buildVisitorMeta(req, clientMeta),
    firstMessage:
      channel === "voicemail"
        ? { role: "visitor", kind: "audio", audioDataUrl, text }
        : channel === "callback"
          ? { role: "visitor", kind: "callback", phone, preferredTime, text }
          : { role: "visitor", kind: "text", text },
  });

  if (fromCall && !fromCall.conversationId) {
    await updateEngagement(fromCall.id, { conversationId: conv.id });
  }

  return NextResponse.json({ ok: true, conversationId: conv.id, visitorKey: conv.visitorKey });
}
