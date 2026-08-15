create or replace function public.confirm_tree_inventory_import(
  p_import_id uuid,
  p_active_orchard_id uuid,
  p_confirm_token text,
  p_confirm_version integer
)
returns table (
  import_id uuid,
  status text,
  created_trees_count integer,
  created_varieties_count integer,
  final_report_json jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_import public.inventory_imports%rowtype;
  v_candidate record;
  v_new_variety_id uuid;
  v_created_trees_count integer := 0;
  v_created_varieties_count integer := 0;
  v_missing_positions_count integer := 0;
  v_unknown_variety_trees_count integer := 0;
  v_existing_variety_trees_count integer := 0;
  v_created_variety_trees_count integer := 0;
  v_unresolved_candidates_count integer := 0;
  v_diagnostic_errors_count integer := 0;
  v_invalid_candidate_id uuid;
  v_invalid_position_id uuid;
  v_conflict_row_number integer;
  v_conflict_position integer;
  v_final_report_json jsonb;
  v_actor_profile_id uuid;
begin
  v_actor_profile_id = auth.uid();

  if v_actor_profile_id is null then
    raise exception 'TREE_INVENTORY_CONFIRM_AUTH_REQUIRED'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if p_import_id is null then
    raise exception 'TREE_INVENTORY_CONFIRM_IMPORT_REQUIRED'
      using errcode = '22023';
  end if;

  if p_active_orchard_id is null then
    raise exception 'TREE_INVENTORY_CONFIRM_ORCHARD_REQUIRED'
      using errcode = '22023';
  end if;

  if p_confirm_token is null or btrim(p_confirm_token) = '' then
    raise exception 'TREE_INVENTORY_CONFIRM_TOKEN_REQUIRED'
      using errcode = '22023';
  end if;

  if p_confirm_version is null or p_confirm_version <= 0 then
    raise exception 'TREE_INVENTORY_CONFIRM_VERSION_REQUIRED'
      using errcode = '22023';
  end if;

  select inventory_import.*
  into v_import
  from public.inventory_imports inventory_import
  where inventory_import.id = p_import_id
  for update;

  if v_import.id is null then
    raise exception 'TREE_INVENTORY_IMPORT_NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if v_import.orchard_id <> p_active_orchard_id then
    raise exception 'TREE_INVENTORY_IMPORT_ORCHARD_MISMATCH'
      using errcode = '42501';
  end if;

  if not public.can_manage_orchard(v_import.orchard_id) then
    raise exception 'TREE_INVENTORY_CONFIRM_FORBIDDEN'
      using errcode = '42501';
  end if;

  if v_import.confirm_token_hash is null
    or encode(extensions.digest(p_confirm_token, 'sha256'), 'hex') <> v_import.confirm_token_hash then
    raise exception 'TREE_INVENTORY_CONFIRM_TOKEN_INVALID'
      using errcode = '42501';
  end if;

  if p_confirm_version <> v_import.confirm_version then
    raise exception 'TREE_INVENTORY_CONFIRM_VERSION_STALE'
      using errcode = '22023';
  end if;

  if v_import.status = 'confirmed' then
    v_final_report_json = coalesce(
      v_import.summary_json -> 'confirm_report',
      jsonb_build_object(
        'import_id', v_import.id,
        'status', v_import.status,
        'created_trees_count', v_import.created_trees_count,
        'created_varieties_count', 0
      )
    );
    v_created_varieties_count = coalesce(
      nullif(v_final_report_json ->> 'created_varieties_count', '')::integer,
      0
    );

    return query
    select
      v_import.id,
      v_import.status,
      v_import.created_trees_count,
      v_created_varieties_count,
      v_final_report_json;
    return;
  end if;

  if v_import.status <> 'ready_for_owner_confirm' then
    raise exception 'TREE_INVENTORY_IMPORT_NOT_READY'
      using errcode = '22023';
  end if;

  v_diagnostic_errors_count = coalesce(
    nullif(v_import.summary_json #>> '{diagnostics,errors}', '')::integer,
    0
  );

  if v_diagnostic_errors_count > 0 then
    raise exception 'TREE_INVENTORY_DIAGNOSTICS_BLOCK_CONFIRM'
      using errcode = '22023';
  end if;

  select count(*)::integer
  into v_unresolved_candidates_count
  from public.inventory_import_variety_candidates candidate
  where candidate.import_id = v_import.id
    and (
      candidate.resolution_status in ('unresolved', 'suggested', 'rejected')
      or (
        candidate.resolution_action = 'use_existing'
        and candidate.resolved_variety_id is null
      )
      or (
        candidate.resolution_action = 'create_new'
        and nullif(btrim(coalesce(candidate.raw_name, '')), '') is null
      )
    );

  if v_unresolved_candidates_count > 0 then
    raise exception 'TREE_INVENTORY_UNRESOLVED_VARIETY_CANDIDATES'
      using errcode = '22023';
  end if;

  select candidate.id
  into v_invalid_candidate_id
  from public.inventory_import_variety_candidates candidate
  left join public.varieties variety
    on variety.id = candidate.resolved_variety_id
  where candidate.import_id = v_import.id
    and candidate.resolution_action = 'use_existing'
    and (
      variety.id is null
      or variety.orchard_id <> v_import.orchard_id
      or lower(btrim(variety.species)) <> lower(btrim(candidate.species))
    )
  limit 1;

  if v_invalid_candidate_id is not null then
    raise exception 'TREE_INVENTORY_RESOLVED_VARIETY_INVALID'
      using errcode = '23514';
  end if;

  update public.inventory_import_positions position
  set variety_id = candidate.resolved_variety_id
  from public.inventory_import_variety_candidates candidate
  where position.import_id = v_import.id
    and position.variety_candidate_id = candidate.id
    and candidate.resolution_action = 'use_existing'
    and candidate.resolved_variety_id is not null;

  select position.id
  into v_invalid_position_id
  from public.inventory_import_positions position
  left join public.varieties variety
    on variety.id = position.variety_id
  where position.import_id = v_import.id
    and position.variety_id is not null
    and (
      variety.id is null
      or variety.orchard_id <> v_import.orchard_id
      or lower(btrim(variety.species)) <> lower(btrim(position.species))
    )
  limit 1;

  if v_invalid_position_id is not null then
    raise exception 'TREE_INVENTORY_POSITION_VARIETY_INVALID'
      using errcode = '23514';
  end if;

  select position.row_number, position.position_in_row
  into v_conflict_row_number, v_conflict_position
  from public.inventory_import_positions position
  join public.trees tree
    on tree.orchard_id = v_import.orchard_id
    and tree.plot_id = v_import.plot_id
    and tree.row_number = position.row_number
    and tree.position_in_row = position.position_in_row
    and tree.is_active = true
  where position.import_id = v_import.id
    and position.planned_action = 'create_tree'
  limit 1;

  if v_conflict_row_number is not null then
    raise exception 'TREE_INVENTORY_LOCATION_CONFLICT at row %, position %',
      v_conflict_row_number,
      v_conflict_position
      using errcode = '23505';
  end if;

  update public.inventory_imports
  set status = 'confirming'
  where id = v_import.id;

  for v_candidate in
    select candidate.*
    from public.inventory_import_variety_candidates candidate
    where candidate.import_id = v_import.id
      and candidate.resolution_action = 'create_new'
    order by candidate.species asc, candidate.raw_name asc, candidate.id asc
    for update
  loop
    v_new_variety_id = null;

    insert into public.varieties (
      orchard_id,
      species,
      name
    )
    values (
      v_import.orchard_id,
      btrim(v_candidate.species),
      btrim(v_candidate.raw_name)
    )
    on conflict (orchard_id, species, name) do nothing
    returning id
    into v_new_variety_id;

    if v_new_variety_id is null then
      raise exception 'TREE_INVENTORY_CREATE_NEW_VARIETY_EXISTS'
        using errcode = '23505';
    end if;

    v_created_varieties_count = v_created_varieties_count + 1;

    update public.inventory_import_variety_candidates
    set resolved_variety_id = v_new_variety_id
    where id = v_candidate.id;

    update public.inventory_import_positions
    set variety_id = v_new_variety_id
    where public.inventory_import_positions.import_id = v_import.id
      and variety_candidate_id = v_candidate.id;
  end loop;

  select
    (count(*) filter (
      where position.planned_action = 'missing_tree'
    ))::integer,
    (count(*) filter (
      where position.planned_action = 'create_tree'
        and position.variety_id is null
    ))::integer,
    (count(*) filter (
      where position.planned_action = 'create_tree'
        and candidate.resolution_action = 'use_existing'
    ))::integer,
    (count(*) filter (
      where position.planned_action = 'create_tree'
        and candidate.resolution_action = 'create_new'
    ))::integer
  into
    v_missing_positions_count,
    v_unknown_variety_trees_count,
    v_existing_variety_trees_count,
    v_created_variety_trees_count
  from public.inventory_import_positions position
  left join public.inventory_import_variety_candidates candidate
    on candidate.id = position.variety_candidate_id
  where position.import_id = v_import.id
    and position.planned_action in ('create_tree', 'missing_tree');

  with planned as (
    select position.*
    from public.inventory_import_positions position
    where position.import_id = v_import.id
      and position.planned_action = 'create_tree'
  ),
  inserted as (
    insert into public.trees (
      orchard_id,
      plot_id,
      variety_id,
      species,
      tree_code,
      display_name,
      section_name,
      row_number,
      position_in_row,
      planted_at,
      rootstock,
      pollinator_info,
      condition_status,
      notes,
      location_verified,
      is_active
    )
    select
      v_import.orchard_id,
      planned.plot_id,
      planned.variety_id,
      btrim(planned.species),
      nullif(btrim(coalesce(planned.tree_code, '')), ''),
      nullif(btrim(coalesce(planned.display_name, '')), ''),
      nullif(btrim(coalesce(planned.section_name, '')), ''),
      planned.row_number,
      planned.position_in_row,
      planned.planted_at,
      nullif(btrim(coalesce(planned.rootstock, '')), ''),
      nullif(btrim(coalesce(planned.defaults_json ->> 'pollinator_info', '')), ''),
      coalesce(planned.condition_status, 'new'),
      case
        when coalesce(
          planned.overrides_json #>> '{import_only,planted_year}',
          planned.overrides_json #>> '{import_only,planted_year_from}',
          planned.overrides_json #>> '{import_only,planted_year_to}'
        ) is null then nullif(btrim(coalesce(planned.notes, '')), '')
        else concat_ws(
          E'\n\n',
          nullif(btrim(coalesce(planned.notes, '')), ''),
          concat(
            'Tree inventory import planting year: ',
            coalesce(
              planned.overrides_json #>> '{import_only,planted_year}',
              concat_ws(
                '-',
                planned.overrides_json #>> '{import_only,planted_year_from}',
                planned.overrides_json #>> '{import_only,planted_year_to}'
              )
            )
          )
        )
      end,
      case
        when jsonb_typeof(planned.defaults_json -> 'location_verified') = 'boolean'
          then (planned.defaults_json ->> 'location_verified')::boolean
        else false
      end,
      coalesce(planned.condition_status, 'new') <> 'removed'
    from planned
    returning
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
      planted_at,
      rootstock,
      pollinator_info,
      condition_status,
      notes,
      location_verified,
      is_active
  ),
  audited as (
    insert into public.inventory_import_created_trees (
      import_id,
      position_id,
      tree_id,
      created_by_profile_id,
      created_tree_snapshot_json
    )
    select
      v_import.id,
      planned.id,
      inserted.id,
      v_actor_profile_id,
      jsonb_build_object(
        'tree_id', inserted.id,
        'orchard_id', inserted.orchard_id,
        'plot_id', inserted.plot_id,
        'variety_id', inserted.variety_id,
        'species', inserted.species,
        'tree_code', inserted.tree_code,
        'display_name', inserted.display_name,
        'section_name', inserted.section_name,
        'row_number', inserted.row_number,
        'position_in_row', inserted.position_in_row,
        'planted_at', inserted.planted_at,
        'rootstock', inserted.rootstock,
        'pollinator_info', inserted.pollinator_info,
        'condition_status', inserted.condition_status,
        'notes', inserted.notes,
        'location_verified', inserted.location_verified,
        'is_active', inserted.is_active
      )
    from planned
    join inserted
      on inserted.plot_id = planned.plot_id
      and inserted.row_number = planned.row_number
      and inserted.position_in_row = planned.position_in_row
    returning 1
  )
  select count(*)::integer
  into v_created_trees_count
  from audited;

  v_final_report_json = jsonb_build_object(
    'import_id', v_import.id,
    'status', 'confirmed',
    'created_trees_count', v_created_trees_count,
    'created_varieties_count', v_created_varieties_count,
    'missing_positions_count', v_missing_positions_count,
    'unknown_variety_trees_count', v_unknown_variety_trees_count,
    'mapped_existing_variety_trees_count', v_existing_variety_trees_count,
    'created_variety_trees_count', v_created_variety_trees_count,
    'confirmed_by_profile_id', v_actor_profile_id,
    'confirmed_at', timezone('UTC', now())
  );

  update public.inventory_imports
  set
    status = 'confirmed',
    confirmed_by_profile_id = v_actor_profile_id,
    created_trees_count = v_created_trees_count,
    summary_json = coalesce(summary_json, '{}'::jsonb)
      || jsonb_build_object('confirm_report', v_final_report_json)
  where id = v_import.id;

  return query
  select
    v_import.id,
    'confirmed'::text,
    v_created_trees_count,
    v_created_varieties_count,
    v_final_report_json;
end;
$$;

revoke execute on function public.confirm_tree_inventory_import(
  uuid,
  uuid,
  text,
  integer
) from public;

grant execute on function public.confirm_tree_inventory_import(
  uuid,
  uuid,
  text,
  integer
) to authenticated;
