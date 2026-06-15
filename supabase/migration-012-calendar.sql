-- Migration 012 — Connected calendars for appointment booking (Google).
-- Stored separately from businesses so OAuth tokens never leak via business APIs.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.calendar_accounts (
  business_id text primary key references public.businesses(id) on delete cascade,
  provider text not null default 'google',
  email text not null default '',
  calendar_id text not null default 'primary',
  refresh_token text not null,
  access_token text,
  token_expiry bigint,
  slot_minutes integer not null default 30,
  days text not null default '1,2,3,4,5',
  start_hour integer not null default 9,
  end_hour integer not null default 17,
  tz_offset_minutes integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

alter table public.calendar_accounts disable row level security;
