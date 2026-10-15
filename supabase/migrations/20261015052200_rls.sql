-- Row Level Security for every public table. Helpers stay in private.

create or replace function private.enforce_order_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invited boolean;
  v_waitlist text;
begin
  if new.purpose = 'lap_only' then
    select h.lap_only_invited into v_invited from public.households h where h.id = new.household_id;
    if not coalesce(v_invited, false) and not private.is_admin() and not private.has_board_scope('membership') then
      raise exception 'Lap-swim-only membership is by invitation.';
    end if;
  end if;
  if new.purpose = 'new_member' then
    select w.status into v_waitlist
    from public.waitlist_applications w
    where w.applicant_person_id = new.person_id
    order by w.submitted_at desc
    limit 1;
    if v_waitlist is distinct from 'invited' and not private.is_admin() and not private.has_board_scope('membership') then
      raise exception 'New member checkout opens when the membership chair invites you.';
    end if;
  end if;
  return new;
end;
$$;

create trigger orders_enforce_insert
  before insert on public.orders
  for each row execute function private.enforce_order_insert();

create or replace function private.party_slot_taken(p_slot uuid, p_except uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.party_reservations pr
    where pr.slot_id = p_slot
      and pr.status in ('requested', 'approved')
      and pr.id is distinct from p_except
  );
$$;

create or replace function private.enforce_party()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_type text;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  select h.membership_type into v_type from public.households h where h.id = new.household_id;
  if v_type = 'lap_only' then
    raise exception 'Lap-swim-only memberships cannot reserve parties.';
  end if;
  if not private.has_role('member') and not private.is_admin() and not private.has_board_scope('social') then
    raise exception 'You need an active membership to reserve a party.';
  end if;
  if new.status in ('requested', 'approved') and private.party_slot_taken(new.slot_id, new.id) then
    raise exception 'That party time is already taken.';
  end if;
  return new;
end;
$$;

create trigger party_reservations_enforce
  before insert or update on public.party_reservations
  for each row execute function private.enforce_party();

-- ---------------------------------------------------------------------------
-- Grants, then policies. Revoke first so Supabase default privileges cannot
-- leave a table open.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema private to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;

revoke all on all tables in schema public from anon, authenticated;
grant all on all tables in schema public to service_role;
grant select on all tables in schema public to anon, authenticated;
revoke all on public.stripe_events from anon, authenticated;

grant select on public.roles, public.seasons, public.board_positions, public.price_list,
  public.lanes, public.events, public.posts, public.documents, public.albums, public.photos,
  public.club_settings
to anon;

grant insert on public.contact_messages to anon;

grant select, insert, update, delete on
  public.households, public.people, public.household_admins, public.privacy_settings,
  public.notification_prefs, public.entitlements, public.waiver_templates, public.waiver_signatures,
  public.lap_settings, public.slot_templates, public.pool_blocks, public.lap_slots, public.lap_bookings,
  public.buddy_invites, public.lap_checkins, public.events, public.rsvps, public.volunteer_shifts,
  public.shift_signups, public.deposit_ledger, public.team_registrations, public.party_slots,
  public.party_reservations, public.waitlist_applications, public.orders, public.order_items,
  public.refunds, public.posts, public.email_sends, public.calendar_feeds, public.albums,
  public.photos, public.documents, public.contact_messages, public.club_settings, public.seasons,
  public.roles, public.board_positions, public.price_list, public.lanes
to authenticated;

grant select on public.audit_log, public.gate_code_reveals to authenticated;

grant execute on function
  private.current_season_year(),
  private.current_person_id(),
  private.current_household_id(),
  private.has_role(text, int),
  private.is_admin(),
  private.has_board_scope(text),
  private.is_household_admin(uuid),
  private.season_expires(int),
  private.going_headcount(uuid, uuid),
  private.party_slot_taken(uuid, uuid)
to anon, authenticated, service_role;

grant execute on function
  private.reveal_gate_code(uuid),
  private.set_gate_code(text, date, date),
  private.generate_lap_slots(int, date, date),
  private.lap_slot_board(timestamptz, timestamptz),
  private.lap_slot_buddies(uuid),
  private.directory_list(),
  private.rotate_calendar_token()
to authenticated, service_role;

grant execute on function private.calendar_feed_events(text) to anon, authenticated, service_role;

