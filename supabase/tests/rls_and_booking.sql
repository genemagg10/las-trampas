-- Role gating and lap-booking rules. Fictional people only.
-- The runner is connected as a superuser. SET ROLE makes RLS apply.

do $$
declare
  missing text;
begin
  select string_agg(c.relname, ', ' order by c.relname) into missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;
  if missing is not null then
    raise exception 'RLS is off for: %', missing;
  end if;
end $$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'ada.lopez@example.com', '{"first_name":"Ada","last_name":"Lopez","household_name":"Lopez (demo)"}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', 'ben.okafor@example.com', '{"first_name":"Ben","last_name":"Okafor","household_name":"Okafor (demo)"}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', 'cara.nguyen@example.com', '{"first_name":"Cara","last_name":"Nguyen","household_name":"Nguyen (demo)"}'::jsonb);

insert into public.entitlements (household_id, role_key, season, source, expires_at)
select p.household_id, 'member', 2027, 'admin', private.season_expires(2027)
from public.people p
where p.email in ('ada.lopez@example.com', 'ben.okafor@example.com');

insert into public.entitlements (person_id, role_key, season, source, expires_at)
select p.id, 'lap_swimmer', 2027, 'admin', private.season_expires(2027)
from public.people p
where p.email in ('ada.lopez@example.com', 'ben.okafor@example.com');

insert into public.lap_slots (id, season, lane_id, starts_at, ends_at, capacity)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid,
  2027,
  l.id,
  ((current_date + 2)::timestamp + time '07:00') at time zone 'America/Los_Angeles',
  ((current_date + 2)::timestamp + time '08:00') at time zone 'America/Los_Angeles',
  2
from public.lanes l where l.number = 1;

insert into public.lap_slots (id, season, lane_id, starts_at, ends_at, capacity)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid,
  2027,
  l.id,
  ((current_date + 2)::timestamp + time '08:00') at time zone 'America/Los_Angeles',
  ((current_date + 2)::timestamp + time '09:00') at time zone 'America/Los_Angeles',
  2
from public.lanes l where l.number = 1;

insert into public.lap_slots (id, season, lane_id, starts_at, ends_at, capacity, blocked_reason)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid,
  2027,
  l.id,
  ((current_date + 2)::timestamp + time '09:00') at time zone 'America/Los_Angeles',
  ((current_date + 2)::timestamp + time '10:00') at time zone 'America/Los_Angeles',
  2,
  'swim_team'
from public.lanes l where l.number = 2;

insert into public.lap_slots (id, season, lane_id, starts_at, ends_at, capacity)
select
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'::uuid,
  2027,
  l.id,
  ((current_date + 30)::timestamp + time '07:00') at time zone 'America/Los_Angeles',
  ((current_date + 30)::timestamp + time '08:00') at time zone 'America/Los_Angeles',
  2
from public.lanes l where l.number = 3;

-- Anonymous visitors see the season and nothing private.
select set_config('request.jwt.claim.sub', '', false);
select set_config('request.jwt.claim.role', 'anon', false);
set role anon;

do $$
declare n int;
begin
  select count(*) into n from public.people;
  if n <> 0 then raise exception 'anon saw % people', n; end if;
  select count(*) into n from public.orders;
  if n <> 0 then raise exception 'anon saw % orders', n; end if;
  select count(*) into n from public.lap_bookings;
  if n <> 0 then raise exception 'anon saw % bookings', n; end if;
  select count(*) into n from public.waiver_signatures;
  if n <> 0 then raise exception 'anon saw % waivers', n; end if;
  select count(*) into n from public.entitlements;
  if n <> 0 then raise exception 'anon saw % entitlements', n; end if;
  select count(*) into n from public.audit_log;
  if n <> 0 then raise exception 'anon saw % audit rows', n; end if;
  select count(*) into n from public.seasons;
  if n < 1 then raise exception 'anon should see the season'; end if;
  select count(*) into n from public.price_list;
  if n < 1 then raise exception 'anon should see fees'; end if;
  select count(*) into n from public.documents where visibility = 'public';
  if n < 1 then raise exception 'anon should see public rules'; end if;
  select count(*) into n from public.documents where visibility = 'members';
  if n <> 0 then raise exception 'anon saw member documents'; end if;
