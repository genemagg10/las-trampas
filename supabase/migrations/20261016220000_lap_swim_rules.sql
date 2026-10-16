-- Lap swim rules from the Lap Swim coach (Phelps), Oct 2026.
-- 30-minute pool-wide slots (6 spots), Sunday Social 90-minute block (capacity in the template, default 12).
-- Caps: 3 days per week and 60 minutes per day; from Wednesday on, open slots in the current week unlock both caps.
-- Buddy = another swimmer in the same 30-minute slot. Teens 15-17: teen waiver, booked by a parent in the same slot.
-- ASCII only.

alter table public.lap_bookings add column if not exists booked_by uuid references public.people (id);
alter table public.lap_bookings add column if not exists share_ok boolean not null default true;
alter table public.lap_bookings add column if not exists alert_on_join boolean not null default false;
alter table public.lap_bookings add column if not exists group_id uuid;
alter table public.lap_bookings add column if not exists no_show_marked_at timestamptz;

create index if not exists lap_bookings_person_idx on public.lap_bookings (person_id, status);

create table if not exists public.lap_notifications (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  kind text not null check (kind in ('joined', 'cancelled', 'last_buddy_cancelled', 'morning_list', 'alone', 'booked')),
  title text not null,
  body text,
  slot_id uuid references public.lap_slots (id) on delete cascade,
  urgent boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists lap_notifications_person_idx on public.lap_notifications (person_id, created_at desc);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  to_person_id uuid references public.people (id) on delete cascade,
  to_email text,
  subject text not null,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'skipped')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.lap_notifications enable row level security;
alter table public.email_queue enable row level security;
grant select, update on public.lap_notifications to authenticated;
grant select on public.email_queue to authenticated;

create policy lap_notifications_own on public.lap_notifications for select
  using (person_id = private.current_person_id() or private.is_admin());
create policy lap_notifications_mark_read on public.lap_notifications for update
  using (person_id = private.current_person_id())
  with check (person_id = private.current_person_id());
create policy email_queue_admin on public.email_queue for select
  using (private.is_admin());

-- Service role (server code using the secret key, e.g. signed cancel links) acts like staff.
create or replace function private.is_service()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '') = 'service_role';
$$;

