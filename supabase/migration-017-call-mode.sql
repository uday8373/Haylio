-- Migration 017 — Single call-handling mode per number.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.
--
-- call_mode selects how inbound calls to the toll-free number are handled
-- (see CALL_MODES in src/lib/ivr.ts):
--   'ivr'         → greet the caller, ask them to press 1 to get the support link by text (default).
--   'missed_call' → disconnect instantly (no audio) and text the support link. Never rings the
--                   owner, no talk-time (non-chargeable).
--   'forward'     → ring the owner's real phone so they can talk to the caller (chargeable).

alter table public.virtual_numbers
  add column if not exists call_mode text not null default 'ivr';

-- Backfill: numbers that already had forwarding switched on become 'forward'.
update public.virtual_numbers
  set call_mode = 'forward'
  where forwarding_enabled = true and call_mode = 'ivr';