grant execute on function public.reveal_gate_code(uuid) to authenticated, service_role;
grant execute on function public.set_gate_code(text, date, date) to authenticated, service_role;
grant execute on function public.generate_lap_slots(int, date, date) to authenticated, service_role;
grant execute on function public.lap_slot_board(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function public.lap_slot_buddies(uuid) to authenticated, service_role;
grant execute on function public.directory_list() to authenticated, service_role;
grant execute on function public.rotate_calendar_token() to authenticated, service_role;
grant execute on function public.calendar_feed_events(text) to anon, authenticated, service_role;

revoke all on function public.apply_order_status(uuid, text, int, text, text) from public, anon, authenticated;
grant execute on function public.apply_order_status(uuid, text, int, text, text) to service_role;

do $$
declare
  r record;
begin
  for r in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- Reference data
create policy roles_read on public.roles for select using (true);
create policy roles_write on public.roles for all
  using (private.is_admin()) with check (private.is_admin());

create policy seasons_read on public.seasons for select using (true);
create policy seasons_write on public.seasons for all
  using (private.is_admin() or private.has_board_scope('membership'))
  with check (private.is_admin() or private.has_board_scope('membership'));

create policy board_read on public.board_positions for select using (true);
create policy board_write on public.board_positions for all
  using (private.is_admin()) with check (private.is_admin());

create policy prices_read on public.price_list for select using (true);
create policy prices_write on public.price_list for all
  using (private.is_admin() or private.has_board_scope('treasurer'))
  with check (private.is_admin() or private.has_board_scope('treasurer'));

create policy settings_read on public.club_settings for select using (true);
create policy settings_write on public.club_settings for all
  using (private.is_admin()) with check (private.is_admin());

create policy lanes_read on public.lanes for select using (true);
create policy lanes_write on public.lanes for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

-- Households and people
create policy households_select on public.households for select
  using (
    id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('membership')
    or private.has_board_scope('treasurer')
  );

create policy households_update on public.households for update
  using (
    private.is_household_admin(id)
    or private.is_admin()
    or private.has_board_scope('membership')
  )
  with check (
    private.is_household_admin(id)
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy people_select on public.people for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy people_insert on public.people for insert
  with check (
    user_id is null
    and household_id = private.current_household_id()
    and private.is_household_admin(household_id)
  );

create policy people_update on public.people for update
  using (
    id = private.current_person_id()
    or (household_id = private.current_household_id() and private.is_household_admin(household_id))
    or private.is_admin()
    or private.has_board_scope('membership')
  )
  with check (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy people_delete on public.people for delete
  using (
    id <> private.current_person_id()
    and household_id = private.current_household_id()
    and private.is_household_admin(household_id)
  );

create policy hadmin_select on public.household_admins for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy hadmin_write on public.household_admins for all
  using (
    private.is_household_admin(household_id)
    or private.is_admin()
    or private.has_board_scope('membership')
  )
  with check (
    private.is_household_admin(household_id)
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy privacy_all on public.privacy_settings for all
  using (
    person_id = private.current_person_id()
    or private.is_household_admin((select p.household_id from public.people p where p.id = person_id))
    or private.is_admin()
  )
  with check (
    person_id = private.current_person_id()
    or private.is_household_admin((select p.household_id from public.people p where p.id = person_id))
    or private.is_admin()
  );

create policy prefs_all on public.notification_prefs for all
  using (person_id = private.current_person_id() or private.is_admin())
  with check (person_id = private.current_person_id() or private.is_admin());

create policy entitlements_select on public.entitlements for select
  using (
    person_id = private.current_person_id()
    or household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy entitlements_write on public.entitlements for all
  using (private.is_admin() or private.has_board_scope('membership'))
  with check (private.is_admin() or private.has_board_scope('membership'));

create policy audit_select on public.audit_log for select
  using (private.is_admin() or private.has_board_scope('settings'));

-- Waivers
create policy waiver_tpl_select on public.waiver_templates for select
  using (published_at is not null or private.is_admin() or private.has_board_scope('lap'));

create policy waiver_tpl_write on public.waiver_templates for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

create policy waiver_sig_select on public.waiver_signatures for select
  using (
    person_id = private.current_person_id()
    or guardian_person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy waiver_sig_insert on public.waiver_signatures for insert
  with check (
    person_id = private.current_person_id()
    or guardian_person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy waiver_sig_update on public.waiver_signatures for update
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

-- Lap swim
create policy lap_settings_select on public.lap_settings for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('lap'));

create policy lap_settings_write on public.lap_settings for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

create policy templates_select on public.slot_templates for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('lap'));

create policy templates_write on public.slot_templates for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

create policy blocks_select on public.pool_blocks for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('lap'));

create policy blocks_write on public.pool_blocks for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

create policy slots_select on public.lap_slots for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('lap'));

create policy slots_write on public.lap_slots for all
  using (private.is_admin() or private.has_board_scope('lap'))
  with check (private.is_admin() or private.has_board_scope('lap'));

create policy bookings_select on public.lap_bookings for select
  using (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy bookings_insert on public.lap_bookings for insert
  with check (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy bookings_update on public.lap_bookings for update
  using (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  )
  with check (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy invites_select on public.buddy_invites for select
  using (
    from_person_id = private.current_person_id()
    or to_person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy invites_insert on public.buddy_invites for insert
  with check (from_person_id = private.current_person_id());

create policy invites_update on public.buddy_invites for update
  using (
    from_person_id = private.current_person_id()
    or to_person_id = private.current_person_id()
  );

create policy reveals_select on public.gate_code_reveals for select
  using (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('lap')
  );

create policy checkins_select on public.lap_checkins for select
  using (
    private.is_admin()
    or private.has_board_scope('lap')
    or exists (
      select 1 from public.lap_bookings b
      where b.id = booking_id and b.person_id = private.current_person_id()
    )
  );

create policy checkins_insert on public.lap_checkins for insert
  with check (
    exists (
      select 1 from public.lap_bookings b
      where b.id = booking_id and b.person_id = private.current_person_id() and b.status = 'booked'
    )
  );

-- Events and volunteering
create policy events_select on public.events for select
  using (
    private.is_admin()
    or private.has_board_scope('social')
    or private.has_board_scope('team')
    or (
      published
      and (
        audience_role is null
        or private.has_role(audience_role)
      )
    )
  );

create policy events_write on public.events for all
  using (private.is_admin() or private.has_board_scope('social') or private.has_board_scope('team'))
  with check (private.is_admin() or private.has_board_scope('social') or private.has_board_scope('team'));

create policy rsvps_select on public.rsvps for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  );

create policy rsvps_write on public.rsvps for all
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  )
  with check (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  );

create policy shifts_select on public.volunteer_shifts for select
  using (
    private.is_admin()
    or private.has_board_scope('social')
    or exists (select 1 from public.events e where e.id = event_id)
  );

create policy shifts_write on public.volunteer_shifts for all
  using (private.is_admin() or private.has_board_scope('social') or private.has_board_scope('team'))
  with check (private.is_admin() or private.has_board_scope('social') or private.has_board_scope('team'));

create policy signups_select on public.shift_signups for select
  using (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('social')
    or exists (
      select 1 from public.volunteer_shifts vs
      where vs.id = shift_id and vs.lead_person_id = private.current_person_id()
    )
  );

create policy signups_insert on public.shift_signups for insert
  with check (person_id = private.current_person_id() or private.is_admin() or private.has_board_scope('social'));

create policy signups_update on public.shift_signups for update
  using (
    person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('social')
    or exists (
      select 1 from public.volunteer_shifts vs
      where vs.id = shift_id and vs.lead_person_id = private.current_person_id()
    )
  );

create policy deposits_select on public.deposit_ledger for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('treasurer')
    or private.has_board_scope('social')
  );

create policy deposits_update on public.deposit_ledger for update
  using (private.is_admin() or private.has_board_scope('treasurer'))
  with check (private.is_admin() or private.has_board_scope('treasurer'));

create policy team_select on public.team_registrations for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('team')
  );

create policy team_write on public.team_registrations for all
  using (private.is_admin() or private.has_board_scope('team'))
  with check (private.is_admin() or private.has_board_scope('team'));

create policy party_slots_select on public.party_slots for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('social'));

create policy party_slots_write on public.party_slots for all
  using (private.is_admin() or private.has_board_scope('social'))
  with check (private.is_admin() or private.has_board_scope('social'));

create policy party_res_select on public.party_reservations for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  );

create policy party_res_write on public.party_reservations for all
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  )
  with check (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('social')
  );

