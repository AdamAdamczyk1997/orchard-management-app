create table public.inventory_imports (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  plot_id uuid not null references public.plots(id) on delete restrict,
  created_by_profile_id uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  confirmed_by_profile_id uuid references public.profiles(id) on delete restrict,
  xlsx_contract_version text not null,
  canonical_contract_version text not null,
  import_mode text not null default 'incremental_create'
    check (import_mode in ('incremental_create')),
  conflict_strategy text not null default 'reject'
    check (conflict_strategy in ('reject')),
  status text not null default 'draft'
    check (
      status in (
        'draft',
        'parsed',
        'validated',
        'awaiting_variety_resolution',
        'ready_for_owner_confirm',
        'confirming',
        'confirmed',
        'failed',
        'cancelled',
        'expired'
      )
    ),
  file_name text,
  file_size_bytes integer check (
    file_size_bytes is null or file_size_bytes > 0
  ),
  file_hash text not null check (file_hash ~ '^[a-f0-9]{64}$'),
  normalized_hash text check (
    normalized_hash is null or normalized_hash ~ '^[a-f0-9]{64}$'
  ),
  idempotency_key text,
  confirm_version integer not null default 1 check (confirm_version > 0),
  confirm_token_hash text,
  summary_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(summary_json) = 'object'),
  diagnostics_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(diagnostics_json) = 'array'),
  canonical_payload_json jsonb check (
    canonical_payload_json is null
    or jsonb_typeof(canonical_payload_json) = 'object'
  ),
  created_trees_count integer not null default 0
    check (created_trees_count >= 0),
  validated_at timestamptz,
  confirmed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'confirmed' and confirmed_at is not null)
    or (status <> 'confirmed')
  )
);

create index idx_inventory_imports_orchard_created_at
  on public.inventory_imports(orchard_id, created_at desc);

create index idx_inventory_imports_plot_status
  on public.inventory_imports(plot_id, status, created_at desc);

create index idx_inventory_imports_created_by_profile
  on public.inventory_imports(created_by_profile_id, created_at desc);

create index idx_inventory_imports_orchard_file_hash
  on public.inventory_imports(orchard_id, file_hash, created_at desc);

create unique index uq_inventory_imports_orchard_idempotency_key
  on public.inventory_imports(orchard_id, idempotency_key)
  where idempotency_key is not null;

create trigger set_inventory_imports_updated_at
before update on public.inventory_imports
for each row
execute function public.set_updated_at();

create table public.inventory_import_source_rows (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.inventory_imports(id) on delete cascade,
  row_kind text not null
    check (row_kind in ('segment', 'exception', 'metadata', 'dictionary')),
  sheet_name text not null,
  source_row_number integer not null check (source_row_number > 0),
  source_row_key text,
  raw_values_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_values_json) = 'object'),
  normalized_values_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(normalized_values_json) = 'object'),
  diagnostics_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(diagnostics_json) = 'array'),
  created_at timestamptz not null default now(),
  unique (import_id, sheet_name, source_row_number)
);

create index idx_inventory_import_source_rows_import_kind
  on public.inventory_import_source_rows(import_id, row_kind);

create table public.inventory_import_variety_candidates (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.inventory_imports(id) on delete cascade,
  candidate_key text not null,
  species text not null,
  raw_name text,
  normalized_name text,
  source_status text not null
    check (source_status in ('known', 'unknown', 'uncertain', 'new_candidate')),
  resolution_status text not null default 'unresolved'
    check (
      resolution_status in (
        'unresolved',
        'suggested',
        'resolved',
        'accepted_unknown',
        'rejected'
      )
    ),
  resolution_action text
    check (
      resolution_action is null
      or resolution_action in (
        'use_existing',
        'create_new',
        'keep_unknown',
        'reject'
      )
    ),
  suggested_variety_id uuid references public.varieties(id) on delete set null,
  resolved_variety_id uuid references public.varieties(id) on delete set null,
  resolved_by_profile_id uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  positions_count integer not null default 0 check (positions_count >= 0),
  source_row_ids uuid[] not null default array[]::uuid[],
  diagnostics_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(diagnostics_json) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, candidate_key)
);

create index idx_inventory_import_variety_candidates_import_status
  on public.inventory_import_variety_candidates(import_id, resolution_status);

