create table public.activities (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  plot_id uuid not null references public.plots(id) on delete restrict,
  tree_id uuid references public.trees(id) on delete set null,
  activity_type text not null check (
    activity_type in (
      'watering',
      'fertilizing',
      'spraying',
      'pruning',
      'inspection',
      'planting',
      'harvest',
      'mowing',
      'weeding',
      'disease_observation',
      'pest_observation',
      'other'
    )
  ),
  activity_subtype text,
  activity_date date not null,
  title text not null,
  description text,
  status text not null default 'done'
    check (status in ('planned', 'done', 'skipped', 'cancelled')),
  work_duration_minutes integer
    check (work_duration_minutes is null or work_duration_minutes >= 0),
  cost_amount numeric(12,2)
    check (cost_amount is null or cost_amount >= 0),
  weather_notes text,
  result_notes text,
  performed_by_profile_id uuid references public.profiles(id) on delete set null,
  performed_by text,
  created_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  season_year integer not null,
  season_phase text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (activity_type = 'pruning' and activity_subtype in ('winter_pruning', 'summer_pruning'))
    or (activity_type <> 'pruning' and activity_subtype is null)
  )
);

create index idx_activities_orchard_id on public.activities(orchard_id);
create index idx_activities_plot_date on public.activities(plot_id, activity_date desc);
create index idx_activities_orchard_type_status_date
  on public.activities(orchard_id, activity_type, status, activity_date desc);
create index idx_activities_performed_by_date
  on public.activities(performed_by_profile_id, activity_date desc);
create index idx_activities_orchard_season_date
  on public.activities(orchard_id, season_year, activity_date desc);

create trigger set_activities_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();
