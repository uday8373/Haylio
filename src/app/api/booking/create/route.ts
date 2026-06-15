import { NextRequest, NextResponse } from "next/server";
import { addMessage, getBusinessByHandle, getCalendarAccount, getConversation } from "@/lib/store";
import { createEvent, googleCalendarEnabled } from "@/lib/googleCalendar";

/** Public: book a slot — creates the calendar event and notes it on the chat. */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { handle, startISO, endISO, label, name, email, conversationId, visitorKey } = body ?? {};
  if (!handle || !startISO || !endISO) return NextResponse.json({ error: "Missing booking details" }, { status: 400 });

  const biz = await getBusinessByHandle(handle);
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!googleCalendarEnabled) return NextResponse.json({ error: "Booking unavailable" }, { status: 503 });

  const acc = await getCalendarAccount(biz.id);
  if (!acc) return NextResponse.json({ error: "Calendar not connected" }, { status: 409 });

  const who = (name && String(name).trim()) || "a customer";
  try {
    const event = await createEvent(acc, {
      startISO,
      endISO,
      summary: `Appointment with ${who}`,
      description: `Booked via your Haylio contact page${email ? ` · ${email}` : ""}.`,
      attendeeEmail: email && /^\S+@\S+\.\S+$/.test(email) ? email : undefined,
    });

    // Record the booking on the conversation thread, if one is attached.
    if (conversationId) {
      const conv = await getConversation(conversationId);
      if (conv && conv.businessId === biz.id && conv.visitorKey === visitorKey) {
        await addMessage(conversationId, {
          role: "visitor",
          kind: "text",
          text: `📅 Booked an appointment: ${label ?? startISO}`,
        });
      }
    }
    return NextResponse.json({ ok: true, eventId: event.id });
  } catch (e) {
    console.error("Booking failed:", e);
    return NextResponse.json({ error: "Couldn't book that slot — please try another." }, { status: 502 });
  }
}
