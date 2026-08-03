create or replace function public.count_harvest_record_list_rows(
  p_orchard_id uuid,
  p_season_year integer,
  p_date_from date default null,
  p_date_to date default null,
  p_plot_id uuid default null,
  p_variety_id uuid default null
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.harvest_records h
  left join public.trees t
    on t.id = h.tree_id
    and t.orchard_id = h.orchard_id
  where public.can_read_orchard_data(p_orchard_id)
    and h.orchard_id = p_orchard_id
    and h.season_year = p_season_year
    and (p_date_from is null or h.harvest_date >= p_date_from)
    and (p_date_to is null or h.harvest_date <= p_date_to)
    and (p_variety_id is null or h.variety_id = p_variety_id)
    and (
      p_plot_id is null
      or h.plot_id = p_plot_id
      or t.plot_id = p_plot_id
    );
$$;

create or replace function public.list_harvest_record_list_rows(
  p_orchard_id uuid,
  p_season_year integer,
  p_date_from date default null,
  p_date_to date default null,
  p_plot_id uuid default null,
  p_variety_id uuid default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  id uuid,
  orchard_id uuid,
  plot_id uuid,
  variety_id uuid,
  tree_id uuid,
  activity_id uuid,
  scope_level text,
  harvest_date date,
  season_year integer,
  section_name text,
  row_number integer,
  from_position integer,
  to_position integer,
  quantity_value numeric,
  quantity_unit text,
  quantity_kg numeric,
  notes text,
  created_by_profile_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  plot_name text,
  plot_status text,
  variety_name text,
  variety_species text,
  tree_display_name text,
  activity_title text,
  created_by_display text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    h.id,
    h.orchard_id,
    coalesce(h.plot_id, t.plot_id) as plot_id,
    h.variety_id,
    h.tree_id,
    h.activity_id,
    h.scope_level,
    h.harvest_date,
    h.season_year,
    case
      when h.scope_level = 'tree' then coalesce(h.section_name, t.section_name)
      else h.section_name
    end as section_name,
    case
      when h.scope_level = 'tree' then t.row_number
      else h.row_number
    end as row_number,
    case
      when h.scope_level = 'tree' then t.position_in_row
      else h.from_position
    end as from_position,
    case
      when h.scope_level = 'tree' then t.position_in_row
      else h.to_position
    end as to_position,
    h.quantity_value,
    h.quantity_unit,
    h.quantity_kg,
    h.notes,
    h.created_by_profile_id,
    h.created_at,
    h.updated_at,
    coalesce(h_plot.name, t_plot.name) as plot_name,
    coalesce(h_plot.status, t_plot.status) as plot_status,
    v.name as variety_name,
    v.species as variety_species,
    coalesce(
      t.display_name,
      t.tree_code,
      case when t.species is not null then t.species || ' drzewo' end
    ) as tree_display_name,
    a.title as activity_title,
    coalesce(p.display_name, p.email) as created_by_display
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
  left join public.varieties v
    on v.id = h.variety_id
    and v.orchard_id = h.orchard_id
  left join public.activities a
    on a.id = h.activity_id
    and a.orchard_id = h.orchard_id
  left join public.profiles p
    on p.id = h.created_by_profile_id
  where public.can_read_orchard_data(p_orchard_id)
    and h.orchard_id = p_orchard_id
    and h.season_year = p_season_year
    and (p_date_from is null or h.harvest_date >= p_date_from)
    and (p_date_to is null or h.harvest_date <= p_date_to)
    and (p_variety_id is null or h.variety_id = p_variety_id)
    and (
      p_plot_id is null
      or h.plot_id = p_plot_id
      or t.plot_id = p_plot_id
    )
  order by h.harvest_date desc, h.created_at desc, h.id desc
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;
