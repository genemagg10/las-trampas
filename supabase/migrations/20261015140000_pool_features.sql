-- Pool features: lost & found, snack shack, swim records.
-- Records seeded from the DCSL league database (Acorn Swim), LTST team records page, retrieved 2026-10-15.

create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  found_on date not null default current_date,
  description text not null,
  location text,
  photo_path text,
  claimed boolean not null default false,
  claimed_at timestamptz,
  created_by uuid references public.people (id),
  created_at timestamptz not null default now()
);

create table if not exists public.snack_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Menu',
  name text not null,
  description text,
  price_cents int check (price_cents is null or price_cents >= 0),
  available boolean not null default true,
  source text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.snack_hours (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  hours text not null,
  sort_order int not null default 0
);

create table if not exists public.swim_records (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'team' check (kind in ('team', 'pool', 'best')),
  gender text not null check (gender in ('Girls', 'Boys', 'Mixed')),
  age_group text not null,
  distance text not null,
  event text not null,
  swimmer text not null,
  time_text text not null,
  year int,
  meet text,
  source_url text,
  source_date date,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.lost_found_items enable row level security;
alter table public.snack_items enable row level security;
alter table public.snack_hours enable row level security;
alter table public.swim_records enable row level security;

grant select on public.snack_items, public.snack_hours, public.swim_records to anon;
grant select, insert, update, delete on public.lost_found_items, public.snack_items, public.snack_hours, public.swim_records to authenticated;

create policy lost_found_select on public.lost_found_items for select
  using (private.has_role('member') or private.is_admin() or private.has_board_scope('membership'));
create policy lost_found_write on public.lost_found_items for all
  using (private.is_admin() or private.has_board_scope('membership') or private.has_board_scope('social'))
  with check (private.is_admin() or private.has_board_scope('membership') or private.has_board_scope('social'));

create policy snack_items_select on public.snack_items for select using (true);
create policy snack_items_write on public.snack_items for all
  using (private.is_admin() or private.has_board_scope('social'))
  with check (private.is_admin() or private.has_board_scope('social'));
create policy snack_hours_select on public.snack_hours for select using (true);
create policy snack_hours_write on public.snack_hours for all
  using (private.is_admin() or private.has_board_scope('social'))
  with check (private.is_admin() or private.has_board_scope('social'));

create policy swim_records_select on public.swim_records for select using (true);
create policy swim_records_write on public.swim_records for all
  using (private.is_admin() or private.has_board_scope('team'))
  with check (private.is_admin() or private.has_board_scope('team'));

-- Only priced snack item found in public sources.
insert into public.snack_items (category, name, description, price_cents, source, sort_order)
select 'Seahorse Day Camp', 'Snack Shack Tuesday Meal Deal', 'Optional add-on for Seahorse Day Camp campers (summer 2026).', 900,
  'https://www.ltst.org/seahorse-day-camp-2023', 0
where not exists (select 1 from public.snack_items where name = 'Snack Shack Tuesday Meal Deal');

insert into public.swim_records (kind, gender, age_group, distance, event, swimmer, time_text, year, meet, source_url, source_date, sort_order)
select * from (values
  ('team', 'Girls', '6&U', '25 Y', 'Freestyle', 'Kari Sivesind', '17.20', 1980, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 0),
  ('team', 'Girls', '7-8', '25 Y', 'Freestyle', 'Stella Canoles', '13.91', 2018, '2018CountyMeet', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 1),
  ('team', 'Girls', '9-10', '50 Y', 'Freestyle', 'Stella Canoles', '28.15', 2019, 'CCCounty (08/03/2019)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 2),
  ('team', 'Girls', '11-12', '50 Y', 'Freestyle', 'Stella Canoles', '23.99', 2022, 'RHCC_AT_LTST_06082022 (25.37)&#10FHST_AT_LTST_06222022 (25.32)&#10BATTLE_OF_AGES_2022 (24.65)&#10DCSL_CHAMPIONSHIP_2022 (23.99)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 3),
  ('team', 'Girls', '13-14', '50 Y', 'Freestyle', 'Tara Griffin', '25.35', 1984, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 4),
  ('team', 'Girls', '15-18', '50 Y', 'Freestyle', 'Jillian Randolph', '25.91', 2026, 'HOX_LC_2026', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 5),
  ('team', 'Girls', '15-18', '100 Y', 'Freestyle', 'Rachel Koenigsberg', '54.53', 2018, '2018CountyMeet', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 6),
  ('team', 'Girls', '6&U', '25 Y', 'Breaststroke', 'Moira Heath', '22.92', 1997, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 7),
  ('team', 'Girls', '7-8', '25 Y', 'Breaststroke', 'Jillian Ochs', '18.04', 1995, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 8),
  ('team', 'Girls', '9-10', '50 Y', 'Breaststroke', 'Jillian Ochs', '34.09', 1997, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 9),
  ('team', 'Girls', '11-12', '50 Y', 'Breaststroke', 'Stella Canoles', '33.89', 2022, 'FHST_AT_LTST_06222022', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 10),
  ('team', 'Girls', '13-14', '50 Y', 'Breaststroke', 'Morgan Coolbaugh', '32.46', 2017, 'CountyMeet2017', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 11),
  ('team', 'Girls', '15-18', '50 Y', 'Breaststroke', 'Becky Straw', '1:10.13', 1998, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 12),
  ('team', 'Girls', '6&U', '25 Y', 'Backstroke', 'Kari Sivesind', '21.50', 1980, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 13),
  ('team', 'Girls', '7-8', '25 Y', 'Backstroke', 'Kari Sivesind', '17.53', 1982, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 14),
  ('team', 'Girls', '9-10', '50 Y', 'Backstroke', 'Lydia Osborn', '33.41', 2015, 'LTST@WCST (07/18/2015)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 15),
  ('team', 'Girls', '11-12', '50 Y', 'Backstroke', 'Stella Canoles', '28.59', 2022, 'SPW_AT_LTST_06042022 (29.85)&#10FHST_AT_LTST_06222022 (29.14)&#10DCSL_CHAMPIONSHIP_2022 (28.68)&#10CCCOUNTY_2022 (28.59)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 16),
  ('team', 'Girls', '13-14', '50 Y', 'Backstroke', 'Keelin Wakefield', '30.15', 2026, 'CCCOUNTY_2026', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 17),
  ('team', 'Girls', '15-18', '50 Y', 'Backstroke', 'Jennifer Ericson', '1:02.00', 1983, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 18),
  ('team', 'Girls', '6&U', '25 Y', 'Butterfly', 'Pierce Curtis', '18.04', 1993, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 19),
  ('team', 'Girls', '7-8', '25 Y', 'Butterfly', 'Georgianna Meyer', '15.05', 2025, 'DCSL_CHAMPIONSHIP_2025', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 20),
  ('team', 'Girls', '9-10', '50 Y', 'Butterfly', 'Alaina Lawrence', '30.06', 2021, 'CCCOUNTY_2021', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 21),
  ('team', 'Girls', '11-12', '50 Y', 'Butterfly', 'Stella Canoles', '26.77', 2022, 'LTST_TTRIALS_05152022 (28.10)&#10LTST_AT_WCSC_06012022 (27.49)&#10SPW_AT_LTST_06042022 (27.49)&#10RHCC_AT_LTST_06082022 (27.49)&#10BATTLE_OF_AGES_2022 (26.79)&#10HOX_LC_2022 (26.77)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 22),
  ('team', 'Girls', '13-14', '50 Y', 'Butterfly', 'Alaina Lawrence', '27.18', 2025, 'CCCOUNTY_2025 (27.28)&#10CCCOUNTY_2025 (27.18)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 23),
  ('team', 'Girls', '15-18', '50 Y', 'Butterfly', 'Becky Straw', '1:00.49', 1998, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 24),
  ('team', 'Girls', '6&U', '100 Y', 'Individual Medley', 'Kari Sivesind', '1:47.10', 1980, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 25),
  ('team', 'Girls', '7-8', '100 Y', 'Individual Medley', 'Stella Canoles', '1:19.00', 2018, '2018CountyMeet', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 26),
  ('team', 'Girls', '9-10', '100 Y', 'Individual Medley', 'Jillian Ochs', '1:11.24', 1997, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 27),
  ('team', 'Girls', '11-12', '100 Y', 'Individual Medley', 'Stella Canoles', '1:02.27', 2022, 'LTST_TTRIALS_05152022 (1:07.33)&#10LTST_AT_SVST_05262022 (1:05.62)&#10SPW_AT_LTST_06042022 (1:05.42)&#10LTST_AT_WCST_06112022 (1:04.39)&#10PHA_AT_LTST_06152022 (1:03.22)&#10LTST_AT_SPBR_07132022 (1:02.64)&#10CCCOUNTY_2022 (1:02.27)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 28),
  ('team', 'Girls', '13-14', '100 Y', 'Individual Medley', 'Tara Griffin', '1:04.24', 1984, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 29),
  ('team', 'Girls', '15-18', '100 Y', 'Individual Medley', 'Jillian Randolph', '1:03.30', 2026, 'DCSL_CHAMPIONSHIP_2026', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 30),
  ('team', 'Girls', '6&U', '4×25 Y', 'Medley Relay', 'G.Meyer, C.Pegnim, J.Castelaz, J.Canoles', '1:30.33', 2023, 'WCSC_AT_LTST_07272023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 31),
  ('team', 'Girls', '7-8', '4×25 Y', 'Medley Relay', 'J.Canoles, C.Pegnim, G.Meyer, M.Roberts', '1:06.53', 2025, 'LTST_AT_PHA_06182025 (1:10.80)&#10LTST_AT_SSC_07092025 (1:10.11)&#10CCCOUNTY_2025 (1:06.53)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 32),
  ('team', 'Girls', '9-10', '4×50 Y', 'Medley Relay', 'S.Meyer, K.Wakefield, C.Castelaz, D.Coombe', '2:03.54', 2023, 'WCSC_AT_LTST_07272023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 33),
  ('team', 'Girls', '11-12', '4×50 Y', 'Medley Relay', 'S.Canoles, E.Stimmler, A.Lawrence, L.Brekke', '2:01.89', 2022, 'DCSL_CHAMPIONSHIP_2022 (2:03.68)&#10CCCOUNTY_2022 (2:01.89)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 34),
  ('team', 'Girls', '13-14', '4×50 Y', 'Medley Relay', 'C.Coffee, M.Coolbaugh, E.McGrath, K.Henderson', '1:57.31', 2017, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 35),
  ('team', 'Girls', '15-18', '4×50 Y', 'Medley Relay', 'E.Straw, B.Straw, L.Jenkins-Stark, E.Dodd', '1:56.76', 1999, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 36),
  ('team', 'Girls', '6&U', '4×25 Y', 'Free Relay', 'M.Ericson, A.Cassidy, E.Melkonian, R.Noone', '1:16.99', 2002, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 37),
  ('team', 'Girls', '7-8', '4×25 Y', 'Free Relay', 'G.Meyer, M.Roberts, C.Pegnim, J.Canoles', '1:00.44', 2025, 'CCCOUNTY_2025', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 38),
  ('team', 'Girls', '9-10', '4×50 Y', 'Free Relay', 'S.Heath, L.Winters, M.Eames, J.Ochs', '1:56.71', 1997, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 39),
  ('team', 'Girls', '11-12', '4×50 Y', 'Free Relay', 'L.Brekke, A.Lawrence, E.Stimmler, S.Canoles', '1:48.82', 2022, 'DCSL_CHAMPIONSHIP_2022 (1:50.56)&#10CCCOUNTY_2022 (1:48.82)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 40),
  ('team', 'Girls', '13-14', '4×50 Y', 'Free Relay', 'E.McGrath, C.Coffee, M.Coolbaugh, K.Henderson', '1:46.06', 2017, '(1:46.08)&#10 (1:46.06) (08/11/2017)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 41),
  ('team', 'Girls', '15-18', '4×50 Y', 'Free Relay', 'A.Brekke, A.Lawrence, L.Brekke, N.Lawrence', '1:44.28', 2026, 'DCSL_CHAMPIONSHIP_2026', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=GIRLS&league=dcsl&type=TEAM', date '2026-10-15', 42),
  ('team', 'Boys', '6&U', '25 Y', 'Freestyle', 'Brad Anderson', '16.67', 1989, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 43),
  ('team', 'Boys', '7-8', '25 Y', 'Freestyle', 'Forrest Canoles', '14.24', 2022, 'BATTLE_OF_AGES_2022 (14.55)&#10HOX_LC_2022 (14.54)&#10CCCOUNTY_2022 (14.34)&#10CCCOUNTY_2022 (14.24)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 44),
  ('team', 'Boys', '9-10', '50 Y', 'Freestyle', 'Gunnar Grant', '28.30', 2021, 'CCCOUNTY_2021', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 45),
  ('team', 'Boys', '11-12', '50 Y', 'Freestyle', 'Gunnar Grant', '24.82', 2023, 'CCCOUNTY_2023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 46),
  ('team', 'Boys', '13-14', '50 Y', 'Freestyle', 'Jerome Sivesind', '22.05', 1981, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 47),
  ('team', 'Boys', '15-18', '50 Y', 'Freestyle', 'Gunnar Grant', '21.95', 2026, 'LTST_AT_SPBR_06302026 (22.36)&#10CCCOUNTY_2026 (22.28)&#10CCCOUNTY_2026 (21.95)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 48),
  ('team', 'Boys', '15-18', '100 Y', 'Freestyle', 'Christian Gotterup', '48.87', 2024, 'CCC_AT_LTST_07242024 (49.38)&#10DCSL_CHAMPIONSHIP_2024 (48.87)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 49),
  ('team', 'Boys', '6&U', '25 Y', 'Breaststroke', 'Drew Anderson', '22.02', 1992, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 50),
  ('team', 'Boys', '7-8', '25 Y', 'Breaststroke', 'Brad Anderson', '18.21', 1991, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 51),
  ('team', 'Boys', '9-10', '50 Y', 'Breaststroke', 'Chris Chuck', '36.81', 2002, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 52),
  ('team', 'Boys', '11-12', '50 Y', 'Breaststroke', 'Chris Chuck', '32.98', 2004, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 53),
  ('team', 'Boys', '13-14', '50 Y', 'Breaststroke', 'Giorgio Alessandria', '29.55', 2015, 'LT@County (08/15/2015)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 54),
  ('team', 'Boys', '15-18', '50 Y', 'Breaststroke', 'Christian Gotterup', '1:01.77', 2024, 'DCSL_CHAMPIONSHIP_2024', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 55),
  ('team', 'Boys', '6&U', '25 Y', 'Backstroke', 'Todd Ericson', '21.60', 1970, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 56),
  ('team', 'Boys', '7-8', '25 Y', 'Backstroke', 'Jason Coleman', '16.40', 1979, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 57),
  ('team', 'Boys', '9-10', '50 Y', 'Backstroke', 'Jason Coleman', '33.20', 1981, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 58),
  ('team', 'Boys', '11-12', '50 Y', 'Backstroke', 'Jason Coleman', '28.62', 1982, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 59),
  ('team', 'Boys', '13-14', '50 Y', 'Backstroke', 'Jerome Sivesind', '26.00', 1981, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 60),
  ('team', 'Boys', '15-18', '50 Y', 'Backstroke', 'Jackson Pahnke', '57.91', 2025, 'CCCOUNTY_2025', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 61),
  ('team', 'Boys', '6&U', '25 Y', 'Butterfly', 'Max Flower', '18.88', 2004, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 62),
  ('team', 'Boys', '7-8', '25 Y', 'Butterfly', 'Jason Coleman', '14.60', 1979, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 63),
  ('team', 'Boys', '9-10', '50 Y', 'Butterfly', 'Forrest Canoles', '31.04', 2024, 'CCCOUNTY_2024', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 64),
  ('team', 'Boys', '11-12', '50 Y', 'Butterfly', 'Gunnar Grant', '27.86', 2023, 'CCCOUNTY_2023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 65),
  ('team', 'Boys', '13-14', '50 Y', 'Butterfly', 'Gunnar Grant', '24.78', 2025, 'DCSL_CHAMPIONSHIP_2025', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 66),
  ('team', 'Boys', '15-18', '50 Y', 'Butterfly', 'Gunnar Grant', '55.02', 2026, 'CCCOUNTY_2026', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 67),
  ('team', 'Boys', '6&U', '100 Y', 'Individual Medley', 'Forrest Canoles', '1:45.41', 2020, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 68),
  ('team', 'Boys', '7-8', '100 Y', 'Individual Medley', 'Jason Coleman', '1:19.80', 1979, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 69),
  ('team', 'Boys', '9-10', '100 Y', 'Individual Medley', 'Jason Coleman', '1:11.30', 1981, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 70),
  ('team', 'Boys', '11-12', '100 Y', 'Individual Medley', 'Grant Sivesind', '1:05.16', 2008, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 71),
  ('team', 'Boys', '13-14', '100 Y', 'Individual Medley', 'Luke VandenBerghe', '57.56', 2016, '2016CountyMeet', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 72),
  ('team', 'Boys', '15-18', '100 Y', 'Individual Medley', 'Travis Low', '56.63', 1999, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 73),
  ('team', 'Boys', '6&U', '4×25 Y', 'Medley Relay', 'G.Meyer, C.Pegnim, J.Castelaz, J.Canoles', '1:30.33', 2023, 'WCSC_AT_LTST_07272023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 74),
  ('team', 'Boys', '7-8', '4×25 Y', 'Medley Relay', 'B.Anderson, J.Curtis, P.Dodd, M.Tammen', '1:11.35', 1991, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 75),
  ('team', 'Boys', '9-10', '4×50 Y', 'Medley Relay', 'N.Castelaz, F.Canoles, M.Pegnim, F.Seymour', '2:13.38', 2024, 'DCSL_CHAMPIONSHIP_2024 (2:18.10)&#10CCCOUNTY_2024 (2:13.38)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 76),
  ('team', 'Boys', '11-12', '4×50 Y', 'Medley Relay', 'M.Johnson, A.Schneider, B.Zenoni, A.Eames', '2:01.85', 2001, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 77),
  ('team', 'Boys', '13-14', '4×50 Y', 'Medley Relay', 'M.Johnson, B.Zenoni, A.Eames, D.McBride', '1:48.98', 2003, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 78),
  ('team', 'Boys', '15-18', '4×50 Y', 'Medley Relay', 'B.Enright, T.Malone, T.Low, P.Dodd', '1:45.33', 1999, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 79),
  ('team', 'Boys', '6&U', '4×25 Y', 'Free Relay', 'M.Ericson, A.Cassidy, E.Melkonian, R.Noone', '1:16.99', 2002, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 80),
  ('team', 'Boys', '7-8', '4×25 Y', 'Free Relay', 'B.Zaich, N.Silva, M.Pegnim, F.Seymour', '1:01.47', 2023, 'CCCOUNTY_2023', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 81),
  ('team', 'Boys', '9-10', '4×50 Y', 'Free Relay', 'F.Seymour, N.Castelaz, M.Pegnim, F.Canoles', '1:59.42', 2024, 'DCSL_CHAMPIONSHIP_2024 (2:02.90)&#10CCCOUNTY_2024 (1:59.42)', 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 82),
  ('team', 'Boys', '11-12', '4×50 Y', 'Free Relay', 'B.Zenoni, A.Schneider, M.Johnson, A.Eames', '1:49.23', 2001, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 83),
  ('team', 'Boys', '13-14', '4×50 Y', 'Free Relay', 'R.Noone, E.Brown, J.Hillman, G.Sivesind', '1:35.20', 2010, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 84),
  ('team', 'Boys', '15-18', '4×50 Y', 'Free Relay', 'B.Enright, T.Malone, T.Low, P.Dodd', '1:31.79', 1999, null, 'https://www.acornswim.com/Database/records/recordtable.php?club=LTST&gender=BOYS&league=dcsl&type=TEAM', date '2026-10-15', 85)
) as v(kind, gender, age_group, distance, event, swimmer, time_text, year, meet, source_url, source_date, sort_order)
where not exists (select 1 from public.swim_records where kind = 'team');
