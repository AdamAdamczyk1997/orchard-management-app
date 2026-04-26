drop policy if exists orchard_memberships_insert_bootstrap_first_owner
on public.orchard_memberships;

drop policy if exists orchard_memberships_insert_owner_or_super_admin
on public.orchard_memberships;

create policy orchard_memberships_insert_bootstrap_or_manage
on public.orchard_memberships
for insert
to authenticated
with check (
  public.can_bootstrap_orchard_owner(orchard_id, profile_id, role, status)
  or public.can_manage_orchard(orchard_id)
);
