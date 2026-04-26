drop policy if exists orchard_memberships_select_self_owner_or_super_admin
on public.orchard_memberships;

create policy orchard_memberships_select_self_owner_or_super_admin
on public.orchard_memberships
for select
to authenticated
using (
  coalesce(profile_id = (select auth.uid()), false)
  or public.can_manage_orchard(orchard_id)
);
