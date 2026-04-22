create or replace function public.create_activity_with_children(
  p_parent jsonb,
  p_scopes jsonb default '[]'::jsonb,
  p_materials jsonb default '[]'::jsonb
)
returns table (
  activity_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_orchard_id uuid;
  v_tree_id uuid;
  v_activity_type text;
  v_activity_subtype text;
  v_activity_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if p_parent is null then
    raise exception 'Activity payload is required.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_scopes, '[]'::jsonb)) <> 'array' then
    raise exception 'Activity scopes payload must be an array.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_materials, '[]'::jsonb)) <> 'array' then
    raise exception 'Activity materials payload must be an array.'
      using errcode = '22023';
  end if;

  v_orchard_id = nullif(trim(coalesce(p_parent ->> 'orchard_id', '')), '')::uuid;
  v_tree_id = nullif(trim(coalesce(p_parent ->> 'tree_id', '')), '')::uuid;
  v_activity_type = nullif(trim(coalesce(p_parent ->> 'activity_type', '')), '');
  v_activity_subtype = nullif(trim(coalesce(p_parent ->> 'activity_subtype', '')), '');

  if v_orchard_id is null then
    raise exception 'Activity orchard_id is required.'
      using errcode = '22023';
  end if;

  if not public.can_write_orchard_operational_data(v_orchard_id) then
    raise exception 'Only active orchard workers can write activities.'
      using errcode = '42501';
  end if;

  if v_activity_type = 'pruning' and v_activity_subtype is null then
    raise exception 'PRUNING_SUBTYPE_REQUIRED'
      using errcode = '22023';
  end if;

  if v_activity_type in ('pruning', 'mowing', 'spraying')
    and jsonb_array_length(coalesce(p_scopes, '[]'::jsonb)) = 0
    and v_tree_id is null then
    raise exception 'ACTIVITY_SCOPE_INVALID'
      using errcode = '22023';
  end if;

  insert into public.activities (
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
    season_phase,
    season_year
  )
  values (
    v_orchard_id,
    nullif(trim(coalesce(p_parent ->> 'plot_id', '')), '')::uuid,
    v_tree_id,
    v_activity_type,
    v_activity_subtype,
    nullif(trim(coalesce(p_parent ->> 'activity_date', '')), '')::date,
    nullif(trim(coalesce(p_parent ->> 'title', '')), ''),
    nullif(trim(coalesce(p_parent ->> 'description', '')), ''),
    coalesce(nullif(trim(coalesce(p_parent ->> 'status', '')), ''), 'done'),
    nullif(trim(coalesce(p_parent ->> 'work_duration_minutes', '')), '')::integer,
    nullif(trim(coalesce(p_parent ->> 'cost_amount', '')), '')::numeric,
    nullif(trim(coalesce(p_parent ->> 'weather_notes', '')), ''),
    nullif(trim(coalesce(p_parent ->> 'result_notes', '')), ''),
    nullif(trim(coalesce(p_parent ->> 'performed_by_profile_id', '')), '')::uuid,
    nullif(trim(coalesce(p_parent ->> 'performed_by', '')), ''),
    auth.uid(),
    nullif(trim(coalesce(p_parent ->> 'season_phase', '')), ''),
    nullif(trim(coalesce(p_parent ->> 'season_year', '')), '')::integer
  )
  returning id
  into v_activity_id;

  insert into public.activity_scopes (
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
  select
    v_activity_id,
    coalesce(
      nullif(trim(coalesce(item.value ->> 'scope_order', '')), '')::integer,
      item.ordinality::integer
    ),
    nullif(trim(coalesce(item.value ->> 'scope_level', '')), ''),
    nullif(trim(coalesce(item.value ->> 'section_name', '')), ''),
    nullif(trim(coalesce(item.value ->> 'row_number', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'from_position', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'to_position', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'tree_id', '')), '')::uuid,
    nullif(trim(coalesce(item.value ->> 'notes', '')), '')
  from jsonb_array_elements(coalesce(p_scopes, '[]'::jsonb)) with ordinality as item(value, ordinality);

  insert into public.activity_materials (
    activity_id,
    name,
    category,
    quantity,
    unit,
    notes
  )
  select
    v_activity_id,
    nullif(trim(coalesce(item.value ->> 'name', '')), ''),
    nullif(trim(coalesce(item.value ->> 'category', '')), ''),
    nullif(trim(coalesce(item.value ->> 'quantity', '')), '')::numeric,
    nullif(trim(coalesce(item.value ->> 'unit', '')), ''),
    nullif(trim(coalesce(item.value ->> 'notes', '')), '')
  from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb)) as item(value);

  return query
  select v_activity_id;
end;
$$;

