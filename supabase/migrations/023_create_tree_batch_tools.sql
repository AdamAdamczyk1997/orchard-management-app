create table public.bulk_tree_import_batches (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  plot_id uuid not null references public.plots(id) on delete restrict,
  variety_id uuid references public.varieties(id) on delete set null,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  species text not null,
  section_name text,
  row_number integer not null check (row_number > 0),
  from_position integer not null check (from_position > 0),
  to_position integer not null check (to_position >= from_position),
  generated_tree_code_pattern text,
  default_condition_status text not null default 'new'
    check (default_condition_status in ('new', 'good', 'warning', 'critical')),
  default_planted_at date,
  default_rootstock text,
  default_notes text,
  created_trees_count integer not null default 0 check (created_trees_count >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'done', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bulk_tree_import_batches_orchard_created_at
  on public.bulk_tree_import_batches(orchard_id, created_at desc);

create index idx_bulk_tree_import_batches_plot_row
  on public.bulk_tree_import_batches(plot_id, row_number, created_at desc);

create trigger set_bulk_tree_import_batches_updated_at
before update on public.bulk_tree_import_batches
for each row
execute function public.set_updated_at();

alter table public.trees
add column planted_batch_id uuid references public.bulk_tree_import_batches(id) on delete set null;

create index idx_trees_planted_batch_id on public.trees(planted_batch_id);

create index idx_trees_bulk_plot_row_position
  on public.trees(orchard_id, plot_id, row_number, position_in_row)
  where row_number is not null
    and position_in_row is not null;

alter table public.bulk_tree_import_batches enable row level security;

create policy bulk_tree_import_batches_select_member_or_super_admin
on public.bulk_tree_import_batches
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy bulk_tree_import_batches_insert_owner_worker_or_super_admin
on public.bulk_tree_import_batches
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy bulk_tree_import_batches_update_owner_worker_or_super_admin
on public.bulk_tree_import_batches
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy bulk_tree_import_batches_delete_owner_worker_or_super_admin
on public.bulk_tree_import_batches
for delete
to authenticated
using (public.can_write_orchard_operational_data(orchard_id));

create or replace function public.create_bulk_tree_batch(
  p_plot_id uuid,
  p_variety_id uuid default null,
  p_species text default null,
  p_section_name text default null,
  p_row_number integer default null,
  p_from_position integer default null,
  p_to_position integer default null,
  p_generated_tree_code_pattern text default null,
  p_default_condition_status text default 'new',
  p_default_planted_at date default null,
  p_default_rootstock text default null,
  p_default_notes text default null
)
returns table (
  batch_id uuid,
  created_trees_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orchard_id uuid;
  v_plot_status text;
  v_variety_orchard_id uuid;
  v_batch_id uuid;
  v_created_count integer;
  v_conflict_position integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if p_plot_id is null then
    raise exception 'Plot is required.'
      using errcode = '22023';
  end if;

  if p_species is null or btrim(p_species) = '' then
    raise exception 'Species is required.'
      using errcode = '22023';
  end if;

  if p_row_number is null or p_row_number <= 0 then
    raise exception 'Row number must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_from_position is null or p_from_position <= 0 then
    raise exception 'Starting position must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_to_position is null or p_to_position <= 0 then
    raise exception 'Ending position must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_from_position > p_to_position then
    raise exception 'FROM_POSITION_GREATER_THAN_TO_POSITION'
      using errcode = '22023';
  end if;

  if p_generated_tree_code_pattern is not null
    and position('{{n}}' in p_generated_tree_code_pattern) = 0 then
    raise exception 'TREE_CODE_PATTERN_INVALID'
      using errcode = '22023';
  end if;

  select orchard_id, status
  into v_orchard_id, v_plot_status
  from public.plots
  where id = p_plot_id;

  if v_orchard_id is null then
    raise exception 'Tree batch plot does not exist.'
      using errcode = '23514';
  end if;

  if v_plot_status = 'archived' then
    raise exception 'PLOT_ARCHIVED'
      using errcode = '22023';
  end if;

  if not public.can_write_orchard_operational_data(v_orchard_id) then
    raise exception 'Only active orchard workers can create bulk tree batches.'
      using errcode = '42501';
  end if;

  if p_variety_id is not null then
    select orchard_id
    into v_variety_orchard_id
    from public.varieties
    where id = p_variety_id;

    if v_variety_orchard_id is null then
      raise exception 'Tree batch variety does not exist.'
        using errcode = '23514';
    end if;

    if v_variety_orchard_id <> v_orchard_id then
      raise exception 'Tree batch variety must belong to the same orchard.'
        using errcode = '23514';
    end if;
  end if;

  select t.position_in_row
  into v_conflict_position
  from public.trees t
  where t.orchard_id = v_orchard_id
    and t.plot_id = p_plot_id
    and t.row_number = p_row_number
    and t.position_in_row between p_from_position and p_to_position
    and t.is_active = true
  order by t.position_in_row asc
  limit 1;

  if v_conflict_position is not null then
    raise exception 'LOCATION_CONFLICT at position %', v_conflict_position
      using errcode = '23505';
  end if;

  insert into public.bulk_tree_import_batches (
    orchard_id,
    plot_id,
    variety_id,
    created_by_profile_id,
    species,
    section_name,
    row_number,
    from_position,
    to_position,
    generated_tree_code_pattern,
    default_condition_status,
    default_planted_at,
    default_rootstock,
    default_notes,
    status
  )
  values (
    v_orchard_id,
    p_plot_id,
    p_variety_id,
    auth.uid(),
    btrim(p_species),
    nullif(btrim(coalesce(p_section_name, '')), ''),
    p_row_number,
    p_from_position,
    p_to_position,
    nullif(btrim(coalesce(p_generated_tree_code_pattern, '')), ''),
    p_default_condition_status,
    p_default_planted_at,
    nullif(btrim(coalesce(p_default_rootstock, '')), ''),
    nullif(btrim(coalesce(p_default_notes, '')), ''),
    'draft'
  )
  returning id
  into v_batch_id;

  insert into public.trees (
    orchard_id,
    plot_id,
    variety_id,
    species,
    section_name,
    row_number,
    position_in_row,
    tree_code,
    planted_at,
    rootstock,
    condition_status,
    notes,
    location_verified,
    is_active,
    planted_batch_id
  )
  select
    v_orchard_id,
    p_plot_id,
    p_variety_id,
    btrim(p_species),
    nullif(btrim(coalesce(p_section_name, '')), ''),
    p_row_number,
    position_in_row,
    case
      when nullif(btrim(coalesce(p_generated_tree_code_pattern, '')), '') is null then null
      else replace(nullif(btrim(coalesce(p_generated_tree_code_pattern, '')), ''), '{{n}}', position_in_row::text)
    end,
    p_default_planted_at,
    nullif(btrim(coalesce(p_default_rootstock, '')), ''),
    p_default_condition_status,
    nullif(btrim(coalesce(p_default_notes, '')), ''),
    false,
    true,
    v_batch_id
  from generate_series(p_from_position, p_to_position) as position_in_row;

  get diagnostics v_created_count = row_count;

  update public.bulk_tree_import_batches
  set
    status = 'done',
    created_trees_count = v_created_count
  where id = v_batch_id;

  return query
  select v_batch_id, v_created_count;
end;
$$;

create or replace function public.bulk_deactivate_trees(
  p_plot_id uuid,
  p_row_number integer,
  p_from_position integer,
  p_to_position integer,
  p_reason text default null
)
returns table (
  updated_trees_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orchard_id uuid;
  v_plot_status text;
  v_updated_count integer;
  v_reason text;
  v_reason_note text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if p_plot_id is null then
    raise exception 'Plot is required.'
      using errcode = '22023';
  end if;

  if p_row_number is null or p_row_number <= 0 then
    raise exception 'Row number must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_from_position is null or p_from_position <= 0 then
    raise exception 'Starting position must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_to_position is null or p_to_position <= 0 then
    raise exception 'Ending position must be greater than 0.'
      using errcode = '22023';
  end if;

  if p_from_position > p_to_position then
    raise exception 'FROM_POSITION_GREATER_THAN_TO_POSITION'
      using errcode = '22023';
  end if;

  select orchard_id, status
  into v_orchard_id, v_plot_status
  from public.plots
  where id = p_plot_id;

  if v_orchard_id is null then
    raise exception 'Tree deactivation plot does not exist.'
      using errcode = '23514';
  end if;

  if v_plot_status = 'archived' then
    raise exception 'PLOT_ARCHIVED'
      using errcode = '22023';
  end if;

  if not public.can_write_orchard_operational_data(v_orchard_id) then
    raise exception 'Only active orchard workers can deactivate trees.'
      using errcode = '42501';
  end if;

  v_reason = nullif(btrim(coalesce(p_reason, '')), '');
  v_reason_note = case
    when v_reason is null then null
    else format(
      'Bulk deactivated on %s: %s',
      to_char(timezone('UTC', now()), 'YYYY-MM-DD'),
      v_reason
    )
  end;

  with updated as (
    update public.trees t
    set
      condition_status = 'removed',
      is_active = false,
      notes = case
        when v_reason_note is null then t.notes
        when nullif(btrim(coalesce(t.notes, '')), '') is null then v_reason_note
        else t.notes || E'\n\n' || v_reason_note
      end
    where t.orchard_id = v_orchard_id
      and t.plot_id = p_plot_id
      and t.row_number = p_row_number
      and t.position_in_row between p_from_position and p_to_position
      and t.is_active = true
    returning 1
  )
  select count(*)
  into v_updated_count
  from updated;

  if v_updated_count = 0 then
    raise exception 'NO_MATCHING_TREES'
      using errcode = 'P0002';
  end if;

  return query
  select v_updated_count;
end;
$$;

revoke execute on function public.create_bulk_tree_batch(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  date,
  text,
  text
) from public;

revoke execute on function public.bulk_deactivate_trees(
  uuid,
  integer,
  integer,
  integer,
  text
) from public;

grant execute on function public.create_bulk_tree_batch(
  uuid,
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  text,
  text,
  date,
  text,
  text
) to authenticated;

grant execute on function public.bulk_deactivate_trees(
  uuid,
  integer,
  integer,
  integer,
  text
) to authenticated;

