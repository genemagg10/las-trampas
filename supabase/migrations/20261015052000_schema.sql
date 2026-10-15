-- Las Trampas Pool: tables. Roles, seasons, and other reference rows are seeded
-- in 20261015052300_reference_seed.sql. No member data lives in migrations.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant anon, authenticated, service_role to postgres;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- People and access
-- ---------------------------------------------------------------------------

create table public.roles (
  key text primary key,
  label text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table public.seasons (
  year int primary key,
  name text not null,
  opens_on date not null,
  closes_on date not null,
  renewal_deadline date not null,
  late_after date,
  is_current boolean not null default false,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seasons_dates check (closes_on > opens_on)
);

create unique index seasons_one_current on public.seasons (is_current) where is_current;

create trigger seasons_updated before update on public.seasons
  for each row execute function private.set_updated_at();

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  membership_type text not null default 'none'
    check (membership_type in ('none', 'full', 'lap_only', 'waitlist')),
  status text not null default 'prospect'
    check (status in ('prospect', 'active', 'lapsed', 'waitlist', 'suspended')),
  member_since int,
  lap_only_invited boolean not null default false,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger households_updated before update on public.households
  for each row execute function private.set_updated_at();

create table public.people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  household_id uuid not null references public.households (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text,
  phone text,
  birth_year int,
  kind text not null default 'adult' check (kind in ('adult', 'teen', 'child')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint people_birth_year check (birth_year is null or birth_year between 1900 and 2100)
);

create unique index people_email_unique on public.people (lower(email)) where email is not null;
create index people_household_idx on public.people (household_id);

create trigger people_updated before update on public.people
  for each row execute function private.set_updated_at();

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users'
  ) then
    alter table public.people
      add constraint people_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete set null;
  end if;
end $$;

create table public.household_admins (
  household_id uuid not null references public.households (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, person_id)
);

create table public.privacy_settings (
  person_id uuid primary key references public.people (id) on delete cascade,
  show_name boolean not null default true,
  show_email boolean not null default false,
  show_phone boolean not null default false,
  show_household boolean not null default false,
  show_children boolean not null default false,
  photo_consent text not null default 'members_only'
    check (photo_consent in ('ok', 'members_only', 'none')),
  lap_buddy_visible boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger privacy_updated before update on public.privacy_settings
  for each row execute function private.set_updated_at();

create table public.notification_prefs (
  person_id uuid not null references public.people (id) on delete cascade,
  topic text not null check (topic in ('reminders', 'announcements', 'lap_buddy', 'payments')),
  email_enabled boolean not null default true,
  primary key (person_id, topic)
);

create table public.board_positions (
  key text primary key,
  label text not null,
  scopes text[] not null,
  inbox_address text,
  sort_order int not null default 0
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.people (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  role_key text not null references public.roles (key),
  scope text,
  season int references public.seasons (year),
  source text not null check (source in ('payment', 'waiver', 'admin', 'import', 'shift', 'team')),
  source_id uuid,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  granted_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  constraint entitlement_subject check (person_id is not null or household_id is not null)
);

create index entitlements_person_idx on public.entitlements (person_id);
create index entitlements_household_idx on public.entitlements (household_id);
create index entitlements_role_idx on public.entitlements (role_key, season);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  action text not null,
  target_table text,
  target_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Waivers
-- ---------------------------------------------------------------------------

create table public.waiver_templates (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  version int not null,
  season int not null references public.seasons (year),
  title text not null,
  body_md text not null,
  acknowledgements jsonb not null default '[]'::jsonb,
  body_sha256 text not null,
  requires_guardian boolean not null default false,
  resign_required boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (key, version)
);

create table public.waiver_signatures (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.waiver_templates (id),
  person_id uuid not null references public.people (id),
  guardian_person_id uuid references public.people (id),
  typed_name text not null,
  signature_png_path text,
  signed_at timestamptz not null default now(),
  ip text,
  user_agent text,
  pdf_path text,
  pdf_sha256 text,
  body_sha256 text not null,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now()
);

create index waiver_signatures_person_idx on public.waiver_signatures (person_id);

-- ---------------------------------------------------------------------------
-- Lap swim
-- ---------------------------------------------------------------------------

create table public.lap_settings (
  season int primary key references public.seasons (year),
  max_per_week int not null default 3 check (max_per_week > 0),
  max_advance_days int not null default 7 check (max_advance_days >= 0),
  cancel_cutoff interval not null default interval '12 hours',
  buddy_mode text not null default 'same_slot' check (buddy_mode in ('same_lane', 'same_slot')),
  min_buddies int not null default 2 check (min_buddies >= 1),
  updated_at timestamptz not null default now()
);

create trigger lap_settings_updated before update on public.lap_settings
  for each row execute function private.set_updated_at();

create table public.lanes (
  id uuid primary key default gen_random_uuid(),
  number int not null unique check (number > 0),
  label text not null,
  active boolean not null default true
);

create table public.slot_templates (
  id uuid primary key default gen_random_uuid(),
  season int not null references public.seasons (year),
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  lane_id uuid not null references public.lanes (id),
  capacity int not null default 2 check (capacity > 0),
  created_at timestamptz not null default now(),
  unique (season, weekday, start_time, lane_id),
  constraint slot_template_times check (end_time > start_time)
);

create table public.pool_blocks (
  id uuid primary key default gen_random_uuid(),
  season int not null references public.seasons (year),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  lane_id uuid references public.lanes (id),
  reason text not null check (reason in ('swim_team', 'lessons', 'maintenance', 'closure')),
  note text,
  created_at timestamptz not null default now(),
  constraint pool_block_times check (ends_at > starts_at)
);

create table public.lap_slots (
  id uuid primary key default gen_random_uuid(),
  season int not null references public.seasons (year),
  lane_id uuid not null references public.lanes (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 2 check (capacity > 0),
  blocked_reason text,
  created_at timestamptz not null default now(),
  unique (lane_id, starts_at),
  constraint lap_slot_times check (ends_at > starts_at)
);

create index lap_slots_starts_idx on public.lap_slots (starts_at);

create table public.lap_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.lap_slots (id),
  person_id uuid not null references public.people (id),
  status text not null default 'booked'
    check (status in ('booked', 'cancelled', 'no_show', 'attended')),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slot_id, person_id)
);

create index lap_bookings_person_idx on public.lap_bookings (person_id);

create trigger lap_bookings_updated before update on public.lap_bookings
  for each row execute function private.set_updated_at();

create table public.buddy_invites (
  id uuid primary key default gen_random_uuid(),
  from_person_id uuid not null references public.people (id),
  to_person_id uuid not null references public.people (id),
  slot_id uuid not null references public.lap_slots (id),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  constraint buddy_not_self check (from_person_id <> to_person_id)
);

-- Codes live in private so the Data API cannot read them. Reveals are logged here.
create table private.gate_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  valid_from date not null,
  valid_to date not null,
  created_at timestamptz not null default now(),
  constraint gate_code_dates check (valid_to >= valid_from)
);

revoke all on table private.gate_codes from public, anon, authenticated;

create table public.gate_code_reveals (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id),
  booking_id uuid not null references public.lap_bookings (id),
  revealed_at timestamptz not null default now()
);