create index idx_inventory_import_variety_candidates_suggested_variety
  on public.inventory_import_variety_candidates(suggested_variety_id)
  where suggested_variety_id is not null;

create index idx_inventory_import_variety_candidates_resolved_variety
  on public.inventory_import_variety_candidates(resolved_variety_id)
  where resolved_variety_id is not null;

create trigger set_inventory_import_variety_candidates_updated_at
before update on public.inventory_import_variety_candidates
for each row
execute function public.set_updated_at();

create table public.inventory_import_positions (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.inventory_imports(id) on delete cascade,
  source_row_id uuid references public.inventory_import_source_rows(id)
    on delete set null,
  variety_candidate_id uuid references public.inventory_import_variety_candidates(id)
    on delete set null,
  plot_id uuid not null references public.plots(id) on delete restrict,
  variety_id uuid references public.varieties(id) on delete set null,
  existing_tree_id uuid references public.trees(id) on delete set null,
  section_name text,
  row_number integer not null check (row_number > 0),
  position_in_row integer not null check (position_in_row > 0),
  tree_code text,
  display_name text,
  species text not null,
  planned_action text not null default 'create_tree'
    check (
      planned_action in (
        'create_tree',
        'missing_tree',
        'blocked_conflict',
        'notes_only'
      )
    ),
  condition_status text
    check (
      condition_status is null
      or condition_status in ('new', 'good', 'warning', 'critical', 'removed')
    ),
  rootstock text,
  planted_at date,
  notes text,
  diagnostics_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(diagnostics_json) = 'array'),
  defaults_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(defaults_json) = 'object'),
  overrides_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(overrides_json) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (import_id, plot_id, row_number, position_in_row)
);

create index idx_inventory_import_positions_import_action
  on public.inventory_import_positions(import_id, planned_action);

create index idx_inventory_import_positions_plot_location
  on public.inventory_import_positions(plot_id, row_number, position_in_row);

create index idx_inventory_import_positions_variety_candidate
  on public.inventory_import_positions(variety_candidate_id)
  where variety_candidate_id is not null;

create index idx_inventory_import_positions_variety
  on public.inventory_import_positions(variety_id)
  where variety_id is not null;

create index idx_inventory_import_positions_existing_tree
  on public.inventory_import_positions(existing_tree_id)
  where existing_tree_id is not null;

create trigger set_inventory_import_positions_updated_at
before update on public.inventory_import_positions
for each row
execute function public.set_updated_at();

create table public.inventory_import_created_trees (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null references public.inventory_imports(id) on delete cascade,
  position_id uuid references public.inventory_import_positions(id)
    on delete set null,
  tree_id uuid references public.trees(id) on delete set null,
  created_by_profile_id uuid not null default auth.uid()
    references public.profiles(id) on delete restrict,
  created_tree_snapshot_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(created_tree_snapshot_json) = 'object'),
  created_at timestamptz not null default now()
);

create unique index uq_inventory_import_created_trees_position
  on public.inventory_import_created_trees(position_id)
  where position_id is not null;

create unique index uq_inventory_import_created_trees_import_tree
  on public.inventory_import_created_trees(import_id, tree_id)
  where tree_id is not null;

create index idx_inventory_import_created_trees_tree
  on public.inventory_import_created_trees(tree_id)
  where tree_id is not null;

create or replace function public.can_read_inventory_import(target_import_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inventory_imports inventory_import
    where inventory_import.id = target_import_id
      and public.can_read_orchard_data(inventory_import.orchard_id)
  );
$$;

create or replace function public.can_write_inventory_import(target_import_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inventory_imports inventory_import
    where inventory_import.id = target_import_id
      and public.can_write_orchard_operational_data(inventory_import.orchard_id)
      and (
        inventory_import.status not in ('confirming', 'confirmed')
        or public.can_manage_orchard(inventory_import.orchard_id)
      )
  );
$$;

create or replace function public.can_manage_inventory_import(target_import_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.inventory_imports inventory_import
    where inventory_import.id = target_import_id
      and public.can_manage_orchard(inventory_import.orchard_id)
  );
$$;

