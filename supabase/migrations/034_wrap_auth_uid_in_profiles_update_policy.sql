drop policy if exists profiles_update_self_or_super_admin
on public.profiles;

create policy profiles_update_self_or_super_admin
on public.profiles
for update
to authenticated
using (
  coalesce(id = (select auth.uid()), false)
  or public.is_super_admin()
)
with check (
  coalesce(id = (select auth.uid()), false)
  or public.is_super_admin()
);
