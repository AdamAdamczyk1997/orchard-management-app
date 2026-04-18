create or replace function public.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_super_admin()
    or coalesce(target_profile_id = auth.uid(), false)
    or exists (
      select 1
      from public.orchard_memberships self_membership
      join public.orchard_memberships target_membership
        on target_membership.orchard_id = self_membership.orchard_id
      where self_membership.profile_id = auth.uid()
        and self_membership.status = 'active'
        and target_membership.profile_id = target_profile_id
    );
$$;

create or replace function public.can_read_orchard_data(target_orchard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin() or public.is_active_orchard_member(target_orchard_id);
$$;

create or replace function public.can_write_orchard_operational_data(target_orchard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin()
    or public.has_orchard_role(target_orchard_id, array['owner', 'worker']::text[]);
$$;

create or replace function public.can_manage_orchard(target_orchard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_super_admin() or public.is_orchard_owner(target_orchard_id);
$$;

create or replace function public.can_bootstrap_orchard_owner(
  target_orchard_id uuid,
  target_profile_id uuid,
  target_role text,
  target_status text
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and target_profile_id = auth.uid()
    and target_role = 'owner'
    and target_status = 'active'
    and exists (
      select 1
      from public.orchards o
      where o.id = target_orchard_id
        and o.created_by_profile_id = auth.uid()
    )
    and not exists (
      select 1
      from public.orchard_memberships om
      where om.orchard_id = target_orchard_id
    );
$$;

create or replace function public.can_read_activity_children(target_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.activities a
    where a.id = target_activity_id
      and public.can_read_orchard_data(a.orchard_id)
  );
$$;

create or replace function public.can_write_activity_children(target_activity_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.activities a
    where a.id = target_activity_id
      and public.can_write_orchard_operational_data(a.orchard_id)
  );
$$;

create or replace function public.guard_profile_self_service_update()
returns trigger
language plpgsql
as $$
begin
  if public.is_super_admin() then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'Profile id is immutable.'
      using errcode = '42501';
  end if;

  if new.email is distinct from old.email then
    raise exception 'Profile email must be changed through auth profile management.'
      using errcode = '42501';
  end if;

  if new.system_role is distinct from old.system_role then
    raise exception 'Profile system_role cannot be changed by the current user.'
      using errcode = '42501';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'Profile created_at is immutable.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_profile_self_service_update_before_write on public.profiles;

create trigger guard_profile_self_service_update_before_write
before update on public.profiles
for each row
execute function public.guard_profile_self_service_update();

revoke execute on function public.can_read_profile(uuid) from public;
revoke execute on function public.can_read_orchard_data(uuid) from public;
revoke execute on function public.can_write_orchard_operational_data(uuid) from public;
revoke execute on function public.can_manage_orchard(uuid) from public;
revoke execute on function public.can_bootstrap_orchard_owner(uuid, uuid, text, text) from public;
revoke execute on function public.can_read_activity_children(uuid) from public;
revoke execute on function public.can_write_activity_children(uuid) from public;
revoke execute on function public.guard_profile_self_service_update() from public;

grant execute on function public.can_read_profile(uuid) to authenticated;
grant execute on function public.can_read_orchard_data(uuid) to authenticated;
grant execute on function public.can_write_orchard_operational_data(uuid) to authenticated;
grant execute on function public.can_manage_orchard(uuid) to authenticated;
grant execute on function public.can_bootstrap_orchard_owner(uuid, uuid, text, text) to authenticated;
grant execute on function public.can_read_activity_children(uuid) to authenticated;
grant execute on function public.can_write_activity_children(uuid) to authenticated;
