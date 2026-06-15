"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeCheckIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  PlusIcon,
} from "@/components/icons";

interface CalState {
  connected: boolean;
  email?: string;
  slotMinutes?: number;
}

interface CalEvent {
  id: string;
  summary: string;
  day: string;
  time: string;
  dateKey: string;
  startMs: number;
  allDay: boolean;
  attendees: string[];
  htmlLink?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const keyOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function CalendarClient({ initial, compact = false }: { initial: CalState; compact?: boolean }) {
  const router = useRouter();
  const [cal, setCal] = useState<CalState>(initial);

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const [monthCursor, setMonthCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string>(() => keyOf(today));

  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- Schedule form ----
  const [showForm, setShowForm] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    time: "09:00",
    durationMinutes: initial.slotMinutes ?? 30,
    summary: "",
    attendeeEmail: "",
  });

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  const loadEvents = useCallback(
    async (y: number, m: number) => {
      setLoading(true);
      setError(null);
      try {
        const from = new Date(y, m, 1);
        const to = new Date(y, m + 1, 1);
        const res = await fetch(`/api/calendar/events?from=${from.toISOString()}&to=${to.toISOString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Couldn't load meetings");
        setEvents(data.events ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't load meetings");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (cal.connected) loadEvents(year, month);
  }, [cal.connected, year, month, loadEvents]);

  // Count of meetings per date in the visible month.
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of events) map[ev.dateKey] = (map[ev.dateKey] ?? 0) + 1;
    return map;
  }, [events]);

  const selectedEvents = useMemo(
    () => events.filter((e) => e.dateKey === selectedDate).sort((a, b) => a.startMs - b.startMs),
    [events, selectedDate]
  );

  function connect() {
    const tz = new Date().getTimezoneOffset();
    window.location.href = `/api/calendar/google/connect?tz=${tz}`;
  }

  async function disconnect() {
    await fetch("/api/calendar", { method: "DELETE" });
    setCal({ connected: false });
    router.refresh();
  }

  async function schedule() {
    if (!form.summary.trim()) {
      setFormError("Add a meeting title.");
      return;
    }
    setScheduling(true);
    setFormError(null);
    const res = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date: selectedDate,
        time: form.time,
        durationMinutes: form.durationMinutes,
        summary: form.summary.trim(),
        attendeeEmail: form.attendeeEmail.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setScheduling(false);
    if (!res.ok) {
      setFormError(data.error || "Couldn't schedule the meeting.");
      return;
    }
    setShowForm(false);
    setForm((f) => ({ ...f, summary: "", attendeeEmail: "" }));
    loadEvents(year, month);
  }

  // ---------------- Not connected ----------------
  if (!cal.connected) {
    return (
      <div className={`${compact ? "" : "mt-7"} card p-6 text-center`}>
        <span className="mx-auto w-14 h-14 rounded-2xl bg-[#eef2f7] border border-[#d6e0ec] flex items-center justify-center text-[#5b6b80]">
          <CalendarIcon size={24} />
        </span>
        <h2 className="mt-4 text-base font-semibold">Connect Google Calendar</h2>
        <p className="mt-2 text-xs text-[#8a897f] leading-relaxed">
          See your meetings here and book new ones in a tap. Your AI agent can also offer open slots to
          leads who ask for an appointment.
        </p>
        <button onClick={connect} className="btn-primary mt-5 w-full justify-center">Connect Google Calendar</button>
      </div>
    );
  }

  // ---------------- Calendar grid ----------------
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selDate = parseKey(selectedDate);
  const niceSelected = selDate.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className={`${compact ? "" : "mt-7"} space-y-4`}>
      {/* Connection banner */}
      <div className="card p-5 flex items-center gap-3 flex-wrap">
        <span className="w-10 h-10 rounded-full bg-[#eaf3e6] border border-[#cfe3c6] flex items-center justify-center text-[#3e7d3a] shrink-0">
          <BadgeCheckIcon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#232219]">Google Calendar connected</p>
          {cal.email && <p className="text-xs text-[#8a897f] truncate">{cal.email}</p>}
        </div>
        <button onClick={disconnect} className="ml-auto text-xs font-semibold text-[#e8552f] hover:text-[#c8431f] transition">
          Disconnect
        </button>
      </div>

      {/* Calendar */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#232219]">
            {MONTHS_LONG[month]} {year}
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(year, month - 1, 1))}
              className="icon-btn !w-8 !h-8"
              aria-label="Previous month"
            >
              <ChevronLeftIcon size={15} />
            </button>
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(year, month + 1, 1))}
              className="icon-btn !w-8 !h-8"
              aria-label="Next month"
            >
              <ChevronRightIcon size={15} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 md:gap-1.5">
          {WEEKDAYS.map((w, i) => (
            <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#a6a59c] pb-1">
              {w}
            </div>
          ))}
          {cells.map((d, i) => {
            if (d === null) return <div key={`b${i}`} />;
            const key = keyOf(new Date(year, month, d));
            const count = countByDate[key] ?? 0;
            const isToday = key === keyOf(today);
            const isSelected = key === selectedDate;
            return (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setSelectedDate(key);
                  setShowForm(false);
                  setFormError(null);
                }}
                title={count ? `${count} meeting${count === 1 ? "" : "s"}` : "No meetings"}
                className={`relative h-9 md:h-11 rounded-lg text-left transition cursor-pointer hover:brightness-95 ${
                  isSelected
                    ? "bg-[#21201a] text-white"
                    : count > 0
                      ? "bg-[#eef2f7] text-[#2a3a4d]"
                      : "bg-[#f6f6f3] text-[#6b6a60]"
                } ${isToday && !isSelected ? "ring-2 ring-[#21201a] ring-offset-1" : ""}`}
              >
                <span className="absolute top-1 left-1.5 text-[10px] md:text-[11px] font-semibold leading-none">{d}</span>
                {count > 0 && (
                  <span
                    className={`absolute bottom-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] md:text-[10px] font-bold leading-none flex items-center justify-center ${
                      isSelected ? "bg-white text-[#21201a]" : "bg-[#e8552f] text-white"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {loading && <p className="mt-3 text-[11px] text-[#a6a59c]">Loading meetings…</p>}
        {error && !loading && (
          <p className="mt-3 text-[11px] text-[#c0392b]">
            {error} <button onClick={() => loadEvents(year, month)} className="underline font-semibold">Retry</button>
          </p>
        )}
      </div>

      {/* Selected day */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#232219]">{niceSelected}</p>
            <p className="text-[11px] text-[#8a897f]">
              {selectedEvents.length} meeting{selectedEvents.length === 1 ? "" : "s"}
            </p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setShowForm((s) => !s);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#21201a] text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-black transition shrink-0"
          >
            <PlusIcon size={13} /> Schedule
          </button>
        </div>

        {showForm && (
          <div className="mt-4 rounded-2xl border border-[#ececea] p-4 space-y-3 animate-scale-in">
            <div>
              <label className="label">Title</label>
              <input
                className="input"
                placeholder="Intro call with…"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Time</label>
                <input
                  type="time"
                  className="input"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Length</label>
                <select
                  className="input"
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })}
                >
                  {[15, 30, 45, 60].map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label">Guest email (optional)</label>
              <input
                type="email"
                className="input"
                placeholder="lead@email.com"
                value={form.attendeeEmail}
                onChange={(e) => setForm({ ...form, attendeeEmail: e.target.value })}
              />
            </div>
            {formError && <p className="text-xs text-[#c0392b]">{formError}</p>}
            <div className="flex items-center gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="text-xs font-semibold text-[#8a897f] hover:text-[#1b1a14] transition">
                Cancel
              </button>
              <button onClick={schedule} className="btn-primary !py-2 !px-4 !text-xs" disabled={scheduling}>
                {scheduling ? "Scheduling…" : "Add to calendar"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 space-y-2">
          {selectedEvents.length === 0 && !showForm && (
            <p className="text-xs text-[#8a897f]">No meetings on this day. Tap Schedule to add one.</p>
          )}
          {selectedEvents.map((ev) => (
            <div key={ev.id} className="flex items-start gap-3 rounded-xl border border-[#f0f0ec] p-3">
              <span className="w-9 h-9 rounded-lg bg-[#eef2f7] border border-[#d6e0ec] flex items-center justify-center text-[#5b6b80] shrink-0">
                <CalendarIcon size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-[#232219] truncate">{ev.summary}</p>
                <p className="text-[11px] text-[#8a897f] flex items-center gap-1 mt-0.5">
                  <ClockIcon size={11} /> {ev.time}
                </p>
                {ev.attendees.length > 0 && (
                  <p className="text-[11px] text-[#a6a59c] truncate mt-0.5">{ev.attendees.join(", ")}</p>
                )}
              </div>
              {ev.htmlLink && (
                <a
                  href={ev.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="icon-btn !w-7 !h-7 shrink-0"
                  title="Open in Google Calendar"
                >
                  <ExternalLinkIcon size={13} />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
