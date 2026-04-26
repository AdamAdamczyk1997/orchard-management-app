export type ActionResult<T> = {
  success: boolean;
  data?: T;
  error_code?: string;
  message?: string;
  field_errors?: Record<string, string>;
};

export type SystemRole = "user" | "super_admin";
export type OrchardMembershipRole = "owner" | "worker" | "manager" | "viewer";
export type OrchardMembershipStatus = "invited" | "active" | "revoked";
export type OrchardStatus = "active" | "archived";
export type PlotStatus = "planned" | "active" | "archived";
export type TreeConditionStatus =
  | "new"
  | "good"
  | "warning"
  | "critical"
  | "removed";
export type ActivityType =
  | "watering"
  | "fertilizing"
  | "spraying"
  | "pruning"
  | "inspection"
  | "planting"
  | "harvest"
  | "mowing"
  | "weeding"
  | "disease_observation"
  | "pest_observation"
  | "other";
export type ActivityStatus = "planned" | "done" | "skipped" | "cancelled";
export type ActivityScopeLevel =
  | "plot"
  | "section"
  | "row"
  | "location_range"
  | "tree";
export type ActivityPruningSubtype = "winter_pruning" | "summer_pruning";
export type SeasonalActivityType = "pruning" | "mowing" | "spraying";
export type HarvestScopeLevel =
  | "orchard"
  | "plot"
  | "variety"
  | "location_range"
  | "tree";
export type HarvestQuantityUnit = "kg" | "t";

export type ProfileSummary = {
  id: string;
  email: string;
  display_name: string | null;
  system_role: SystemRole;
  locale: string | null;
  timezone: string | null;
  orchard_onboarding_dismissed_at: string | null;
  created_at?: string;
  updated_at?: string;
};

export type OrchardFormInput = {
  name: string;
  code?: string;
  description?: string;
};

export type UpdateOrchardInput = OrchardFormInput;

export type OrchardSummary = {
  id: string;
  name: string;
  code?: string | null;
  status: OrchardStatus;
  my_role: OrchardMembershipRole;
  membership_status: OrchardMembershipStatus;
};

export type OrchardDetails = {
  id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  status: OrchardStatus;
  created_by_profile_id: string;
  created_at?: string;
  updated_at?: string;
};

export type OrchardMembershipSummary = {
  id: string;
  orchard_id: string;
  profile_id: string;
  email?: string | null;
  display_name?: string | null;
  role: OrchardMembershipRole;
  status: OrchardMembershipStatus;
  joined_at?: string | null;
};

export type ActiveOrchardContext = {
  orchard: OrchardSummary | null;
  available_orchards: OrchardSummary[];
  membership?: OrchardMembershipSummary | null;
  requires_onboarding: boolean;
};

export type ResolvedActiveOrchardContext = ActiveOrchardContext & {
  authenticated: boolean;
  user_id: string | null;
  profile: ProfileSummary | null;
  resolved_orchard_id: string | null;
  cookie_orchard_id: string | null;
  should_persist_cookie: boolean;
  should_clear_cookie: boolean;
  error_code?: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  display_name?: string;
};

export type SignInInput = {
  email: string;
  password: string;
};

export type ResetPasswordInput = {
  email: string;
};

export type UpdateProfileInput = {
  display_name?: string;
  locale?: string;
  timezone?: string;
};

export type CreateOrchardInput = OrchardFormInput & {
  dismiss_intro?: boolean;
};

export type InviteOrchardMemberInput = {
  email: string;
  role: "worker" | "manager" | "viewer";
};

export type SetActiveOrchardInput = {
  orchard_id: string;
};

export type CreateOrchardRpcResult = {
  orchard_id: string;
  orchard_name: string;
  orchard_code: string | null;
  orchard_status: OrchardStatus;
  membership_id: string;
  membership_role: OrchardMembershipRole;
  membership_status: OrchardMembershipStatus;
  membership_joined_at: string | null;
};

export type PlotFormInput = {
  name: string;
  code?: string;
  description?: string;
  location_name?: string;
  area_m2?: number;
  soil_type?: string;
  irrigation_type?: string;
  status: PlotStatus;
};

export type PlotSummary = {
  id: string;
  orchard_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  location_name?: string | null;
  area_m2?: number | null;
  soil_type?: string | null;
  irrigation_type?: string | null;
  status: PlotStatus;
  is_active: boolean;
  tree_count?: number;
  created_at?: string;
  updated_at?: string;
};

