create index if not exists idx_trees_orchard_active
  on public.trees(orchard_id)
  where is_active = true;

create index if not exists idx_activities_orchard_recent
  on public.activities(orchard_id, activity_date desc, created_at desc);

create index if not exists idx_activity_scopes_tree_activity
  on public.activity_scopes(tree_id, activity_id)
  where tree_id is not null;

create index if not exists idx_harvest_records_orchard_recent
  on public.harvest_records(orchard_id, harvest_date desc, created_at desc);

create index if not exists idx_harvest_records_orchard_season_recent
  on public.harvest_records(orchard_id, season_year, harvest_date desc, created_at desc);

create index if not exists idx_harvest_records_orchard_season_plot_recent
  on public.harvest_records(orchard_id, season_year, plot_id, harvest_date desc, created_at desc)
  where plot_id is not null;

create index if not exists idx_harvest_records_orchard_season_variety_recent
  on public.harvest_records(orchard_id, season_year, variety_id, harvest_date desc, created_at desc)
  where variety_id is not null;
