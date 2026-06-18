"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckIcon, ChevronRightIcon, MessageIcon, PhoneIcon } from "@/components/icons";
import { timeAgo } from "@/lib/ui";
import type { CallOutcome, SmsStatus } from "@/lib/types";

/** Display-only shape — never carries the caller's full number to the client. */
export interface CallLogEntry {
  id: string;
  callerLast4: string;
  callAt: number;
  smsStatus: SmsStatus;
  callOutcome?: CallOutcome;
  callDuration?: number;
  clickedAt?: number;
  conversationId?: string;
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "year", label: "This year" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

const PAGE_SIZE = 10;

/** Is `ts` within the selected period (anchored to the user's local clock)? */
function inRange(ts: number, filter: FilterId): boolean {
  if (filter === "all") return true;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const DAY = 86_400_000;
  switch (filter) {
    case "today":
      return ts >= startOfToday;
    case "yesterday":
      return ts >= startOfToday - DAY && ts < startOfToday;
    case "week": {
      const mondayOffset = (now.getDay() + 6) % 7; // 0 = Monday
      return ts >= startOfToday - mondayOffset * DAY;
    }
    case "month":
      return ts >= new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    case "year":
      return ts >= new Date(now.getFullYear(), 0, 1).getTime();
    default:
      return true;
  }
}

function smsPill(status: SmsStatus) {
  switch (status) {
    case "delivered":
      return <span className="pill-dark !bg-[#3e7d3a]">DELIVERED</span>;
    case "sent":
      return <span className="pill-blue">SENT</span>;
    case "failed":
      return <span className="pill-orange">FAILED</span>;
    case "opted_out":
      return <span className="pill-dark">OPTED OUT</span>;
    default:
      return <span className="pill-soft">PENDING</span>;
  }
}

export function CallLog({ entries, hasNumber }: { entries: CallLogEntry[]; hasNumber: boolean }) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () => entries.filter((e) => inRange(e.callAt, filter)),
    [entries, filter]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  function pick(f: FilterId) {
    setFilter(f);
    setPage(1);
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 md:px-7 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <PhoneIcon size={16} className="text-[#4b4a42]" />
          <h2 className="text-lg font-semibold">Call log</h2>
          <span className="ml-auto text-[11px] text-[#a6a59c]">
            {filtered.length} {filtered.length === 1 ? "call" : "calls"}
          </span>
        </div>

        {/* Period filters */}
        <div className="mt-4 flex gap-2 flex-wrap">
          {FILTERS.map((f) => {
            const on = f.id === filter;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => pick(f.id)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold border transition ${
                  on
                    ? "bg-[#21201a] text-white border-[#21201a]"
                    : "bg-white text-[#6b6a60] border-[#e8e8e4] hover:border-[#c9c9c3]"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="px-5 md:px-7 pb-7 text-sm text-[#8a897f]">
          {entries.length === 0
            ? hasNumber
              ? "No calls yet. Send a test call from Call settings, or put your number on your Google Business Profile."
              : "No calls yet. Purchase your number to start."
            : "No calls in this period. Try a wider range."}
        </p>
      ) : (
        <>
          <div className="divide-y divide-[#f0f0ec] border-t border-[#f0f0ec]">
            {pageItems.map((e) => (
              <div key={e.id} className="px-5 md:px-7 py-4 flex items-center gap-4 flex-wrap">
                <span className="w-10 h-10 rounded-2xl bg-[#21201a] text-white flex items-center justify-center shrink-0">
                  <PhoneIcon size={16} />
                </span>
                <div className="min-w-[140px]">
                  <p className="text-sm font-semibold font-mono">+• ••• ••• {e.callerLast4}</p>
                  <p className="text-[11px] text-[#a6a59c] mt-0.5">{timeAgo(e.callAt)}</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto flex-wrap">
                  {e.callOutcome === "forwarded_answered" && (
                    <span className="pill-dark !bg-[#3e7d3a]">
                      <PhoneIcon size={10} /> ANSWERED{e.callDuration ? ` · ${Math.ceil(e.callDuration / 60)} MIN` : ""}
                    </span>
                  )}
                  {e.callOutcome === "forwarded_missed" && <span className="pill-orange">MISSED → SMS</span>}
                  {e.callOutcome !== "forwarded_answered" && smsPill(e.smsStatus)}
                  {e.clickedAt ? (
                    <span className="pill-dark !bg-[#e8552f]"><CheckIcon size={10} /> CLICKED {timeAgo(e.clickedAt)}</span>
                  ) : (
                    <span className="pill-soft">NO CLICK YET</span>
                  )}
                  {e.conversationId ? (
                    <Link
                      href={`/dashboard/inbox/${e.conversationId}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#e3e3df] px-3 py-1 text-[10px] font-semibold text-[#1b1a14] hover:bg-[#f4f4f1] transition"
                    >
                      <MessageIcon size={11} /> VIEW CONVERSATION <ChevronRightIcon size={10} />
                    </Link>
                  ) : (
                    <span className="pill-soft !bg-transparent !border !border-[#ececea]">NO CONVERSATION</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 md:px-7 py-4 border-t border-[#f0f0ec] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-full px-4 py-1.5 text-xs font-semibold border border-[#e8e8e4] bg-white text-[#6b6a60] enabled:hover:border-[#c9c9c3] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="text-xs text-[#8a897f]">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="rounded-full px-4 py-1.5 text-xs font-semibold border border-[#e8e8e4] bg-white text-[#6b6a60] enabled:hover:border-[#c9c9c3] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
