-- Migration 018 — WhatsApp messaging (Twilio).
-- Run in Supabase Studio → SQL Editor. Safe to re-run.
--
-- whats_app_from      → the business's WhatsApp sender address, e.g.
--                       'whatsapp:+14155238886'. Empty ⇒ use the platform's
--                       Twilio WhatsApp Sandbox sender (see src/lib/whatsapp.ts).
-- whatsapp_messages   → log of outbound WhatsApp messages sent from the dashboard.

alter table public.virtual_numbers
  add column if not exists whats_app_from text not null default '';

create table if not exists public.whatsapp_messages (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  to_number text not null,
  to_last4 text not null,
  body text not null,
  status text not null default 'queued',
  sid text,
  error text,
  created_at bigint not null
);

create index if not exists whatsapp_messages_business_id_idx
  on public.whatsapp_messages (business_id, created_at desc);

-- Prototype note: RLS disabled to match the rest of the schema.
alter table public.whatsapp_messages disable row level security;
