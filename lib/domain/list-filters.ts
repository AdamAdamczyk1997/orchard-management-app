import type {
  ActivityListFilters,
  HarvestRecordListFilters,
  PlotListFilters,
  TreeListFilters,
  VarietyListFilters,
} from "@/types/contracts";

function hasTextValue(value?: string) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasActivePlotListFilters(filters: PlotListFilters) {
  return hasTextValue(filters.status);
}

export function hasActiveVarietyListFilters(filters: VarietyListFilters) {
  return hasTextValue(filters.q);
}

export function hasActiveTreeListFilters(filters: TreeListFilters) {
  return (
    hasTextValue(filters.q) ||
    hasTextValue(filters.plot_id) ||
    hasTextValue(filters.variety_id) ||
    hasTextValue(filters.species) ||
    (hasTextValue(filters.condition_status) && filters.condition_status !== "all") ||
    (hasTextValue(filters.is_active) && filters.is_active !== "true")
  );
}

export function hasActiveActivityListFilters(filters: ActivityListFilters) {
  return (
    hasTextValue(filters.date_from) ||
    hasTextValue(filters.date_to) ||
    hasTextValue(filters.plot_id) ||
    hasTextValue(filters.tree_id) ||
    hasTextValue(filters.performed_by_profile_id) ||
    (hasTextValue(filters.activity_type) && filters.activity_type !== "all") ||
    (hasTextValue(filters.status) && filters.status !== "all")
  );
}

export function hasActiveHarvestListFilters(
  filters: HarvestRecordListFilters,
  defaultSeasonYear: number,
) {
  return (
    filters.season_year !== defaultSeasonYear ||
    hasTextValue(filters.date_from) ||
    hasTextValue(filters.date_to) ||
    hasTextValue(filters.plot_id) ||
    hasTextValue(filters.variety_id)
  );
}
