-- Migration 007 — Temporary opt-in proof image uploads.
-- Holds a screenshot just long enough for Twilio to review it; the row is
-- deleted once the toll-free verification is approved or rejected.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.optin_uploads (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  content_type text not null default 'image/png',
  -- base64-encoded image bytes (kept small; capped in the API at a few MB)
  data text not null,
  created_at bigint not null
);

create index if not exists optin_uploads_business_idx on public.optin_uploads (business_id);

alter table public.optin_uploads disable row level security;
