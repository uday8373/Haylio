"""Generate supabase/demo-data.sql for the demo business (biz_demo).

Run: python3 scripts/generate-demo-data.py  (needs espeak-ng and ffmpeg for the voice notes)

All times are written relative to now() in SQL, so the data always covers the
last ~2 weeks whenever the script is run.
"""
import base64
import json
import re
import subprocess
import tempfile
from pathlib import Path

BIZ = "biz_demo"
BIZ_NAME = "Bluebird Café"
LINK_BASE = "https://haylio.vercel.app/c/"


def q(s):
    """SQL string literal."""
    if s is None:
        return "null"
    return "'" + str(s).replace("'", "''") + "'"


def ago(minutes):
    return f"pg_temp.ago({int(minutes)})"


def D(days, hours=0, mins=0):
    return days * 1440 + hours * 60 + mins


def digits(phone):
    return re.sub(r"\D", "", phone)


def ckey(contact):
    if "@" in contact:
        return "email:" + contact.lower()
    return "tel:" + digits(contact)[-10:]


def voice_note(text, voice):
    with tempfile.TemporaryDirectory() as d:
        wav, mp3 = Path(d, "v.wav"), Path(d, "v.mp3")
        subprocess.run(["espeak-ng", "-v", voice, "-s", "150", "-w", str(wav), text], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav), "-ac", "1", "-ar", "16000",
                        "-c:a", "libmp3lame", "-b:a", "24k", str(mp3)], check=True)
        return "data:audio/mpeg;base64," + base64.b64encode(mp3.read_bytes()).decode()


MOBILE_IOS = {"browser": "Safari", "os": "iOS", "deviceType": "mobile", "language": "en-AU", "timezone": "Australia/Sydney"}
MOBILE_ANDROID = {"browser": "Chrome", "os": "Android", "deviceType": "mobile", "language": "en-AU", "timezone": "Australia/Sydney"}
DESKTOP = {"browser": "Chrome", "os": "macOS", "deviceType": "desktop", "language": "en-AU", "timezone": "Australia/Sydney"}


def meta(base, city, referrer):
    m = dict(base)
    m.update({"country": "AU", "region": "NSW", "city": city, "referrer": referrer})
    return m


