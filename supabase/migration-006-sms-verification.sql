-- Migration 006 — Toll-Free Verification for SMS sending.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.sms_verifications (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  business_name text not null default '',
  website text not null default '',
  address text not null default '',
  contact_name text not null default '',
  contact_email text not null default '',
  contact_phone text not null default '',
  toll_free_number text not null default '',
  use_case text not null default 'customer_care',
  use_case_summary text not null default '',
  sample_message text not null default '',
  opt_in_type text not null default 'web_form',
  opt_in_details text not null default '',
  opt_in_image_url text not null default '',
  monthly_volume text not null default '',
  status text not null default 'not_submitted',
  twilio_verification_sid text,
  rejection_reason text,
  submitted_at bigint,
  reviewed_at bigint,
  created_at bigint not null,
  updated_at bigint not null
);

create unique index if not exists sms_verifications_business_idx
  on public.sms_verifications (business_id);

alter table public.sms_verifications disable row level security;
