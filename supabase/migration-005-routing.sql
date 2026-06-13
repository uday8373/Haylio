-- Migration 005 — Forwarding schedule, DND hours, minutes tracking.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.virtual_numbers
  add column if not exists forward_start text not null default '09:00',
  add column if not exists forward_end text not null default '18:00',
  add column if not exists dnd_enabled boolean not null default false,
  add column if not exists dnd_start text not null default '21:00',
  add column if not exists dnd_end text not null default '08:00',
  add column if not exists tz_offset_minutes integer not null default 0;

-- Duration (seconds) of answered forwarded calls, for the monthly minutes cap.
alter table public.engagements
  add column if not exists call_duration integer;
