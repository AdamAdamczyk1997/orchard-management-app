create or replace function public.list_harvest_location_source_records(
  p_orchard_id uuid,
  p_season_year integer,
  p_plot_id uuid default null,
  p_variety_id uuid default null
)
returns table (
  id uuid,
  scope_level text,
  harvest_date date,
  quantity_kg numeric,
  plot_id uuid,
  plot_name text,
  plot_status text,
  section_name text,
  row_number integer,
  from_position integer,
  to_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id,
    h.scope_level,
    h.harvest_date,
    h.quantity_kg,
    coalesce(h.plot_id, t.plot_id) as plot_id,
    coalesce(h_plot.name, t_plot.name) as plot_name,
    coalesce(h_plot.status, t_plot.status) as plot_status,
    case
      when h.scope_level = 'tree' then coalesce(h.section_name, t.section_name)
      else h.section_name
    end as section_name,
    case
      when h.scope_level = 'location_range' then h.row_number
      when h.scope_level = 'tree' then t.row_number
      else null
    end as row_number,
    case
      when h.scope_level = 'location_range' then h.from_position
      when h.scope_level = 'tree' then t.position_in_row
      else null
    end as from_position,
    case
      when h.scope_level = 'location_range' then h.to_position
      when h.scope_level = 'tree' then t.position_in_row
      else null
    end as to_position
  from public.harvest_records h
  left join public.trees t
    on t.id = h.tree_id
    and t.orchard_id = h.orchard_id
  left join public.plots h_plot
    on h_plot.id = h.plot_id
    and h_plot.orchard_id = h.orchard_id
  left join public.plots t_plot
    on t_plot.id = t.plot_id
    and t_plot.orchard_id = h.orchard_id
  where public.can_read_orchard_data(p_orchard_id)
    and h.orchard_id = p_orchard_id
    and h.season_year = p_season_year
    and (p_variety_id is null or h.variety_id = p_variety_id)
    and (
      p_plot_id is null
      or h.plot_id = p_plot_id
      or t.plot_id = p_plot_id
    );
$$;