# (id, channel, name, contact, tag, unread, minutes_ago, messages, visitor_meta)
# messages: list of (role, kind, payload, seconds_after_start)
conversations = [
    ("demo_c01", "chat", "Emily Carter", "emily.carter@example.com", "request", True, 40, [
        ("visitor", "text", "Hi! Do you have gluten-free options?", 0),
        ("ai", "text", "We do. There are gluten-free brownies, and most salads and egg dishes can be made gluten-free. Our kitchen isn't fully gluten-free, so let us know about any allergies.", 5),
        ("visitor", "text", "Great. Can I book a table for 6 this Sunday around 10am?", 60),
        ("ai", "text", "We don't take weekend bookings, but we can hold a table for groups of 6 or more if you let us know ahead. I'll pass your request to the team now, and they'll confirm by email.", 66),
        ("visitor", "text", "Perfect, thank you!", 90),
    ], meta(MOBILE_IOS, "Sydney", "https://www.google.com/")),

    ("demo_c02", "callback", "James Wilson", "+61 412 345 678", "request", True, D(0, 2), [
        ("visitor", "callback", {"phone": "+61 412 345 678", "preferredTime": "Tomorrow, 9 to 11 am",
                                 "text": "Catering for a 40-person office lunch on the 12th. Sandwich platters and pastries."}, 0),
    ], meta(DESKTOP, "Sydney", "https://bluebirdcafe.example.com/catering")),

    ("demo_c03", "voicemail", "Sam Nguyen", "+61 423 111 902", "request", True, D(0, 5), [
        ("visitor", "audio", ("Hi, this is Sam. I'd love to order a chocolate birthday cake for Saturday, for about twenty people. Please call me back on this number. Thanks!", "en-us+m3"), 0),
    ], meta(MOBILE_ANDROID, "Parramatta", "")),

    ("demo_c04", "message", "Olivia Brown", "olivia.b@example.com", "complaint", False, D(1, 3), [
        ("visitor", "text", "I ordered a custom cake for pickup at 2pm yesterday and it wasn't ready until 2:40. A bit disappointing for a birthday.", 0),
        ("business", "text", "Hi Olivia, I'm really sorry about the wait. That's not the experience we want for anyone. Your next coffee and slice are on us, just mention this message at the counter.", 3600),
        ("visitor", "text", "Thanks, I appreciate that.", 5400),
    ], meta(DESKTOP, "Sydney", "")),

    ("demo_c05", "chat", None, None, "query", False, D(1, 6), [
        ("visitor", "text", "What time do you close on Saturday?", 0),
        ("ai", "text", "On Saturdays we're open from 8:00 to 15:00.", 4),
    ], meta(MOBILE_IOS, "Surry Hills", "https://www.instagram.com/")),

    ("demo_c06", "chat", "Daniel Lee", "+61 434 222 781", "request", False, D(2, 1), [
        ("visitor", "text", "Can you do a cake shaped like a football? It's for my son's 8th.", 0),
        ("ai", "text", "We love a themed cake! Custom cakes need 48 hours' notice. Can I take your number so the team can talk through the design?", 5),
        ("visitor", "text", "Sure, 0434 222 781.", 40),
        ("business", "text", "Hi Daniel, yes we can! A 2D football cake for 15 people is $85. Want to lock it in for this Friday?", 7200),
    ], meta(MOBILE_ANDROID, "Sydney", "https://www.google.com/")),

    ("demo_c07", "message", "RankBoost SEO", "growth@rankboost.example.com", "spam", False, D(2, 9), [
        ("visitor", "text", "Get your café to #1 on Google in 7 days, guaranteed! Reply YES for a free audit.", 0),
    ], None),

    ("demo_c08", "callback", "Aisha Khan", "+61 455 678 123", "request", False, D(3, 4), [
        ("visitor", "callback", {"phone": "+61 455 678 123", "preferredTime": "Weekdays after 5 pm",
                                 "text": "Hosting a baby shower on a Sunday afternoon, about 25 guests. Do you do private bookings?"}, 0),
    ], meta(MOBILE_IOS, "Bondi", "https://www.google.com/maps")),

    ("demo_c09", "voicemail", "Tom Fraser", "+61 401 555 019", "query", False, D(4, 2), [
        ("visitor", "audio", ("Hey, it's Tom. Just checking if you're open on the public holiday Monday, and whether the kitchen does lunch that day. Cheers.", "en-us+m1"), 0),
    ], None),

    ("demo_c10", "chat", "Mia Rossi", "mia.rossi@example.com", "query", False, D(4, 7), [
        ("visitor", "text", "Which plant milks do you have?", 0),
        ("ai", "text", "We have oat, soy and almond milk for all coffees, at no extra charge.", 4),
        ("visitor", "text", "Nice. Do you have a loyalty card?", 30),
        ("ai", "text", "Yes! Buy 9 coffees and your 10th is free. Just ask for a card next time you're in.", 35),
    ], meta(MOBILE_IOS, "Newtown", "https://www.instagram.com/")),

    ("demo_c11", "chat", "Ben Carter", "+61 478 902 334", "request", False, D(5, 1), [
        ("visitor", "text", "Hi, I called earlier. Do you deliver to offices in Darling Harbour?", 0),
        ("ai", "text", "We don't run deliveries for single orders, but catering orders for 10 or more can be dropped off within 5 km. Would you like me to pass this to the team?", 5),
        ("visitor", "text", "Yes, it's for about 12 people next Wednesday.", 50),
        ("business", "text", "Hi Ben, Wednesday works. I'll text you a platter menu now.", 3000),
    ], meta(MOBILE_ANDROID, "Sydney", "")),

    ("demo_c12", "message", "Grace Kim", "grace.kim@example.com", "query", False, D(6, 5), [
        ("visitor", "text", "Hi, are you hiring baristas at the moment? I have 3 years of experience.", 0),
        ("business", "text", "Hi Grace, we are! Could you drop your CV in at the counter any weekday morning?", 20000),
    ], meta(DESKTOP, "Glebe", "https://bluebirdcafe.example.com/")),

    ("demo_c13", "callback", "Lucas Martin", "+61 466 300 882", "request", False, D(7, 3), [
        ("visitor", "callback", {"phone": "+61 466 300 882", "preferredTime": "Friday morning",
                                 "text": "I run a gym café and would like to stock your banana bread wholesale."}, 0),
    ], meta(DESKTOP, "Alexandria", "https://www.google.com/")),

    ("demo_c14", "chat", None, None, "query", False, D(8, 2), [
        ("visitor", "text", "Is there parking nearby?", 0),
        ("ai", "text", "There's free 2-hour street parking on Harbour Lane, and a paid car park one block away.", 4),
    ], meta(MOBILE_IOS, "Sydney", "https://www.google.com/maps")),

    ("demo_c15", "voicemail", "Chloe Evans", "+61 422 870 455", "complaint", False, D(9, 4), [
        ("visitor", "audio", ("Hi, it's Chloe. I came in this morning and my oat latte was made with regular milk. I'm lactose intolerant, so I just wanted to let you know. Thanks.", "en-us+f3"), 0),
    ], None),

    ("demo_c16", "chat", "Noah Patel", "+61 490 112 556", "request", False, D(11, 1), [
        ("visitor", "text", "Hi, I missed you on the phone. How much is catering for a team breakfast, about 20 people?", 0),
        ("ai", "text", "Breakfast catering starts at $14 per person for pastries, fruit and coffee. For exact pricing, the team can call you back. Shall I arrange that?", 5),
        ("visitor", "text", "Yes please. We'd want it every second Friday.", 45),
    ], meta(DESKTOP, "North Sydney", "")),

    ("demo_c17", "message", "Ella Thompson", "ella.t@example.com", "query", False, D(13, 6), [
        ("visitor", "text", "Do you have high chairs? Coming in with my toddler on Saturday.", 0),
        ("business", "text", "Hi Ella, we have two high chairs and a small kids' corner. See you Saturday!", 9000),
    ], meta(MOBILE_IOS, "Marrickville", "")),
]

