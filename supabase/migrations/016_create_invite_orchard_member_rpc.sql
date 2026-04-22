create or replace function public.invite_orchard_member_by_email(
  p_orchard_id uuid,
  p_email text,
  p_role text default 'worker'
)
returns table (
  membership_id uuid,
  orchard_id uuid,
  profile_id uuid,
  email text,
  display_name text,
  role text,
  status text,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text;
  v_profile_id uuid;
  v_membership_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required.'
      using errcode = '42501';
  end if;

  if not public.can_manage_orchard(p_orchard_id) then
    raise exception 'Only orchard owners can manage orchard members.'
      using errcode = '42501';
  end if;

  v_normalized_email = lower(trim(coalesce(p_email, '')));

  if v_normalized_email = '' then
    raise exception 'Member email is required.'
      using errcode = '22023';
  end if;

  if p_role not in ('worker', 'manager', 'viewer') then
    raise exception 'Unsupported orchard membership role.'
      using errcode = '22023';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where lower(p.email) = v_normalized_email
  limit 1;

  if v_profile_id is null then
    raise exception 'No profile exists for the provided email.'
      using errcode = 'P0001';
  end if;

  select om.id
  into v_membership_id
  from public.orchard_memberships om
  where om.orchard_id = p_orchard_id
    and om.profile_id = v_profile_id
    and om.status = 'active'
  limit 1;

  if v_membership_id is not null then
    raise exception 'An active orchard membership already exists for this profile.'
      using errcode = '23505';
  end if;

  insert into public.orchard_memberships (
    orchard_id,
    profile_id,
    role,
    status,
    invited_by_profile_id
  )
  values (
    p_orchard_id,
    v_profile_id,
    p_role,
    'active',
    auth.uid()
  )
  on conflict on constraint orchard_memberships_orchard_id_profile_id_key
  do update
  set
    role = excluded.role,
    status = 'active',
    invited_by_profile_id = excluded.invited_by_profile_id
  returning orchard_memberships.id
  into v_membership_id;

  return query
  select
    om.id as membership_id,
    om.orchard_id,
    om.profile_id,
    p.email,
    p.display_name,
    om.role,
    om.status,
    om.joined_at
  from public.orchard_memberships om
  join public.profiles p
    on p.id = om.profile_id
  where om.id = v_membership_id;
end;
$$;

revoke execute on function public.invite_orchard_member_by_email(uuid, text, text) from public;
grant execute on function public.invite_orchard_member_by_email(uuid, text, text) to authenticated;
