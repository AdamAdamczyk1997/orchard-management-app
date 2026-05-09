drop policy if exists orchards_select_member_creator_or_super_admin
on public.orchards;

create policy orchards_select_member_creator_or_super_admin
on public.orchards
for select
to authenticated
using (
  public.can_read_orchard_data(id)
  or coalesce(created_by_profile_id = (select auth.uid()), false)
);
