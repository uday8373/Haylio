-- Migration 002 — Business profile fields (brand images + AI training).
-- Run this if you already created the tables with schema.sql.
-- (Fresh installs: schema.sql now includes these columns — skip this file.)

alter table public.businesses
  add column if not exists logo_url text not null default '',
  add column if not exists cover_image_url text not null default '',
  add column if not exists background_image_url text not null default '',
  add column if not exists ai_instructions text not null default '';

-- Give the demo café some demo branding + AI guidance
update public.businesses set
  logo_url = 'https://picsum.photos/seed/bluebird-logo/200/200',
  cover_image_url = 'https://picsum.photos/seed/bluebird-cover/800/300',
  ai_instructions = 'Always be warm and upbeat. If someone asks about cakes or catering, encourage them to leave a callback request so we can discuss details. Mention our loyalty card (buy 9 coffees, get the 10th free) when relevant.'
where id = 'biz_demo' and logo_url = '';
