create or replace function public.validate_activity_scope_consistency()
returns trigger
language plpgsql
as $$
declare
  v_activity_orchard_id uuid;
  v_activity_plot_id uuid;
  v_activity_plot_layout_type text;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
begin
  select
    a.orchard_id,
    a.plot_id,
    p.layout_type
  into
    v_activity_orchard_id,
    v_activity_plot_id,
    v_activity_plot_layout_type
  from public.activities a
  join public.plots p
    on p.id = a.plot_id
  where a.id = new.activity_id;

  if v_activity_orchard_id is null then
    raise exception 'Activity scope parent activity does not exist.'
      using errcode = '23514';
  end if;

  if new.scope_level in ('row', 'location_range')
    and v_activity_plot_layout_type = 'irregular' then
    raise exception 'ACTIVITY_SCOPE_LAYOUT_UNSUPPORTED'
      using errcode = '22023';
  end if;

  if new.tree_id is not null then
    select orchard_id, plot_id
    into v_tree_orchard_id, v_tree_plot_id
    from public.trees
    where id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Activity scope tree does not exist.'
        using errcode = '23514';
    end if;

    if v_tree_orchard_id <> v_activity_orchard_id or v_tree_plot_id <> v_activity_plot_id then
      raise exception 'Activity scope tree must belong to the same orchard and plot as the parent activity.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.set_harvest_derived_fields_and_validate()
returns trigger
language plpgsql
as $$
declare
  v_plot_orchard_id uuid;
  v_plot_layout_type text;
  v_variety_orchard_id uuid;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
  v_tree_variety_id uuid;
  v_activity_orchard_id uuid;
  v_activity_plot_id uuid;
  v_activity_tree_id uuid;
begin
  new.season_year = public.derive_season_year_from_date(new.harvest_date);
  new.quantity_kg = public.normalize_harvest_quantity_to_kg(new.quantity_value, new.quantity_unit);

  if new.plot_id is not null then
    select orchard_id, layout_type
    into v_plot_orchard_id, v_plot_layout_type
    from public.plots
    where id = new.plot_id;

    if v_plot_orchard_id is null then
      raise exception 'Harvest plot does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_plot_orchard_id then
      raise exception 'Harvest orchard_id must match plot orchard_id.'
        using errcode = '23514';
    end if;

    if new.scope_level = 'location_range' and v_plot_layout_type = 'irregular' then
      raise exception 'HARVEST_LOCATION_RANGE_UNSUPPORTED'
        using errcode = '22023';
    end if;
  end if;

  if new.variety_id is not null then
    select orchard_id
    into v_variety_orchard_id
    from public.varieties
    where id = new.variety_id;

    if v_variety_orchard_id is null then
      raise exception 'Harvest variety does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_variety_orchard_id then
      raise exception 'Harvest orchard_id must match variety orchard_id.'
        using errcode = '23514';
    end if;
  end if;

  if new.tree_id is not null then
    select orchard_id, plot_id, variety_id
    into v_tree_orchard_id, v_tree_plot_id, v_tree_variety_id
    from public.trees
    where id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Harvest tree does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_tree_orchard_id then
      raise exception 'Harvest orchard_id must match tree orchard_id.'
        using errcode = '23514';
    end if;

    if new.plot_id is not null and new.plot_id <> v_tree_plot_id then
      raise exception 'Harvest plot_id must match tree plot_id when tree_id is provided.'
        using errcode = '23514';
    end if;

    if new.variety_id is not null and v_tree_variety_id is not null and new.variety_id <> v_tree_variety_id then
      raise exception 'Harvest variety_id must match tree variety_id when both values are present.'
        using errcode = '23514';
    end if;
  end if;

  if new.activity_id is not null then
    select orchard_id, plot_id, tree_id
    into v_activity_orchard_id, v_activity_plot_id, v_activity_tree_id
    from public.activities
    where id = new.activity_id;

    if v_activity_orchard_id is null then
      raise exception 'Harvest activity does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_activity_orchard_id then
      raise exception 'Harvest orchard_id must match activity orchard_id.'
        using errcode = '23514';
    end if;

    if new.plot_id is not null and v_activity_plot_id is not null and new.plot_id <> v_activity_plot_id then
      raise exception 'Harvest plot_id must match activity plot_id when both values are present.'
        using errcode = '23514';
    end if;

    if new.tree_id is not null and v_activity_tree_id is not null and new.tree_id <> v_activity_tree_id then
      raise exception 'Harvest tree_id must match activity tree_id when both values are present.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;
