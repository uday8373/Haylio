-- Migration 015 — Team members & session actor.
-- Adds teammate invitations and tracks which user (owner vs invited member)
-- a session belongs to. Run in Supabase Studio → SQL Editor. Safe to re-run.

-- Invited teammates. The business owner is the implicit admin and is NOT stored
-- here. Email is unique app-wide so an invited address can't open a new account.
create table if not exists public.team_members (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  email text not null unique,
  role text not null default 'member',          -- 'admin' | 'member'
  status text not null default 'invited',        -- 'invited' | 'active'
  invited_by_name text,
  token text not null unique,
  invited_at bigint not null,
  accepted_at bigint
);

create index if not exists team_members_business_idx on public.team_members (business_id);

-- Who a session belongs to. Absent member_id ⇒ the owner (admin). These are
-- optional; the app falls back gracefully if they're missing.
alter table public.sessions
  add column if not exists role text not null default 'admin';
alter table public.sessions
  add column if not exists actor_email text;
alter table public.sessions
  add column if not exists member_id text;
