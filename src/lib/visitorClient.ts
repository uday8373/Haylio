import type { VisitorMeta } from "./types";

/**
 * Collect everything we can about the visitor from the browser. Runs client-side
 * only; sent with the first widget interaction and merged with server-derived
 * geo/IP data. All access is defensive — older browsers omit several APIs.
 */
export function collectClientMeta(): Partial<VisitorMeta> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return {};

  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { effectiveType?: string };
    userAgentData?: { platform?: string; mobile?: boolean };
  };

  const meta: Partial<VisitorMeta> = {};

  try {
    meta.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch { /* ignore */ }

  meta.language = nav.language;
  if (Array.isArray(nav.languages) && nav.languages.length) meta.languages = nav.languages.slice(0, 6);

  if (window.screen) {
    meta.screen = `${window.screen.width}×${window.screen.height}`;
  }
  meta.viewport = `${window.innerWidth}×${window.innerHeight}`;
  if (window.devicePixelRatio) meta.devicePixelRatio = Math.round(window.devicePixelRatio * 100) / 100;

  meta.platform = nav.userAgentData?.platform || nav.platform || undefined;
  if (typeof nav.deviceMemory === "number") meta.deviceMemory = nav.deviceMemory;
  if (typeof nav.hardwareConcurrency === "number") meta.cpuCores = nav.hardwareConcurrency;
  meta.touch = (navigator.maxTouchPoints ?? 0) > 0 || "ontouchstart" in window;
  if (nav.connection?.effectiveType) meta.connection = nav.connection.effectiveType;

  try {
    meta.colorScheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch { /* ignore */ }

  meta.referrer = document.referrer || undefined;
  meta.pageUrl = window.location.href;
  meta.userAgent = navigator.userAgent;

  return meta;
}
