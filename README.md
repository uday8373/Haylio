# ⚡ Haylio

A privacy-first contact layer for businesses: share one smart link instead of your personal mobile number. Customers reach you via AI chat, messages, voice notes, and callback requests. See `PRODUCT.md` for the full product spec and roadmap.

## Setup

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 1. Supabase (persistence)

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are set in `.env`. **Before first use**, open Supabase Studio → SQL Editor, paste the contents of `supabase/schema.sql`, and run it. This creates `businesses`, `conversations`, `sessions` and seeds the demo café.

Without Supabase env vars, the app falls back to an in-memory store (data resets on restart).

> Prototype note: tables run with RLS disabled and the server uses the anon key. Before production, switch to the service_role key (server-side only) and enable RLS.

### 2. Google Business validation (signup)

Set `GOOGLE_PLACES_API_KEY` in `.env` — create a key in Google Cloud Console with **Places API (New)** enabled. Signup then searches Google Business listings: picking a listing locks the business name to the Google name (not editable) and auto-imports website, address, phone, and opening hours. Businesses not on Google can register manually (unverified, name editable).

### 3. AI chat

`ANTHROPIC_API_KEY` in `.env` powers real Claude answers in the widget; without it, the widget falls back to FAQ keyword matching.

## Demo

- **Live widget:** http://localhost:3000/b/demo-cafe
- **Dashboard login:** `demo@haylio.app` / `demo1234` (pre-filled)

## Try the full loop

1. Open `/b/demo-cafe`, ask the AI a question, or leave a message / voice note / callback request.
2. Log in to `/dashboard` → Inbox: read messages, play voice notes, reply.
3. Widget & AI: toggle channels, edit FAQs (the AI's knowledge), change colors.
4. Share: copy your link, QR code, or website embed snippet.
5. Register a new business via Google search (needs the Places key) or manually.

## Architecture notes

- Data layer: `src/lib/store.ts` — async repository over Supabase PostgREST (`src/lib/supabase.ts`, plain fetch, no SDK) with in-memory fallback. Messages live as JSONB on each conversation.
- Auth: cookie sessions stored in the `sessions` table (prototype-grade).
- Google Places: `src/app/api/places/search/route.ts` (Text Search, New API).
- Voice messages: browser `MediaRecorder` → data URL in the conversation JSONB.
- Adding real SMS / call proxy later = new channel adapters (see `PRODUCT.md`).
