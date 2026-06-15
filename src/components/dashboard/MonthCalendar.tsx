"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Local YYYY-MM-DD key (no timezone drift). */
export function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function shade(count: number, max: number) {
  if (count <= 0) return { bg: "#f6f6f3", text: "#b6b5ac" };
  const t = Math.min(1, count / max);
  const opacity = 0.18 + t * 0.82;
  return { bg: `rgba(232, 85, 47, ${opacity})`, text: t > 0.55 ? "#ffffff" : "#7a2f17" };
}

/**
 * Month heat-calendar of enquiry volume. Clicking a day that has enquiries
 * navigates to the enquiries-by-date page. Used on the dashboard home and on
 * the enquiries page itself (where `selectedDate` highlights the active day).
 */
export default function MonthCalendar({
  timestamps,
  initialMonth,
  selectedDate,
}: {
  timestamps: number[];
  initialMonth?: { year: number; month: number };
  selectedDate?: string;
}) {
  const router = useRouter();
  const now = new Date();
  const [cursor, setCursor] = useState(
    () => new Date(initialMonth?.year ?? now.getFullYear(), initialMonth?.month ?? now.getMonth(), 1)
  );

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const { counts, total, max, peakDay } = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const counts = new Array<number>(daysInMonth).fill(0);
    for (const t of timestamps) {
      const d = new Date(t);
      if (d.getFullYear() === year && d.getMonth() === month) counts[d.getDate() - 1]++;
    }
    const total = counts.reduce((a, b) => a + b, 0);
    const max = Math.max(1, ...counts);
    let peakDay = 0;
    counts.forEach((c, i) => {
      if (c > counts[peakDay]) peakDay = i;
    });
    return { counts, total, max, peakDay };
  }, [timestamps, year, month]);

  const firstWeekday = new Date(year, month, 1).getDay();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= counts.length; d++) cells.push(d);

  const go = (key: string) => router.push(`/dashboard/enquiries?date=${key}`);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl md:text-3xl font-semibold tracking-tight">{total}</p>
          <p className="text-xs text-[#8a897f] mt-0.5">
            enquiries in {MONTHS_LONG[month]} {year}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            className="icon-btn !w-8 !h-8"
            aria-label="Previous month"
          >
            <ChevronLeftIcon size={15} />
          </button>
          <span className="text-xs font-semibold min-w-[92px] text-center">
            {MONTHS_SHORT[month]} {year}
          </span>
          <button
            type="button"
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            className="icon-btn !w-8 !h-8"
            aria-label="Next month"
          >
            <ChevronRightIcon size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 md:gap-1.5">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center text-[10px] font-semibold uppercase tracking-wide text-[#a6a59c] pb-1">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <div key={`b${i}`} />;
          const count = counts[d - 1];
          const s = shade(count, max);
          const key = dateKey(year, month, d);
          const isToday = isCurrentMonth && today.getDate() === d;
          const isSelected = selectedDate === key;
          const isPeak = count > 0 && d - 1 === peakDay;
          const clickable = count > 0;

          const base = `relative h-9 md:h-11 rounded-lg transition ${
            isSelected
              ? "ring-2 ring-[#e8552f] ring-offset-1"
              : isToday
                ? "ring-2 ring-[#21201a] ring-offset-1"
                : ""
          } ${isPeak ? "shadow-sm" : ""} ${clickable ? "cursor-pointer hover:brightness-95" : ""}`;

          const inner = (
            <>
              <span
                className="absolute top-1 left-1.5 text-[9px] md:text-[10px] font-medium leading-none opacity-70"
                style={{ color: s.text }}
              >
                {d}
              </span>
              {count > 0 && (
                <span className="absolute bottom-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-[#21201a] text-white text-[9px] md:text-[10px] font-bold leading-none flex items-center justify-center">
                  {count}
                </span>
              )}
            </>
          );

          const title = `${MONTHS_SHORT[month]} ${d}: ${count} enquir${count === 1 ? "y" : "ies"}`;

          return clickable ? (
            <button key={d} type="button" onClick={() => go(key)} title={title} className={base} style={{ background: s.bg }}>
              {inner}
            </button>
          ) : (
            <div key={d} title={title} className={base} style={{ background: s.bg }}>
              {inner}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[#a6a59c]">
        <span>Less</span>
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: "#f6f6f3" }} />
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: "rgba(232,85,47,0.3)" }} />
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: "rgba(232,85,47,0.6)" }} />
        <span className="w-3.5 h-3.5 rounded-md" style={{ background: "rgba(232,85,47,1)" }} />
        <span>More</span>
      </div>
    </div>
  );
}
