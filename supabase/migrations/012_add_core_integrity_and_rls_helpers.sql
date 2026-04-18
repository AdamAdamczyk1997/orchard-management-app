create or replace function public.sync_orchard_membership_joined_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'active' and new.joined_at is null then
    if tg_op = 'UPDATE' and old.joined_at is not null then
      new.joined_at = old.joined_at;
    else
      new.joined_at = now();
    end if;
  end if;

  return new;
end;
$$;

create trigger sync_orchard_membership_joined_at_before_write
before insert or update on public.orchard_memberships
for each row
execute function public.sync_orchard_membership_joined_at();

create or replace function public.validate_tree_consistency()
returns trigger
language plpgsql
as $$
declare
  v_plot_orchard_id uuid;
  v_variety_orchard_id uuid;
begin
  select orchard_id
  into v_plot_orchard_id
  from public.plots
  where id = new.plot_id;

  if v_plot_orchard_id is null then
    raise exception 'Tree plot does not exist.'
      using errcode = '23514';
  end if;

  if new.orchard_id <> v_plot_orchard_id then
    raise exception 'Tree orchard_id must match plot orchard_id.'
      using errcode = '23514';
  end if;

  if new.variety_id is not null then
    select orchard_id
    into v_variety_orchard_id
    from public.varieties
    where id = new.variety_id;

    if v_variety_orchard_id is null then
      raise exception 'Tree variety does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_variety_orchard_id then
      raise exception 'Tree orchard_id must match variety orchard_id.'
        using errcode = '23514';
    end if;
  end if;

  if new.condition_status = 'removed' then
    new.is_active = false;
  end if;

  return new;
end;
$$;

create trigger validate_tree_consistency_before_write
before insert or update on public.trees
for each row
execute function public.validate_tree_consistency();

create or replace function public.set_activity_derived_fields_and_validate()
returns trigger
language plpgsql
as $$
declare
  v_plot_orchard_id uuid;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
begin
  new.season_year = public.derive_season_year_from_date(new.activity_date);

  select orchard_id
  into v_plot_orchard_id
  from public.plots
  where id = new.plot_id;

  if v_plot_orchard_id is null then
    raise exception 'Activity plot does not exist.'
      using errcode = '23514';
  end if;

  if new.orchard_id <> v_plot_orchard_id then
    raise exception 'Activity orchard_id must match plot orchard_id.'
      using errcode = '23514';
  end if;

  if new.tree_id is not null then
    select orchard_id, plot_id
    into v_tree_orchard_id, v_tree_plot_id
    from public.trees
    where id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Activity tree does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_tree_orchard_id or new.plot_id <> v_tree_plot_id then
      raise exception 'Activity tree must belong to the same orchard and plot as the activity.'
        using errcode = '23514';
    end if;
  end if;

  if new.performed_by_profile_id is not null and not exists (
    select 1
    from public.orchard_memberships om
    where om.orchard_id = new.orchard_id
      and om.profile_id = new.performed_by_profile_id
      and om.status = 'active'
  ) then
    raise exception 'Activity performer must have an active membership in the same orchard.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger set_activity_derived_fields_and_validate_before_write
before insert or update on public.activities
for each row
execute function public.set_activity_derived_fields_and_validate();

create or replace function public.validate_activity_scope_consistency()
returns trigger
language plpgsql
as $$
declare
  v_activity_orchard_id uuid;
  v_activity_plot_id uuid;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
begin
  select orchard_id, plot_id
  into v_activity_orchard_id, v_activity_plot_id
  from public.activities
  where id = new.activity_id;

  if v_activity_orchard_id is null then
    raise exception 'Activity scope parent activity does not exist.'
      using errcode = '23514';
  end if;

  if new.tree_id is not null then
    select orchard_id, plot_id
    into v_tree_orchard_id, v_tree_plot_id
    from public.trees
    where id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Activity scope tree does not exist.'
        using errcode = '23514';
    end if;

    if v_tree_orchard_id <> v_activity_orchard_id or v_tree_plot_id <> v_activity_plot_id then
      raise exception 'Activity scope tree must belong to the same orchard and plot as the parent activity.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger validate_activity_scope_consistency_before_write
before insert or update on public.activity_scopes
for each row
execute function public.validate_activity_scope_consistency();

