import { NextRequest, NextResponse } from "next/server";
import { getBusinessByHandle, getCalendarAccount } from "@/lib/store";
import { getAvailableSlots, googleCalendarEnabled } from "@/lib/googleCalendar";

/** Public: available appointment slots for a business (used by the widget). */
export async function GET(req: NextRequest) {
  const handle = new URL(req.url).searchParams.get("handle") ?? "";
  const biz = handle ? await getBusinessByHandle(handle) : undefined;
  if (!biz) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  if (!googleCalendarEnabled) return NextResponse.json({ slots: [] });

  const acc = await getCalendarAccount(biz.id);
  if (!acc) return NextResponse.json({ slots: [] });

  try {
    const slots = await getAvailableSlots(acc, { count: 3, days: 10 });
    return NextResponse.json({ slots });
  } catch (e) {
    console.error("Slots lookup failed:", e);
    return NextResponse.json({ slots: [] });
  }
}