create or replace function public.validate_inventory_import_consistency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plot_orchard_id uuid;
begin
  select plot.orchard_id
  into v_plot_orchard_id
  from public.plots plot
  where plot.id = new.plot_id;

  if v_plot_orchard_id is null then
    raise exception 'Inventory import plot does not exist.'
      using errcode = '23514';
  end if;

  if new.orchard_id <> v_plot_orchard_id then
    raise exception 'Inventory import orchard_id must match plot orchard_id.'
      using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.orchard_id is distinct from old.orchard_id then
      raise exception 'Inventory import orchard_id is immutable.'
        using errcode = '42501';
    end if;

    if new.plot_id is distinct from old.plot_id then
      raise exception 'Inventory import plot_id is immutable.'
        using errcode = '42501';
    end if;

    if new.created_by_profile_id is distinct from old.created_by_profile_id then
      raise exception 'Inventory import created_by_profile_id is immutable.'
        using errcode = '42501';
    end if;

    if new.file_hash is distinct from old.file_hash then
      raise exception 'Inventory import file_hash is immutable.'
        using errcode = '42501';
    end if;
  end if;

  if new.status = 'confirmed' and new.confirmed_at is null then
    new.confirmed_at = now();
  end if;

  return new;
end;
$$;

create trigger validate_inventory_import_consistency_before_write
before insert or update on public.inventory_imports
for each row
execute function public.validate_inventory_import_consistency();

create or replace function public.validate_inventory_import_variety_candidate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_orchard_id uuid;
  v_suggested_variety_orchard_id uuid;
  v_resolved_variety_orchard_id uuid;
  v_source_row_id uuid;
  v_source_row_import_id uuid;
begin
  select inventory_import.orchard_id
  into v_import_orchard_id
  from public.inventory_imports inventory_import
  where inventory_import.id = new.import_id;

  if v_import_orchard_id is null then
    raise exception 'Inventory import parent does not exist.'
      using errcode = '23514';
  end if;

  if new.suggested_variety_id is not null then
    select variety.orchard_id
    into v_suggested_variety_orchard_id
    from public.varieties variety
    where variety.id = new.suggested_variety_id;

    if v_suggested_variety_orchard_id is null then
      raise exception 'Inventory import suggested variety does not exist.'
        using errcode = '23514';
    end if;

    if v_suggested_variety_orchard_id <> v_import_orchard_id then
      raise exception 'Inventory import suggested variety must belong to the same orchard.'
        using errcode = '23514';
    end if;
  end if;

  if new.resolved_variety_id is not null then
    select variety.orchard_id
    into v_resolved_variety_orchard_id
    from public.varieties variety
    where variety.id = new.resolved_variety_id;

    if v_resolved_variety_orchard_id is null then
      raise exception 'Inventory import resolved variety does not exist.'
        using errcode = '23514';
    end if;

    if v_resolved_variety_orchard_id <> v_import_orchard_id then
      raise exception 'Inventory import resolved variety must belong to the same orchard.'
        using errcode = '23514';
    end if;
  end if;

  foreach v_source_row_id in array new.source_row_ids loop
    select source_row.import_id
    into v_source_row_import_id
    from public.inventory_import_source_rows source_row
    where source_row.id = v_source_row_id;

    if v_source_row_import_id is null or v_source_row_import_id <> new.import_id then
      raise exception 'Inventory import variety candidate source rows must belong to the same import.'
        using errcode = '23514';
    end if;
  end loop;

  return new;
end;
$$;

create trigger validate_inventory_import_variety_candidate_before_write
before insert or update on public.inventory_import_variety_candidates
for each row
execute function public.validate_inventory_import_variety_candidate();

create or replace function public.validate_inventory_import_position()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_orchard_id uuid;
  v_import_plot_id uuid;
  v_source_row_import_id uuid;
  v_variety_candidate_import_id uuid;
  v_variety_orchard_id uuid;
  v_existing_tree_orchard_id uuid;
  v_existing_tree_plot_id uuid;
