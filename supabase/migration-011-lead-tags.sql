-- Migration 011 — CRM lead tags/scoring overlay.
-- Leads themselves are derived from conversations + engagements; this table
-- stores only the manual overlay (tag + note) keyed by a contact key.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.lead_tags (
  business_id text not null references public.businesses(id) on delete cascade,
  contact_key text not null,
  tag text not null default 'none',
  note text,
  updated_at bigint not null,
  primary key (business_id, contact_key)
);

alter table public.lead_tags disable row level security;