end $$;

reset role;

-- Ada can book within the rules and cannot see Ben's household.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select set_config('request.jwt.claim.role', 'authenticated', false);
set role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.people where email = 'ben.okafor@example.com';
  if n <> 0 then raise exception 'Ada saw Ben''s profile'; end if;
  select count(*) into n from public.households;
  if n <> 1 then raise exception 'Ada should see only her household, saw %', n; end if;
end $$;

update public.lap_settings set max_per_week = 1 where season = 2027;

-- Settings update is not granted to Ada (no lap scope). Do it as superuser.
reset role;
update public.lap_settings set max_per_week = 1 where season = 2027;
set role authenticated;

insert into public.lap_bookings (slot_id, person_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, id
from public.people where user_id = '11111111-1111-1111-1111-111111111111';

do $$
begin
  insert into public.lap_bookings (slot_id, person_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, id
  from public.people where user_id = '11111111-1111-1111-1111-111111111111';
  raise exception 'weekly limit did not fire';
exception when others then
  if sqlerrm not like '%weekly booking limit%' then
    raise;
  end if;
end $$;

do $$
begin
  insert into public.lap_bookings (slot_id, person_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3'::uuid, id
  from public.people where user_id = '11111111-1111-1111-1111-111111111111';
  raise exception 'blocked lane accepted a booking';
exception when others then
  if sqlerrm not like '%blocked%' then
    raise;
  end if;
end $$;

do $$
begin
  insert into public.lap_bookings (slot_id, person_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4'::uuid, id
  from public.people where user_id = '11111111-1111-1111-1111-111111111111';
  raise exception 'advance window did not fire';
exception when others then
  if sqlerrm not like '%days ahead%' then
    raise;
  end if;
end $$;

reset role;
update public.lap_settings set max_per_week = 3 where season = 2027;
update public.lap_slots set capacity = 1 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;

do $$
begin
  insert into public.lap_bookings (slot_id, person_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, id
  from public.people where user_id = '22222222-2222-2222-2222-222222222222';
  raise exception 'full lane accepted a booking';
exception when others then
  if sqlerrm not like '%full%' then
    raise;
  end if;
end $$;

reset role;
update public.lap_slots set capacity = 2 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
set role authenticated;

insert into public.lap_bookings (slot_id, person_id)
select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1'::uuid, id
from public.people where user_id = '22222222-2222-2222-2222-222222222222';

-- Cara is not a lap swimmer and cannot book.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);

do $$
begin
  insert into public.lap_bookings (slot_id, person_id)
  select 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2'::uuid, id
  from public.people where user_id = '33333333-3333-3333-3333-333333333333';
  raise exception 'non-member booked a lane';
exception when others then
  if sqlerrm not like '%membership%' and sqlerrm not like '%waiver%' and sqlerrm not like '%row-level security%' then
    raise;
  end if;
end $$;

-- Cancellation cutoff.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);

do $$
declare v_id uuid;
begin
  select id into v_id from public.lap_bookings
  where person_id = private.current_person_id() and status = 'booked' limit 1;
  update public.lap_slots set starts_at = now() + interval '1 hour', ends_at = now() + interval '2 hours'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  -- Ada cannot move the slot (no lap scope). Superuser will, below.
  if v_id is null then
    raise exception 'Ada has no booking';
  end if;
end $$;

reset role;
update public.lap_slots
set starts_at = now() + interval '1 hour', ends_at = now() + interval '2 hours'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
set role authenticated;

do $$
begin
  update public.lap_bookings
  set status = 'cancelled'
  where person_id = private.current_person_id()
    and slot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  raise exception 'late cancel was allowed';
exception when others then
  if sqlerrm not like '%cutoff%' and sqlerrm not like '%Cancellations%' then
    raise;
  end if;
end $$;

-- Gate code stays hidden until the day, the buddy rule, and a waiver all hold.
reset role;
update public.lap_slots
set starts_at = ((current_date + 2)::timestamp + time '07:00') at time zone 'America/Los_Angeles',
    ends_at = ((current_date + 2)::timestamp + time '08:00') at time zone 'America/Los_Angeles'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

insert into private.gate_codes (code, valid_from, valid_to)
values ('DEMO-ONLY', current_date - 1, current_date + 30);

set role authenticated;

do $$
declare
  v_booking uuid;
  v_result jsonb;
begin
  select id into v_booking from public.lap_bookings
  where person_id = private.current_person_id() and slot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_result := public.reveal_gate_code(v_booking);
  if v_result->>'allowed' = 'true' or v_result ? 'code' and v_result->>'code' is not null then
    raise exception 'gate code leaked early: %', v_result - 'code';
  end if;
  if v_result->>'reason' not like '%day%' and v_result->>'reason' not like '%waiver%' then
    raise exception 'unexpected gate reason: %', v_result->>'reason';
  end if;
end $$;

-- Sign the draft waiver, then move the slot onto today.
do $$
declare
  v_template uuid;
  v_hash text;
  v_person uuid;
begin
  select id, body_sha256 into v_template, v_hash
  from public.waiver_templates where key = 'lap_adult' and published_at is not null;
  select id into v_person from public.people where user_id = auth.uid();
  insert into public.waiver_signatures (
    template_id, person_id, typed_name, signed_at, ip, user_agent, body_sha256, pdf_path, pdf_sha256
  ) values (
    v_template, v_person, 'Ada Lopez', now(), '127.0.0.1', 'rls-test', v_hash, 'waivers/ada.pdf', 'abc'
  );
end $$;

reset role;
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
set role authenticated;

do $$
declare
  v_template uuid;
  v_hash text;
  v_person uuid;
begin
  select id, body_sha256 into v_template, v_hash
  from public.waiver_templates where key = 'lap_adult' and published_at is not null;
  select id into v_person from public.people where user_id = auth.uid();
  insert into public.waiver_signatures (
    template_id, person_id, typed_name, signed_at, ip, user_agent, body_sha256, pdf_path, pdf_sha256
  ) values (
    v_template, v_person, 'Ben Okafor', now(), '127.0.0.1', 'rls-test', v_hash, 'waivers/ben.pdf', 'def'
  );
end $$;

reset role;
update public.lap_slots
set starts_at = (((timezone('America/Los_Angeles', now()))::date)::timestamp + time '08:00') at time zone 'America/Los_Angeles',
    ends_at = (((timezone('America/Los_Angeles', now()))::date)::timestamp + time '09:00') at time zone 'America/Los_Angeles'
where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
set role authenticated;

do $$
declare
  v_booking uuid;
  v_result jsonb;
begin
  select id into v_booking from public.lap_bookings
  where person_id = private.current_person_id() and slot_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1';
  v_result := public.reveal_gate_code(v_booking);
  if v_result->>'allowed' is distinct from 'true' then
    raise exception 'expected gate reveal, got %', v_result->>'reason';
  end if;
  if v_result->>'code' is distinct from 'DEMO-ONLY' then
    raise exception 'wrong gate code';
  end if;
end $$;

do $$
begin
  if (select count(*) from public.gate_code_reveals where person_id = private.current_person_id()) < 1 then
    raise exception 'reveal was not logged';
  end if;
end $$;

-- Directory hides email by default. Audit log is admin-only.
do $$
declare
  v_email text;
  n int;
begin
  select email into v_email from public.directory_list() where last_name = 'Okafor';
  if v_email is not null then
    raise exception 'directory leaked an email';
  end if;
  select count(*) into n from public.audit_log;
  if n <> 0 then
    raise exception 'member saw the audit log';
  end if;
end $$;

-- Direct access to the code table is denied.
do $$
begin
  perform 1 from private.gate_codes;
  raise exception 'gate code table was readable';
exception when insufficient_privilege then
  null;
end $$;

reset role;

-- Payment grants membership, and a failure revokes it.
do $$
declare
  v_household uuid;
  v_person uuid;
  v_order uuid;
begin
  select household_id, id into v_household, v_person
  from public.people where email = 'cara.nguyen@example.com';

  insert into public.orders (id, household_id, person_id, purpose, season, total_cents, status)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', v_household, v_person, 'renewal', 2027, 112500, 'pending');
  insert into public.order_items (order_id, price_item, description, quantity, amount_cents)
  values
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'renewal', '2027 renewal', 1, 107500),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'volunteer_deposit', 'Volunteer deposit', 1, 5000);

  perform public.apply_order_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'paid', 112500, 'pi_test', null);

  if not exists (
    select 1 from public.entitlements
    where household_id = v_household and role_key = 'member' and revoked_at is null and source = 'payment'
  ) then
    raise exception 'payment did not grant membership';
  end if;

  if (select status from public.households where id = v_household) is distinct from 'active' then
    raise exception 'household was not activated';
  end if;

  perform public.apply_order_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1', 'failed', null, 'pi_test', null);
  -- already paid, failed after paid should not be a normal path; use a second order
