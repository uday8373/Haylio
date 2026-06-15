import { currentBusiness } from "@/lib/session";
import { buildLeads } from "@/lib/leads";
import { getCalendarAccount } from "@/lib/store";
import { googleCalendarEnabled } from "@/lib/googleCalendar";
import LeadsClient from "@/components/dashboard/LeadsClient";
import CalendarClient from "@/components/dashboard/CalendarClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const biz = (await currentBusiness())!;
  const [leads, acc] = await Promise.all([buildLeads(biz.id), getCalendarAccount(biz.id)]);

  const calInitial = acc
    ? { connected: true, email: acc.email, slotMinutes: acc.slotMinutes, days: acc.days, startHour: acc.startHour, endHour: acc.endHour }
    : { connected: false };

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Leads</h1>
      <p className="text-sm text-[#8a897f] mt-1.5">
        Every person who's called or messaged you, grouped into one record. Tag them and track
        every interaction across channels in one place.
      </p>

      <div className="mt-6 grid lg:grid-cols-[minmax(0,1fr)_340px] gap-8 items-start">
        <div className="min-w-0">
          <LeadsClient initial={JSON.parse(JSON.stringify(leads))} />
        </div>

        {/* Calendar — booking availability lives beside your leads */}
        <aside className="lg:sticky lg:top-6">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-sm font-semibold text-[#1b1a14]">Calendar</h2>
            <span className="pill-soft">AI booking</span>
          </div>
          {googleCalendarEnabled ? (
            <CalendarClient initial={calInitial} compact />
          ) : (
            <div className="card p-5 text-xs text-[#8a897f]">
              Google Calendar isn't configured on this server. Add the Google OAuth env vars to let your
              AI agent book appointments.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
