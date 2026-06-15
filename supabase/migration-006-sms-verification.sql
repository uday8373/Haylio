-- Migration 006 — Toll-Free Verification for SMS sending.
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

create table if not exists public.sms_verifications (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  business_name text not null default '',
  website text not null default '',
  address text not null default '',
  address_street text,
  address_street2 text,
  address_city text,
  address_state text,
  address_postal text,
  address_country text,
  business_type text,
  registration_number text,
  registration_authority text,
  registration_country text,
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

-- Backfill columns for tables created by an earlier version of this migration
-- (CREATE TABLE IF NOT EXISTS won't add columns to an existing table).
alter table public.sms_verifications
  add column if not exists business_name text not null default '',
  add column if not exists website text not null default '',
  add column if not exists address text not null default '',
  add column if not exists address_street text,
  add column if not exists address_street2 text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists address_postal text,
  add column if not exists address_country text,
  add column if not exists business_type text,
  add column if not exists registration_number text,
  add column if not exists registration_authority text,
  add column if not exists registration_country text,
  add column if not exists contact_name text not null default '',
  add column if not exists contact_email text not null default '',
  add column if not exists contact_phone text not null default '',
  add column if not exists toll_free_number text not null default '',
  add column if not exists use_case text not null default 'customer_care',
  add column if not exists use_case_summary text not null default '',
  add column if not exists sample_message text not null default '',
  add column if not exists opt_in_type text not null default 'web_form',
  add column if not exists opt_in_details text not null default '',
  add column if not exists opt_in_image_url text not null default '',
  add column if not exists monthly_volume text not null default '',
  add column if not exists status text not null default 'not_submitted',
  add column if not exists twilio_verification_sid text,
  add column if not exists rejection_reason text,
  add column if not exists submitted_at bigint,
  add column if not exists reviewed_at bigint;

alter table public.sms_verifications disable row level security;
