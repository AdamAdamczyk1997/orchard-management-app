drop policy if exists orchards_update_owner_creator_or_super_admin
on public.orchards;

create policy orchards_update_owner_creator_or_super_admin
on public.orchards
for update
to authenticated
using (
  public.can_manage_orchard(id)
  or coalesce(created_by_profile_id = (select auth.uid()), false)
)
with check (
  public.can_manage_orchard(id)
  or coalesce(created_by_profile_id = (select auth.uid()), false)
);
