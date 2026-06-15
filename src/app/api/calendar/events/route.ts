import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { getCalendarAccount } from "@/lib/store";
import { buildEventISO, createEvent, listEvents } from "@/lib/googleCalendar";

export const dynamic = "force-dynamic";

/** GET — meetings on the connected calendar. Optional ?from=ISO&to=ISO window. */
export async function GET(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acc = await getCalendarAccount(biz.id);
  if (!acc) return NextResponse.json({ error: "Calendar not connected" }, { status: 404 });

  const fromRaw = req.nextUrl.searchParams.get("from");
  const toRaw = req.nextUrl.searchParams.get("to");
  const from = fromRaw && !Number.isNaN(Date.parse(fromRaw)) ? new Date(fromRaw) : undefined;
  const to = toRaw && !Number.isNaN(Date.parse(toRaw)) ? new Date(toRaw) : undefined;

  try {
    const events = await listEvents(acc, from || to ? { from, to } : { days: 30 });
    return NextResponse.json({ events });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load events" },
      { status: 502 }
    );
  }
}

/** POST — schedule a new meeting. Body: { date, time, durationMinutes?, summary, attendeeEmail?, description? } */
export async function POST(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const acc = await getCalendarAccount(biz.id);
  if (!acc) return NextResponse.json({ error: "Calendar not connected" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const date = String(b.date ?? "");
  const time = String(b.time ?? "");
  const summary = String(b.summary ?? "").trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "A valid date is required." }, { status: 400 });
  if (!/^\d{2}:\d{2}$/.test(time)) return NextResponse.json({ error: "A valid time is required." }, { status: 400 });
  if (!summary) return NextResponse.json({ error: "A meeting title is required." }, { status: 400 });

  const allowed = [15, 30, 45, 60];
  const durationMinutes = allowed.includes(b.durationMinutes) ? b.durationMinutes : acc.slotMinutes || 30;

  const attendeeEmail =
    typeof b.attendeeEmail === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.attendeeEmail.trim())
      ? b.attendeeEmail.trim()
      : undefined;
  const description = typeof b.description === "string" ? b.description.trim() || undefined : undefined;

  const { startISO, endISO } = buildEventISO(date, time, durationMinutes, acc.tzOffsetMinutes);

  try {
    const created = await createEvent(acc, { startISO, endISO, summary, description, attendeeEmail });
    return NextResponse.json({ ok: true, id: created.id, htmlLink: created.htmlLink });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to schedule meeting" },
      { status: 502 }
    );
  }
}
