import { NextRequest, NextResponse } from "next/server";
import { currentBusiness } from "@/lib/session";
import { deleteCalendarAccount, getCalendarAccount, upsertCalendarAccount } from "@/lib/store";

/** Safe (token-free) view of the calendar connection. */
function publicView(acc: Awaited<ReturnType<typeof getCalendarAccount>>) {
  if (!acc) return { connected: false };
  return {
    connected: true,
    email: acc.email,
    slotMinutes: acc.slotMinutes,
    days: acc.days,
    startHour: acc.startHour,
    endHour: acc.endHour,
    tzOffsetMinutes: acc.tzOffsetMinutes,
  };
}

export async function GET() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(publicView(await getCalendarAccount(biz.id)));
}

/** Update availability config (slot length, working days/hours, timezone). */
export async function PATCH(req: NextRequest) {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const acc = await getCalendarAccount(biz.id);
  if (!acc) return NextResponse.json({ error: "Calendar not connected" }, { status: 404 });

  const b = await req.json().catch(() => ({}));
  const next = { ...acc };
  if ([15, 30, 45, 60].includes(b.slotMinutes)) next.slotMinutes = b.slotMinutes;
  if (Array.isArray(b.days)) next.days = b.days.filter((d: number) => d >= 0 && d <= 6);
  if (Number.isInteger(b.startHour) && b.startHour >= 0 && b.startHour <= 23) next.startHour = b.startHour;
  if (Number.isInteger(b.endHour) && b.endHour >= 1 && b.endHour <= 24) next.endHour = b.endHour;
  if (Number.isInteger(b.tzOffsetMinutes) && Math.abs(b.tzOffsetMinutes) <= 14 * 60) next.tzOffsetMinutes = b.tzOffsetMinutes;
  if (next.endHour <= next.startHour) return NextResponse.json({ error: "End hour must be after start hour." }, { status: 400 });

  const saved = await upsertCalendarAccount(next);
  return NextResponse.json(publicView(saved));
}

export async function DELETE() {
  const biz = await currentBusiness();
  if (!biz) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await deleteCalendarAccount(biz.id);
  return NextResponse.json({ connected: false });
}
