# Haylio — Product Spec

**One-liner:** A privacy-first contact layer for businesses. Share one smart link everywhere (Google Business Profile, website, flyers, vehicle decals) instead of a personal mobile number. Customers reach you through AI chat, messages, voice notes, and callbacks — you reply on your terms, and your real number never leaks.

## Problem

Small business owners publish their personal mobile number on Google Business Profile, websites, and directories because it's the only contact option they have. The result: spam calls, scraped numbers sold to lead-gen lists, WhatsApp marketing blasts, calls at 11pm, and no way to "rotate" the number once it leaks — it's their personal SIM.

## Solution

Every business gets a unique Haylio link (`haylio.app/b/your-business`) and QR code. Opening it shows a branded contact widget with channels the owner enables:

1. **AI Chat** — answers instantly from the business profile (hours, services, location, FAQs). Deflects 60–80% of repetitive questions without bothering the owner. Powered by Claude.
2. **Message** — structured text message (name + contact + message), lands in the dashboard inbox. No number exposed.
3. **Voice message** — visitor records a voice note in the browser; owner listens in the inbox. The "leave me a voicemail" experience without a phone line.
4. **Request a callback** — visitor leaves their number and preferred time; the owner calls back when convenient (their caller ID, their schedule).

The owner manages everything from a dashboard: inbox with replies, widget configuration, AI knowledge (business info + FAQs), share tools (link, QR, embeddable widget for any website).

## Why this wins

- **Spam asymmetry:** spammers harvest phone numbers because calls/SMS are cheap to blast. A web widget with AI triage is worthless to harvest — there's nothing to autodial.
- **Replaceable surface:** if a link gets abused, regenerate it. You can never regenerate your personal SIM.
- **Better than a second SIM/virtual number:** a number still rings, still gets spam, and can't answer questions. Haylio triages first and escalates only real intent.
- **SEO/GBP-compatible:** the link drops cleanly into Google Business Profile, Instagram bio, invoices, packaging, storefront QR.

## Architecture (current prototype)

- **Next.js 15 (App Router, TypeScript, Tailwind)** — single deployable app.
- **In-memory data store** behind a thin repository layer (`src/lib/store.ts`) — swap for Postgres/Prisma without touching UI or routes.
- **Cookie session auth** (prototype-grade; swap for NextAuth/Clerk later).
- **AI:** `/api/chat` calls the Anthropic API using the business profile as system prompt; falls back to FAQ keyword matching when no `ANTHROPIC_API_KEY` is set.
- **Voice:** browser `MediaRecorder` → audio data URL stored with the conversation (move to object storage later).
- **Channel abstraction:** every inbound contact is a `Conversation` with a `channel` — adding SMS/phone later is a new channel adapter, not a rewrite.

## Roadmap

| Phase | What ships |
|---|---|
| **1 — now** | Web channels: AI chat, messages, voice notes, callback requests. Dashboard inbox + widget config + share/QR/embed. |
| **2** | Real database + production auth. Email/push notification on new inbound. Business hours auto-responder. Spam/abuse filtering and link regeneration. Analytics (views, conversations, AI deflection rate). |
| **3 — telephony** | Twilio integration: provision a real masked number per business (for customers who insist on dialing). Voicemail-to-inbox with transcription. SMS in/out from the dashboard. |
| **4 — call proxy** | Smart call forwarding: AI/IVR answers, screens intent, then bridges the call to the owner's real number (never revealed). Per-hours routing, VIP allowlist, spam block. |
| **5** | Teams (multiple staff in inbox), WhatsApp/Instagram channel adapters, lead CRM export, multi-location businesses. |

## Monetization (suggested)

Free: 1 link, AI chat with cap, basic inbox. Pro (~$15/mo): unlimited AI, voice notes, embed widget, branding. Business (~$39/mo): masked phone number, call proxy, team inbox.
