-- Haylio schema — paste into Supabase Studio → SQL Editor → Run.
-- Safe to re-run (drops and recreates).

drop table if exists public.sessions;
drop table if exists public.conversations;
drop table if exists public.businesses;

create table public.businesses (
  id text primary key,
  handle text unique not null,
  name text not null,
  email text unique not null,
  password_hash text not null,
  category text not null default '',
  description text not null default '',
  hours text not null default '',
  location text not null default '',
  website text not null default '',
  phone text not null default '',
  google_place_id text,
  verified boolean not null default false,
  twilio_subaccount_sid text,
  plan_status text not null default 'inactive',
  plan_subscription_id text,
  plan_activated_at bigint,
  logo_url text not null default '',
  cover_image_url text not null default '',
  background_image_url text not null default '',
  ai_instructions text not null default '',
  faqs jsonb not null default '[]',
  widget jsonb not null,
  created_at bigint not null
);

create table public.conversations (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  channel text not null,
  visitor_name text,
  visitor_contact text,
  visitor_key text not null,
  unread boolean not null default true,
  messages jsonb not null default '[]',
  visitor_meta jsonb,
  tag text not null default 'none',
  created_at bigint not null,
  updated_at bigint not null
);
create index conversations_business_idx on public.conversations (business_id, updated_at desc);

create table public.sessions (
  token text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  created_at bigint not null
);

-- Telephony (Privacy Wrapper) — also available standalone as migration-003.
create table if not exists public.virtual_numbers (
  id text primary key,
  business_id text unique not null references public.businesses(id) on delete cascade,
  phone_number text not null,
  twilio_sid text,
  subaccount_sid text,
  provider text not null default 'simulator',
  status text not null default 'pending_verification',
  greeting text not null,
  sms_template text not null,
  voice text not null default 'Polly.Joanna-Neural',
  ivr_script_id text not null default 'friendly',
  call_mode text not null default 'ivr',
  forwarding_enabled boolean not null default false,
  forward_to_number text not null default '',
  forward_start text not null default '09:00',
  forward_end text not null default '18:00',
  dnd_enabled boolean not null default false,
  dnd_start text not null default '21:00',
  dnd_end text not null default '08:00',
  tz_offset_minutes integer not null default 0,
  created_at bigint not null
);

create table if not exists public.engagements (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  caller_number text not null,
  caller_last4 text not null,
  token text unique not null,
  call_at bigint not null,
  sms_status text not null default 'pending',
  sms_sid text,
  sms_body text,
  clicked_at bigint,
  conversation_id text,
  call_outcome text,
  call_duration integer,
  created_at bigint not null
);
create index if not exists engagements_business_idx on public.engagements (business_id, call_at desc);
create index if not exists engagements_token_idx on public.engagements (token);

-- Toll-Free Verification required before a toll-free number can send SMS (one per business).
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
create unique index if not exists sms_verifications_business_idx on public.sms_verifications (business_id);

-- Temporary opt-in proof images, deleted once verification is finalised.
create table if not exists public.optin_uploads (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  content_type text not null default 'image/png',
  data text not null,
  created_at bigint not null
);
create index if not exists optin_uploads_business_idx on public.optin_uploads (business_id);

-- Connected calendars for appointment booking (Google OAuth tokens live here).
create table if not exists public.calendar_accounts (
  business_id text primary key references public.businesses(id) on delete cascade,
  provider text not null default 'google',
  email text not null default '',
  calendar_id text not null default 'primary',
  refresh_token text not null,
  access_token text,
  token_expiry bigint,
  slot_minutes integer not null default 30,
  days text not null default '1,2,3,4,5',
  start_hour integer not null default 9,
  end_hour integer not null default 17,
  tz_offset_minutes integer not null default 0,
  created_at bigint not null,
  updated_at bigint not null
);

-- CRM lead tags/scoring overlay (leads are derived from conversations + engagements).
create table if not exists public.lead_tags (
  business_id text not null references public.businesses(id) on delete cascade,
  contact_key text not null,
  tag text not null default 'none',
  note text,
  name text,
  updated_at bigint not null,
  primary key (business_id, contact_key)
);

