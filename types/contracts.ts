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

export type OrchardSummary = {
  id: string;
  name: string;
  code?: string | null;
  status: OrchardStatus;
  my_role: OrchardMembershipRole;
  membership_status: OrchardMembershipStatus;
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
