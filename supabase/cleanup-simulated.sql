-- Remove simulated telephony data now that Twilio is live.
-- Run in Supabase Studio → SQL Editor.

delete from public.engagements where sms_sid like 'sim_%' or id like 'eng_seed%';
delete from public.virtual_numbers where provider = 'simulator';