begin
  select inventory_import.orchard_id, inventory_import.plot_id
  into v_import_orchard_id, v_import_plot_id
  from public.inventory_imports inventory_import
  where inventory_import.id = new.import_id;

  if v_import_orchard_id is null then
    raise exception 'Inventory import parent does not exist.'
      using errcode = '23514';
  end if;

  if new.plot_id <> v_import_plot_id then
    raise exception 'Inventory import position plot_id must match parent import plot_id.'
      using errcode = '23514';
  end if;

  if new.source_row_id is not null then
    select source_row.import_id
    into v_source_row_import_id
    from public.inventory_import_source_rows source_row
    where source_row.id = new.source_row_id;

    if v_source_row_import_id is null or v_source_row_import_id <> new.import_id then
      raise exception 'Inventory import position source row must belong to the same import.'
        using errcode = '23514';
    end if;
  end if;

  if new.variety_candidate_id is not null then
    select variety_candidate.import_id
    into v_variety_candidate_import_id
    from public.inventory_import_variety_candidates variety_candidate
    where variety_candidate.id = new.variety_candidate_id;

    if v_variety_candidate_import_id is null or v_variety_candidate_import_id <> new.import_id then
      raise exception 'Inventory import position variety candidate must belong to the same import.'
        using errcode = '23514';
    end if;
  end if;

  if new.variety_id is not null then
    select variety.orchard_id
    into v_variety_orchard_id
    from public.varieties variety
    where variety.id = new.variety_id;

    if v_variety_orchard_id is null then
      raise exception 'Inventory import position variety does not exist.'
        using errcode = '23514';
    end if;

    if v_variety_orchard_id <> v_import_orchard_id then
      raise exception 'Inventory import position variety must belong to the same orchard.'
        using errcode = '23514';
    end if;
  end if;

  if new.existing_tree_id is not null then
    select tree.orchard_id, tree.plot_id
    into v_existing_tree_orchard_id, v_existing_tree_plot_id
    from public.trees tree
    where tree.id = new.existing_tree_id;

    if v_existing_tree_orchard_id is null then
      raise exception 'Inventory import position existing tree does not exist.'
        using errcode = '23514';
    end if;

    if v_existing_tree_orchard_id <> v_import_orchard_id
      or v_existing_tree_plot_id <> v_import_plot_id then
      raise exception 'Inventory import position existing tree must belong to the same orchard and plot.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_inventory_import_position_before_write
before insert or update on public.inventory_import_positions
for each row
execute function public.validate_inventory_import_position();

create or replace function public.validate_inventory_import_created_tree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import_orchard_id uuid;
  v_import_plot_id uuid;
  v_position_import_id uuid;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
begin
  select inventory_import.orchard_id, inventory_import.plot_id
  into v_import_orchard_id, v_import_plot_id
  from public.inventory_imports inventory_import
  where inventory_import.id = new.import_id;

  if v_import_orchard_id is null then
    raise exception 'Inventory import parent does not exist.'
      using errcode = '23514';
  end if;

  if new.position_id is not null then
    select import_position.import_id
    into v_position_import_id
    from public.inventory_import_positions import_position
    where import_position.id = new.position_id;

    if v_position_import_id is null or v_position_import_id <> new.import_id then
      raise exception 'Inventory import created-tree position must belong to the same import.'
        using errcode = '23514';
    end if;
  end if;

  if new.tree_id is not null then
    select tree.orchard_id, tree.plot_id
    into v_tree_orchard_id, v_tree_plot_id
    from public.trees tree
    where tree.id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Inventory import created tree does not exist.'
        using errcode = '23514';
    end if;

    if v_tree_orchard_id <> v_import_orchard_id
      or v_tree_plot_id <> v_import_plot_id then
      raise exception 'Inventory import created tree must belong to the same orchard and plot.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_inventory_import_created_tree_before_write
before insert or update on public.inventory_import_created_trees
for each row
execute function public.validate_inventory_import_created_tree();

alter table public.inventory_imports enable row level security;
alter table public.inventory_import_source_rows enable row level security;
alter table public.inventory_import_variety_candidates enable row level security;
alter table public.inventory_import_positions enable row level security;
alter table public.inventory_import_created_trees enable row level security;

create policy inventory_imports_select_member_or_super_admin
on public.inventory_imports
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy inventory_imports_insert_owner_worker_or_super_admin
on public.inventory_imports
for insert
to authenticated
with check (
  public.can_write_orchard_operational_data(orchard_id)
  and created_by_profile_id = (select auth.uid())
  and (
    status not in ('confirming', 'confirmed')
    or public.can_manage_orchard(orchard_id)
  )
);