-- Money
create policy waitlist_select on public.waitlist_applications for select
  using (
    applicant_person_id = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('membership')
  );

create policy waitlist_insert on public.waitlist_applications for insert
  with check (applicant_person_id = private.current_person_id());

create policy waitlist_update on public.waitlist_applications for update
  using (private.is_admin() or private.has_board_scope('membership'))
  with check (private.is_admin() or private.has_board_scope('membership'));

create policy orders_select on public.orders for select
  using (
    household_id = private.current_household_id()
    or private.is_admin()
    or private.has_board_scope('treasurer')
  );

create policy orders_insert on public.orders for insert
  with check (
    status = 'pending'
    and household_id = private.current_household_id()
    and person_id = private.current_person_id()
    and stripe_payment_intent_id is null
  );

create policy items_select on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (
          o.household_id = private.current_household_id()
          or private.is_admin()
          or private.has_board_scope('treasurer')
        )
    )
  );

create policy items_insert on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and o.household_id = private.current_household_id()
        and o.status = 'pending'
    )
  );

create policy refunds_select on public.refunds for select
  using (
    private.is_admin()
    or private.has_board_scope('treasurer')
    or exists (
      select 1 from public.orders o
      where o.id = order_id and o.household_id = private.current_household_id()
    )
  );

create policy refunds_insert on public.refunds for insert
  with check (private.is_admin() or private.has_board_scope('treasurer'));