# (id, caller, minutes_ago, outcome, sms_status, duration_s, clicked_after_min, conversation_id)
engagements = [
    ("demo_e01", "+61455678123", 15, "texted", "sent", None, None, None),
    ("demo_e02", "+61412345678", D(0, 2, 30), "forwarded_answered", "pending", 95, None, None),
    ("demo_e03", "+61423111902", D(0, 5, 20), "texted", "delivered", None, 12, "demo_c03"),
    ("demo_e04", "+61298765432", D(1, 2), "texted", "delivered", None, None, None),
    ("demo_e05", "+61400999123", D(2, 4), "texted", "failed", None, None, None),
    ("demo_e06", "+61437555210", D(3, 1), "forwarded_answered", "pending", 180, None, None),
    ("demo_e07", "+61428000777", D(4, 3), "forwarded_missed", "delivered", None, 6, None),
    ("demo_e08", "+61478902334", D(5, 1, 20), "forwarded_missed", "delivered", None, 18, "demo_c11"),
    ("demo_e09", "+61411222333", D(6, 2), "texted", "opted_out", None, None, None),
    ("demo_e10", "+61403330990", D(8, 5), "forwarded_missed", "delivered", None, None, None),
    ("demo_e11", "+61490112556", D(11, 1, 25), "forwarded_missed", "delivered", None, 22, "demo_c16"),
    ("demo_e12", "+61490112556", D(10, 3), "forwarded_answered", "pending", 260, None, None),
    ("demo_e13", "+61481221004", D(12, 6), "texted", "delivered", None, None, None),
]

