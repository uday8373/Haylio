import type { NextRequest } from "next/server";
import type { VisitorMeta } from "./types";

/**
 * Build a VisitorMeta from the request (IP, geo headers, user-agent) merged
 * with client-collected fields (timezone, screen, language, etc.).
 *
 * Geo headers are populated by hosting platforms: Vercel (x-vercel-ip-*),
 * Cloudflare (cf-ipcountry). On localhost they're absent — geo will be empty.
 */
export function buildVisitorMeta(req: NextRequest, client?: Partial<VisitorMeta>): VisitorMeta {
  const h = req.headers;
  const ua = h.get("user-agent") ?? client?.userAgent ?? "";
  const parsed = parseUserAgent(ua);

  const ip =
    (h.get("x-forwarded-for") ?? "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    undefined;

  const country = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || undefined;
  const region = h.get("x-vercel-ip-country-region") || undefined;
  const city = decodeHeader(h.get("x-vercel-ip-city")) || undefined;
  const tzHeader = h.get("x-vercel-ip-timezone") || undefined;
  const acceptLang = h.get("accept-language") || undefined;
  const referer = h.get("referer") || undefined;

  return {
    ip: ip || undefined,
    country: (country || undefined)?.toUpperCase(),
    region,
    city,
    browser: parsed.browser,
    browserVersion: parsed.browserVersion,
    os: parsed.os,
    deviceType: parsed.deviceType,
    userAgent: ua || undefined,
    // Client values win where present; fall back to header-derived ones.
    language: client?.language || firstLang(acceptLang),
    languages: client?.languages,
    timezone: client?.timezone || tzHeader,
    screen: client?.screen,
    viewport: client?.viewport,
    devicePixelRatio: client?.devicePixelRatio,
    platform: client?.platform,
    deviceMemory: client?.deviceMemory,
    cpuCores: client?.cpuCores,
    touch: client?.touch,
    connection: client?.connection,
    colorScheme: client?.colorScheme,
    referrer: client?.referrer || referer,
    pageUrl: client?.pageUrl,
    collectedAt: Date.now(),
  };
}

function decodeHeader(v: string | null): string | undefined {
  if (!v) return undefined;
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

function firstLang(accept?: string): string | undefined {
  if (!accept) return undefined;
  return accept.split(",")[0]?.split(";")[0]?.trim() || undefined;
}

/** Minimal, dependency-free user-agent parsing for the common cases. */
export function parseUserAgent(ua: string): {
  browser?: string;
  browserVersion?: string;
  os?: string;
  deviceType?: VisitorMeta["deviceType"];
} {
  if (!ua) return {};
  const u = ua;

  // OS
  let os: string | undefined;
  if (/Windows NT 10/.test(u)) os = "Windows 10/11";
  else if (/Windows NT/.test(u)) os = "Windows";
  else if (/iPhone|iPad|iPod/.test(u)) os = "iOS";
  else if (/Mac OS X/.test(u)) os = "macOS";
  else if (/Android/.test(u)) os = "Android";
  else if (/CrOS/.test(u)) os = "ChromeOS";
  else if (/Linux/.test(u)) os = "Linux";

  // Device type
  let deviceType: VisitorMeta["deviceType"] = "desktop";
  if (/iPad|Tablet|PlayBook|Silk/.test(u) || (/Android/.test(u) && !/Mobile/.test(u))) deviceType = "tablet";
  else if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry/.test(u)) deviceType = "mobile";

  // Browser (order matters — many UAs include "Safari"/"Chrome" tokens)
  let browser: string | undefined;
  let browserVersion: string | undefined;
  const pick = (re: RegExp, name: string) => {
    const m = u.match(re);
    if (m) {
      browser = name;
      browserVersion = m[1];
    }
    return Boolean(m);
  };

  if (/Edg\//.test(u)) pick(/Edg\/([\d.]+)/, "Edge");
  else if (/OPR\/|Opera/.test(u)) pick(/(?:OPR|Opera)\/([\d.]+)/, "Opera");
  else if (/SamsungBrowser/.test(u)) pick(/SamsungBrowser\/([\d.]+)/, "Samsung Internet");
  else if (/Firefox\//.test(u)) pick(/Firefox\/([\d.]+)/, "Firefox");
  else if (/Chrome\//.test(u)) pick(/Chrome\/([\d.]+)/, "Chrome");
  else if (/Version\/[\d.]+.*Safari/.test(u)) pick(/Version\/([\d.]+)/, "Safari");
  else if (/Safari\//.test(u)) browser = "Safari";

  return { browser, browserVersion, os, deviceType };
}

const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", CA: "Canada", AU: "Australia", IN: "India",
  DE: "Germany", FR: "France", ES: "Spain", IT: "Italy", NL: "Netherlands", IE: "Ireland",
  BR: "Brazil", MX: "Mexico", JP: "Japan", CN: "China", SG: "Singapore", AE: "UAE",
  SA: "Saudi Arabia", ZA: "South Africa", NZ: "New Zealand", SE: "Sweden", NO: "Norway",
  DK: "Denmark", FI: "Finland", CH: "Switzerland", BE: "Belgium", AT: "Austria", PT: "Portugal",
  PL: "Poland", RU: "Russia", KR: "South Korea", ID: "Indonesia", PH: "Philippines",
  MY: "Malaysia", TH: "Thailand", VN: "Vietnam", PK: "Pakistan", BD: "Bangladesh", NG: "Nigeria",
};

export function countryName(code?: string): string | undefined {
  if (!code) return undefined;
  return COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase();
}

/** ISO 3166-1 alpha-2 → flag emoji via regional indicator symbols. */
export function countryFlag(code?: string): string {
  if (!code || code.length !== 2) return "🌐";
  const cc = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "🌐";
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