-- stripe_events: RLS on, no policies. service_role bypasses.

-- Communication and files
create policy posts_select on public.posts for select
  using (
    private.is_admin()
    or private.has_board_scope('communications')
    or (
      publish_at is not null
      and publish_at <= now()
      and (audience_role is null or private.has_role(audience_role))
    )
  );

create policy posts_write on public.posts for all
  using (private.is_admin() or private.has_board_scope('communications'))
  with check (private.is_admin() or private.has_board_scope('communications'));

create policy email_select on public.email_sends for select
  using (private.is_admin() or private.has_board_scope('communications'));

create policy email_insert on public.email_sends for insert
  with check (private.is_admin() or private.has_board_scope('communications'));

create policy feeds_select on public.calendar_feeds for select
  using (person_id = private.current_person_id() or private.is_admin());

create policy albums_select on public.albums for select
  using (
    visibility = 'public'
    or (visibility = 'members' and private.has_role('member'))
    or private.is_admin()
    or private.has_board_scope('photos')
  );

create policy albums_write on public.albums for all
  using (private.is_admin() or private.has_board_scope('photos'))
  with check (private.is_admin() or private.has_board_scope('photos'));

create policy photos_select on public.photos for select
  using (
    uploaded_by = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('photos')
    or (
      status = 'approved'
      and exists (
        select 1 from public.albums a
        where a.id = album_id
          and (
            (a.visibility = 'public' and public_ok and not has_minors)
            or (a.visibility = 'members' and private.has_role('member'))
          )
      )
    )
  );

create policy photos_insert on public.photos for insert
  with check (
    uploaded_by = private.current_person_id()
    or private.is_admin()
    or private.has_board_scope('photos')
  );

create policy photos_update on public.photos for update
  using (private.is_admin() or private.has_board_scope('photos'))
  with check (private.is_admin() or private.has_board_scope('photos'));

create policy docs_select on public.documents for select
  using (
    visibility = 'public'
    or (visibility = 'members' and private.has_role('member'))
    or (visibility = 'board' and (private.has_role('board') or private.is_admin()))
    or private.is_admin()
    or private.has_board_scope('communications')
  );

create policy docs_write on public.documents for all
  using (private.is_admin() or private.has_board_scope('communications'))
  with check (private.is_admin() or private.has_board_scope('communications'));

create policy contact_insert on public.contact_messages for insert
  with check (char_length(body) between 2 and 5000);

create policy contact_select on public.contact_messages for select
  using (private.is_admin() or private.has_board_scope('communications'));

create policy contact_update on public.contact_messages for update
  using (private.is_admin() or private.has_board_scope('communications'))
  with check (private.is_admin() or private.has_board_scope('communications'));

-- Storage, when this migration runs on Supabase.
do $$
begin
  if exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'storage' and c.relname = 'buckets'
  ) then
    insert into storage.buckets (id, name, public)
    values
      ('photos-public', 'photos-public', true),
      ('photos-members', 'photos-members', false),
      ('waivers', 'waivers', false),
      ('documents', 'documents', false)
    on conflict (id) do nothing;

    execute $pol$
      create policy photos_public_read on storage.objects for select
      to anon, authenticated
      using (bucket_id = 'photos-public')
    $pol$;
    execute $pol$
      create policy photos_members_read on storage.objects for select
      to authenticated
      using (bucket_id = 'photos-members' and private.has_role('member'))
    $pol$;
    execute $pol$
      create policy photos_members_insert on storage.objects for insert
      to authenticated
      with check (
        bucket_id = 'photos-members'
        and private.has_role('member')
        and name like 'pending/%'
      )
    $pol$;
    execute $pol$
      create policy photos_admin_write on storage.objects for all
      to authenticated
      using (
        bucket_id in ('photos-public', 'photos-members')
        and (private.is_admin() or private.has_board_scope('photos'))
      )
      with check (
        bucket_id in ('photos-public', 'photos-members')
        and (private.is_admin() or private.has_board_scope('photos'))
      )
    $pol$;
    execute $pol$
      create policy waivers_read on storage.objects for select
      to authenticated
      using (
        bucket_id = 'waivers'
        and (
          private.is_admin()
          or private.has_board_scope('lap')
          or name like (private.current_person_id()::text || '/%')
        )
      )
    $pol$;
    execute $pol$
      create policy documents_storage_read on storage.objects for select
      to authenticated
      using (bucket_id = 'documents' and private.has_role('member'))
    $pol$;
    execute $pol$
      create policy documents_storage_write on storage.objects for all
      to authenticated
      using (bucket_id = 'documents' and (private.is_admin() or private.has_board_scope('communications')))
      with check (bucket_id = 'documents' and (private.is_admin() or private.has_board_scope('communications')))
    $pol$;
  end if;
end $$;
