create table public.orchard_memberships (
  id uuid primary key default gen_random_uuid(),
  orchard_id uuid not null references public.orchards(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null
    check (role in ('owner', 'worker', 'manager', 'viewer')),
  status text not null default 'active'
    check (status in ('invited', 'active', 'revoked')),
  invited_by_profile_id uuid references public.profiles(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (orchard_id, profile_id)
);

create unique index uq_orchard_memberships_single_active_owner
  on public.orchard_memberships(orchard_id)
  where role = 'owner' and status = 'active';

create index idx_orchard_memberships_profile_status
  on public.orchard_memberships(profile_id, status);

create index idx_orchard_memberships_orchard_role_status
  on public.orchard_memberships(orchard_id, role, status);

create trigger set_orchard_memberships_updated_at
before update on public.orchard_memberships
for each row
execute function public.set_updated_at();
