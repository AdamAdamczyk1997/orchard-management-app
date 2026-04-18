alter table public.profiles enable row level security;
alter table public.orchards enable row level security;
alter table public.orchard_memberships enable row level security;
alter table public.plots enable row level security;
alter table public.varieties enable row level security;
alter table public.trees enable row level security;
alter table public.activities enable row level security;
alter table public.activity_scopes enable row level security;
alter table public.activity_materials enable row level security;
alter table public.harvest_records enable row level security;

create policy profiles_select_visible_profiles
on public.profiles
for select
to authenticated
using (public.can_read_profile(id));

create policy profiles_update_self_or_super_admin
on public.profiles
for update
to authenticated
using (coalesce(id = auth.uid(), false) or public.is_super_admin())
with check (coalesce(id = auth.uid(), false) or public.is_super_admin());

create policy orchards_select_member_creator_or_super_admin
on public.orchards
for select
to authenticated
using (
  public.can_read_orchard_data(id)
  or coalesce(created_by_profile_id = auth.uid(), false)
);

create policy orchards_insert_creator_or_super_admin
on public.orchards
for insert
to authenticated
with check (
  auth.uid() is not null
  and (
    coalesce(created_by_profile_id = auth.uid(), false)
    or public.is_super_admin()
  )
);

create policy orchards_update_owner_creator_or_super_admin
on public.orchards
for update
to authenticated
using (
  public.can_manage_orchard(id)
  or coalesce(created_by_profile_id = auth.uid(), false)
)
with check (
  public.can_manage_orchard(id)
  or coalesce(created_by_profile_id = auth.uid(), false)
);

create policy orchards_delete_super_admin_only
on public.orchards
for delete
to authenticated
using (public.is_super_admin());

create policy orchard_memberships_select_self_owner_or_super_admin
on public.orchard_memberships
for select
to authenticated
using (
  coalesce(profile_id = auth.uid(), false)
  or public.can_manage_orchard(orchard_id)
);

create policy orchard_memberships_insert_bootstrap_first_owner
on public.orchard_memberships
for insert
to authenticated
with check (
  public.can_bootstrap_orchard_owner(orchard_id, profile_id, role, status)
);

create policy orchard_memberships_insert_owner_or_super_admin
on public.orchard_memberships
for insert
to authenticated
with check (public.can_manage_orchard(orchard_id));

create policy orchard_memberships_update_owner_or_super_admin
on public.orchard_memberships
for update
to authenticated
using (public.can_manage_orchard(orchard_id))
with check (public.can_manage_orchard(orchard_id));

create policy orchard_memberships_delete_owner_or_super_admin
on public.orchard_memberships
for delete
to authenticated
using (public.can_manage_orchard(orchard_id));

create policy plots_select_member_or_super_admin
on public.plots
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy plots_insert_owner_worker_or_super_admin
on public.plots
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy plots_update_owner_worker_or_super_admin
on public.plots
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy plots_delete_owner_or_super_admin
on public.plots
for delete
to authenticated
using (public.can_manage_orchard(orchard_id));

create policy varieties_select_member_or_super_admin
on public.varieties
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy varieties_insert_owner_worker_or_super_admin
on public.varieties
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy varieties_update_owner_worker_or_super_admin
on public.varieties
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy varieties_delete_owner_or_super_admin
on public.varieties
for delete
to authenticated
using (public.can_manage_orchard(orchard_id));

create policy trees_select_member_or_super_admin
on public.trees
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy trees_insert_owner_worker_or_super_admin
on public.trees
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy trees_update_owner_worker_or_super_admin
on public.trees
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy trees_delete_owner_or_super_admin
on public.trees
for delete
to authenticated
using (public.can_manage_orchard(orchard_id));

create policy activities_select_member_or_super_admin
on public.activities
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy activities_insert_owner_worker_or_super_admin
on public.activities
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy activities_update_owner_worker_or_super_admin
on public.activities
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy activities_delete_owner_worker_or_super_admin
on public.activities
for delete
to authenticated
using (public.can_write_orchard_operational_data(orchard_id));

create policy activity_scopes_select_via_parent_activity
on public.activity_scopes
for select
to authenticated
using (public.can_read_activity_children(activity_id));

create policy activity_scopes_insert_via_parent_activity
on public.activity_scopes
for insert
to authenticated
with check (public.can_write_activity_children(activity_id));

create policy activity_scopes_update_via_parent_activity
on public.activity_scopes
for update
to authenticated
using (public.can_write_activity_children(activity_id))
with check (public.can_write_activity_children(activity_id));

create policy activity_scopes_delete_via_parent_activity
on public.activity_scopes
for delete
to authenticated
using (public.can_write_activity_children(activity_id));

create policy activity_materials_select_via_parent_activity
on public.activity_materials
for select
to authenticated
using (public.can_read_activity_children(activity_id));

create policy activity_materials_insert_via_parent_activity
on public.activity_materials
for insert
to authenticated
with check (public.can_write_activity_children(activity_id));

create policy activity_materials_update_via_parent_activity
on public.activity_materials
for update
to authenticated
using (public.can_write_activity_children(activity_id))
with check (public.can_write_activity_children(activity_id));

create policy activity_materials_delete_via_parent_activity
on public.activity_materials
for delete
to authenticated
using (public.can_write_activity_children(activity_id));

create policy harvest_records_select_member_or_super_admin
on public.harvest_records
for select
to authenticated
using (public.can_read_orchard_data(orchard_id));

create policy harvest_records_insert_owner_worker_or_super_admin
on public.harvest_records
for insert
to authenticated
with check (public.can_write_orchard_operational_data(orchard_id));

create policy harvest_records_update_owner_worker_or_super_admin
on public.harvest_records
for update
to authenticated
using (public.can_write_orchard_operational_data(orchard_id))
with check (public.can_write_orchard_operational_data(orchard_id));

create policy harvest_records_delete_owner_worker_or_super_admin
on public.harvest_records
for delete
to authenticated
using (public.can_write_orchard_operational_data(orchard_id));
