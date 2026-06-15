import { baseUrl } from "./telephony";
import { getCalendarAccount, upsertCalendarAccount } from "./store";
import type { BookingSlot, CalendarAccount } from "./types";

/**
 * Google Calendar integration: OAuth connect, free/busy lookup, slot
 * generation, and event creation. Uses the REST API directly (no SDK).
 *
 * Env: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET.
 * The redirect URI must be registered in Google Cloud → Credentials.
 */

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

export const googleCalendarEnabled = Boolean(CLIENT_ID && CLIENT_SECRET);

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "openid",
  "email",
].join(" ");

export function redirectUri(): string {
  return `${baseUrl()}/api/calendar/google/callback`;
}

export function authUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    include_granted_scopes: "true",
    prompt: "consent", // force a refresh_token every time
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

export async function exchangeCode(code: string): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiry: number }> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: CLIENT_ID!,
      client_secret: CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google refresh ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return { accessToken: data.access_token as string, expiry: Date.now() + Number(data.expires_in) * 1000 };
}

/** Return a valid access token for the account, refreshing + persisting if needed. */
export async function validAccessToken(account: CalendarAccount): Promise<string> {
  if (account.accessToken && account.tokenExpiry && account.tokenExpiry > Date.now() + 60_000) {
    return account.accessToken;
  }
  const { accessToken, expiry } = await refreshAccessToken(account.refreshToken);
  await upsertCalendarAccount({ ...account, accessToken, tokenExpiry: expiry });
  return accessToken;
}

export async function getGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  return (data.email as string) || "";
}

interface BusyInterval { start: string; end: string }

async function freeBusy(accessToken: string, calendarId: string, timeMin: Date, timeMax: Date): Promise<BusyInterval[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    cache: "no-store",
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: calendarId }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google freeBusy ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  const cal = data.calendars?.[calendarId];
  return (cal?.busy ?? []) as BusyInterval[];
}

/** Format a UTC instant as a label in the owner's fixed-offset local time. */
function slotLabel(startMs: number, tzOffsetMinutes: number): string {
  // tzOffsetMinutes is Date.getTimezoneOffset() style (UTC = local - offset).
  const local = new Date(startMs - tzOffsetMinutes * 60_000);
  const day = local.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const time = local.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return `${day} · ${time}`;
}

