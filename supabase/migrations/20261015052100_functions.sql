-- Helpers live in private (not exposed by the Data API). Public functions are
-- thin wrappers. Authorization uses auth.uid(), never user-editable metadata.

create or replace function private.current_season_year()
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select s.year from public.seasons s where s.is_current order by s.year desc limit 1;
$$;

create or replace function private.current_person_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id from public.people p where p.user_id = auth.uid() limit 1;
$$;

create or replace function private.current_household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.household_id from public.people p where p.user_id = auth.uid() limit 1;
$$;

create or replace function private.has_role(p_role text, p_season int default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.entitlements e
    where e.revoked_at is null
      and e.role_key = p_role
      and (e.starts_at is null or e.starts_at <= now())
      and (e.expires_at is null or e.expires_at > now())
      and (
        e.season is null
        or e.season = coalesce(p_season, private.current_season_year())
      )
      and (
        e.person_id = private.current_person_id()
        or e.household_id = private.current_household_id()
      )
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('admin');
$$;

create or replace function private.has_board_scope(p_scope text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_admin() or exists (
    select 1
    from public.entitlements e
    join public.board_positions b on b.key = e.scope
    where e.role_key = 'board'
      and e.revoked_at is null
      and (e.starts_at is null or e.starts_at <= now())
      and (e.expires_at is null or e.expires_at > now())
      and e.person_id = private.current_person_id()
      and (p_scope = any (b.scopes) or 'all' = any (b.scopes))
  );
$$;

create or replace function private.is_household_admin(p_household uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_admins ha
    where ha.household_id = p_household
      and ha.person_id = private.current_person_id()
  );
$$;

create or replace function private.season_expires(p_season int)
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select (s.closes_on + 1)::timestamp at time zone s.timezone
  from public.seasons s
  where s.year = p_season;
$$;

create or replace function private.audit(p_action text, p_table text, p_id uuid, p_details jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_log (actor_id, action, target_table, target_id, details)
  values (private.current_person_id(), p_action, p_table, p_id, coalesce(p_details, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Signup: one person + household per new auth user, or claim an invited row
-- ---------------------------------------------------------------------------

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_household uuid;
  v_person uuid;
  v_token text;
  v_existing uuid;
begin
  select p.id into v_existing
  from public.people p
  where p.email is not null
    and new.email is not null
    and lower(p.email) = lower(new.email)
    and p.user_id is null
  limit 1;

  if v_existing is not null then
    update public.people
    set user_id = new.id
    where id = v_existing;
    return new;
  end if;

  insert into public.households (name)
  values (
    coalesce(
      nullif(new.raw_user_meta_data->>'household_name', ''),
      coalesce(nullif(split_part(coalesce(new.email, 'member'), '@', 1), ''), 'New') || ' household'
    )
  )
  returning id into v_household;

  insert into public.people (user_id, household_id, email, first_name, last_name, kind)
  values (
    new.id,
    v_household,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'adult'
  )
  returning id into v_person;

  insert into public.household_admins (household_id, person_id) values (v_household, v_person);
  insert into public.privacy_settings (person_id) values (v_person);
  insert into public.notification_prefs (person_id, topic)
  select v_person, topic
  from unnest(array['reminders', 'announcements', 'lap_buddy', 'payments']) as topic;

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.calendar_feeds (person_id, token, token_hash)
  values (v_person, v_token, encode(extensions.digest(v_token, 'sha256'), 'hex'));

  return new;
end;
$$;

do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'auth' and c.relname = 'users'
  ) then
    execute 'drop trigger if exists on_auth_user_created on auth.users';
    execute 'create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user()';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Lap booking rules (also mirrored in lib/booking/rules.ts for the UI)
-- ---------------------------------------------------------------------------

create or replace function private.assert_can_book(p_slot uuid, p_person uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.lap_slots%rowtype;
  v_settings public.lap_settings%rowtype;
  v_tz text;
  v_booked int;
  v_week int;
begin
  select * into v_slot from public.lap_slots where id = p_slot;
  if not found then
    raise exception 'That lane time no longer exists.';
  end if;

  if not private.has_role('member', v_slot.season) then
    raise exception 'You need an active membership for this season.';
  end if;
  if not private.has_role('lap_swimmer', v_slot.season) then
    raise exception 'Sign the lap swim waiver before booking.';
  end if;
  if v_slot.blocked_reason is not null then
    raise exception 'That lane is blocked (%).', v_slot.blocked_reason;
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'That lane time has already started.';
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
    raise exception 'That lane is full.';
  end if;

  select s.timezone into v_tz from public.seasons s where s.year = v_slot.season;
  select count(*) into v_week
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  where b.person_id = p_person
    and b.status = 'booked'
    and s.id <> p_slot
    and date_trunc('week', s.starts_at at time zone v_tz)
      = date_trunc('week', v_slot.starts_at at time zone v_tz);
  if v_week >= v_settings.max_per_week then
    raise exception 'You have reached the weekly booking limit (%).', v_settings.max_per_week;
  end if;
end;
$$;

create or replace function private.assert_can_cancel(p_slot uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_slot public.lap_slots%rowtype;
  v_settings public.lap_settings%rowtype;
begin
  if private.is_admin() or private.has_board_scope('lap') then
    return;
  end if;
  select * into v_slot from public.lap_slots where id = p_slot;
  select * into v_settings from public.lap_settings where season = v_slot.season;
  if now() > v_slot.starts_at - v_settings.cancel_cutoff then
    raise exception 'Cancellations close before the cutoff.';
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
begin
  v_person := private.current_person_id();

  if tg_op = 'INSERT' then
    if new.status is distinct from 'booked' then
      raise exception 'New bookings start as booked.';
    end if;
    if v_person is null or new.person_id is distinct from v_person then
      if not private.is_admin() and not private.has_board_scope('lap') then
        raise exception 'You can only book a lane for yourself.';
      end if;
    end if;
    perform private.assert_can_book(new.slot_id, new.person_id);
    return new;
  end if;

  if new.person_id is distinct from old.person_id or new.slot_id is distinct from old.slot_id then
    raise exception 'Bookings cannot be moved. Cancel and book again.';
  end if;

  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if old.person_id is distinct from v_person
       and not private.is_admin() and not private.has_board_scope('lap') then
      raise exception 'You can only cancel your own booking.';
    end if;
    perform private.assert_can_cancel(old.slot_id);
    new.cancelled_at := now();
    return new;
  end if;

  if new.status = 'booked' and old.status = 'cancelled' then
    if old.person_id is distinct from v_person
       and not private.is_admin() and not private.has_board_scope('lap') then
      raise exception 'You can only book a lane for yourself.';
    end if;
    new.cancelled_at := null;
    perform private.assert_can_book(new.slot_id, new.person_id);
    return new;
  end if;

  if new.status in ('attended', 'no_show') and old.status = 'booked' then
    if new.status = 'no_show' and not private.is_admin() and not private.has_board_scope('lap') then
      raise exception 'Only the Lap Swim VP can mark a no-show.';
    end if;
    if new.status = 'attended' and old.person_id is distinct from v_person
       and not private.is_admin() and not private.has_board_scope('lap') then
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

create trigger lap_bookings_enforce
  before insert or update on public.lap_bookings
  for each row execute function private.enforce_lap_booking();

create or replace function private.buddy_count(p_slot_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  join public.lap_slots origin on origin.id = p_slot_id
  join public.lap_settings settings on settings.season = origin.season
  where b.status = 'booked'
    and s.starts_at = origin.starts_at
    and (settings.buddy_mode = 'same_slot' or s.id = origin.id);
$$;

create or replace function private.reveal_gate_code(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
  v_booking public.lap_bookings%rowtype;
  v_slot public.lap_slots%rowtype;
  v_season public.seasons%rowtype;
  v_settings public.lap_settings%rowtype;
  v_today date;
  v_slot_day date;
  v_count int;
  v_code text;
  v_waiver boolean;
begin
  v_person := private.current_person_id();
  if v_person is null then
    return jsonb_build_object('allowed', false, 'reason', 'Sign in to see the gate code.');
  end if;

  select * into v_booking from public.lap_bookings where id = p_booking_id;
  if not found or v_booking.person_id is distinct from v_person then
    return jsonb_build_object('allowed', false, 'reason', 'This booking is not yours.');
  end if;
  if v_booking.status is distinct from 'booked' then
    return jsonb_build_object('allowed', false, 'reason', 'This booking is not active.');
  end if;

  select * into v_slot from public.lap_slots where id = v_booking.slot_id;
  select * into v_season from public.seasons where year = v_slot.season;
  select * into v_settings from public.lap_settings where season = v_slot.season;

  v_today := (now() at time zone v_season.timezone)::date;
  v_slot_day := (v_slot.starts_at at time zone v_season.timezone)::date;
  if v_slot_day is distinct from v_today then
    return jsonb_build_object('allowed', false, 'reason', 'The gate code is shown only on the day of your booking.');
  end if;

  if not private.has_role('member', v_slot.season) or not private.has_role('lap_swimmer', v_slot.season) then
    return jsonb_build_object('allowed', false, 'reason', 'You need a current membership and a signed waiver.');
  end if;

  select exists (
    select 1
    from public.waiver_signatures ws
    join public.waiver_templates wt on wt.id = ws.template_id
    where ws.person_id = v_person
      and ws.revoked_at is null
      and wt.season = v_slot.season
      and wt.key in ('lap_adult', 'lap_teen')
  ) into v_waiver;
  if not v_waiver then
    return jsonb_build_object('allowed', false, 'reason', 'Your waiver is not on file for this season.');
  end if;

  v_count := private.buddy_count(v_slot.id);
  if v_count < coalesce(v_settings.min_buddies, 2) then
    return jsonb_build_object('allowed', false, 'reason', 'The buddy rule is not met yet. Invite another cleared swimmer.');
  end if;

  select g.code into v_code
  from private.gate_codes g
  where v_slot_day between g.valid_from and g.valid_to
  order by g.created_at desc
  limit 1;
  if v_code is null then
    return jsonb_build_object('allowed', false, 'reason', 'No gate code is on file yet.');
  end if;

  insert into public.gate_code_reveals (person_id, booking_id) values (v_person, p_booking_id);
  perform private.audit('gate_code_reveal', 'lap_bookings', p_booking_id, jsonb_build_object('slot_id', v_slot.id));
  return jsonb_build_object('allowed', true, 'code', v_code, 'reason', 'Shown only to you, only today.');
end;
$$;

create or replace function public.reveal_gate_code(p_booking_id uuid)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reveal_gate_code(p_booking_id);
$$;

create or replace function private.set_gate_code(p_code text, p_from date, p_to date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() and not private.has_board_scope('lap') then
    raise exception 'Only the Lap Swim VP or an admin can set the gate code.';
  end if;
  if p_to < p_from or length(trim(p_code)) < 2 then
    raise exception 'Enter the code that is on the gate, and the dates it is valid.';
  end if;
  insert into private.gate_codes (code, valid_from, valid_to)
  values (trim(p_code), p_from, p_to);
  perform private.audit('gate_code_set', 'gate_codes', null, jsonb_build_object('valid_from', p_from, 'valid_to', p_to));
end;
$$;

create or replace function public.set_gate_code(p_code text, p_from date, p_to date)
returns void
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.set_gate_code(p_code, p_from, p_to);
$$;

create or replace function private.generate_lap_slots(p_season int, p_from date, p_to date)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tz text;
  d date;
  tmpl record;
  v_start timestamptz;
  v_end timestamptz;
  v_block text;
  v_inserted int := 0;
  v_row int;
begin
  if not private.is_admin() and not private.has_board_scope('lap') then
    raise exception 'Only the Lap Swim VP or an admin can generate lanes.';
  end if;
  if p_to < p_from or (p_to - p_from) > 200 then
    raise exception 'Choose a shorter date range.';
  end if;
  select timezone into v_tz from public.seasons where year = p_season;
  if v_tz is null then
    raise exception 'Unknown season.';
  end if;

  d := p_from;
  while d <= p_to loop
    for tmpl in
      select * from public.slot_templates
      where season = p_season and weekday = extract(dow from d)::int
    loop
      v_start := (d::timestamp + tmpl.start_time) at time zone v_tz;
      v_end := (d::timestamp + tmpl.end_time) at time zone v_tz;
      select b.reason into v_block
      from public.pool_blocks b
      where b.season = p_season
        and (b.lane_id is null or b.lane_id = tmpl.lane_id)
        and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(v_start, v_end, '[)')
      limit 1;
      insert into public.lap_slots (season, lane_id, starts_at, ends_at, capacity, blocked_reason)
      values (p_season, tmpl.lane_id, v_start, v_end, tmpl.capacity, v_block)
      on conflict (lane_id, starts_at) do nothing;
      get diagnostics v_row = row_count;
      v_inserted := v_inserted + v_row;
    end loop;
    d := d + 1;
  end loop;
  return v_inserted;
end;
$$;

create or replace function public.generate_lap_slots(p_season int, p_from date, p_to date)
returns int
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.generate_lap_slots(p_season, p_from, p_to);
$$;

create or replace function private.lap_slot_board(p_from timestamptz, p_to timestamptz)
returns table (
  slot_id uuid,
  lane_id uuid,
  lane_number int,
  lane_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int,
  booked_count int,
  blocked_reason text,
  mine boolean,
  buddy_count int,
  buddy_met boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.has_role('member') and not private.is_admin() and not private.has_board_scope('lap') then
    raise exception 'Members only.';
  end if;
  return query
  select
    s.id,
    s.lane_id,
    l.number,
    l.label,
    s.starts_at,
    s.ends_at,
    s.capacity,
    (select count(*)::int from public.lap_bookings b where b.slot_id = s.id and b.status = 'booked'),
    s.blocked_reason,
    exists (
      select 1 from public.lap_bookings b
      where b.slot_id = s.id and b.person_id = private.current_person_id() and b.status = 'booked'
    ),
    private.buddy_count(s.id),
    private.buddy_count(s.id) >= coalesce(settings.min_buddies, 2)
  from public.lap_slots s
  join public.lanes l on l.id = s.lane_id
  left join public.lap_settings settings on settings.season = s.season
  where s.starts_at >= p_from and s.starts_at < p_to
  order by s.starts_at, l.number;
end;
$$;

create or replace function public.lap_slot_board(p_from timestamptz, p_to timestamptz)
returns table (
  slot_id uuid,
  lane_id uuid,
  lane_number int,
  lane_label text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity int,
  booked_count int,
  blocked_reason text,
  mine boolean,
  buddy_count int,
  buddy_met boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.lap_slot_board(p_from, p_to);
$$;

create or replace function private.lap_slot_buddies(p_slot_id uuid)
returns table (person_id uuid, first_name text, last_name text, hidden_count int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_hidden int;
  v_origin public.lap_slots%rowtype;
  v_mode text;
begin
  if not private.has_role('lap_swimmer') and not private.is_admin() and not private.has_board_scope('lap') then
    raise exception 'Lap swimmers only.';
  end if;
  select * into v_origin from public.lap_slots where id = p_slot_id;
  select buddy_mode into v_mode from public.lap_settings where season = v_origin.season;
  select count(*)::int into v_hidden
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  join public.privacy_settings pr on pr.person_id = b.person_id
  where b.status = 'booked'
    and s.starts_at = v_origin.starts_at
    and (v_mode = 'same_slot' or s.id = v_origin.id)
    and pr.lap_buddy_visible = false
    and b.person_id is distinct from private.current_person_id();

  return query
  select p.id, p.first_name, p.last_name, v_hidden
  from public.lap_bookings b
  join public.lap_slots s on s.id = b.slot_id
  join public.people p on p.id = b.person_id
  join public.privacy_settings pr on pr.person_id = p.id
  where b.status = 'booked'
    and s.starts_at = v_origin.starts_at
    and (v_mode = 'same_slot' or s.id = v_origin.id)
    and (pr.lap_buddy_visible or p.id = private.current_person_id());
end;
$$;

create or replace function public.lap_slot_buddies(p_slot_id uuid)
returns table (person_id uuid, first_name text, last_name text, hidden_count int)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.lap_slot_buddies(p_slot_id);
$$;

-- ---------------------------------------------------------------------------
-- Waivers grant lap_swimmer. Signatures are immutable except revocation.
-- ---------------------------------------------------------------------------

create or replace function private.enforce_waiver_signature()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_template public.waiver_templates%rowtype;
  v_me uuid;
begin
  if tg_op = 'UPDATE' then
    if not private.is_admin() and not private.has_board_scope('lap') then
      raise exception 'Signed waivers cannot be edited.';
    end if;
    if new.template_id is distinct from old.template_id
       or new.person_id is distinct from old.person_id
       or new.typed_name is distinct from old.typed_name
       or new.signed_at is distinct from old.signed_at
       or new.ip is distinct from old.ip
       or new.user_agent is distinct from old.user_agent
       or new.pdf_path is distinct from old.pdf_path
       or new.pdf_sha256 is distinct from old.pdf_sha256
       or new.body_sha256 is distinct from old.body_sha256
       or new.signature_png_path is distinct from old.signature_png_path
       or new.guardian_person_id is distinct from old.guardian_person_id then
      raise exception 'Signed waivers are immutable. Revoke instead of editing.';
    end if;
    if new.revoked_at is not null and old.revoked_at is null then
      update public.entitlements
      set revoked_at = now(), revoked_reason = coalesce(new.revoked_reason, 'waiver_revoked')
      where source = 'waiver' and source_id = new.id and revoked_at is null;
      perform private.audit('waiver_revoke', 'waiver_signatures', new.id, jsonb_build_object('reason', new.revoked_reason));
    end if;
    return new;
  end if;

  v_me := private.current_person_id();
  select * into v_template from public.waiver_templates where id = new.template_id;
  if v_template.published_at is null then
    raise exception 'That waiver is not open for signatures.';
  end if;
  if new.body_sha256 is distinct from v_template.body_sha256 then
    raise exception 'The waiver text changed. Reload and sign the current version.';
  end if;
  if length(trim(new.typed_name)) < 3 then
    raise exception 'Type your full name to sign.';
  end if;

  if v_template.requires_guardian then
    if new.guardian_person_id is null or not private.is_household_admin(
      (select household_id from public.people where id = new.person_id)
    ) then
      raise exception 'A parent or guardian in the household has to co-sign.';
    end if;
    if new.guardian_person_id is distinct from v_me and not private.is_admin() then
      raise exception 'Sign with your own account.';
    end if;
  else
    if new.person_id is distinct from v_me and not private.is_admin() and not private.has_board_scope('lap') then
      raise exception 'You can only sign for yourself.';
    end if;
  end if;

  if exists (
    select 1 from public.waiver_signatures ws
    where ws.template_id = new.template_id
      and ws.person_id = new.person_id
      and ws.revoked_at is null
  ) then
    raise exception 'This waiver is already signed.';
  end if;

  insert into public.entitlements (person_id, role_key, season, source, source_id, expires_at)
  values (
    new.person_id,
    'lap_swimmer',
    v_template.season,
    'waiver',
    new.id,
    private.season_expires(v_template.season)
  );
  perform private.audit('waiver_sign', 'waiver_signatures', new.id, jsonb_build_object('template', v_template.key));
  return new;
end;
$$;

create trigger waiver_signatures_enforce
  before insert or update on public.waiver_signatures
  for each row execute function private.enforce_waiver_signature();

-- ---------------------------------------------------------------------------
-- Shifts, deposits, RSVPs
-- ---------------------------------------------------------------------------

create or replace function private.enforce_shift_signup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_shift public.volunteer_shifts%rowtype;
  v_event public.events%rowtype;
  v_filled int;
  v_units int;
begin
  select * into v_shift from public.volunteer_shifts where id = coalesce(new.shift_id, old.shift_id);
  select * into v_event from public.events where id = v_shift.event_id;

  if tg_op = 'INSERT' then
    if new.person_id is distinct from private.current_person_id()
       and not private.is_admin() and not private.has_board_scope('social') then
      raise exception 'You can only sign yourself up.';
    end if;
    if new.status is distinct from 'signed_up' then
      raise exception 'New signups start as signed up.';
    end if;
    if v_shift.audience = 'swim_team' and not private.has_role('swim_team_family', v_event.season)
       and not private.is_admin() then
      raise exception 'This shift is for swim team families.';
    end if;
    if not private.has_role('member', v_event.season) and not private.is_admin() then
      raise exception 'You need an active membership to take a shift.';
    end if;
    select count(*) into v_filled
    from public.shift_signups s
    where s.shift_id = new.shift_id and s.status in ('signed_up', 'completed');
    if v_filled >= v_shift.capacity then
      raise exception 'That shift is full.';
    end if;
    insert into public.entitlements (person_id, role_key, season, source, source_id, expires_at)
    select new.person_id, 'volunteer', v_event.season, 'shift', new.id, private.season_expires(v_event.season)
    where v_event.season is not null
      and not exists (
        select 1 from public.entitlements e
        where e.person_id = new.person_id and e.role_key = 'volunteer'
          and e.season = v_event.season and e.revoked_at is null
      );
    return new;
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    if not private.is_admin() and not private.has_board_scope('social')
       and v_shift.lead_person_id is distinct from private.current_person_id() then
      raise exception 'The shift lead or an admin marks a shift complete.';
    end if;
    new.completed_by := private.current_person_id();
    new.completed_at := now();
    if v_shift.counts_for_deposit and v_event.season is not null then
      insert into public.deposit_ledger (household_id, season, credit_units_required)
      select p.household_id, v_event.season, coalesce(
        (select (value #>> '{}')::int from public.club_settings where key = 'deposit_units_required'),
        1
      )
      from public.people p
      where p.id = new.person_id
      on conflict (household_id, season) do nothing;

      update public.deposit_ledger d
      set credit_units_earned = d.credit_units_earned + v_shift.credit_units,
          status = case
            when d.status in ('refunded', 'forfeited', 'rolled_over') then d.status
            when d.credit_units_earned + v_shift.credit_units >= d.credit_units_required
              and d.paid_cents > 0 then 'earned'
            else d.status
          end
      from public.people p
      where p.id = new.person_id
        and d.household_id = p.household_id
        and d.season = v_event.season;
    end if;
    return new;
  end if;

  if new.status = 'cancelled' and old.status = 'signed_up' then
    if new.person_id is distinct from private.current_person_id()
       and not private.is_admin() and not private.has_board_scope('social') then
      raise exception 'You can only cancel your own shift.';
    end if;
    return new;
  end if;

  if new.status = 'no_show' and not private.is_admin() and not private.has_board_scope('social')
     and v_shift.lead_person_id is distinct from private.current_person_id() then
    raise exception 'The shift lead or an admin marks a no-show.';
  end if;
  return new;
end;
$$;

create trigger shift_signups_enforce
  before insert or update on public.shift_signups
  for each row execute function private.enforce_shift_signup();

create or replace function private.going_headcount(p_event uuid, p_except uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(r.adults + r.kids), 0)::int
  from public.rsvps r
  where r.event_id = p_event and r.status = 'going' and r.id is distinct from p_except;
$$;

-- Invoker (not definer) so current_user is the caller. Webhooks run as service_role
-- and may confirm a paid RSVP. Capacity reads go through the definer helper.
create or replace function private.enforce_rsvp()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_event public.events%rowtype;
  v_used int;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  select * into v_event from public.events where id = new.event_id;
  if v_event.id is null then
    raise exception 'That event is not open.';
  end if;
  if not v_event.published and not private.is_admin() and not private.has_board_scope('social') then
    raise exception 'That event is not open.';
  end if;
  if not private.is_household_admin(new.household_id) and not private.is_admin()
     and not private.has_board_scope('social') then
    raise exception 'A household admin sends the RSVP.';
  end if;
  if new.household_id is distinct from private.current_household_id()
     and not private.is_admin() and not private.has_board_scope('social') then
    raise exception 'You can only RSVP for your household.';
  end if;
  if not private.has_role('member', v_event.season) and not private.is_admin() then
    raise exception 'You need an active membership to RSVP.';
  end if;
  if v_event.audience_role = 'swim_team_family'
     and not private.has_role('swim_team_family', v_event.season)
     and not private.is_admin() then
    raise exception 'This event is for swim team families.';
  end if;

  if new.status = 'going' and v_event.capacity is not null then
    v_used := private.going_headcount(new.event_id, new.id);
    if v_used + new.adults + new.kids > v_event.capacity then
      new.status := 'waitlist';
    end if;
  end if;

  if v_event.price_cents > 0 and tg_op = 'INSERT' and new.status = 'going' then
    new.status := 'pending_payment';
  end if;
  return new;
end;
$$;

create trigger rsvps_enforce
  before insert or update on public.rsvps
  for each row execute function private.enforce_rsvp();

-- ---------------------------------------------------------------------------
-- Orders: prices must match the fee schedule. Status changes are server-side.
-- ---------------------------------------------------------------------------

create or replace function private.enforce_order_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_expected int;
begin
  select * into v_order from public.orders where id = new.order_id;
  if v_order.status is distinct from 'pending' then
    raise exception 'This order can no longer be changed.';
  end if;

  if new.price_item = 'event_ticket' then
    select e.price_cents * new.quantity into v_expected
    from public.events e
    where e.id = new.ref_id and e.published and e.price_cents > 0;
  elsif new.price_item = 'party_slot' then
    select ps.fee_cents * new.quantity into v_expected
    from public.party_slots ps
    where ps.id = new.ref_id;
  else
    select pl.amount_cents * new.quantity into v_expected
    from public.price_list pl
    where pl.season = v_order.season and pl.item = new.price_item;
  end if;

  if v_expected is null or v_expected is distinct from new.amount_cents then
    raise exception 'That price does not match the current fee schedule.';
  end if;
  return new;
end;
$$;

create trigger order_items_enforce
  before insert or update on public.order_items
  for each row execute function private.enforce_order_item();

create or replace function private.check_order_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sum int;
  v_total int;
begin
  select coalesce(sum(amount_cents), 0) into v_sum from public.order_items where order_id = new.order_id;
  select total_cents into v_total from public.orders where id = new.order_id;
  if v_sum is distinct from v_total then
    raise exception 'Order total does not match its items.';
  end if;
  return null;
end;
$$;

create constraint trigger order_items_total
  after insert or update on public.order_items
  deferrable initially deferred
  for each row execute function private.check_order_total();

create or replace function private.protect_order_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     or new.total_cents is distinct from old.total_cents
     or new.stripe_payment_intent_id is distinct from old.stripe_payment_intent_id
     or new.receipt_url is distinct from old.receipt_url then
    if current_user not in ('service_role', 'postgres', 'supabase_admin') then
      raise exception 'Payment status is updated from the Stripe webhook.';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_protect_status
  before update on public.orders
  for each row execute function private.protect_order_status();

create or replace function public.apply_order_status(
  p_order_id uuid,
  p_status text,
  p_amount_cents int default null,
  p_payment_intent text default null,
  p_receipt_url text default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_expires timestamptz;
  v_provisional boolean;
  v_position int;
  v_event_capacity int;
  v_used int;
begin
  if p_status not in ('processing', 'paid', 'failed', 'refunded') then
    raise exception 'Unsupported status.';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;

  if p_amount_cents is not null and p_amount_cents is distinct from v_order.total_cents
     and p_status in ('paid', 'processing') then
    raise exception 'Paid amount does not match the order.';
  end if;

  if v_order.status = 'paid' and p_status in ('paid', 'processing') then
    return;
  end if;
  if v_order.status = 'refunded' and p_status = 'refunded' then
    return;
  end if;

  update public.orders
  set status = p_status,
      stripe_payment_intent_id = coalesce(p_payment_intent, stripe_payment_intent_id),
      receipt_url = coalesce(p_receipt_url, receipt_url)
  where id = p_order_id;

  if p_status = 'failed' then
    update public.entitlements
    set revoked_at = now(), revoked_reason = 'payment_failed'
    where source = 'payment' and source_id = p_order_id and revoked_at is null;
    update public.rsvps set status = 'cancelled' where order_id = p_order_id and status = 'pending_payment';
    update public.party_reservations set status = 'cancelled' where order_id = p_order_id and status = 'requested';
    return;
  end if;

  if p_status = 'refunded' then
    update public.entitlements
    set revoked_at = now(), revoked_reason = 'refunded'
    where source = 'payment' and source_id = p_order_id and revoked_at is null;
    update public.rsvps set status = 'cancelled' where order_id = p_order_id;
    return;
  end if;

  if p_status = 'processing' then
    select coalesce((value #>> '{}')::boolean, true) into v_provisional
    from public.club_settings where key = 'ach_grants_provisional';
    if not coalesce(v_provisional, true) then
      return;
    end if;
  end if;

  v_expires := private.season_expires(v_order.season);

  for v_item in select * from public.order_items where order_id = p_order_id loop
    if v_item.price_item in ('renewal', 'renewal_late', 'new_member') then
      update public.households
      set status = 'active', membership_type = 'full'
      where id = v_order.household_id;
      insert into public.entitlements (household_id, role_key, season, source, source_id, expires_at)
      select v_order.household_id, 'member', v_order.season, 'payment', p_order_id, v_expires
      where not exists (
        select 1 from public.entitlements e
        where e.source = 'payment' and e.source_id = p_order_id and e.role_key = 'member' and e.revoked_at is null
      );
      if v_item.price_item = 'new_member' then
        update public.waitlist_applications
        set status = 'joined'
        where applicant_person_id = v_order.person_id and status in ('invited', 'active');
      end if;
    elsif v_item.price_item = 'lap_only' then
      update public.households
      set status = 'active', membership_type = 'lap_only'
      where id = v_order.household_id;
      insert into public.entitlements (household_id, role_key, season, source, source_id, expires_at)
      select v_order.household_id, 'member', v_order.season, 'payment', p_order_id, v_expires
      where not exists (
        select 1 from public.entitlements e
        where e.source = 'payment' and e.source_id = p_order_id and e.role_key = 'member' and e.revoked_at is null
      );
    elsif v_item.price_item = 'volunteer_deposit' then
      insert into public.deposit_ledger (household_id, season, paid_cents, credit_units_required, status)
      values (
        v_order.household_id,
        v_order.season,
        v_item.amount_cents,
        coalesce((select (value #>> '{}')::int from public.club_settings where key = 'deposit_units_required'), 1),
        'pending'
      )
      on conflict (household_id, season) do update
      set paid_cents = public.deposit_ledger.paid_cents + excluded.paid_cents,
          status = case
            when public.deposit_ledger.credit_units_earned >= public.deposit_ledger.credit_units_required
              then 'earned'
            else 'pending'
          end;
    elsif v_item.price_item = 'waitlist_fee' then
      select coalesce(max(position), 0) + 1 into v_position
      from public.waitlist_applications
      where status in ('active', 'invited', 'joined');
      update public.waitlist_applications
      set status = 'active', position = coalesce(position, v_position)
      where order_id = p_order_id and status = 'pending_payment';
      update public.households set status = 'waitlist', membership_type = 'waitlist'
      where id = v_order.household_id and status = 'prospect';
    elsif v_item.price_item = 'party_slot' then
      update public.party_reservations set status = 'requested' where order_id = p_order_id and status = 'requested';
    elsif v_item.price_item = 'event_ticket' then
      select e.capacity into v_event_capacity
      from public.rsvps r
      join public.events e on e.id = r.event_id
      where r.order_id = p_order_id
      limit 1;
      select coalesce(sum(r2.adults + r2.kids), 0) into v_used
      from public.rsvps r2
      where r2.status = 'going'
        and r2.event_id = (select event_id from public.rsvps where order_id = p_order_id limit 1);
      update public.rsvps
      set status = case
        when v_event_capacity is not null and v_used + adults + kids > v_event_capacity then 'waitlist'
        else 'going'
      end
      where order_id = p_order_id and status = 'pending_payment';
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Directory, calendar feed, household guards
-- ---------------------------------------------------------------------------

create or replace function private.directory_list()
returns table (
  person_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  household_name text,
  kind text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_me uuid;
begin
  if not private.has_role('member') and not private.is_admin() and not private.has_board_scope('membership') then
    raise exception 'Members only.';
  end if;
  v_me := private.current_person_id();
  return query
  select
    p.id,
    case when pr.show_name or p.id = v_me then p.first_name else null end,
    case when pr.show_name or p.id = v_me then p.last_name else null end,
    case when pr.show_email or p.id = v_me then p.email else null end,
    case when pr.show_phone or p.id = v_me then p.phone else null end,
    case when pr.show_household or p.id = v_me then h.name else null end,
    case when p.kind = 'child' and not pr.show_children and p.id is distinct from v_me then null else p.kind end
  from public.people p
  join public.privacy_settings pr on pr.person_id = p.id
  join public.households h on h.id = p.household_id
  where (pr.show_name or p.id = v_me)
    and (
      p.kind <> 'child'
      or pr.show_children
      or p.id = v_me
      or p.household_id = private.current_household_id()
    )
    and exists (
      select 1 from public.entitlements e
      where e.role_key = 'member'
        and e.revoked_at is null
        and (e.expires_at is null or e.expires_at > now())
        and (e.person_id = p.id or e.household_id = p.household_id)
    );
end;
$$;

create or replace function public.directory_list()
returns table (
  person_id uuid,
  first_name text,
  last_name text,
  email text,
  phone text,
  household_name text,
  kind text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.directory_list();
$$;

create or replace function private.calendar_feed_events(p_token text)
returns table (
  uid text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text
)
language sql
stable
security definer
set search_path = ''
as $$
  with owner as (
    select cf.person_id, p.household_id
    from public.calendar_feeds cf
    join public.people p on p.id = cf.person_id
    where cf.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  )
  select 'lap-' || b.id::text, 'Lap swim · ' || l.label, s.starts_at, s.ends_at, 'Las Trampas Pool'
  from owner o
  join public.lap_bookings b on b.person_id = o.person_id and b.status = 'booked'
  join public.lap_slots s on s.id = b.slot_id
  join public.lanes l on l.id = s.lane_id
  union all
  select 'rsvp-' || r.id::text, e.title, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '2 hours'), coalesce(e.location, 'Las Trampas Pool')
  from owner o
  join public.rsvps r on r.household_id = o.household_id and r.status = 'going'
  join public.events e on e.id = r.event_id
  union all
  select 'shift-' || su.id::text, vs.title || ' · ' || e.title, vs.starts_at, vs.ends_at, coalesce(e.location, 'Las Trampas Pool')
  from owner o
  join public.shift_signups su on su.person_id = o.person_id and su.status in ('signed_up', 'completed')
  join public.volunteer_shifts vs on vs.id = su.shift_id
  join public.events e on e.id = vs.event_id
  union all
  select 'party-' || pr.id::text, 'Party · ' || ps.area, ps.starts_at, ps.ends_at, 'Las Trampas Pool'
  from owner o
  join public.party_reservations pr on pr.household_id = o.household_id and pr.status in ('requested', 'approved')
  join public.party_slots ps on ps.id = pr.slot_id
  union all
  select 'team-' || e.id::text, e.title, e.starts_at, coalesce(e.ends_at, e.starts_at + interval '2 hours'), coalesce(e.location, 'Las Trampas Pool')
  from owner o
  join public.events e on e.kind = 'swim_team' and e.published
  where exists (
    select 1 from public.entitlements en
    where en.role_key = 'swim_team_family' and en.revoked_at is null
      and (en.expires_at is null or en.expires_at > now())
      and (en.person_id = o.person_id or en.household_id = o.household_id)
  );
$$;

create or replace function public.calendar_feed_events(p_token text)
returns table (
  uid text,
  title text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.calendar_feed_events(p_token);
$$;

create or replace function private.rotate_calendar_token()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_person uuid;
  v_token text;
begin
  v_person := private.current_person_id();
  if v_person is null then
    raise exception 'Sign in first.';
  end if;
  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.calendar_feeds (person_id, token, token_hash)
  values (v_person, v_token, encode(extensions.digest(v_token, 'sha256'), 'hex'))
  on conflict (person_id) do update
  set token = excluded.token,
      token_hash = excluded.token_hash,
      rotated_at = now();
  perform private.audit('calendar_token_rotate', 'calendar_feeds', v_person, '{}'::jsonb);
  return v_token;
end;
$$;

create or replace function public.rotate_calendar_token()
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.rotate_calendar_token();
$$;

create or replace function private.protect_household()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.stripe_customer_id is distinct from old.stripe_customer_id
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'Billing identity is managed by the server.';
  end if;
  if (new.membership_type is distinct from old.membership_type or new.status is distinct from old.status)
     and current_user not in ('service_role', 'postgres', 'supabase_admin')
     and not private.is_admin()
     and not private.has_board_scope('membership') then
    raise exception 'Membership status is updated from payments or by the membership chair.';
  end if;
  return new;
end;
$$;

create trigger households_protect
  before update on public.households
  for each row execute function private.protect_household();

create or replace function private.grant_team_family()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.entitlements (household_id, role_key, season, source, source_id, expires_at)
  select new.household_id, 'swim_team_family', new.season, 'team', new.id, private.season_expires(new.season)
  where not exists (
    select 1 from public.entitlements e
    where e.household_id = new.household_id
      and e.role_key = 'swim_team_family'
      and e.season = new.season
      and e.revoked_at is null
  );
  return new;
end;
$$;

create trigger team_registrations_grant
  after insert on public.team_registrations
  for each row execute function private.grant_team_family();
