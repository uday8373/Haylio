-- Migration 013 — Editable lead display name (overrides the derived one).
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.lead_tags
  add column if not exists name text;
