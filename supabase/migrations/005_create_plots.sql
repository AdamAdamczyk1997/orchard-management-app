create table public.plots (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  name text not null,
  code text,
  description text,
  location_name text,
  area_m2 numeric(12,2) check (area_m2 is null or area_m2 > 0),
  soil_type text,
  irrigation_type text,
  status text not null default 'active'
    check (status in ('planned', 'active', 'archived')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, name)
);

create unique index uq_plots_orchard_code
  on public.plots(orchard_id, code)
  where code is not null;

create index idx_plots_orchard_id on public.plots(orchard_id);
create index idx_plots_orchard_status on public.plots(orchard_id, status);

create trigger set_plots_updated_at
before update on public.plots
for each row
execute function public.set_updated_at();