# (contact, tag, note)
lead_tags = [
    ("+61 490 112 556", "hot", "Wants breakfast catering every second Friday for ~20. Quote sent, follow up Friday."),
    ("+61 423 111 902", "hot", "Chocolate birthday cake for Saturday, ~20 people. Call back to confirm design."),
    ("+61 412 345 678", "qualified", "40-person office lunch on the 12th. Send platter menu and quote."),
    ("+61 466 300 882", "qualified", "Wholesale banana bread for a gym café. Send price list."),
    ("+61 455 678 123", "warm", "Baby shower, Sunday afternoon, ~25 guests."),
    ("+61 478 902 334", "warm", "Office catering, 12 people, next Wednesday. Menu sent by WhatsApp."),
    ("+61428000777", "cold", "Clicked the texted link but never got in touch."),
]

# (id, to, minutes_ago, status, body, error)
whatsapp = [
    ("demo_w01", "+61478902334", D(5, 0), "delivered", "Hi Ben, here's our platter menu: bluebirdcafe.example.com/catering. Wednesday for 12 is no problem!", None),
    ("demo_w02", "+61490112556", D(10, 2), "delivered", "Hi Noah, as promised, breakfast catering for 20 every second Friday comes to $280 per order. Shall we start next week?", None),
    ("demo_w03", "+61412345678", D(0, 1), "sent", "Hi James, thanks for the call. Our catering menu is here: bluebirdcafe.example.com/catering. I'll send a quote for the 12th today.", None),
    ("demo_w04", "+61400999123", D(2, 3), "failed", "Hi, sorry we missed your call! How can we help?", "The number isn't registered on WhatsApp."),
]

team = [
    ("demo_tm1", "sarah.barista@example.com", "member", "active", D(20), D(19)),
    ("demo_tm2", "alex.manager@example.com", "admin", "invited", D(1), None),
]

# ------------------------------------------------------------------ SQL
out = []
w = out.append
w("""-- Haylio demo data for the demo account (demo@haylio.app, business id biz_demo).
--
-- Paste into Supabase Studio > SQL Editor > Run. Safe to re-run: it removes the
-- previous demo rows (ids starting with "demo_") and inserts them again with
-- dates relative to now, so the dashboard always shows the last two weeks.
--
-- Requires schema.sql and migrations 002 to 018 to have been run.
--
-- To remove the demo data later, run only the "remove previous demo data" block.

begin;

create or replace function pg_temp.ago(mins integer) returns bigint
language sql as $$ select (extract(epoch from now()) * 1000)::bigint - mins::bigint * 60000 $$;

-- ---------- Remove previous demo data ----------
delete from public.conversations     where business_id = 'biz_demo' and left(id, 5) = 'demo_';
delete from public.engagements       where business_id = 'biz_demo' and left(id, 5) = 'demo_';
delete from public.whatsapp_messages where business_id = 'biz_demo' and left(id, 5) = 'demo_';
delete from public.team_members      where business_id = 'biz_demo' and left(id, 5) = 'demo_';
""")
w("delete from public.lead_tags where business_id = 'biz_demo' and contact_key in ("
  + ", ".join(q(ckey(c)) for c, _, _ in lead_tags) + ");\n")

# Virtual number (only if the demo business has none yet)
w(f"""-- ---------- Business number (simulated; skipped if one already exists) ----------
insert into public.virtual_numbers
  (id, business_id, phone_number, provider, status, greeting, sms_template, call_mode,
   forwarding_enabled, forward_to_number, tz_offset_minutes, created_at)
values (
  'demo_vn1', 'biz_demo', '+18335550192', 'simulator', 'simulated',
  {q(f"Thanks for calling {BIZ_NAME}! We've just sent you a text with a link where you can reach us instantly. Talk soon!")},
  {q("{business}: Sorry we missed your call! Reach us instantly here: {link} — chat, leave a voice note, or request a callback. Reply STOP to opt out.")},
  'ivr', false, '', -660, {ago(D(21))}
)
on conflict (business_id) do nothing;
""")

