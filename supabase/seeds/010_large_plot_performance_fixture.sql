begin;

do $$
declare
  required_emails text[] := array[
    'jan.owner@orchardlog.local',
    'pawel.worker@orchardlog.local'
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
      'Large plot fixture prerequisite failed. Run pnpm seed:baseline-reset first. Missing auth users: %',
      array_to_string(missing_emails, ', ');
  end if;
end;
$$;

delete from public.activity_materials
where activity_id in (
  select id
  from public.activities
  where orchard_id in (
    select id
    from public.orchards
    where id = '90000000-0000-4000-8000-000000000001'
       or code = 'PERF'
  )
);

delete from public.activity_scopes
where activity_id in (
  select id
  from public.activities
  where orchard_id in (
    select id
    from public.orchards
    where id = '90000000-0000-4000-8000-000000000001'
       or code = 'PERF'
  )
);

delete from public.harvest_records
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.activities
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.trees
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.bulk_tree_import_batches
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.varieties
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.plots
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.orchard_memberships
where orchard_id in (
  select id
  from public.orchards
  where id = '90000000-0000-4000-8000-000000000001'
     or code = 'PERF'
);

delete from public.orchards
where id = '90000000-0000-4000-8000-000000000001'
   or code = 'PERF';

insert into public.orchards (
  id,
  name,
  code,
  description,
  status,
  created_by_profile_id
)
values (
  '90000000-0000-4000-8000-000000000001',
  'Sad Performance Fixture',
  'PERF',
  'Local-only fixture orchard for large plot and tree-scale measurements. Reset with pnpm seed:baseline-reset.',
  'active',
  (select id from public.profiles where email = 'jan.owner@orchardlog.local')
);

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
    '91000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    'owner',
    'active',
    null,
    '2025-12-01T08:00:00Z'
  ),
  (
    '91000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000001',
    (select id from public.profiles where email = 'pawel.worker@orchardlog.local'),
    'worker',
    'active',
    (select id from public.profiles where email = 'jan.owner@orchardlog.local'),
    '2025-12-01T08:05:00Z'
  );

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
    '93000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'Apple',
    'Performance Gala',
    'Fixture variety distributed across large rows.',
    'Use for selector and PVO scale measurements only.',
    'Dessert apple fixture.',
    'September',
    'Fixture data',
    'Local',
    true
  ),
  (
    '93000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000001',
    'Apple',
    'Performance Ligol',
    'Fixture variety distributed across large rows.',
    'Use for selector and PVO scale measurements only.',
    'Storage apple fixture.',
    'October',
    'Fixture data',
    'Local',
    false
  ),
  (
    '93000000-0000-4000-8000-000000000003',
    '90000000-0000-4000-8000-000000000001',
    'Apple',
    'Performance Golden',
    'Fixture variety distributed across large rows.',
    'Use for selector and PVO scale measurements only.',
    'Yellow apple fixture.',
    'September',
    'Fixture data',
    'Local',
    false
  ),
  (
    '93000000-0000-4000-8000-000000000004',
    '90000000-0000-4000-8000-000000000001',
    'Pear',
    'Performance Conference',
    'Fixture variety distributed across mixed rows.',
    'Use for selector and PVO scale measurements only.',
    'Pear fixture.',
    'September',
    'Fixture data',
    'Local',
    false
  ),
  (
    '93000000-0000-4000-8000-000000000005',
    '90000000-0000-4000-8000-000000000001',
    'Plum',
    'Performance President',
    'Fixture variety distributed across mixed rows.',
    'Use for selector and PVO scale measurements only.',
    'Plum fixture.',
    'August',
    'Fixture data',
    'Local',
    false
  ),
  (
    '93000000-0000-4000-8000-000000000006',
    '90000000-0000-4000-8000-000000000001',
    'Cherry',
    'Performance Kordia',
    'Fixture variety distributed across mixed rows.',
    'Use for selector and PVO scale measurements only.',
    'Cherry fixture.',
    'July',
    'Fixture data',
    'Local',
    false
  );

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
  status,
  is_active,
  layout_type,
  row_numbering_scheme,
  tree_numbering_scheme,
  entrance_description,
  layout_notes,
  default_row_count,
  default_trees_per_row
)
values
  (
    '92000000-0000-4000-8000-000000000001',
    '90000000-0000-4000-8000-000000000001',
    'Performance Rows 500',
    'PERF-500',
    'Local-only rows plot with 500 trees for medium-scale measurements.',
    'Performance fixture north block',
    12500,
    'loam',
    'drip',
    'active',
    true,
    'rows',
    'north_to_south',
    'from_row_start',
    'North gate',
    '10 rows x 50 positions. Fixture generated by supabase/seeds/010_large_plot_performance_fixture.sql.',
    10,
    50
  ),
  (
    '92000000-0000-4000-8000-000000000002',
    '90000000-0000-4000-8000-000000000001',
    'Performance Rows 1500',
    'PERF-1500',
    'Local-only rows plot with 1500 trees for large-scale measurements.',
    'Performance fixture east block',
    37500,
    'sandy loam',
    'drip',
    'active',
    true,
    'rows',
    'north_to_south',
    'from_row_start',
    'East service road',
    '30 rows x 50 positions. Fixture generated by supabase/seeds/010_large_plot_performance_fixture.sql.',
    30,
    50
  ),
  (
    '92000000-0000-4000-8000-000000000003',
    '90000000-0000-4000-8000-000000000001',
    'Performance Mixed Partial',
    'PERF-MIX',
    'Local-only mixed plot with partial row coverage and inferred gaps.',
    'Performance fixture mixed block',
    6800,
    'clay loam',
    'micro sprinklers',
    'active',
    true,
    'mixed',
    'custom',
    'custom',
    'Mixed block entrance',
    '6 partially filled rows. Positions 5, 13 and 21 are intentionally empty in each row.',
    6,
    24
  );

