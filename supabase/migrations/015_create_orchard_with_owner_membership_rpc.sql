create or replace function public.create_orchard_with_owner_membership(
  p_name text,
  p_code text default null,
  p_description text default null
)
returns table (
  orchard_id uuid,
  orchard_name text,
  orchard_code text,
  orchard_status text,
  membership_id uuid,
  membership_role text,
  membership_status text,
  membership_joined_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_orchard_id uuid;
  v_membership_id uuid;
  v_membership_joined_at timestamptz;
begin
  v_profile_id := auth.uid();

  if v_profile_id is null then
    raise exception 'Authentication is required to create an orchard.'
      using errcode = '42501';
  end if;

  insert into public.orchards (
    name,
    code,
    description,
    created_by_profile_id
  )
  values (
    trim(p_name),
    nullif(trim(coalesce(p_code, '')), ''),
    nullif(trim(coalesce(p_description, '')), ''),
    v_profile_id
  )
  returning id
  into v_orchard_id;

  insert into public.orchard_memberships (
    orchard_id,
    profile_id,
    role,
    status
  )
  values (
    v_orchard_id,
    v_profile_id,
    'owner',
    'active'
  )
  returning id, joined_at
  into v_membership_id, v_membership_joined_at;

  return query
  select
    o.id,
    o.name,
    o.code,
    o.status,
    om.id,
    om.role,
    om.status,
    om.joined_at
  from public.orchards o
  join public.orchard_memberships om
    on om.orchard_id = o.id
  where o.id = v_orchard_id
    and om.id = v_membership_id;
end;
$$;

revoke execute on function public.create_orchard_with_owner_membership(text, text, text) from public;
grant execute on function public.create_orchard_with_owner_membership(text, text, text) to authenticated;
