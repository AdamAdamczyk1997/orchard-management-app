alter function public.set_updated_at()
  set search_path = public;

alter function public.derive_season_year_from_date(date)
  set search_path = public;

alter function public.normalize_harvest_quantity_to_kg(numeric, text)
  set search_path = public;

alter function public.sync_orchard_membership_joined_at()
  set search_path = public;

alter function public.validate_tree_consistency()
  set search_path = public;

alter function public.set_activity_derived_fields_and_validate()
  set search_path = public;

alter function public.validate_activity_scope_consistency()
  set search_path = public;

alter function public.set_harvest_derived_fields_and_validate()
  set search_path = public;

alter function public.guard_profile_self_service_update()
  set search_path = public;
