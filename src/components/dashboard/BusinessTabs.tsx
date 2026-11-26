"use client";

import { useState } from "react";
import ProfileSections from "@/components/dashboard/ProfileSections";
import WidgetSections from "@/components/dashboard/WidgetSections";
import SharePanel from "@/components/dashboard/SharePanel";
import type { Business } from "@/lib/types";

export type SafeBusiness = Omit<Business, "passwordHash">;

type Tab = "profile" | "widget" | "share";

export default function BusinessTabs({ business }: { business?: SafeBusiness }) {
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "widget", label: "Widget & AI" },
    { key: "share", label: "Share" },
  ];

  return (
    <div className="min-w-0">
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold border transition ${
                active ? "bg-[#21201a] text-white border-[#21201a]" : "bg-white text-[#6b6a60] border-[#e8e8e4] hover:border-[#c9c9c3]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {/* All stay mounted so unsaved edits survive a tab switch. */}
      <div className={tab === "profile" ? "" : "hidden"}>
        <ProfileSections initial={business} />
      </div>
      <div className={tab === "widget" ? "" : "hidden"}>
        <WidgetSections initial={business} />
      </div>
      <div className={tab === "share" ? "" : "hidden"}>
        <div className="max-w-md">
          <SharePanel initialHandle={business?.handle} />
        </div>
      </div>
    </div>
  );
}
