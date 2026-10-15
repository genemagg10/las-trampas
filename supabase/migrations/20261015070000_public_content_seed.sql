-- Public content seeded from the current lastrampaspool.com site (October 2026).
-- Recreational swim times are from the pool's public calendar; an update post restates public facts.
-- Idempotent: keyed on slug.

insert into public.events (title, slug, kind, summary, location, starts_at, published)
values
  ('Recreational Swim', 'rec-swim-2026-10-16', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-16 16:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-17', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-17 11:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-18', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-18 11:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-23', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-23 16:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-24', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-24 11:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-25', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-25 11:00 America/Los_Angeles', true),
  ('Recreational Swim', 'rec-swim-2026-10-30', 'club', 'Fall recreational swim for members and guests.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-30 16:00 America/Los_Angeles', true),
  ('Recreational Swim – Halloween', 'rec-swim-2026-10-31', 'club', 'Halloween recreational swim.', '640 St. Mary''s Road, Lafayette', timestamptz '2026-10-31 11:00 America/Los_Angeles', true)
on conflict (slug) do nothing;

insert into public.posts (kind, title, slug, body_md, publish_at)
values (
  'announcement',
  'Fall swim at Las Trampas',
  'fall-swim-2026',
  $md$The pool is open to members and their guests through October. Recreational swim continues on Fridays at 4:00 pm and on Saturdays and Sundays at 11:00 am. The last swim on the current calendar is the Halloween swim on Saturday, October 31. See the [calendar](/calendar) for every date.

## Lap swim

Adults-only lap swim runs at set hours in the spring, summer, and fall. There is no lifeguard on duty during lap swim and you may not swim alone. A signed Adult Lap Swim Waiver is required each season before you can reserve a lane.

## Membership

Membership is currently at full capacity, and the club keeps an ongoing waitlist. Returning members renew each winter; the 2026 annual dues were $1,075 plus a $50 volunteer deposit, refunded when you work a shift at a maintenance day or a pool-wide social.

## Reach the club

640 St. Mary's Road, Lafayette, CA 94549 · PO Box 742, Lafayette, CA 94549 · 925-310-4313 (not monitored at all times) · Instagram [@lastrampaspool](https://www.instagram.com/lastrampaspool/)
$md$,
  timestamptz '2026-10-14 12:00 America/Los_Angeles'
)
on conflict (slug) do nothing;