w("-- ---------- Enquiries (conversations) ----------")
for cid, ch, name, contact, tag, unread, mins, msgs, vmeta in conversations:
    mlist = []
    for i, (role, kind, payload, secs) in enumerate(msgs, 1):
        m = {"id": f"{cid}_m{i}", "role": role, "kind": kind, "at": secs * 1000}
        if kind == "text":
            m["text"] = payload
        elif kind == "callback":
            m.update(payload)
        elif kind == "audio":
            m["audioDataUrl"] = voice_note(*payload)
        mlist.append(m)
    last_offset_min = max(s for *_, s in msgs) // 60
    created = mins
    updated = max(0, mins - last_offset_min)
    vk = "vk_" + cid
    w(f"""insert into public.conversations
  (id, business_id, channel, visitor_name, visitor_contact, visitor_key, unread, messages, visitor_meta, tag, created_at, updated_at)
values ({q(cid)}, 'biz_demo', {q(ch)}, {q(name)}, {q(contact)}, {q(vk)}, {str(unread).lower()},
  {q(json.dumps(mlist, ensure_ascii=False))}::jsonb, {q(json.dumps(vmeta, ensure_ascii=False)) + '::jsonb' if vmeta else 'null'}, {q(tag)},
  {ago(created)}, {ago(updated)});""")

w("""
-- Message times are stored as offsets above; turn them into real timestamps.
update public.conversations c
set messages = (
  select jsonb_agg(jsonb_set(m, '{at}', to_jsonb(c.created_at + (m->>'at')::bigint)) order by ord)
  from jsonb_array_elements(c.messages) with ordinality as t(m, ord)
)
where c.business_id = 'biz_demo' and left(c.id, 5) = 'demo_';
""")

w("-- ---------- Calls to the business number (engagements) ----------")
for eid, caller, mins, outcome, sms, dur, click_after, conv in engagements:
    token = "demo" + eid[-3:] + "tok"
    body = None
    if sms != "pending":
        body = f"{BIZ_NAME}: Sorry we missed your call! Reach us instantly here: {LINK_BASE}{token} — chat, leave a voice note, or request a callback. Reply STOP to opt out."
    clicked = ago(mins - click_after) if click_after else "null"
    w(f"""insert into public.engagements
  (id, business_id, caller_number, caller_last4, token, call_at, sms_status, sms_body, clicked_at, conversation_id, call_outcome, call_duration, created_at)
values ({q(eid)}, 'biz_demo', {q(caller)}, {q(digits(caller)[-4:])}, {q(token)}, {ago(mins)}, {q(sms)}, {q(body)},
  {clicked}, {q(conv)}, {q(outcome)}, {dur if dur else 'null'}, {ago(mins)});""")

w("\n-- ---------- Lead tags and notes ----------")
for contact, tag, note in lead_tags:
    w(f"""insert into public.lead_tags (business_id, contact_key, tag, note, updated_at)
values ('biz_demo', {q(ckey(contact))}, {q(tag)}, {q(note)}, {ago(60)})
on conflict (business_id, contact_key) do update set tag = excluded.tag, note = excluded.note, updated_at = excluded.updated_at;""")

w("\n-- ---------- WhatsApp messages sent from the dashboard ----------")
for wid, to, mins, status, body, err in whatsapp:
    w(f"""insert into public.whatsapp_messages (id, business_id, to_number, to_last4, body, status, error, created_at)
values ({q(wid)}, 'biz_demo', {q(to)}, {q(digits(to)[-4:])}, {q(body)}, {q(status)}, {q(err)}, {ago(mins)});""")

w("\n-- ---------- Team ----------")
for tid, email, role, status, inv, acc in team:
    w(f"""insert into public.team_members (id, business_id, email, role, status, invited_by_name, token, invited_at, accepted_at)
values ({q(tid)}, 'biz_demo', {q(email)}, {q(role)}, {q(status)}, {q(BIZ_NAME)}, {q(tid + '_invite_token')}, {ago(inv)}, {ago(acc) if acc else 'null'})
on conflict (email) do nothing;""")

w("\ncommit;\n")

(Path(__file__).resolve().parent.parent / "supabase" / "demo-data.sql").write_text("\n".join(out))
print("ok")
