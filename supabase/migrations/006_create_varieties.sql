create table public.varieties (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  species text not null,
  name text not null,
  description text,
  care_notes text,
  characteristics text,
  ripening_period text,
  resistance_notes text,
  origin_country text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, species, name)
);

create index idx_varieties_orchard_id on public.varieties(orchard_id);
create index idx_varieties_orchard_species on public.varieties(orchard_id, species);

create trigger set_varieties_updated_at
before update on public.varieties
for each row
execute function public.set_updated_at();
