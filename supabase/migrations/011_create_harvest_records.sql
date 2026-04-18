create table public.harvest_records (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  plot_id uuid references public.plots(id) on delete set null,
  variety_id uuid references public.varieties(id) on delete set null,
  tree_id uuid references public.trees(id) on delete set null,
  activity_id uuid references public.activities(id) on delete set null,
  scope_level text not null
    check (scope_level in ('orchard', 'plot', 'variety', 'location_range', 'tree')),
  harvest_date date not null,
  season_year integer not null,
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  from_position integer check (from_position is null or from_position > 0),
  to_position integer check (to_position is null or to_position > 0),
  quantity_value numeric(12,3) not null check (quantity_value > 0),
  quantity_unit text not null check (quantity_unit in ('kg', 't')),
  quantity_kg numeric(12,3) not null check (quantity_kg > 0),
  notes text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (from_position is null and to_position is null)
    or (from_position is not null and to_position is not null and to_position >= from_position)
  ),
  check (
    (scope_level = 'orchard'
      and plot_id is null
      and variety_id is null
      and tree_id is null
      and row_number is null
      and from_position is null
      and to_position is null)
    or
    (scope_level = 'plot'
      and plot_id is not null
      and tree_id is null
      and row_number is null
      and from_position is null
      and to_position is null)
    or
    (scope_level = 'variety'
      and variety_id is not null
      and tree_id is null
      and row_number is null
      and from_position is null
      and to_position is null)
    or
    (scope_level = 'location_range'
      and plot_id is not null
      and tree_id is null
      and row_number is not null
      and from_position is not null
      and to_position is not null)
    or
    (scope_level = 'tree'
      and tree_id is not null
      and row_number is null
      and from_position is null
      and to_position is null)
  )
);

create index idx_harvest_records_orchard_id on public.harvest_records(orchard_id);
create index idx_harvest_records_season_date
  on public.harvest_records(season_year, harvest_date desc);
create index idx_harvest_records_orchard_variety_season
  on public.harvest_records(orchard_id, variety_id, season_year);
create index idx_harvest_records_orchard_plot_season
  on public.harvest_records(orchard_id, plot_id, season_year);

create trigger set_harvest_records_updated_at
before update on public.harvest_records
for each row
execute function public.set_updated_at();
