begin;

do $$
declare
  required_emails text[] := array[
    'admin@orchardlog.local',
    'jan.owner@orchardlog.local',
    'maria.owner@orchardlog.local',
    'pawel.worker@orchardlog.local',
    'ewa.worker@orchardlog.local',
    'outsider@orchardlog.local'
  ];
  missing_emails text[];
begin
  select array_agg(required_email order by required_email)
  into missing_emails
  from unnest(required_emails) as required_email
  where not exists (
    select 1
    from auth.users u
    where lower(u.email) = lower(required_email)
  );

  if missing_emails is not null then
    raise exception
      'Seed prerequisite failed. Create these auth users before running the seed: %',
      array_to_string(missing_emails, ', ');
  end if;
end;
$$;

alter table public.profiles
disable trigger guard_profile_self_service_update_before_write;

insert into public.profiles (
  id,
  email,
  display_name,
  system_role,
  locale,
  timezone,
  orchard_onboarding_dismissed_at
)
select
  u.id,
  lower(u.email),
  case lower(u.email)
    when 'admin@orchardlog.local' then 'Anna Admin'
    when 'jan.owner@orchardlog.local' then 'Jan Sadownik'
    when 'maria.owner@orchardlog.local' then 'Maria Sadowniczka'
    when 'pawel.worker@orchardlog.local' then 'Pawel Pracownik'
    when 'ewa.worker@orchardlog.local' then 'Ewa Pracowniczka'
    when 'outsider@orchardlog.local' then 'Karolina Outsider'
  end,
  case
    when lower(u.email) = 'admin@orchardlog.local' then 'super_admin'
    else 'user'
  end,
  'pl',
  'Europe/Warsaw',
  case
    when lower(u.email) = 'outsider@orchardlog.local' then null
    else now()
  end
from auth.users u
where lower(u.email) in (
  'admin@orchardlog.local',
  'jan.owner@orchardlog.local',
  'maria.owner@orchardlog.local',
  'pawel.worker@orchardlog.local',
  'ewa.worker@orchardlog.local',
  'outsider@orchardlog.local'
)
on conflict (id) do update
set
  email = excluded.email,
  display_name = excluded.display_name,
  system_role = excluded.system_role,
  locale = excluded.locale,
  timezone = excluded.timezone,
  orchard_onboarding_dismissed_at = excluded.orchard_onboarding_dismissed_at;

alter table public.profiles
enable trigger guard_profile_self_service_update_before_write;

insert into public.orchards (
  id,
  name,
  code,
  description,
  status,
  created_by_profile_id
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'Sad Glowny',
    'MAIN',
    'Glowny orchard referencyjny do testow codziennej pracy.',
    'active',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local')
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Sad Poludniowy',
    'SOUTH',
    'Drugi orchard do testow izolacji danych i cross-membership.',
    'active',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local')
  )
on conflict (id) do update
set
  name = excluded.name,
  code = excluded.code,
  description = excluded.description,
  status = excluded.status,
  created_by_profile_id = excluded.created_by_profile_id;

insert into public.orchard_memberships (
  id,
  orchard_id,
  profile_id,
  role,
  status,
  invited_by_profile_id,
  joined_at
)
values
  (
    '11000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    'owner',
    'active',
    null,
    '2026-01-10T08:00:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    'worker',
    'active',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    '2026-01-12T09:30:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    (select id from public.profiles where email = 'ewa.worker@orchardlog.local'),
    'worker',
    'revoked',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    '2026-01-15T11:00:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    'owner',
    'active',
    null,
    '2026-01-11T08:30:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    (select id from public.profiles where email = 'ewa.worker@orchardlog.local'),
    'worker',
    'active',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    '2026-01-16T07:45:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    'worker',
    'active',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    '2026-01-18T10:15:00Z'
  ),
  (
    '11000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000002',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    'worker',
    'invited',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    null
  )
on conflict (orchard_id, profile_id) do update
set
  role = excluded.role,
  status = excluded.status,
  invited_by_profile_id = excluded.invited_by_profile_id,
  joined_at = excluded.joined_at;

