create table public.activity_scopes (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  scope_order integer check (scope_order is null or scope_order > 0),
  scope_level text not null
    check (scope_level in ('plot', 'section', 'row', 'location_range', 'tree')),
  section_name text,
  row_number integer check (row_number is null or row_number > 0),
  from_position integer check (from_position is null or from_position > 0),
  to_position integer check (to_position is null or to_position > 0),
  tree_id uuid references public.trees(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (from_position is null and to_position is null)
    or (from_position is not null and to_position is not null and to_position >= from_position)
  ),
  check (
    (scope_level = 'plot'
      and section_name is null
      and row_number is null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'section'
      and section_name is not null
      and row_number is null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'row'
      and row_number is not null
      and from_position is null
      and to_position is null
      and tree_id is null)
    or
    (scope_level = 'location_range'
      and row_number is not null
      and from_position is not null
      and to_position is not null
      and tree_id is null)
    or
    (scope_level = 'tree'
      and tree_id is not null
      and from_position is null
      and to_position is null)
  )
);

create index idx_activity_scopes_activity_id on public.activity_scopes(activity_id);
create index idx_activity_scopes_scope_level_row on public.activity_scopes(scope_level, row_number);

create trigger set_activity_scopes_updated_at
before update on public.activity_scopes
for each row
execute function public.set_updated_at();