with variety_map as (
  select *
  from (
    values
      (1, '93000000-0000-4000-8000-000000000001'::uuid, 'Apple', 'Performance Gala', 'M9'),
      (2, '93000000-0000-4000-8000-000000000002'::uuid, 'Apple', 'Performance Ligol', 'M26'),
      (3, '93000000-0000-4000-8000-000000000003'::uuid, 'Apple', 'Performance Golden', 'M9'),
      (4, '93000000-0000-4000-8000-000000000004'::uuid, 'Pear', 'Performance Conference', 'Quince A'),
      (5, '93000000-0000-4000-8000-000000000005'::uuid, 'Plum', 'Performance President', 'Alycza'),
      (6, '93000000-0000-4000-8000-000000000006'::uuid, 'Cherry', 'Performance Kordia', 'Colt')
  ) as varieties(variety_index, variety_id, species, variety_name, rootstock)
),
fixture_positions as (
  select
    '92000000-0000-4000-8000-000000000001'::uuid as plot_id,
    'PERF-500' as plot_code,
    'A' as section_name,
    row_number,
    position_in_row,
    ((row_number - 1) * 50 + position_in_row) as tree_number
  from generate_series(1, 10) as rows(row_number)
  cross join generate_series(1, 50) as positions(position_in_row)

  union all

  select
    '92000000-0000-4000-8000-000000000002'::uuid as plot_id,
    'PERF-1500' as plot_code,
    case
      when row_number <= 10 then 'A'
      when row_number <= 20 then 'B'
      else 'C'
    end as section_name,
    row_number,
    position_in_row,
    1000 + ((row_number - 1) * 50 + position_in_row) as tree_number
  from generate_series(1, 30) as rows(row_number)
  cross join generate_series(1, 50) as positions(position_in_row)

  union all

  select
    '92000000-0000-4000-8000-000000000003'::uuid as plot_id,
    'PERF-MIX' as plot_code,
    case
      when row_number <= 3 then 'North'
      else 'South'
    end as section_name,
    row_number,
    position_in_row,
    3000 + ((row_number - 1) * 24 + position_in_row) as tree_number
  from generate_series(1, 6) as rows(row_number)
  cross join generate_series(1, 24) as positions(position_in_row)
  where position_in_row not in (5, 13, 21)
),
fixture_trees as (
  select
    ('94000000-0000-4000-8000-' || lpad(fp.tree_number::text, 12, '0'))::uuid as id,
    '90000000-0000-4000-8000-000000000001'::uuid as orchard_id,
    fp.plot_id,
    vm.variety_id,
    vm.species,
    fp.plot_code || '-R' || lpad(fp.row_number::text, 2, '0') || '-P' || lpad(fp.position_in_row::text, 3, '0') as tree_code,
    vm.variety_name || ' R' || fp.row_number::text || '/P' || fp.position_in_row::text as display_name,
    fp.section_name,
    fp.row_number,
    fp.position_in_row,
    null::text as row_label,
    null::text as position_label,
    date '2022-03-20' + ((fp.row_number % 5) * interval '1 day') as planted_at,
    date '2022-03-20' + ((fp.row_number % 5) * interval '1 day') as acquired_at,
    vm.rootstock,
    'Performance fixture pollinator group ' || (((fp.row_number + fp.position_in_row - 2) % 6) + 1)::text as pollinator_info,
    case
      when fp.tree_number in (17, 1177, 3051) then 'critical'
      when fp.position_in_row in (11, 29, 47) and fp.row_number % 5 = 0 then 'warning'
      when fp.row_number = 1 and fp.position_in_row <= 2 then 'new'
      else 'good'
    end as condition_status,
    case
      when fp.tree_number in (17, 1177, 3051) then 'Critical fixture tree for scale warnings'
      when fp.position_in_row in (11, 29, 47) and fp.row_number % 5 = 0 then 'Warning fixture tree for filter measurements'
      else 'Healthy fixture tree'
    end as health_status,
    'fruiting' as development_stage,
    date '2025-09-15' + ((fp.row_number % 21) * interval '1 day') as last_harvest_at,
    'Local-only large plot performance fixture tree. Reset with pnpm seed:baseline-reset.' as notes,
    not (
      (fp.row_number % 6 = 0 and fp.position_in_row in (7, 19))
      or fp.tree_number in (17, 1177, 3051)
    ) as location_verified,
    true as is_active
  from fixture_positions fp
  join variety_map vm
    on vm.variety_index = (((fp.row_number + fp.position_in_row - 2) % 6) + 1)
)
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
select
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
  planted_at::date,
  acquired_at::date,
  rootstock,
  pollinator_info,
  condition_status,
  health_status,
  development_stage,
  last_harvest_at::date,
  notes,
  location_verified,
  is_active
from fixture_trees;

commit;