insert into public.plots (
  id,
  orchard_id,
  name,
  code,
  description,
  location_name,
  area_m2,
  soil_type,
  irrigation_type,
  layout_type,
  row_numbering_scheme,
  tree_numbering_scheme,
  entrance_description,
  layout_notes,
  default_row_count,
  default_trees_per_row,
  status,
  is_active
)
values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Kwatera Polnocna',
    'MAIN-N',
    'Glowny blok z dominujacymi odmianami jabloni.',
    'Polnocny skraj orchard',
    4200.00,
    'loamy',
    'drip',
    'rows',
    'left_to_right_from_entrance',
    'from_row_start',
    'Wjazd od strony zachodniej',
    'Glowne rzedy numerowane od lewej do prawej patrzac od bramy.',
    8,
    180,
    'active',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Kwatera Poludniowa',
    'MAIN-S',
    'Dzialka z mniejsza liczba drzew i odmiana gruszy.',
    'Poludniowy pas orchard',
    2600.00,
    'sandy_loam',
    'drip',
    'mixed',
    'custom',
    null,
    'Serwisowy wjazd od strony poludniowej',
    'Czesc drzew stoi w pelnych rzedach, a czesc przy bocznej alejce.',
    5,
    120,
    'active',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    'Gorny Taras',
    'SOUTH-U',
    'Taras z odmiana Idared.',
    'Wyzej polozona czesc orchard',
    3100.00,
    'loamy',
    'sprinkler',
    'rows',
    'north_to_south',
    'from_row_end',
    'Wejscie od gornego tarasu',
    'Numeracja rzedow schodzi z gory na dol tarasu.',
    6,
    140,
    'active',
    true
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'Dolny Taras',
    'SOUTH-L',
    'Nizsza czesc orchard z pojedynczymi drzewami i plum.',
    'Dolna czesc orchard',
    1800.00,
    'clay_loam',
    'none',
    'irregular',
    null,
    null,
    'Podejscie od dolnej sciezki',
    'Pojedyncze drzewa i nieregularne nasadzenia przy skarpie.',
    null,
    null,
    'active',
    true
  )
on conflict (id) do update
set
  orchard_id = excluded.orchard_id,
  name = excluded.name,
  code = excluded.code,
  description = excluded.description,
  location_name = excluded.location_name,
  area_m2 = excluded.area_m2,
  soil_type = excluded.soil_type,
  irrigation_type = excluded.irrigation_type,
  layout_type = excluded.layout_type,
  row_numbering_scheme = excluded.row_numbering_scheme,
  tree_numbering_scheme = excluded.tree_numbering_scheme,
  entrance_description = excluded.entrance_description,
  layout_notes = excluded.layout_notes,
  default_row_count = excluded.default_row_count,
  default_trees_per_row = excluded.default_trees_per_row,
  status = excluded.status,
  is_active = excluded.is_active;

insert into public.varieties (
  id,
  orchard_id,
  species,
  name,
  description,
  care_notes,
  characteristics,
  ripening_period,
  resistance_notes,
  origin_country,
  is_favorite
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'Apple',
    'Ligol',
    'Popularna odmiana jesienna.',
    'Regularne ciecie zimowe.',
    'Duzy czerwony owoc.',
    'September',
    'Moderate resistance',
    'Poland',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'Apple',
    'Szampion',
    'Odmiana deserowa do testow zbioru w tonach.',
    'Kontrola przerzedzania zawiazkow.',
    'Slodki smak.',
    'September',
    'Average resistance',
    'Czech Republic',
    false
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'Pear',
    'Conference',
    'Klasyczna odmiana gruszy.',
    'Wymaga czujnosci przy przymrozkach.',
    'Wydluzony owoc.',
    'Late September',
    'Sensitive to frost',
    'United Kingdom',
    false
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    'Apple',
    'Idared',
    'Odmiana dla drugiego orchard.',
    'Dobrze reaguje na letnie ciecie.',
    'Stabilny plon.',
    'October',
    'Good storage performance',
    'United States',
    true
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000002',
    'Plum',
    'President',
    'Pojedyncza odmiana sliwy na dolnym tarasie.',
    'Kontrola zdrowotnosci po deszczach.',
    'Pozny zbior.',
    'September',
    'Moderate resistance',
    'United Kingdom',
    false
  )
on conflict (id) do update
set
  orchard_id = excluded.orchard_id,
  species = excluded.species,
  name = excluded.name,
  description = excluded.description,
  care_notes = excluded.care_notes,
  characteristics = excluded.characteristics,
  ripening_period = excluded.ripening_period,
  resistance_notes = excluded.resistance_notes,
  origin_country = excluded.origin_country,
  is_favorite = excluded.is_favorite;

