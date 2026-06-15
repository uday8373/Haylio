-- Migration 016 — Dashboard-configurable IVR voice + prompt script.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.
--
-- voice         → Amazon Polly voice used by Twilio <Say> (see src/lib/ivr.ts IVR_VOICES)
-- ivr_script_id → predefined wording preset for the press-1 flow (see IVR_SCRIPTS)

alter table public.virtual_numbers
  add column if not exists voice text not null default 'Polly.Joanna-Neural',
  add column if not exists ivr_script_id text not null default 'friendly';