create or replace function public.update_activity_with_children(
  p_activity_id uuid,
  p_parent jsonb,
  p_scopes jsonb default '[]'::jsonb,
  p_materials jsonb default '[]'::jsonb
)
returns table (
  activity_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing_activity public.activities%rowtype;
  v_tree_id uuid;
  v_activity_type text;
  v_activity_subtype text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if p_parent is null then
    raise exception 'Activity payload is required.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_scopes, '[]'::jsonb)) <> 'array' then
    raise exception 'Activity scopes payload must be an array.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_materials, '[]'::jsonb)) <> 'array' then
    raise exception 'Activity materials payload must be an array.'
      using errcode = '22023';
  end if;

  select *
  into v_existing_activity
  from public.activities
  where id = p_activity_id;

  if not found then
    raise exception 'NOT_FOUND'
      using errcode = 'P0002';
  end if;

  if not public.can_write_orchard_operational_data(v_existing_activity.orchard_id) then
    raise exception 'Only active orchard workers can update activities.'
      using errcode = '42501';
  end if;

  v_tree_id = nullif(trim(coalesce(p_parent ->> 'tree_id', '')), '')::uuid;
  v_activity_type = nullif(trim(coalesce(p_parent ->> 'activity_type', '')), '');
  v_activity_subtype = nullif(trim(coalesce(p_parent ->> 'activity_subtype', '')), '');

  if v_activity_type = 'pruning' and v_activity_subtype is null then
    raise exception 'PRUNING_SUBTYPE_REQUIRED'
      using errcode = '22023';
  end if;

  if v_activity_type in ('pruning', 'mowing', 'spraying')
    and jsonb_array_length(coalesce(p_scopes, '[]'::jsonb)) = 0
    and v_tree_id is null then
    raise exception 'ACTIVITY_SCOPE_INVALID'
      using errcode = '22023';
  end if;

  update public.activities
  set
    orchard_id = v_existing_activity.orchard_id,
    plot_id = nullif(trim(coalesce(p_parent ->> 'plot_id', '')), '')::uuid,
    tree_id = v_tree_id,
    activity_type = v_activity_type,
    activity_subtype = v_activity_subtype,
    activity_date = nullif(trim(coalesce(p_parent ->> 'activity_date', '')), '')::date,
    title = nullif(trim(coalesce(p_parent ->> 'title', '')), ''),
    description = nullif(trim(coalesce(p_parent ->> 'description', '')), ''),
    status = coalesce(nullif(trim(coalesce(p_parent ->> 'status', '')), ''), 'done'),
    work_duration_minutes = nullif(trim(coalesce(p_parent ->> 'work_duration_minutes', '')), '')::integer,
    cost_amount = nullif(trim(coalesce(p_parent ->> 'cost_amount', '')), '')::numeric,
    weather_notes = nullif(trim(coalesce(p_parent ->> 'weather_notes', '')), ''),
    result_notes = nullif(trim(coalesce(p_parent ->> 'result_notes', '')), ''),
    performed_by_profile_id = nullif(trim(coalesce(p_parent ->> 'performed_by_profile_id', '')), '')::uuid,
    performed_by = nullif(trim(coalesce(p_parent ->> 'performed_by', '')), ''),
    season_phase = nullif(trim(coalesce(p_parent ->> 'season_phase', '')), ''),
    season_year = nullif(trim(coalesce(p_parent ->> 'season_year', '')), '')::integer
  where id = v_existing_activity.id;

  delete from public.activity_scopes
  where public.activity_scopes.activity_id = v_existing_activity.id;

  delete from public.activity_materials
  where public.activity_materials.activity_id = v_existing_activity.id;

  insert into public.activity_scopes (
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
  select
    v_existing_activity.id,
    coalesce(
      nullif(trim(coalesce(item.value ->> 'scope_order', '')), '')::integer,
      item.ordinality::integer
    ),
    nullif(trim(coalesce(item.value ->> 'scope_level', '')), ''),
    nullif(trim(coalesce(item.value ->> 'section_name', '')), ''),
    nullif(trim(coalesce(item.value ->> 'row_number', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'from_position', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'to_position', '')), '')::integer,
    nullif(trim(coalesce(item.value ->> 'tree_id', '')), '')::uuid,
    nullif(trim(coalesce(item.value ->> 'notes', '')), '')
  from jsonb_array_elements(coalesce(p_scopes, '[]'::jsonb)) with ordinality as item(value, ordinality);

  insert into public.activity_materials (
    activity_id,
    name,
    category,
    quantity,
    unit,
    notes
  )
  select
    v_existing_activity.id,
    nullif(trim(coalesce(item.value ->> 'name', '')), ''),
    nullif(trim(coalesce(item.value ->> 'category', '')), ''),
    nullif(trim(coalesce(item.value ->> 'quantity', '')), '')::numeric,
    nullif(trim(coalesce(item.value ->> 'unit', '')), ''),
    nullif(trim(coalesce(item.value ->> 'notes', '')), '')
  from jsonb_array_elements(coalesce(p_materials, '[]'::jsonb)) as item(value);

  return query
  select v_existing_activity.id;
end;
$$;

create or replace function public.list_active_orchard_member_options(
  p_orchard_id uuid
)
returns table (
  profile_id uuid,
  email text,
  display_name text,
  role text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  perform set_config('row_security', 'off', true);

  if not public.can_read_orchard_data(p_orchard_id) then
    raise exception 'Only orchard members can read these options.'
      using errcode = '42501';
  end if;

  return query
  select
    om.profile_id,
    p.email,
    p.display_name,
    om.role
  from public.orchard_memberships om
  join public.profiles p
    on p.id = om.profile_id
  where om.orchard_id = p_orchard_id
    and om.status = 'active'
  order by
    case om.role
      when 'owner' then 0
      when 'worker' then 1
      when 'manager' then 2
      else 3
    end,
    coalesce(p.display_name, p.email);
end;
$$;

revoke execute on function public.create_activity_with_children(jsonb, jsonb, jsonb) from public;
revoke execute on function public.update_activity_with_children(uuid, jsonb, jsonb, jsonb) from public;
revoke execute on function public.list_active_orchard_member_options(uuid) from public;

grant execute on function public.create_activity_with_children(jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_activity_with_children(uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.list_active_orchard_member_options(uuid) to authenticated;
