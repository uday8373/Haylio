-- Migration 003 — Privacy Wrapper telephony: virtual numbers + engagement funnel.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.virtual_numbers (
  id text primary key,
  business_id text unique not null references public.businesses(id) on delete cascade,
  phone_number text not null,
  twilio_sid text,
  provider text not null default 'simulator',            -- simulator | twilio
  status text not null default 'pending_verification',   -- simulated | pending_verification | active
  greeting text not null,
  sms_template text not null,
  created_at bigint not null
);

create table if not exists public.engagements (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  caller_number text not null,
  caller_last4 text not null,
  token text unique not null,
  call_at bigint not null,
  sms_status text not null default 'pending',  -- pending | sent | delivered | failed | opted_out
  sms_sid text,
  sms_body text,
  clicked_at bigint,
  conversation_id text,
  created_at bigint not null
);
create index if not exists engagements_business_idx on public.engagements (business_id, call_at desc);
create index if not exists engagements_token_idx on public.engagements (token);

alter table public.virtual_numbers disable row level security;
alter table public.engagements disable row level security;