insert into public.trees (
  id,
  orchard_id,
  plot_id,
  variety_id,
  species,
  tree_code,
  display_name,
  section_name,
  row_number,
  position_in_row,
  row_label,
  position_label,
  planted_at,
  acquired_at,
  rootstock,
  pollinator_info,
  condition_status,
  health_status,
  development_stage,
  last_harvest_at,
  notes,
  location_verified,
  is_active
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Apple',
    'MAIN-N-R1-P1',
    'Ligol R1/P1',
    'A',
    1,
    1,
    null,
    null,
    '2021-03-15',
    '2021-03-15',
    'M26',
    'Row pollinator group A',
    'good',
    'Healthy canopy',
    'fruiting',
    '2025-09-18',
    'Reference tree for pruning and harvest tests.',
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Apple',
    'MAIN-N-R1-P2',
    'Ligol R1/P2',
    'A',
    1,
    2,
    null,
    null,
    '2021-03-15',
    '2021-03-15',
    'M26',
    'Row pollinator group A',
    'good',
    'Healthy canopy',
    'fruiting',
    '2025-09-18',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    'Apple',
    'MAIN-N-R1-P3',
    'Ligol R1/P3',
    'A',
    1,
    3,
    null,
    null,
    '2021-03-15',
    '2021-03-15',
    'M26',
    'Row pollinator group A',
    'warning',
    'Minor bark damage observed',
    'fruiting',
    '2025-09-18',
    'Use as a warning-state example in the UI.',
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'Apple',
    'MAIN-N-R2-P1',
    'Szampion R2/P1',
    'A',
    2,
    1,
    null,
    null,
    '2020-03-10',
    '2020-03-10',
    'M9',
    'Shared pollinator group B',
    'good',
    'Healthy',
    'fruiting',
    '2025-09-20',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    'Apple',
    'MAIN-N-R2-P2',
    'Szampion R2/P2',
    'A',
    2,
    2,
    null,
    null,
    '2020-03-10',
    '2020-03-10',
    'M9',
    'Shared pollinator group B',
    'good',
    'Healthy',
    'fruiting',
    '2025-09-20',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    'Apple',
    'MAIN-N-YB-1',
    'Young Apple Block',
    'Young Block',
    null,
    null,
    'YB-1',
    'Tree-A',
    '2025-04-01',
    '2025-04-01',
    'M9',
    null,
    'new',
    'Recently planted',
    'young',
    null,
    'Example tree without a linked variety.',
    false,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000007',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    'Pear',
    'MAIN-S-R1-P1',
    'Conference R1/P1',
    'B',
    1,
    1,
    null,
    null,
    '2019-03-20',
    '2019-03-20',
    'Quince A',
    null,
    'good',
    'Healthy',
    'fruiting',
    '2025-09-28',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000008',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    'Apple',
    'MAIN-S-R1-P2',
    'Removed Ligol example',
    'B',
    1,
    2,
    null,
    null,
    '2019-03-20',
    '2019-03-20',
    'M26',
    null,
    'removed',
    'Removed after storm damage',
    'historic',
    '2024-09-10',
    'Reference record for logical removal.',
    true,
    false
  ),
  (
    '40000000-0000-4000-8000-000000000009',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000004',
    'Apple',
    'SOUTH-U-R1-P1',
    'Idared R1/P1',
    'Upper',
    1,
    1,
    null,
    null,
    '2020-03-12',
    '2020-03-12',
    'M9',
    null,
    'good',
    'Healthy',
    'fruiting',
    '2025-10-03',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000010',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000004',
    'Apple',
    'SOUTH-U-R1-P2',
    'Idared R1/P2',
    'Upper',
    1,
    2,
    null,
    null,
    '2020-03-12',
    '2020-03-12',
    'M9',
    null,
    'good',
    'Healthy',
    'fruiting',
    '2025-10-03',
    null,
    true,
    true
  ),
  (
    '40000000-0000-4000-8000-000000000011',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000005',
    'Plum',
    'SOUTH-L-B-1',
    'President Block B',
    'B',
    null,
    null,
    'B-1',
    'Tree-1',
    '2018-03-05',
    '2018-03-05',
    'Ałycza',
    null,
    'critical',
    'Requires detailed health inspection',
    'fruiting',
    '2025-09-26',
    'Used for planned inspection scenario.',
    false,
    true
  )