export type PlotOption = Pick<PlotSummary, "id" | "name" | "status">;

export type PlotListFilters = {
  status?: PlotStatus | "all";
};

export type VarietyFormInput = {
  species: string;
  name: string;
  description?: string;
  care_notes?: string;
  characteristics?: string;
  ripening_period?: string;
  resistance_notes?: string;
  origin_country?: string;
  is_favorite?: boolean;
};

export type VarietySummary = {
  id: string;
  orchard_id: string;
  species: string;
  name: string;
  description?: string | null;
  care_notes?: string | null;
  characteristics?: string | null;
  ripening_period?: string | null;
  resistance_notes?: string | null;
  origin_country?: string | null;
  is_favorite: boolean;
  created_at?: string;
  updated_at?: string;
};

export type VarietyOption = Pick<VarietySummary, "id" | "species" | "name">;

export type VarietyListFilters = {
  q?: string;
};

export type TreeFormInput = {
  plot_id: string;
  variety_id?: string | null;
  species: string;
  tree_code?: string;
  display_name?: string;
  section_name?: string;
  row_number?: number;
  position_in_row?: number;
  row_label?: string;
  position_label?: string;
  planted_at?: string;
  acquired_at?: string;
  rootstock?: string;
  pollinator_info?: string;
  condition_status: TreeConditionStatus;
  health_status?: string;
  development_stage?: string;
  last_harvest_at?: string;
  notes?: string;
  location_verified?: boolean;
};

