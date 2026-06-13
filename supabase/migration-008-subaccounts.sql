-- Migration 008 — Twilio subaccounts per business + per-number subaccount link.
-- Each business gets its own Twilio subaccount; numbers are bought under it.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.businesses
  add column if not exists twilio_subaccount_sid text;

alter table public.virtual_numbers
  add column if not exists subaccount_sid text;