on conflict (id) do update
set
  orchard_id = excluded.orchard_id,
  plot_id = excluded.plot_id,
  variety_id = excluded.variety_id,
  species = excluded.species,
  tree_code = excluded.tree_code,
  display_name = excluded.display_name,
  section_name = excluded.section_name,
  row_number = excluded.row_number,
  position_in_row = excluded.position_in_row,
  row_label = excluded.row_label,
  position_label = excluded.position_label,
  planted_at = excluded.planted_at,
  acquired_at = excluded.acquired_at,
  rootstock = excluded.rootstock,
  pollinator_info = excluded.pollinator_info,
  condition_status = excluded.condition_status,
  health_status = excluded.health_status,
  development_stage = excluded.development_stage,
  last_harvest_at = excluded.last_harvest_at,
  notes = excluded.notes,
  location_verified = excluded.location_verified,
  is_active = excluded.is_active;

insert into public.activities (
  id,
  orchard_id,
  plot_id,
  tree_id,
  activity_type,
  activity_subtype,
  activity_date,
  title,
  description,
  status,
  work_duration_minutes,
  cost_amount,
  weather_notes,
  result_notes,
  performed_by_profile_id,
  performed_by,
  created_by_profile_id,
  season_phase
)
values
  (
    '50000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    'pruning',
    'winter_pruning',
    '2026-02-15',
    'Winter pruning row 1',
    'Pruning performed on the first Ligol row.',
    'done',
    95,
    0.00,
    'Cold but dry weather.',
    'Completed without issues.',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    'spraying',
    null,
    '2026-04-10',
    'Spring copper spray',
    'Preventive spring spraying across two row ranges.',
    'done',
    70,
    185.00,
    'Dry morning, wind below 2 m/s.',
    'Coverage completed on both target rows.',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    null
  ),
  (
    '50000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    null,
    'mowing',
    null,
    '2026-05-02',
    'Mowing whole south plot',
    'Grass mowing before the next orchard visit.',
    'done',
    45,
    40.00,
    'Warm and dry.',
    'Whole plot completed.',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null
  ),
  (
    '50000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    null,
    'pruning',
    'summer_pruning',
    '2026-07-20',
    'Summer pruning selected Idared trees',
    'Targeted summer pruning on selected trees.',
    'done',
    60,
    0.00,
    'Hot afternoon.',
    'Two trees corrected.',
    (select id from public.profiles where email = 'ewa.worker@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'ewa.worker@orchardlog.local'),
    null
  ),
  (
    '50000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    null,
    'harvest',
    null,
    '2026-09-15',
    'Ligol harvest row 1',
    'First Ligol harvest pass on row 1.',
    'done',
    120,
    0.00,
    'Dry late-summer weather.',
    'Good fruit quality observed.',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    null
  ),
  (
    '50000000-0000-4000-8000-000000000006',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000011',
    'inspection',
    null,
    '2026-08-05',
    'Inspect plum tree health',
    'Planned inspection after disease warning.',
    'planned',
    30,
    0.00,
    null,
    null,
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    null,
    (select id from public.profiles where email = 'maria.owner@orchardlog.local'),
    null
  )
on conflict (id) do update
set
  orchard_id = excluded.orchard_id,
  plot_id = excluded.plot_id,
  tree_id = excluded.tree_id,
  activity_type = excluded.activity_type,
  activity_subtype = excluded.activity_subtype,
  activity_date = excluded.activity_date,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  work_duration_minutes = excluded.work_duration_minutes,
  cost_amount = excluded.cost_amount,
  weather_notes = excluded.weather_notes,
  result_notes = excluded.result_notes,
  performed_by_profile_id = excluded.performed_by_profile_id,
  performed_by = excluded.performed_by,
  created_by_profile_id = excluded.created_by_profile_id,
  season_phase = excluded.season_phase;

insert into public.activity_scopes (
  id,
  activity_id,
  scope_order,
  scope_level,
  section_name,
  row_number,
  from_position,
  to_position,
  tree_id,
  notes
)
values
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000001',
    1,
    'location_range',
    'A',
    1,
    1,
    3,
    null,
    'Full first row of Ligol trees.'
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    1,
    'location_range',
    'A',
    1,
    1,
    3,
    null,
    'Ligol row coverage.'
  ),
  (
    '51000000-0000-4000-8000-000000000003',
    '50000000-0000-4000-8000-000000000002',
    2,
    'location_range',
    'A',
    2,
    1,
    2,
    null,
    'Szampion row coverage.'
  ),
  (
    '51000000-0000-4000-8000-000000000004',
    '50000000-0000-4000-8000-000000000003',
    1,
    'plot',
    null,
    null,
    null,
    null,
    null,
    'Whole plot mowing.'
  ),
  (
    '51000000-0000-4000-8000-000000000005',
    '50000000-0000-4000-8000-000000000004',
    1,
    'tree',
    'Upper',
    null,
    null,
    null,
    '40000000-0000-4000-8000-000000000009',
    'First target tree.'
  ),
  (
    '51000000-0000-4000-8000-000000000006',
    '50000000-0000-4000-8000-000000000004',
    2,
    'tree',
    'Upper',
    null,
    null,
    null,
    '40000000-0000-4000-8000-000000000010',
    'Second target tree.'
  ),
  (
    '51000000-0000-4000-8000-000000000007',
    '50000000-0000-4000-8000-000000000005',
    1,
    'location_range',
    'A',
    1,
    1,
    3,
    null,
    'Ligol harvest range.'
  ),
  (
    '51000000-0000-4000-8000-000000000008',
    '50000000-0000-4000-8000-000000000006',
    1,
    'tree',
    'B',
    null,
    null,
    null,
    '40000000-0000-4000-8000-000000000011',
    'Planned health inspection on the plum tree.'
  )