create policy inventory_imports_update_owner_worker_or_super_admin
on public.inventory_imports
for update
to authenticated
using (
  public.can_write_orchard_operational_data(orchard_id)
  and (
    status not in ('confirming', 'confirmed')
    or public.can_manage_orchard(orchard_id)
  )
)
with check (
  public.can_write_orchard_operational_data(orchard_id)
  and (
    status not in ('confirming', 'confirmed')
    or public.can_manage_orchard(orchard_id)
  )
);

create policy inventory_imports_delete_owner_or_super_admin
on public.inventory_imports
for delete
to authenticated
using (public.can_manage_orchard(orchard_id));

create policy inventory_import_source_rows_select_via_import
on public.inventory_import_source_rows
for select
to authenticated
using (public.can_read_inventory_import(import_id));

create policy inventory_import_source_rows_insert_via_import
on public.inventory_import_source_rows
for insert
to authenticated
with check (public.can_write_inventory_import(import_id));

create policy inventory_import_source_rows_update_via_import
on public.inventory_import_source_rows
for update
to authenticated
using (public.can_write_inventory_import(import_id))
with check (public.can_write_inventory_import(import_id));

create policy inventory_import_source_rows_delete_via_import
on public.inventory_import_source_rows
for delete
to authenticated
using (public.can_write_inventory_import(import_id));

create policy inventory_import_variety_candidates_select_via_import
on public.inventory_import_variety_candidates
for select
to authenticated
using (public.can_read_inventory_import(import_id));

create policy inventory_import_variety_candidates_insert_via_import
on public.inventory_import_variety_candidates
for insert
to authenticated
with check (public.can_write_inventory_import(import_id));

create policy inventory_import_variety_candidates_update_owner_or_super_admin
on public.inventory_import_variety_candidates
for update
to authenticated
using (public.can_manage_inventory_import(import_id))
with check (public.can_manage_inventory_import(import_id));

create policy inventory_import_variety_candidates_delete_via_import
on public.inventory_import_variety_candidates
for delete
to authenticated
using (public.can_write_inventory_import(import_id));

create policy inventory_import_positions_select_via_import
on public.inventory_import_positions
for select
to authenticated
using (public.can_read_inventory_import(import_id));

create policy inventory_import_positions_insert_via_import
on public.inventory_import_positions
for insert
to authenticated
with check (public.can_write_inventory_import(import_id));

create policy inventory_import_positions_update_via_import
on public.inventory_import_positions
for update
to authenticated
using (public.can_write_inventory_import(import_id))
with check (public.can_write_inventory_import(import_id));

create policy inventory_import_positions_delete_via_import
on public.inventory_import_positions
for delete
to authenticated
using (public.can_write_inventory_import(import_id));

create policy inventory_import_created_trees_select_via_import
on public.inventory_import_created_trees
for select
to authenticated
using (public.can_read_inventory_import(import_id));

create policy inventory_import_created_trees_insert_owner_or_super_admin
on public.inventory_import_created_trees
for insert
to authenticated
with check (
  public.can_manage_inventory_import(import_id)
  and created_by_profile_id = (select auth.uid())
);

create policy inventory_import_created_trees_update_owner_or_super_admin
on public.inventory_import_created_trees
for update
to authenticated
using (public.can_manage_inventory_import(import_id))
with check (public.can_manage_inventory_import(import_id));

create policy inventory_import_created_trees_delete_owner_or_super_admin
on public.inventory_import_created_trees
for delete
to authenticated
using (public.can_manage_inventory_import(import_id));

revoke execute on function public.can_read_inventory_import(uuid) from public;
revoke execute on function public.can_write_inventory_import(uuid) from public;
revoke execute on function public.can_manage_inventory_import(uuid) from public;
revoke execute on function public.validate_inventory_import_consistency() from public;
revoke execute on function public.validate_inventory_import_variety_candidate() from public;
revoke execute on function public.validate_inventory_import_position() from public;
revoke execute on function public.validate_inventory_import_created_tree() from public;

grant execute on function public.can_read_inventory_import(uuid) to authenticated;
grant execute on function public.can_write_inventory_import(uuid) to authenticated;
grant execute on function public.can_manage_inventory_import(uuid) to authenticated;
