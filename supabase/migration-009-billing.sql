-- Migration 009 — Paywall: per-business plan status (Cashfree subscription).
-- Run in Supabase Studio → SQL Editor. Safe to re-run.

alter table public.businesses
  add column if not exists plan_status text not null default 'inactive',
  add column if not exists plan_subscription_id text,
  add column if not exists plan_activated_at bigint;
