create index if not exists idx_orchard_memberships_invited_by_profile_id
  on public.orchard_memberships(invited_by_profile_id);

create index if not exists idx_trees_variety_id
  on public.trees(variety_id);

create index if not exists idx_activities_tree_id
  on public.activities(tree_id);

create index if not exists idx_activities_created_by_profile_id
  on public.activities(created_by_profile_id);

create index if not exists idx_harvest_records_plot_id
  on public.harvest_records(plot_id);

create index if not exists idx_harvest_records_variety_id
  on public.harvest_records(variety_id);

create index if not exists idx_harvest_records_tree_id
  on public.harvest_records(tree_id);

create index if not exists idx_harvest_records_activity_id
  on public.harvest_records(activity_id);

create index if not exists idx_harvest_records_created_by_profile_id
  on public.harvest_records(created_by_profile_id);

create index if not exists idx_bulk_tree_import_batches_variety_id
  on public.bulk_tree_import_batches(variety_id);

create index if not exists idx_bulk_tree_import_batches_created_by_profile_id
  on public.bulk_tree_import_batches(created_by_profile_id);
