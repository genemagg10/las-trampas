-- Reference data only: roles, the sample 2027 season, fees, lanes, and draft
-- documents. No households, people, or bookings. Amounts are the working
-- figures from the scope and stay editable by the board.

insert into public.roles (key, label, description) values
  ('member', 'Member', 'Household dues are paid for the season.'),
  ('lap_swimmer', 'Lap swimmer', 'Signed the current-season lap waiver.'),
  ('swim_team_family', 'Swim team family', 'Household has a registered Seahorse swimmer.'),
  ('volunteer', 'Volunteer', 'Signed up for a shift this season.'),
  ('board', 'Board', 'Elected or appointed board position, scoped.'),
  ('admin', 'Admin', 'Webmaster. Full access until removed.')
on conflict (key) do nothing;

insert into public.board_positions (key, label, scopes, sort_order) values
  ('president', 'President', array['all'], 10),
  ('treasurer', 'Treasurer', array['treasurer'], 20),
  ('lap_swim_vp', 'Lap Swim VP', array['lap'], 30),
  ('social', 'Social chair', array['social'], 40),
  ('membership', 'Membership', array['membership'], 50),
  ('communications', 'Communications', array['communications', 'photos'], 60),
  ('webmaster', 'Webmaster', array['all'], 70),
  ('secretary', 'Secretary', array['communications'], 80),
  ('seahorses', 'Swim team liaison', array['team'], 90)
on conflict (key) do nothing;

insert into public.seasons (
  year, name, opens_on, closes_on, renewal_deadline, late_after, is_current, timezone
) values (
  2027,
  '2027 season',
  date '2027-05-01',
  date '2027-10-15',
  date '2027-02-16',
  date '2027-02-16',
  true,
  'America/Los_Angeles'
) on conflict (year) do nothing;

insert into public.price_list (season, item, label, amount_cents, notes) values
  (2027, 'renewal', '2027 renewal (by Feb 16)', 107500, 'Working figure. The board confirms the final amount.'),
  (2027, 'renewal_late', '2027 renewal (after Feb 16)', 117500, 'Working figure.'),
  (2027, 'volunteer_deposit', 'Volunteer deposit', 5000, 'Earned back when the required shift is completed.'),
  (2027, 'new_member', 'New member fee', 67500, 'Working figure, after an invitation from the waitlist.'),
  (2027, 'new_member_deposit', 'New member deposit', 7500, 'Refundable deposit. Confirm with the treasurer.'),
  (2027, 'lap_only', 'Lap-swim-only membership', 52500, 'Invitation only.'),
  (2027, 'waitlist_fee', 'Waitlist application', 10000, 'Holds a place on the waitlist.'),
  (2027, 'party_slot', 'Party reservation', 10000, 'Per slot. An admin approves the reservation.')
on conflict (season, item) do nothing;

insert into public.lap_settings (season, max_per_week, max_advance_days, cancel_cutoff, buddy_mode, min_buddies)
values (2027, 3, 7, interval '12 hours', 'same_slot', 2)
on conflict (season) do nothing;

insert into public.lanes (number, label)
select n, 'Lane ' || n
from generate_series(1, 6) as n
on conflict (number) do nothing;

insert into public.slot_templates (season, weekday, start_time, end_time, lane_id, capacity)
select 2027, d.weekday, t.start_time, t.end_time, l.id, 2
from (values (1), (2), (3), (4), (5)) as d(weekday)
cross join (values (time '06:00', time '07:00'), (time '07:00', time '08:00')) as t(start_time, end_time)
cross join public.lanes l
where l.active
on conflict (season, weekday, start_time, lane_id) do nothing;

insert into public.club_settings (key, value) values
  ('ach_grants_provisional', 'true'::jsonb),
  ('deposit_units_required', '1'::jsonb),
  ('waiver_draft', 'true'::jsonb),
  ('club_name', '"Las Trampas Pool"'::jsonb),
  ('timezone', '"America/Los_Angeles"'::jsonb)
on conflict (key) do nothing;

insert into public.waiver_templates (
  key, version, season, title, body_md, acknowledgements, body_sha256,
  requires_guardian, published_at
)
select
  'lap_adult',
  1,
  2027,
  '2027 adult lap swim waiver (draft)',
  $md$**Draft — pending legal review. Do not treat this as the club's final waiver.**

Las Trampas Pool is a member-owned swim club in Burton Valley, Lafayette. Lap swim is unsupervised by a lifeguard. You are responsible for your own safety and for swimming with a buddy.

By signing, you confirm that you:
- are a member in good standing for the 2027 season
- can swim the length of the pool and will leave the water if you feel unsafe
- will follow the posted lap rules and the buddy rule
- understand the gate code is shown only on the day of a confirmed booking

Replace this text with the version approved by the board and the club's insurer before opening day.
$md$,
  jsonb_build_array(
    'I have read the lap swim rules for this season.',
    'I will swim with a buddy and will not share the gate code.',
    'I understand this draft must be replaced after legal review.'
  ),
  encode(extensions.digest($md$**Draft — pending legal review. Do not treat this as the club's final waiver.**

Las Trampas Pool is a member-owned swim club in Burton Valley, Lafayette. Lap swim is unsupervised by a lifeguard. You are responsible for your own safety and for swimming with a buddy.

By signing, you confirm that you:
- are a member in good standing for the 2027 season
- can swim the length of the pool and will leave the water if you feel unsafe
- will follow the posted lap rules and the buddy rule
- understand the gate code is shown only on the day of a confirmed booking

Replace this text with the version approved by the board and the club's insurer before opening day.
$md$, 'sha256'), 'hex'),
  false,
  now()
where not exists (
  select 1 from public.waiver_templates where key = 'lap_adult' and version = 1
);

insert into public.waiver_templates (
  key, version, season, title, body_md, acknowledgements, body_sha256, requires_guardian, published_at
)
select
  'lap_teen',
  1,
  2027,
  '2027 teen lap swim waiver (unpublished)',
  'Draft for ages 15–17. A parent or guardian co-signs. Unpublished until the board decides the teen policy.',
  jsonb_build_array('I am the parent or guardian and I co-sign for this swimmer.'),
  encode(extensions.digest(
    'Draft for ages 15–17. A parent or guardian co-signs. Unpublished until the board decides the teen policy.',
    'sha256'
  ), 'hex'),
  true,
  null
where not exists (
  select 1 from public.waiver_templates where key = 'lap_teen' and version = 1
);

insert into public.documents (title, kind, body_md, version, effective_on, visibility)
select v.title, v.kind, v.body, 1, date '2026-10-15', v.visibility
from (values
  (
    'Bylaws',
    'bylaws',
    'members',
    'Placeholder. The secretary will paste the current bylaws here. This is not the club''s bylaws.'
  ),
  (
    'Member handbook',
    'handbook',
    'members',
    'Placeholder. The board will paste the current member handbook here.'
  ),
  (
    'Pool rules',
    'rules',
    'public',
    'Las Trampas Pool is open to members from May through October. Full pool rules will replace this summary once the board publishes them. Lap swim requires a season waiver and a buddy.'
  ),
  (
    'Lap swim rules',
    'rules',
    'members',
    'Placeholder for the lap rules: buddy requirement, booking limits, and cancellation cutoff. The Lap Swim VP edits the live limits under Admin → Lanes; those settings are what the booking system enforces.'
  )
) as v(title, kind, visibility, body)
where not exists (select 1 from public.documents d where d.title = v.title and d.version = 1);
