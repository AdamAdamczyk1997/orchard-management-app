create table public.activity_materials (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  name text not null,
  category text,
  quantity numeric(12,3) check (quantity is null or quantity >= 0),
  unit text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_activity_materials_activity_id on public.activity_materials(activity_id);

create trigger set_activity_materials_updated_at
before update on public.activity_materials
for each row
execute function public.set_updated_at();