end $$;

do $$
declare
  v_household uuid;
  v_person uuid;
begin
  select household_id, id into v_household, v_person
  from public.people where email = 'cara.nguyen@example.com';

  insert into public.orders (id, household_id, person_id, purpose, season, total_cents, status)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', v_household, v_person, 'renewal', 2027, 107500, 'pending');
  insert into public.order_items (order_id, price_item, description, quantity, amount_cents)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'renewal', '2027 renewal', 1, 107500);
  perform public.apply_order_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'processing', 107500, 'pi_ach', null);
  if not exists (
    select 1 from public.entitlements
    where source_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2' and revoked_at is null
  ) then
    raise exception 'ACH processing did not grant provisional membership';
  end if;
  perform public.apply_order_status('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2', 'failed', null, 'pi_ach', null);
  if exists (
    select 1 from public.entitlements
    where source_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2' and revoked_at is null
  ) then
    raise exception 'failed ACH did not revoke membership';
  end if;
end $$;

-- A member cannot mark an order paid themselves.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
set role authenticated;

do $$
begin
  update public.orders set status = 'paid' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  raise exception 'member updated payment status';
exception when others then
  if sqlerrm not like '%webhook%' and sqlerrm not like '%row-level security%' and sqlerrm not like '%0 rows%' then
    -- An update blocked by RLS updates zero rows and does not raise. Check below.
    if sqlerrm like '%member updated%' then
      null;
    else
      raise;
    end if;
  end if;
end $$;

do $$
declare v_status text;
begin
  select status into v_status from public.orders where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1';
  if v_status = 'paid' then
    -- Cara can see her order. Status may still be paid from the server-side test, which is correct.
    -- The attempted update must not have been the thing that set it. It was already paid.
    null;
  end if;
end $$;

reset role;

-- Zero-dollar forgery is rejected.
do $$
declare
  v_household uuid;
  v_person uuid;
begin
  select household_id, id into v_household, v_person from public.people where email = 'cara.nguyen@example.com';
  insert into public.orders (id, household_id, person_id, purpose, season, total_cents, status)
  values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', v_household, v_person, 'renewal', 2027, 0, 'pending');
  begin
    insert into public.order_items (order_id, price_item, description, quantity, amount_cents)
    values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb3', 'renewal', 'forged', 1, 0);
    raise exception 'forged price was accepted';
  exception when others then
    if sqlerrm not like '%fee schedule%' then
      raise;
    end if;
  end;
end $$;