export type TreeSummary = {
  id: string;
  orchard_id: string;
  plot_id: string;
  plot_name: string;
  plot_status: PlotStatus;
  variety_id?: string | null;
  variety_name?: string | null;
  variety_species?: string | null;
  species: string;
  tree_code?: string | null;
  display_name?: string | null;
  section_name?: string | null;
  row_number?: number | null;
  position_in_row?: number | null;
  row_label?: string | null;
  position_label?: string | null;
  planted_at?: string | null;
  acquired_at?: string | null;
  rootstock?: string | null;
  pollinator_info?: string | null;
  condition_status: TreeConditionStatus;
  health_status?: string | null;
  development_stage?: string | null;
  last_harvest_at?: string | null;
  notes?: string | null;
  location_verified: boolean;
  is_active: boolean;
  location_label: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TreeListFilters = {
  q?: string;
  plot_id?: string;
  variety_id?: string;
  species?: string;
  condition_status?: TreeConditionStatus | "all";
  is_active?: "true" | "false" | "all";
};

export type ActiveMemberOption = {
  profile_id: string;
  email: string;
  display_name?: string | null;
  role: OrchardMembershipRole;
  label: string;
};

export type TreeOption = {
  id: string;
  plot_id: string;
  plot_name: string;
  label: string;
  is_active: boolean;
};

export type DashboardSummary = {
  active_plots_count: number;
  active_trees_count: number;
  recent_activities: Array<{
    id: string;
    title: string;
    activity_date: string;
    status: ActivityStatus;
    plot_name: string;
  }>;
  recent_harvests: Array<{
    id: string;
    harvest_date: string;
    quantity_kg: number;
    plot_name: string;
  }>;
};

export type ActivityScopeInput = {
  scope_order?: number;
  scope_level: ActivityScopeLevel;
  section_name?: string;
  row_number?: number;
  from_position?: number;
  to_position?: number;
  tree_id?: string | null;
  notes?: string;
};

export type ActivityMaterialInput = {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
};

export type ActivityFormInput = {
  plot_id: string;
  tree_id?: string | null;
  activity_type: ActivityType;
  activity_subtype?: ActivityPruningSubtype | null;
  activity_date: string;
  title: string;
  description?: string;
  status: ActivityStatus;
  work_duration_minutes?: number;
  cost_amount?: number;
  weather_notes?: string;
  result_notes?: string;
  performed_by_profile_id?: string | null;
  performed_by?: string;
  season_year?: number;
  season_phase?: string;
  scopes?: ActivityScopeInput[];
  materials?: ActivityMaterialInput[];
};

export type ActivityScopeSummary = {
  id: string;
  scope_order?: number | null;
  scope_level: ActivityScopeLevel;
  section_name?: string | null;
  row_number?: number | null;
  from_position?: number | null;
  to_position?: number | null;
  tree_id?: string | null;
  tree_display_name?: string | null;
  notes?: string | null;
};

export type ActivityMaterialSummary = {
  id: string;
  name: string;
  category?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
};

export type ActivitySummary = {
  id: string;
  orchard_id: string;
  plot_id: string;
  tree_id?: string | null;
  activity_type: ActivityType;
  activity_subtype?: ActivityPruningSubtype | null;
  activity_date: string;
  season_year: number;
  season_phase?: string | null;
  status: ActivityStatus;
  title: string;
  description?: string | null;
  plot_name?: string;
  tree_display_name?: string | null;
  scope_count?: number;
  material_count?: number;
  performed_by_display?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type ActivityListFilters = {
  date_from?: string;
  date_to?: string;
  plot_id?: string;
  tree_id?: string;
  activity_type?: ActivityType | "all";
  status?: ActivityStatus | "all";
  performed_by_profile_id?: string;
};

export type SeasonalActivitySummaryFilters = {
  season_year: number;
  plot_id?: string;
  activity_type: SeasonalActivityType;
  activity_subtype?: ActivityPruningSubtype;
  performed_by_profile_id?: string;
};

export type SeasonalActivityCoverageFilters = SeasonalActivitySummaryFilters & {
  plot_id: string;
};

export type SeasonalActivitySummary = {
  season_year: number;
  activity_type: SeasonalActivityType;
  activity_subtype?: ActivityPruningSubtype | null;
  total_done_count: number;
  affected_plots: Array<{
    plot_id: string;
    plot_name: string;
    total_done_count: number;
    last_activity_date: string | null;
  }>;
};

export type SeasonalActivityCoverage = Array<{
  activity_id: string;
  activity_date: string;
  status: ActivityStatus;
  plot_id: string;
  plot_name: string;
  activity_type: SeasonalActivityType;
  activity_subtype?: ActivityPruningSubtype | null;
  scope: ActivityScopeSummary;
}>;

export type ActivityDetails = ActivitySummary & {
  work_duration_minutes?: number | null;
  cost_amount?: number | null;
  weather_notes?: string | null;
  result_notes?: string | null;
  performed_by_profile_id?: string | null;
  created_by_profile_id: string;
  scopes: ActivityScopeSummary[];
  materials: ActivityMaterialSummary[];
};

export type HarvestRecordFormInput = {
  plot_id?: string | null;
  variety_id?: string | null;
  tree_id?: string | null;
  activity_id?: string | null;
  scope_level: HarvestScopeLevel;
  harvest_date: string;
  season_year?: number;
  section_name?: string;
  row_number?: number;
  from_position?: number;
  to_position?: number;
  quantity_value: number;
  quantity_unit: HarvestQuantityUnit;
  notes?: string;
};

export type HarvestRecordSummary = {
  id: string;
  orchard_id: string;
  plot_id?: string | null;
  variety_id?: string | null;
  tree_id?: string | null;
  activity_id?: string | null;
  scope_level: HarvestScopeLevel;
  harvest_date: string;
  season_year: number;
  section_name?: string | null;
  row_number?: number | null;
  from_position?: number | null;
  to_position?: number | null;
  quantity_value: number;
  quantity_unit: HarvestQuantityUnit;
  quantity_kg: number;
  notes?: string | null;
  plot_name?: string | null;
  variety_name?: string | null;
  variety_species?: string | null;
  tree_display_name?: string | null;
  activity_title?: string | null;
  created_by_display?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type HarvestRecordDetails = HarvestRecordSummary & {
  created_by_profile_id: string;
};

export type HarvestRecordListFilters = {
  season_year: number;
  date_from?: string;
  date_to?: string;
  plot_id?: string;
  variety_id?: string;
};

export type HarvestActivityOption = {
  id: string;
  plot_id: string;
  tree_id?: string | null;
  label: string;
};

export type HarvestSeasonSummaryFilters = {
  season_year: number;
  plot_id?: string;
  variety_id?: string;
};

export type HarvestSeasonSummary = {
  season_year: number;
  total_quantity_kg: number;
  record_count: number;
  by_variety: Array<{
    variety_id: string;
    variety_name: string | null;
    total_quantity_kg: number;
    record_count: number;
  }>;
  by_plot: Array<{
    plot_id: string;
    plot_name: string | null;
    total_quantity_kg: number;
    record_count: number;
  }>;
};

export type HarvestTimelineFilters = HarvestSeasonSummaryFilters;

export type HarvestTimelineEntry = {
  harvest_date: string;
  total_quantity_kg: number;
  record_count: number;
};

export type HarvestTimeline = HarvestTimelineEntry[];
