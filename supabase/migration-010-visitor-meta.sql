-- Migration 010 — Capture visitor analytics (geo, device, browser) per conversation.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.conversations
  add column if not exists visitor_meta jsonb;
