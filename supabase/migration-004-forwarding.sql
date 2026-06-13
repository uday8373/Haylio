-- Migration 004 — Call forwarding to the owner's real number.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.virtual_numbers
  add column if not exists forwarding_enabled boolean not null default false,
  add column if not exists forward_to_number text not null default '';

-- Outcome of each intercepted call:
-- 'texted' (greeting + SMS), 'forwarded_answered', 'forwarded_missed' (rang owner, no answer → SMS)
alter table public.engagements
  add column if not exists call_outcome text;