create or replace function public.set_harvest_derived_fields_and_validate()
returns trigger
language plpgsql
as $$
declare
  v_plot_orchard_id uuid;
  v_variety_orchard_id uuid;
  v_tree_orchard_id uuid;
  v_tree_plot_id uuid;
  v_tree_variety_id uuid;
  v_activity_orchard_id uuid;
  v_activity_plot_id uuid;
  v_activity_tree_id uuid;
begin
  new.season_year = public.derive_season_year_from_date(new.harvest_date);
  new.quantity_kg = public.normalize_harvest_quantity_to_kg(new.quantity_value, new.quantity_unit);

  if new.plot_id is not null then
    select orchard_id
    into v_plot_orchard_id
    from public.plots
    where id = new.plot_id;

    if v_plot_orchard_id is null then
      raise exception 'Harvest plot does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_plot_orchard_id then
      raise exception 'Harvest orchard_id must match plot orchard_id.'
        using errcode = '23514';
    end if;
  end if;

  if new.variety_id is not null then
    select orchard_id
    into v_variety_orchard_id
    from public.varieties
    where id = new.variety_id;

    if v_variety_orchard_id is null then
      raise exception 'Harvest variety does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_variety_orchard_id then
      raise exception 'Harvest orchard_id must match variety orchard_id.'
        using errcode = '23514';
    end if;
  end if;

  if new.tree_id is not null then
    select orchard_id, plot_id, variety_id
    into v_tree_orchard_id, v_tree_plot_id, v_tree_variety_id
    from public.trees
    where id = new.tree_id;

    if v_tree_orchard_id is null then
      raise exception 'Harvest tree does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_tree_orchard_id then
      raise exception 'Harvest orchard_id must match tree orchard_id.'
        using errcode = '23514';
    end if;

    if new.plot_id is not null and new.plot_id <> v_tree_plot_id then
      raise exception 'Harvest plot_id must match tree plot_id when tree_id is provided.'
        using errcode = '23514';
    end if;

    if new.variety_id is not null and v_tree_variety_id is not null and new.variety_id <> v_tree_variety_id then
      raise exception 'Harvest variety_id must match tree variety_id when both values are present.'
        using errcode = '23514';
    end if;
  end if;

  if new.activity_id is not null then
    select orchard_id, plot_id, tree_id
    into v_activity_orchard_id, v_activity_plot_id, v_activity_tree_id
    from public.activities
    where id = new.activity_id;

    if v_activity_orchard_id is null then
      raise exception 'Harvest activity does not exist.'
        using errcode = '23514';
    end if;

    if new.orchard_id <> v_activity_orchard_id then
      raise exception 'Harvest orchard_id must match activity orchard_id.'
        using errcode = '23514';
    end if;

    if new.plot_id is not null and v_activity_plot_id is not null and new.plot_id <> v_activity_plot_id then
      raise exception 'Harvest plot_id must match activity plot_id when both values are present.'
        using errcode = '23514';
    end if;

    if new.tree_id is not null and v_activity_tree_id is not null and new.tree_id <> v_activity_tree_id then
      raise exception 'Harvest tree_id must match activity tree_id when both values are present.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create trigger set_harvest_derived_fields_and_validate_before_write
before insert or update on public.harvest_records
for each row
execute function public.set_harvest_derived_fields_and_validate();

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.system_role = 'super_admin'
  );
$$;

create or replace function public.is_active_orchard_member(target_orchard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orchard_memberships om
    where om.orchard_id = target_orchard_id
      and om.profile_id = auth.uid()
      and om.status = 'active'
  );
$$;

create or replace function public.has_orchard_role(
  target_orchard_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.orchard_memberships om
    where om.orchard_id = target_orchard_id
      and om.profile_id = auth.uid()
      and om.status = 'active'
      and om.role = any(allowed_roles)
  );
$$;

create or replace function public.is_orchard_owner(target_orchard_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_orchard_role(target_orchard_id, array['owner']::text[]);
$$;

revoke execute on function public.is_super_admin() from public;
revoke execute on function public.is_active_orchard_member(uuid) from public;
revoke execute on function public.has_orchard_role(uuid, text[]) from public;
revoke execute on function public.is_orchard_owner(uuid) from public;

grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.is_active_orchard_member(uuid) to authenticated;
grant execute on function public.has_orchard_role(uuid, text[]) to authenticated;
grant execute on function public.is_orchard_owner(uuid) to authenticated;
