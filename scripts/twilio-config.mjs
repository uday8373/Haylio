#!/usr/bin/env node
/**
 * Inspect / configure the Twilio toll-free number's voice + SMS webhooks.
 *
 *   node scripts/twilio-config.mjs              # check: list numbers + their webhooks
 *   node scripts/twilio-config.mjs --set <URL>  # point VoiceUrl/SmsUrl at <URL> (https base)
 *
 * <URL> is your public HTTPS base (Vercel deploy or ngrok tunnel), e.g.
 *   node scripts/twilio-config.mjs --set https://haylio.vercel.app
 *
 * Credentials are read from .env (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  fs.readFileSync(path.join(root, ".env"), "utf8")
    .split("\n")
    .filter((l) => l && !l.trimStart().startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const SID = env.TWILIO_ACCOUNT_SID;
const TOKEN = env.TWILIO_AUTH_TOKEN;
if (!SID || !TOKEN) {
  console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN in .env");
  process.exit(1);
}

const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
const TW = "https://api.twilio.com/2010-04-01";

const setIdx = process.argv.indexOf("--set");
const setBase = setIdx !== -1 ? (process.argv[setIdx + 1] || "").replace(/\/$/, "") : null;
if (setIdx !== -1) {
  if (!/^https:\/\//.test(setBase)) {
    console.error("--set needs a public https URL, e.g. --set https://your-app.vercel.app");
    process.exit(1);
  }
}

async function tw(p, init) {
  const res = await fetch(`${TW}${p}`, {
    ...init,
    headers: { Authorization: auth, "content-type": "application/x-www-form-urlencoded", ...(init?.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const ok = (v) => (v ? "\x1b[32m" + v + "\x1b[0m" : "\x1b[31m(not set)\x1b[0m");

const accounts = [{ sid: SID, friendly_name: "(main)" }];
const subs = await tw("/Accounts.json?PageSize=50");
for (const a of subs.accounts || []) if (a.sid !== SID) accounts.push(a);

let total = 0;
for (const a of accounts) {
  const d = await tw(`/Accounts/${a.sid}/IncomingPhoneNumbers.json?PageSize=50`);
  const nums = d.incoming_phone_numbers || [];
  if (!nums.length) continue;
  console.log(`\nAccount ${a.sid} ${a.friendly_name || ""}`);
  for (const n of nums) {
    total++;
    console.log(`  ${n.phone_number}  (sid ${n.sid})`);
    console.log(`    VoiceUrl: ${ok(n.voice_url)}  [${n.voice_method || "-"}]`);
    console.log(`    SmsUrl  : ${ok(n.sms_url)}  [${n.sms_method || "-"}]`);

    if (setBase) {
      const body = new URLSearchParams({
        VoiceUrl: `${setBase}/api/twilio/voice`,
        VoiceMethod: "POST",
        SmsUrl: `${setBase}/api/twilio/inbound-sms`,
        SmsMethod: "POST",
      });
      await tw(`/Accounts/${a.sid}/IncomingPhoneNumbers/${n.sid}.json`, { method: "POST", body });
      console.log(`    -> updated VoiceUrl to ${setBase}/api/twilio/voice`);
    }
  }
}

if (!total) console.log("\nNo phone numbers found on this account or its subaccounts.");
else if (!setBase) console.log(`\nA number is "configured to receive calls" only when VoiceUrl is set to https://<public>/api/twilio/voice`);