on conflict (id) do update
set
  activity_id = excluded.activity_id,
  scope_order = excluded.scope_order,
  scope_level = excluded.scope_level,
  section_name = excluded.section_name,
  row_number = excluded.row_number,
  from_position = excluded.from_position,
  to_position = excluded.to_position,
  tree_id = excluded.tree_id,
  notes = excluded.notes;

insert into public.activity_materials (
  id,
  activity_id,
  name,
  category,
  quantity,
  unit,
  notes
)
values
  (
    '52000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'Miedzian 50 WP',
    'plant_protection',
    2.500,
    'kg',
    'Copper-based spray used for spring protection.'
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    'Water',
    'dilution',
    400.000,
    'l',
    'Spray solution volume.'
  )
on conflict (id) do update
set
  activity_id = excluded.activity_id,
  name = excluded.name,
  category = excluded.category,
  quantity = excluded.quantity,
  unit = excluded.unit,
  notes = excluded.notes;

insert into public.harvest_records (
  id,
  orchard_id,
  plot_id,
  variety_id,
  tree_id,
  activity_id,
  scope_level,
  harvest_date,
  section_name,
  row_number,
  from_position,
  to_position,
  quantity_value,
  quantity_unit,
  notes,
  created_by_profile_id
)
values
  (
    '53000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    null,
    '50000000-0000-4000-8000-000000000005',
    'location_range',
    '2026-09-15',
    'A',
    1,
    1,
    3,
    200.000,
    'kg',
    'Ligol harvest from row 1.',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local')
  ),
  (
    '53000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000002',
    null,
    null,
    'plot',
    '2026-09-20',
    null,
    null,
    null,
    null,
    1.200,
    't',
    'Szampion plot-level harvest entered in tonnes.',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local')
  ),
  (
    '53000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000002',
    null,
    null,
    null,
    null,
    'orchard',
    '2026-09-25',
    null,
    null,
    null,
    null,
    350.000,
    'kg',
    'Mixed orchard-level summary without variety.',
    (select id from public.profiles where email = 'maria.owner@orchardlog.local')
  ),
  (
    '53000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000004',
    '40000000-0000-4000-8000-000000000009',
    null,
    'tree',
    '2026-09-18',
    'Upper',
    null,
    null,
    null,
    25.000,
    'kg',
    'Tree-level Idared reference harvest.',
    (select id from public.profiles where email = 'ewa.worker@orchardlog.local')
  ),
  (
    '53000000-0000-4000-8000-000000000005',
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000003',
    null,
    null,
    'variety',
    '2026-09-28',
    null,
    null,
    null,
    null,
    55.000,
    'kg',
    'Conference harvest used for by-variety reporting.',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local')
  )
on conflict (id) do update
set
  orchard_id = excluded.orchard_id,
  plot_id = excluded.plot_id,
  variety_id = excluded.variety_id,
  tree_id = excluded.tree_id,
  activity_id = excluded.activity_id,
  scope_level = excluded.scope_level,
  harvest_date = excluded.harvest_date,
  section_name = excluded.section_name,
  row_number = excluded.row_number,
  from_position = excluded.from_position,
  to_position = excluded.to_position,
  quantity_value = excluded.quantity_value,
  quantity_unit = excluded.quantity_unit,
  notes = excluded.notes,
  created_by_profile_id = excluded.created_by_profile_id;

commit;