/** RFC3339 string with the owner's fixed offset, e.g. 2025-06-17T14:30:00-05:00. */
function toOffsetISO(ms: number, tzOffsetMinutes: number): string {
  const local = new Date(ms - tzOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const sign = tzOffsetMinutes <= 0 ? "+" : "-";
  const abs = Math.abs(tzOffsetMinutes);
  const off = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:00${off}`
  );
}

/**
 * Compute up to `count` available slots over the next `days`, honouring the
 * owner's working window/days and excluding busy times from Google.
 */
export async function getAvailableSlots(
  account: CalendarAccount,
  opts: { days?: number; count?: number } = {}
): Promise<BookingSlot[]> {
  const days = opts.days ?? 10;
  const count = opts.count ?? 3;
  const slotMs = account.slotMinutes * 60_000;
  const tz = account.tzOffsetMinutes;

  const now = new Date();
  const timeMax = new Date(now.getTime() + days * 24 * 60 * 60_000);

  const accessToken = await validAccessToken(account);
  const busy = await freeBusy(accessToken, account.calendarId, now, timeMax);
  const busyRanges = busy.map((b) => [Date.parse(b.start), Date.parse(b.end)] as [number, number]);

  const slots: BookingSlot[] = [];
  // Iterate day by day in the owner's local time.
  for (let d = 0; d < days && slots.length < count; d++) {
    // Local midnight for day d.
    const localMidnightUtc = startOfLocalDay(now.getTime(), tz) + d * 24 * 60 * 60_000;
    const localDow = new Date(localMidnightUtc - tz * 60_000).getUTCDay();
    if (!account.days.includes(localDow)) continue;

    for (let h = account.startHour; h < account.endHour && slots.length < count; h++) {
      for (let m = 0; m < 60 && slots.length < count; m += account.slotMinutes) {
        const startMs = localMidnightUtc + (h * 60 + m) * 60_000;
        const endMs = startMs + slotMs;
        if (startMs < now.getTime() + 60 * 60_000) continue; // at least 1h out
        const overlaps = busyRanges.some(([bs, be]) => startMs < be && endMs > bs);
        if (overlaps) continue;
        slots.push({ startISO: toOffsetISO(startMs, tz), endISO: toOffsetISO(endMs, tz), label: slotLabel(startMs, tz) });
      }
    }
  }
  return slots;
}

/** UTC ms of the most recent local midnight for the given offset. */
function startOfLocalDay(nowMs: number, tzOffsetMinutes: number): number {
  const local = new Date(nowMs - tzOffsetMinutes * 60_000);
  local.setUTCHours(0, 0, 0, 0);
  return local.getTime() + tzOffsetMinutes * 60_000;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  /** Day label in the owner's local time, e.g. "Tue, Jun 17". */
  day: string;
  /** Time range in the owner's local time, or "All day". */
  time: string;
  /** Local YYYY-MM-DD (owner's tz) — used to group events onto calendar dates. */
  dateKey: string;
  /** Start instant (epoch ms) — for sorting/grouping. */
  startMs: number;
  allDay: boolean;
  attendees: string[];
  htmlLink?: string;
}

/** Local YYYY-MM-DD for an instant in the owner's fixed-offset time. */
function ownerDateKey(ms: number, tzOffsetMinutes: number): string {
  const l = new Date(ms - tzOffsetMinutes * 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${l.getUTCFullYear()}-${pad(l.getUTCMonth() + 1)}-${pad(l.getUTCDate())}`;
}

interface GoogleEventTime { date?: string; dateTime?: string }
interface GoogleEvent {
  id: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  start?: GoogleEventTime;
  end?: GoogleEventTime;
  attendees?: { email?: string }[];
}

/** Render an instant as day + time in the owner's fixed-offset local time. */
function eventLabel(startMs: number, endMs: number, allDay: boolean, tz: number): { day: string; time: string } {
  if (allDay) {
    const local = new Date(startMs);
    return {
      day: local.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      time: "All day",
    };
  }
  const ls = new Date(startMs - tz * 60_000);
  const le = new Date(endMs - tz * 60_000);
  const day = ls.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const t1 = ls.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const t2 = le.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  return { day, time: `${t1} – ${t2}` };
}

/**
 * List events on the owner's calendar. Defaults to the next `days` (30) but
 * accepts an explicit `from`/`to` window so the calendar UI can load any month.
 */
export async function listEvents(
  account: CalendarAccount,
  opts: { days?: number; from?: Date; to?: Date } = {}
): Promise<CalendarEvent[]> {
  const timeMin = opts.from ?? new Date();
  const timeMax = opts.to ?? new Date(timeMin.getTime() + (opts.days ?? 30) * 24 * 60 * 60_000);
  const accessToken = await validAccessToken(account);

  const p = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(account.calendarId)}/events?${p.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Google events ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);

  const items = (data.items ?? []) as GoogleEvent[];
  return items
    .filter((it) => it.status !== "cancelled" && (it.start?.dateTime || it.start?.date))
    .map((it) => {
      const allDay = Boolean(it.start?.date && !it.start?.dateTime);
      const startMs = Date.parse((it.start?.dateTime ?? it.start?.date)!);
      const endMs = Date.parse((it.end?.dateTime ?? it.end?.date ?? it.start?.dateTime ?? it.start?.date)!);
      const { day, time } = eventLabel(startMs, endMs, allDay, account.tzOffsetMinutes);
      const dateKey = allDay ? it.start!.date! : ownerDateKey(startMs, account.tzOffsetMinutes);
      return {
        id: it.id,
        summary: it.summary?.trim() || "(No title)",
        day,
        time,
        dateKey,
        startMs,
        allDay,
        attendees: (it.attendees ?? []).map((a) => a.email).filter((e): e is string => Boolean(e)),
        htmlLink: it.htmlLink,
      };
    });
}

/**
 * Build start/end RFC3339 strings (with the owner's offset) from a local
 * wall-clock date + time and a duration in minutes.
 */
export function buildEventISO(
  dateStr: string,
  timeStr: string,
  durationMinutes: number,
  tzOffsetMinutes: number
): { startISO: string; endISO: string } {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const [h, mi] = timeStr.split(":").map(Number);
  // toOffsetISO subtracts tz to recover wall time, so pre-add it here.
  const startMs = Date.UTC(y, mo - 1, d, h, mi) + tzOffsetMinutes * 60_000;
  return {
    startISO: toOffsetISO(startMs, tzOffsetMinutes),
    endISO: toOffsetISO(startMs + durationMinutes * 60_000, tzOffsetMinutes),
  };
}

export async function createEvent(
  account: CalendarAccount,
  ev: { startISO: string; endISO: string; summary: string; description?: string; attendeeEmail?: string }
): Promise<{ id: string; htmlLink?: string }> {
  const accessToken = await validAccessToken(account);
  const body: Record<string, unknown> = {
    summary: ev.summary,
    description: ev.description,
    start: { dateTime: ev.startISO },
    end: { dateTime: ev.endISO },
  };
  if (ev.attendeeEmail) body.attendees = [{ email: ev.attendeeEmail }];

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(account.calendarId)}/events?sendUpdates=all`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Google event ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return { id: data.id as string, htmlLink: data.htmlLink as string | undefined };
}

/** Convenience: is a booking available for this business right now? */
export async function businessCalendar(businessId: string): Promise<CalendarAccount | undefined> {
  if (!googleCalendarEnabled) return undefined;
  return getCalendarAccount(businessId);
}