alter table public.virtual_numbers disable row level security;
alter table public.engagements disable row level security;
alter table public.sms_verifications disable row level security;
alter table public.optin_uploads disable row level security;
alter table public.lead_tags disable row level security;

-- Prototype note: the app talks to these tables server-side with the anon key,
-- so RLS is disabled. Before going to production, switch the server to the
-- service_role key and enable RLS with proper policies.
alter table public.businesses disable row level security;
alter table public.conversations disable row level security;
alter table public.sessions disable row level security;

-- ---------- Demo seed (login: demo@haylio.app / demo1234) ----------

insert into public.businesses
  (id, handle, name, email, password_hash, category, description, hours, location, website, phone, verified,
   plan_status,
   logo_url, cover_image_url, background_image_url, ai_instructions, faqs, widget, created_at)
values (
  'biz_demo',
  'demo-cafe',
  'Bluebird Café',
  'demo@haylio.app',
  '23a18bb7acb8177262f676e8e88f3a86ccf13940c0700f170481452f75ae3901',
  'Café & Bakery',
  'Neighbourhood specialty coffee and fresh-baked goods. Breakfast and lunch, dine-in or takeaway. We also take custom cake orders.',
  'Mon–Fri 7:00–17:00, Sat–Sun 8:00–15:00',
  '12 Harbour Lane, Sydney NSW',
  'https://bluebirdcafe.example.com',
  '',
  true,
  'active',
  'https://picsum.photos/seed/bluebird-logo/200/200',
  'https://picsum.photos/seed/bluebird-cover/800/300',
  '',
  'Always be warm and upbeat. If someone asks about cakes or catering, encourage them to leave a callback request so we can discuss details. Mention our loyalty card (buy 9 coffees, get the 10th free) when relevant.',
  '[
    {"q":"Do you take cake orders?","a":"Yes! Custom cakes need 48 hours notice. Send us a message with your date and design ideas."},
    {"q":"Do you have vegan options?","a":"We have vegan banana bread, salads, and oat/soy/almond milk for all coffees."},
    {"q":"Is there parking?","a":"Free 2-hour street parking on Harbour Lane, plus a paid lot one block away."},
    {"q":"Do you do catering?","a":"We cater events of 10–100 people. Leave a callback request and we''ll call you to discuss."}
  ]',
  '{"themeColor":"#8b5cf6","greeting":"Hi! 👋 How can we help you today?","channels":{"aiChat":true,"message":true,"voicemail":true,"callback":true}}',
  (extract(epoch from now()) * 1000)::bigint
)
on conflict (id) do nothing;

insert into public.conversations (id, business_id, channel, visitor_name, visitor_contact, visitor_key, unread, messages, created_at, updated_at)
values
(
  'conv_seed1', 'biz_demo', 'chat', 'Priya', null, 'vk_seed1', true,
  '[
    {"id":"m_s1a","role":"visitor","kind":"text","text":"Hi, are you open on public holidays?","at":0},
    {"id":"m_s1b","role":"ai","kind":"text","text":"We''re usually open 8:00–15:00 on public holidays, but it can vary — would you like to leave a message and the team will confirm?","at":0},
    {"id":"m_s1c","role":"visitor","kind":"text","text":"Yes please — is the café open this Monday?","at":0}
  ]',
  (extract(epoch from now()) * 1000)::bigint - 5400000,
  (extract(epoch from now()) * 1000)::bigint - 5100000
),
(
  'conv_seed2', 'biz_demo', 'callback', 'Marco', '+61 400 123 456', 'vk_seed2', true,
  '[{"id":"m_s2a","role":"visitor","kind":"callback","phone":"+61 400 123 456","preferredTime":"Today after 4pm","text":"Catering quote for office event, ~30 people.","at":0}]',
  (extract(epoch from now()) * 1000)::bigint - 18000000,
  (extract(epoch from now()) * 1000)::bigint - 18000000
)
on conflict (id) do nothing;

-- Fix the seeded message timestamps to roughly match conversation times
update public.conversations
set messages = (
  select jsonb_agg(jsonb_set(m, '{at}', to_jsonb(created_at)))
  from jsonb_array_elements(messages) m
)
where id in ('conv_seed1', 'conv_seed2');
