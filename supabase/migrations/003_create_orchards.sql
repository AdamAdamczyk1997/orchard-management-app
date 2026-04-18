create table public.orchards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  description text,
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_by_profile_id uuid not null
    references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_orchards_created_by on public.orchards(created_by_profile_id);
create index idx_orchards_status on public.orchards(status);

create trigger set_orchards_updated_at
before update on public.orchards
for each row
execute function public.set_updated_at();
