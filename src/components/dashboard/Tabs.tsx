"use client";

import { useState, type ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Pill-style sub-tabs matching the Business tab (BusinessTabs). Panels are
 * server-rendered and passed in as `content`; all stay mounted (hidden when
 * inactive) so unsaved form edits survive a tab switch.
 */
export function Tabs({ tabs, initial }: { tabs: TabItem[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.id);

  return (
    <div className="min-w-0">
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                on
                  ? "bg-[#21201a] text-white border-[#21201a]"
                  : "bg-white text-[#6b6a60] border-[#e8e8e4] hover:border-[#c9c9c3]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.id} className={t.id === active ? "" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