create or replace function private.slot_minutes(p_slot uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select (extract(epoch from (s.ends_at - s.starts_at)) / 60)::int from public.lap_slots s where s.id = p_slot;
$$;

create or replace function private.assert_can_book(p_slot uuid, p_person uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.lap_slots%rowtype;
  v_settings public.lap_settings%rowtype;
  v_person public.people%rowtype;
  v_tz text;
  v_booked int;
  v_day date;
  v_today date;
  v_unlocked boolean;
  v_days int;
  v_minutes int;
begin
  select * into v_slot from public.lap_slots where id = p_slot;
  if not found then
    raise exception 'That lap time no longer exists.';
  end if;
  select * into v_person from public.people where id = p_person;

  if v_slot.blocked_reason is not null then
    raise exception 'That time is blocked (%).', v_slot.blocked_reason;
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'That time has already started.';
  end if;

  select * into v_settings from public.lap_settings where season = v_slot.season;
  if not found then
    raise exception 'Lap swim is not configured for this season.';
  end if;
  if v_slot.starts_at > now() + make_interval(days => v_settings.max_advance_days) then
    raise exception 'You can only book % days ahead.', v_settings.max_advance_days;
  end if;

  select count(*) into v_booked
  from public.lap_bookings b
  where b.slot_id = p_slot and b.status = 'booked' and b.person_id <> p_person;
  if v_booked >= v_slot.capacity then
    raise exception 'That time is full.';
  end if;

  if v_person.kind = 'teen' then
    if not exists (
      select 1 from public.waiver_signatures ws
      join public.waiver_templates wt on wt.id = ws.template_id
      where ws.person_id = p_person and ws.revoked_at is null
        and wt.key = 'lap_teen' and wt.season = v_slot.season
    ) then
      raise exception 'Teens need a signed teen lap waiver.';
    end if;
    if not exists (
      select 1 from public.lap_bookings b
      join public.people pa on pa.id = b.person_id
      join public.household_admins ha on ha.person_id = pa.id and ha.household_id = v_person.household_id
      where b.slot_id = p_slot and b.status = 'booked' and pa.kind = 'adult'
    ) then
      raise exception 'A teen swims in a parent''s lane. Book the parent for this time first.';
    end if;
    return;
  elsif v_person.kind = 'child' then
    raise exception 'Lap swim is for adults and teens 15 to 17.';
  end if;

  if not private.has_role('member', v_slot.season) and not exists (
    select 1 from public.entitlements e
    where e.revoked_at is null and e.role_key = 'member'
      and (e.season is null or e.season = v_slot.season)
      and (e.person_id = p_person or e.household_id = v_person.household_id)
  ) then
    raise exception 'You need an active membership for this season.';
  end if;
  if not exists (
    select 1 from public.entitlements e
    where e.revoked_at is null and e.role_key = 'lap_swimmer'
      and (e.season is null or e.season = v_slot.season)
      and (e.expires_at is null or e.expires_at > now())
      and e.person_id = p_person
  ) then
    raise exception 'Sign the lap swim waiver before booking.';
  end if;

  select s.timezone into v_tz from public.seasons s where s.year = v_slot.season;
  v_day := (v_slot.starts_at at time zone v_tz)::date;
  v_today := (now() at time zone v_tz)::date;
  -- From Wednesday on, open slots in the current week ignore the day and minute caps.
  v_unlocked := date_trunc('week', v_day) = date_trunc('week', v_today)
    and extract(isodow from v_today) >= 3;
  if v_unlocked then
    return;
  end if;

  select coalesce(sum(extract(epoch from (s.ends_at - s.starts_at)) / 60), 0)::int into v_minutes
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  where b.person_id = p_person and b.status = 'booked' and s.id <> p_slot
    and (s.starts_at at time zone v_tz)::date = v_day;
  -- The Sunday Social block counts as 60 minutes.
  if v_minutes + least(private.slot_minutes(p_slot), 60) > 60 then
    raise exception 'The limit is 60 minutes a day (it lifts for open slots from Wednesday).';
  end if;

  select count(distinct (s.starts_at at time zone v_tz)::date)::int into v_days
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  where b.person_id = p_person and b.status = 'booked' and s.id <> p_slot
    and date_trunc('week', (s.starts_at at time zone v_tz)::date) = date_trunc('week', v_day)
    and (s.starts_at at time zone v_tz)::date <> v_day;
  if v_days >= 3 then
    raise exception 'The limit is 3 days a week (extra days unlock on Wednesday for open slots).';
  end if;
end;
$$;

create or replace function private.enforce_lap_booking()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
  v_staff boolean;
  v_target public.people%rowtype;
begin
  v_person := private.current_person_id();
  v_staff := private.is_admin() or private.has_board_scope('lap') or private.is_service();

  if tg_op = 'INSERT' then
    if new.status is distinct from 'booked' then
      raise exception 'New bookings start as booked.';
    end if;
    select * into v_target from public.people where id = new.person_id;
    if v_target.kind = 'teen' then
      if not v_staff and not exists (
        select 1 from public.household_admins ha
        where ha.household_id = v_target.household_id and ha.person_id = v_person
      ) then
        raise exception 'A parent books lap swim for a teen.';
      end if;
    elsif new.person_id is distinct from v_person and not v_staff then
      raise exception 'You can only book for yourself.';
    end if;
    new.booked_by := coalesce(new.booked_by, v_person);
    perform private.assert_can_book(new.slot_id, new.person_id);
    return new;
  end if;

  if new.person_id is distinct from old.person_id or new.slot_id is distinct from old.slot_id then
    raise exception 'Bookings cannot be moved. Cancel and book again.';
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if old.person_id is distinct from v_person and old.booked_by is distinct from v_person and not v_staff then
      raise exception 'You can only cancel your own booking.';
    end if;
    if not v_staff then
      perform private.assert_can_cancel(old.slot_id);
    end if;
    new.cancelled_at := now();
    return new;
  end if;

  if new.status = 'booked' and old.status = 'cancelled' then
    if old.person_id is distinct from v_person and not v_staff then
      raise exception 'You can only book for yourself.';
    end if;
    new.cancelled_at := null;
    perform private.assert_can_book(new.slot_id, new.person_id);
    return new;
  end if;

  if new.status in ('attended', 'no_show') and old.status in ('booked', 'attended', 'no_show') then
    if new.status = 'no_show' and not v_staff then
      raise exception 'Only the Lap Swim VP can mark a no-show.';
    end if;
    if new.status = 'no_show' then
      new.no_show_marked_at := now();
    end if;
    if new.status = 'attended' and old.person_id is distinct from v_person and not v_staff then
      raise exception 'You can only check in your own booking.';
    end if;
    return new;
  end if;

  if new.status is distinct from old.status then
    raise exception 'That status change is not allowed.';
  end if;
  return new;
end;
$$;

-- In-app notifications plus queued email (sent once Resend is configured).
create or replace function private.notify_lap(p_person uuid, p_kind text, p_title text, p_body text, p_slot uuid, p_urgent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  insert into public.lap_notifications (person_id, kind, title, body, slot_id, urgent)
  values (p_person, p_kind, p_title, p_body, p_slot, p_urgent);
  select email into v_email from public.people where id = p_person;
  if v_email is not null then
    insert into public.email_queue (to_person_id, to_email, subject, body)
    values (p_person, v_email, p_title, coalesce(p_body, p_title));
  end if;
end;
$$;

create or replace function private.lap_booking_notify()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.lap_slots%rowtype;
  v_tz text;
  v_when text;
  v_name text;
  v_left int;
  r record;
begin
  select * into v_slot from public.lap_slots where id = new.slot_id;
  select timezone into v_tz from public.seasons where year = v_slot.season;
  v_when := to_char(v_slot.starts_at at time zone coalesce(v_tz, 'America/Los_Angeles'), 'Dy Mon DD HH12:MI AM');
  select nullif(first_name, '') into v_name from public.people where id = new.person_id;
  v_name := coalesce(v_name, 'A swimmer');

  if (tg_op = 'INSERT' and new.status = 'booked')
     or (tg_op = 'UPDATE' and new.status = 'booked' and old.status = 'cancelled') then
    for r in
      select b.person_id from public.lap_bookings b
      where b.slot_id = new.slot_id and b.status = 'booked' and b.person_id <> new.person_id
    loop
      perform private.notify_lap(r.person_id, 'joined', v_name || ' joined your ' || v_when || ' lap swim',
        'You have a buddy for ' || v_when || '.', new.slot_id, false);
    end loop;
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status = 'booked' then
    select count(*) into v_left from public.lap_bookings b
    where b.slot_id = new.slot_id and b.status = 'booked' and b.person_id <> new.person_id;
    for r in
      select b.person_id from public.lap_bookings b
      where b.slot_id = new.slot_id and b.status = 'booked' and b.person_id <> new.person_id
    loop
      if v_left = 1 then
        perform private.notify_lap(r.person_id, 'last_buddy_cancelled', 'URGENT: your last buddy cancelled ' || v_when,
          'You would be swimming alone at ' || v_when || '. Find another time or invite a buddy.', new.slot_id, true);
      else
        perform private.notify_lap(r.person_id, 'cancelled', v_name || ' cancelled ' || v_when,
          'You still have ' || (v_left - 1) || ' other swimmer(s) in this slot.', new.slot_id, false);
      end if;
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists lap_bookings_notify on public.lap_bookings;
create trigger lap_bookings_notify
  after insert or update of status on public.lap_bookings
  for each row execute function private.lap_booking_notify();

-- Pool-wide slots: the sanctioned settings.
update public.lap_settings set max_per_week = 99, min_buddies = 2, buddy_mode = 'same_slot';
insert into public.club_settings (key, value) values ('sunday_social_capacity', '12'::jsonb)
on conflict (key) do nothing;