create table public.lap_checkins (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.lap_bookings (id),
  checked_in_at timestamptz not null default now(),
  method text not null default 'tap' check (method in ('tap', 'admin'))
);

-- ---------------------------------------------------------------------------
-- Events, volunteering, swim team, parties
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  season int references public.seasons (year),
  title text not null,
  slug text unique,
  kind text not null check (kind in ('social', 'maintenance', 'swim_team', 'club')),
  summary text,
  description text,
  location text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity int check (capacity is null or capacity > 0),
  price_cents int not null default 0 check (price_cents >= 0),
  audience_role text,
  published boolean not null default false,
  hero_photo_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_starts_idx on public.events (starts_at);

create trigger events_updated before update on public.events
  for each row execute function private.set_updated_at();

create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  household_id uuid not null references public.households (id),
  adults int not null default 1 check (adults >= 0),
  kids int not null default 0 check (kids >= 0),
  status text not null default 'going'
    check (status in ('pending_payment', 'going', 'waitlist', 'cancelled')),
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, household_id),
  constraint rsvp_headcount check (adults + kids > 0)
);

create trigger rsvps_updated before update on public.rsvps
  for each row execute function private.set_updated_at();

create table public.volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  capacity int not null default 1 check (capacity > 0),
  lead_person_id uuid references public.people (id),
  counts_for_deposit boolean not null default true,
  credit_units int not null default 1 check (credit_units >= 0),
  audience text not null default 'member' check (audience in ('member', 'swim_team')),
  created_at timestamptz not null default now(),
  constraint shift_times check (ends_at > starts_at)
);

create table public.shift_signups (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.volunteer_shifts (id) on delete cascade,
  person_id uuid not null references public.people (id),
  status text not null default 'signed_up'
    check (status in ('signed_up', 'completed', 'no_show', 'cancelled')),
  completed_by uuid references public.people (id),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, person_id)
);

