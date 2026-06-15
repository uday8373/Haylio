-- Migration 014 — Per-conversation category tag (query/complaint/request/spam).
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.conversations
  add column if not exists tag text not null default 'none';
