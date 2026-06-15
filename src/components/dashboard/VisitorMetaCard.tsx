"use client";

import { useState } from "react";
import type { VisitorMeta } from "@/lib/types";
import { countryFlag, countryName } from "@/lib/visitor";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  GlobeIcon,
  MapPinIcon,
  MonitorIcon,
  SmartphoneIcon,
} from "@/components/icons";

function Row({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-[#f0f0ec] last:border-0">
      <dt className="text-xs text-[#8a897f] shrink-0">{label}</dt>
      <dd className="text-xs font-medium text-[#232219] text-right break-words min-w-0">{value}</dd>
    </div>
  );
}

export default function VisitorMetaCard({ meta }: { meta: VisitorMeta }) {
  const [open, setOpen] = useState(true);

  const location = [meta.city, meta.region, countryName(meta.country)].filter(Boolean).join(", ");
  const DeviceIcon = meta.deviceType === "desktop" ? MonitorIcon : SmartphoneIcon;
  const browser = [meta.browser, meta.browserVersion?.split(".")[0]].filter(Boolean).join(" ");

  return (
    <section className="card p-5 animate-fade-up">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2"
        aria-expanded={open}
      >
        <h2 className="font-bold text-[#232219] flex items-center gap-2 text-sm">
          <GlobeIcon size={15} className="text-[#4b4a42]" /> Visitor details
        </h2>
        <span className="flex items-center gap-2">
          {meta.country && <span className="text-base leading-none" title={countryName(meta.country)}>{countryFlag(meta.country)}</span>}
          {meta.deviceType && <DeviceIcon size={13} className="text-[#8a897f]" />}
          <span className="w-6 h-6 rounded-full bg-[#f1f1ee] flex items-center justify-center text-[#6b6a60]">
            {open ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
          </span>
        </span>
      </button>

      {open && (
        <div className="mt-4 animate-fade-up">
          <dl>
            <Row label="Location" value={location && <span className="inline-flex items-center gap-1.5"><MapPinIcon size={12} className="text-[#a6a59c]" /> {location}</span>} />
            <Row label="Timezone" value={meta.timezone && <span className="inline-flex items-center gap-1.5"><ClockIcon size={12} className="text-[#a6a59c]" /> {meta.timezone}</span>} />
            <Row label="Language" value={meta.language} />
            <Row label="Device" value={meta.deviceType && <span className="capitalize">{meta.deviceType}</span>} />
            <Row label="Browser" value={browser || undefined} />
            <Row label="Operating system" value={meta.os} />
            <Row label="Platform" value={meta.platform} />
            <Row label="Screen" value={meta.screen} />
            <Row label="Viewport" value={meta.viewport} />
            <Row label="Pixel ratio" value={meta.devicePixelRatio ? `${meta.devicePixelRatio}×` : undefined} />
            <Row label="CPU cores" value={meta.cpuCores} />
            <Row label="Memory" value={meta.deviceMemory ? `${meta.deviceMemory} GB` : undefined} />
            <Row label="Touch" value={meta.touch === undefined ? undefined : meta.touch ? "Yes" : "No"} />
            <Row label="Connection" value={meta.connection?.toUpperCase()} />
            <Row label="Color scheme" value={meta.colorScheme && <span className="capitalize">{meta.colorScheme}</span>} />
          </dl>

          {(meta.referrer || meta.pageUrl || meta.ip) && (
            <div className="mt-3 pt-3 border-t border-[#f0f0ec]">
              <dl>
                <Row label="Came from" value={meta.referrer ? <span className="font-mono text-[10px]">{meta.referrer}</span> : undefined} />
                <Row label="Landed on" value={meta.pageUrl ? <span className="font-mono text-[10px]">{meta.pageUrl}</span> : undefined} />
                <Row label="IP address" value={meta.ip ? <span className="font-mono">{meta.ip}</span> : undefined} />
              </dl>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
