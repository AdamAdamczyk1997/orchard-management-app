drop policy if exists orchards_insert_creator_or_super_admin
on public.orchards;

create policy orchards_insert_creator_or_super_admin
on public.orchards
for insert
to authenticated
with check (
  (select auth.uid()) is not null
  and (
    coalesce(created_by_profile_id = (select auth.uid()), false)
    or public.is_super_admin()
  )
);
