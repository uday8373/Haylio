"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import MonthCalendar from "@/components/dashboard/MonthCalendar";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ExternalLinkIcon } from "@/components/icons";

const DAY = 24 * 60 * 60 * 1000;

export type RangeView = "week" | "lastweek" | "month" | "year";

const VIEW_OPTIONS: { id: RangeView; label: string }[] = [
  { id: "week", label: "This week" },
  { id: "lastweek", label: "Last week" },
  { id: "month", label: "Month" },
  { id: "year", label: "Yearly" },
];

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The enquiry range switcher: a dropdown (week / last week / month / year) and
 * the matching visualization beneath it. `left` fills the header area to the
 * left of the dropdown (e.g. the toll-free number block on the home page).
 */
export default function EnquiryRangeView({
  timestamps,
  left,
  initialView = "week",
  initialMonth,
  selectedDate,
  expandHref,
}: {
  timestamps: number[];
  left?: ReactNode;
  initialView?: RangeView;
  initialMonth?: { year: number; month: number };
  selectedDate?: string;
  /** When set, shows an expand icon beside the dropdown linking to this page. */
  expandHref?: string;
}) {
  const [view, setView] = useState<RangeView>(initialView);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const [yearCursor, setYearCursor] = useState(() => initialMonth?.year ?? now.getFullYear());

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  const activeLabel = VIEW_OPTIONS.find((o) => o.id === view)!.label;

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="min-w-0">{left}</div>

        <div className="flex items-center gap-2 shrink-0">
          {/* ---- Range dropdown ---- */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="btn-secondary !rounded-full !py-2 !px-4 !text-xs"
            >
              {activeLabel}
              <ChevronDownIcon size={13} className={menuOpen ? "rotate-180 transition" : "transition"} />
            </button>
            {menuOpen && (
            <div className="absolute right-0 z-20 mt-2 w-40 rounded-2xl border border-[#ececea] bg-white p-1.5 shadow-lg animate-scale-in">
              {VIEW_OPTIONS.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    setView(o.id);
                    setMenuOpen(false);
                  }}
                  className={`w-full text-left rounded-xl px-3 py-2 text-xs font-medium transition ${
                    view === o.id ? "bg-[#21201a] text-white" : "text-[#4a493f] hover:bg-[#f1f1ee]"
                  }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {expandHref && (
            <Link
              href={expandHref}
              className="icon-btn !w-9 !h-9 shrink-0"
              title="Open full enquiry view"
              aria-label="Open full enquiry view"
            >
              <ExternalLinkIcon size={15} />
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6">
        {(view === "week" || view === "lastweek") && (
          <WeekView timestamps={timestamps} offsetWeeks={view === "lastweek" ? 1 : 0} />
        )}
        {view === "month" && (
          <MonthCalendar timestamps={timestamps} initialMonth={initialMonth} selectedDate={selectedDate} />
        )}
        {view === "year" && (
          <YearView
            timestamps={timestamps}
            year={yearCursor}
            onPrev={() => setYearCursor((y) => y - 1)}
            onNext={() => setYearCursor((y) => y + 1)}
          />
        )}
      </div>
    </>
  );
}

/* ---------------- Week / Last week (lollipop) ---------------- */
function WeekView({ timestamps, offsetWeeks }: { timestamps: number[]; offsetWeeks: number }) {
  const { days, delta, label } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = today.getTime() - offsetWeeks * 7 * DAY;
    const days = Array.from({ length: 7 }, (_, i) => {
      const start = base - (6 - i) * DAY;
      const count = timestamps.filter((t) => t >= start && t < start + DAY).length;
      return { label: "SMTWTFS"[new Date(start).getDay()], count, start };
    });
    const periodTotal = timestamps.filter((t) => t >= base - 6 * DAY && t < base + DAY).length;
    const prevTotal = timestamps.filter((t) => t >= base - 13 * DAY && t < base - 6 * DAY).length;
    const delta = prevTotal === 0 ? (periodTotal > 0 ? 100 : 0) : Math.round(((periodTotal - prevTotal) / prevTotal) * 100);
    return { days, delta, label: offsetWeeks === 0 ? "This week's enquiries vs last week's" : "Last week's enquiries vs the week before" };
  }, [timestamps, offsetWeeks]);

  const maxCount = Math.max(1, ...days.map((d) => d.count));
  const peakIdx = days.reduce((best, d, i) => (d.count > days[best].count ? i : best), 0);

  return (
    <div className="flex flex-col md:flex-row md:items-end gap-6">
      <div className="shrink-0 md:pb-6 flex md:block items-baseline gap-4">
        <p className="text-4xl md:text-5xl font-semibold tracking-tight">
          {delta >= 0 ? "+" : ""}
          {delta}%
        </p>
        <p className="md:mt-2 text-xs text-[#8a897f] max-w-[160px] md:max-w-[120px]">{label}</p>
      </div>

      <div className="flex-1 flex items-end justify-between gap-1 md:gap-2 h-52 min-w-0">
        {days.map((d, i) => {
          const h = 24 + (d.count / maxCount) * 130;
          const peak = i === peakIdx && d.count > 0;
          return (
            <div key={i} className="flex flex-col items-center gap-0 flex-1">
              {peak && (
                <span className="mb-2 pill-dark !text-[11px] !px-3 !py-1.5 animate-scale-in whitespace-nowrap">
                  {d.count}
                  <span className="hidden md:inline"> enquir{d.count === 1 ? "y" : "ies"}</span>
                </span>
              )}
              <span className={`w-2 h-2 rounded-full ${peak ? "bg-[#21201a]" : "bg-[#7c97c9]"}`} style={{ marginBottom: -1 }} />
              <span className={`w-px ${peak ? "bg-[#21201a]" : "bg-[#d8d8d3]"}`} style={{ height: h }} />
              <span
                className={`mt-3 w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs font-semibold ${
                  peak ? "bg-[#21201a] text-white" : "bg-[#f1f1ee] text-[#6b6a60]"
                }`}
              >
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Year (12 months) ---------------- */
function YearView({
  timestamps,
  year,
  onPrev,
  onNext,
}: {
  timestamps: number[];
  year: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { months, total, max, peak } = useMemo(() => {
    const months = new Array<number>(12).fill(0);
    for (const t of timestamps) {
      const d = new Date(t);
      if (d.getFullYear() === year) months[d.getMonth()]++;
    }
    const total = months.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...months);
    let peak = 0;
    months.forEach((c, i) => {
      if (c > months[peak]) peak = i;
    });
    return { months, total, max, peak };
  }, [timestamps, year]);

  const today = new Date();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight">{total}</p>
          <p className="text-xs text-[#8a897f] mt-0.5">enquiries in {year}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onPrev} className="icon-btn !w-8 !h-8" aria-label="Previous year">
            <ChevronLeftIcon size={15} />
          </button>
          <span className="text-xs font-semibold min-w-[56px] text-center">{year}</span>
          <button type="button" onClick={onNext} className="icon-btn !w-8 !h-8" aria-label="Next year">
            <ChevronRightIcon size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 md:gap-2.5">
        {months.map((count, i) => {
          const t = count / max;
          const isPeak = count > 0 && i === peak;
          const isThisMonth = today.getFullYear() === year && today.getMonth() === i;
          return (
            <div
              key={i}
              className={`rounded-2xl border p-3 transition ${isThisMonth ? "border-[#21201a]" : "border-[#ececea]"}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#8a897f]">{MONTHS_SHORT[i]}</span>
                <span className={`text-sm font-semibold ${isPeak ? "text-[#e8552f]" : "text-[#21201a]"}`}>{count}</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[#f1f1ee] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.max(count > 0 ? 8 : 0, t * 100)}%`, background: isPeak ? "#e8552f" : "#7c97c9" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
