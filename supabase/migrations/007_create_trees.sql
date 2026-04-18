create table public.trees (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  plot_id uuid not null references public.plots(id) on delete restrict,
  variety_id uuid references public.varieties(id) on delete set null,
  species text not null,
  tree_code text,
  display_name text,
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  position_in_row integer check (position_in_row is null or position_in_row > 0),
  row_label text,
  position_label text,
  planted_at date,
  acquired_at date,
  rootstock text,
  pollinator_info text,
  condition_status text not null default 'good'
    check (condition_status in ('new', 'good', 'warning', 'critical', 'removed')),
  health_status text,
  development_stage text,
  last_harvest_at date,
  notes text,
  location_verified boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (row_number is null and position_in_row is null)
    or (row_number is not null and position_in_row is not null)
  ),
  check (condition_status <> 'removed' or is_active = false)
);

create unique index uq_trees_active_logical_location
  on public.trees(plot_id, row_number, position_in_row)
  where is_active = true
    and row_number is not null
    and position_in_row is not null;

create index idx_trees_orchard_id on public.trees(orchard_id);
create index idx_trees_plot_condition on public.trees(plot_id, condition_status);
create index idx_trees_orchard_variety on public.trees(orchard_id, variety_id);

create trigger set_trees_updated_at
before update on public.trees
for each row
execute function public.set_updated_at();
