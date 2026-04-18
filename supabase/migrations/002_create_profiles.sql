create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  system_role text not null default 'user'
    check (system_role in ('user', 'super_admin')),
  locale text default 'pl',
  timezone text default 'Europe/Warsaw',
  orchard_onboarding_dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_system_role on public.profiles(system_role);

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    system_role,
    locale,
    timezone
  ) values (
    new.id,
    coalesce(new.email, concat(new.id::text, '@local.invalid')),
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, new.id::text), '@', 1)
    ),
    'user',
    coalesce(new.raw_user_meta_data ->> 'locale', 'pl'),
    coalesce(new.raw_user_meta_data ->> 'timezone', 'Europe/Warsaw')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row
execute function public.handle_new_user_profile();

insert into public.profiles (
  id,
  email,
  display_name,
  system_role,
  locale,
  timezone
)
select
  u.id,
  coalesce(u.email, concat(u.id::text, '@local.invalid')),
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(u.email, u.id::text), '@', 1)
  ),
  'user',
  coalesce(u.raw_user_meta_data ->> 'locale', 'pl'),
  coalesce(u.raw_user_meta_data ->> 'timezone', 'Europe/Warsaw')
from auth.users u
where not exists (
  select 1
  from public.profiles p
  where p.id = u.id
);