create trigger shift_signups_updated before update on public.shift_signups
  for each row execute function private.set_updated_at();

create table public.deposit_ledger (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  season int not null references public.seasons (year),
  paid_cents int not null default 0 check (paid_cents >= 0),
  credit_units_required int not null default 1 check (credit_units_required >= 0),
  credit_units_earned int not null default 0 check (credit_units_earned >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'earned', 'forfeited', 'refunded', 'rolled_over')),
  updated_at timestamptz not null default now(),
  unique (household_id, season)
);

create trigger deposit_ledger_updated before update on public.deposit_ledger
  for each row execute function private.set_updated_at();

create table public.team_registrations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id),
  season int not null references public.seasons (year),
  swimmer_person_id uuid not null references public.people (id),
  source text not null default 'manual' check (source in ('import', 'ltst_ics', 'manual')),
  created_at timestamptz not null default now(),
  unique (season, swimmer_person_id)
);

create table public.party_slots (
  id uuid primary key default gen_random_uuid(),
  season int not null references public.seasons (year),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  area text not null default 'lawn',
  fee_cents int not null default 10000 check (fee_cents >= 0),
  created_at timestamptz not null default now(),
  constraint party_slot_times check (ends_at > starts_at)
);

create table public.party_reservations (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null references public.party_slots (id),
  household_id uuid not null references public.households (id),
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'declined', 'cancelled')),
  order_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger party_reservations_updated before update on public.party_reservations
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------

create table public.price_list (
  id uuid primary key default gen_random_uuid(),
  season int not null references public.seasons (year),
  item text not null,
  label text not null,
  amount_cents int not null check (amount_cents >= 0),
  notes text,
  unique (season, item)
);

create table public.waitlist_applications (
  id uuid primary key default gen_random_uuid(),
  applicant_person_id uuid references public.people (id),
  household_name text not null,
  contact_email text not null,
  contact_phone text,
  about text,
  submitted_at timestamptz not null default now(),
  position int,
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'active', 'invited', 'joined', 'withdrawn')),
  order_id uuid,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households (id),
  person_id uuid references public.people (id),
  purpose text not null
    check (purpose in ('renewal', 'new_member', 'lap_only', 'waitlist', 'party', 'event_ticket', 'volunteer_deposit')),
  season int references public.seasons (year),
  total_cents int not null check (total_cents >= 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'paid', 'failed', 'refunded')),
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_household_idx on public.orders (household_id);

create trigger orders_updated before update on public.orders
  for each row execute function private.set_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  price_item text not null,
  description text not null,
  quantity int not null default 1 check (quantity > 0),
  amount_cents int not null check (amount_cents >= 0),
  ref_id uuid
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  amount_cents int not null check (amount_cents > 0),
  reason text not null,
  stripe_refund_id text,
  by_person_id uuid references public.people (id),
  created_at timestamptz not null default now()
);

create table public.stripe_events (
  stripe_event_id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Communication, photos, documents
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('monthly_update', 'announcement')),
  title text not null,
  slug text not null unique,
  body_md text not null,
  audience_role text,
  publish_at timestamptz,
  emailed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger posts_updated before update on public.posts
  for each row execute function private.set_updated_at();

create table public.email_sends (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts (id),
  resend_id text,
  recipient_count int not null default 0,
  topic text,
  sent_at timestamptz not null default now()
);

create table public.calendar_feeds (
  person_id uuid primary key references public.people (id) on delete cascade,
  token text not null,
  token_hash text not null unique,
  rotated_at timestamptz not null default now()
);

create table public.albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  season int references public.seasons (year),
  event_id uuid references public.events (id),
  visibility text not null default 'members' check (visibility in ('members', 'public')),
  description text,
  created_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.albums (id) on delete cascade,
  storage_path text not null,
  uploaded_by uuid references public.people (id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  alt_text text not null default '',
  has_minors boolean not null default false,
  public_ok boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('bylaws', 'handbook', 'rules', 'form', 'policy')),
  body_md text,
  storage_path text,
  version int not null default 1,
  effective_on date,
  visibility text not null default 'members' check (visibility in ('public', 'members', 'board')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger documents_updated before update on public.documents
  for each row execute function private.set_updated_at();

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  topic text not null,
  board_position_key text references public.board_positions (key),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint contact_body_len check (char_length(body) between 2 and 5000)
);

create table public.club_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create trigger club_settings_updated before update on public.club_settings
  for each row execute function private.set_updated_at();

comment on table private.gate_codes is
  'Gate codes are not in the public schema. Read them only through private.reveal_gate_code.';
