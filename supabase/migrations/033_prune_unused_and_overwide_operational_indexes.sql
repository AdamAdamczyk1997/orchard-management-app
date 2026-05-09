drop index if exists public.idx_bulk_tree_import_batches_orchard_created_at;

create index if not exists idx_bulk_tree_import_batches_orchard_id
  on public.bulk_tree_import_batches(orchard_id);

drop index if exists public.idx_bulk_tree_import_batches_plot_row;

create index if not exists idx_bulk_tree_import_batches_plot_id
  on public.bulk_tree_import_batches(plot_id);

drop index if exists public.idx_activity_scopes_scope_level_row;

drop index if exists public.idx_harvest_records_season_date;

drop index if exists public.idx_harvest_records_orchard_variety_season;

drop index if exists public.idx_harvest_records_orchard_plot_season;
