# OrchardLog / Sadownik+ - kontrakty danych

## Cel dokumentu

Ten dokument opisuje robocze ksztalty danych przekazywanych miedzy formularzami, server actions i warstwa danych.

## Zasada ogolna

- Kontrakty powinny byc zgodne z modelem bazy, ale dopasowane do potrzeb formularzy i widokow.
- Nie kazda odpowiedz musi zwracac caly rekord z bazy.
- Mutacje powinny zwracac ustandaryzowany wynik.
- Standardowe formularze domenowe nie przesylaja recznie `orchard_id`, bo pracuja w kontekscie `active_orchard`.

## 1. Wspolny wynik operacji

```ts
type ActionResult<T> = {
  success: boolean
  data?: T
  error_code?: string
  message?: string
  field_errors?: Record<string, string>
}
```

## 2. Kontrakt auth i profilu

```ts
type SignUpInput = {
  email: string
  password: string
  display_name?: string
}

type SignInInput = {
  email: string
  password: string
}

type ResetPasswordInput = {
  email: string
}

type UpdateProfileInput = {
  display_name?: string
  locale?: string
  timezone?: string
}
```

Uwagi Phase 1:

- `signUp` przekazuje do auth metadata:
  - `display_name`
  - `locale = "pl"`
  - `timezone = "Europe/Warsaw"`
- `resetPassword` w Phase 1 obsluguje tylko request reset linku, bez pelnego recovery flow

## 3. Kontrakt orchard i kontekstu pracy

```ts
type OrchardFormInput = {
  name: string
  code?: string
  description?: string
}

type UpdateOrchardInput = OrchardFormInput

type CreateOrchardInput = OrchardFormInput & {
  dismiss_intro?: boolean
}

type OrchardSummary = {
  id: string
  name: string
  code?: string | null
  status: "active" | "archived"
  my_role: "owner" | "worker" | "manager" | "viewer"
  membership_status: "invited" | "active" | "revoked"
}

type OrchardMembershipSummary = {
  id: string
  orchard_id: string
  profile_id: string
  email?: string | null
  display_name?: string | null
  role: "owner" | "worker" | "manager" | "viewer"
  status: "invited" | "active" | "revoked"
  joined_at?: string | null
}

type OrchardDetails = {
  id: string
  name: string
  code?: string | null
  description?: string | null
  status: "active" | "archived"
  created_by_profile_id: string
  created_at?: string
  updated_at?: string
}

type InviteOrchardMemberInput = {
  email: string
  role: "worker" | "manager" | "viewer"
}

type ActiveOrchardContext = {
  orchard: OrchardSummary | null
  available_orchards: OrchardSummary[]
  membership?: OrchardMembershipSummary | null
  requires_onboarding: boolean
}
```

Uwagi Phase 1:

- `active_orchard` jest utrwalany w `httpOnly` cookie `ol_active_orchard`
- standardowe formularze domenowe nadal nie przesylaja recznie `orchard_id`
- obecny UI MVP dla `inviteOrchardMember` korzysta z tego kontraktu future-ready,
  ale aktualnie wysyla tylko role `worker` i dodaje istniejace konto od razu jako
  aktywne membership

## 4. Kontrakt formularza dzialki

```ts
type PlotFormInput = {
  name: string
  code?: string
  description?: string
  location_name?: string
  area_m2?: number
  soil_type?: string
  irrigation_type?: string
  status: "planned" | "active" | "archived"
}

type PlotSummary = {
  id: string
  orchard_id: string
  name: string
  code?: string | null
  description?: string | null
  location_name?: string | null
  area_m2?: number | null
  soil_type?: string | null
  irrigation_type?: string | null
  status: "planned" | "active" | "archived"
  is_active: boolean
  created_at: string
  updated_at: string
}

type PlotOption = {
  id: string
  name: string
  status: "planned" | "active" | "archived"
}

type PlotListFilters = {
  status?: "active" | "planned" | "archived" | "all"
}
```

## 5. Kontrakt formularza drzewa

```ts
type TreeFormInput = {
  plot_id: string
  variety_id?: string | null
  species: string
  tree_code?: string
  display_name?: string
  section_name?: string
  row_number?: number
  position_in_row?: number
  row_label?: string
  position_label?: string
  planted_at?: string
  acquired_at?: string
  rootstock?: string
  pollinator_info?: string
  condition_status: "new" | "good" | "warning" | "critical" | "removed"
  health_status?: string
  development_stage?: string
  last_harvest_at?: string
  notes?: string
  location_verified?: boolean
}

type TreeSummary = {
  id: string
  orchard_id: string
  plot_id: string
  plot_name: string
  plot_status: "planned" | "active" | "archived"
  species: string
  tree_code?: string | null
  display_name?: string | null
  section_name?: string | null
  row_number?: number | null
  position_in_row?: number | null
  row_label?: string | null
  position_label?: string | null
  planted_at?: string | null
  acquired_at?: string | null
  rootstock?: string | null
  pollinator_info?: string | null
  variety_name?: string | null
  variety_species?: string | null
  location_label?: string | null
  condition_status: "new" | "good" | "warning" | "critical" | "removed"
  health_status?: string | null
  development_stage?: string | null
  last_harvest_at?: string | null
  notes?: string | null
  location_verified: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

type TreeListFilters = {
  q?: string
  plot_id?: string
  variety_id?: string
  species?: string
  condition_status?: "new" | "good" | "warning" | "critical" | "removed" | "all"
  is_active?: "true" | "false" | "all"
}
```

## 6. Kontrakt formularza odmiany

```ts
type VarietyFormInput = {
  species: string
  name: string
  description?: string
  care_notes?: string
  characteristics?: string
  ripening_period?: string
  resistance_notes?: string
  origin_country?: string
  is_favorite?: boolean
}

type VarietySummary = {
  id: string
  orchard_id: string
  species: string
  name: string
  description?: string | null
  care_notes?: string | null
  characteristics?: string | null
  ripening_period?: string | null
  resistance_notes?: string | null
  origin_country?: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

type VarietyOption = {
  id: string
  species: string
  name: string
}

type VarietyListFilters = {
  q?: string
}
```

Uwagi Phase 2:

- `plots`, `varieties` i `trees` maja osobne listy `new` / `edit`, ale bez dedykowanych detail pages.
- formularz drzewa nie pozwala wybrac archiwalnej dzialki do zapisu.
- standardowe formularze nadal nie przesylaja `orchard_id`; wszystko rozstrzyga `active_orchard`.

## 7. Kontrakt formularza aktywnosci

```ts
type ActivityMaterialInput = {
  name: string
  category?: string
  quantity?: number
  unit?: string
  notes?: string
}

type ActivityScopeInput = {
  scope_order?: number
  scope_level: "plot" | "section" | "row" | "location_range" | "tree"
  section_name?: string
  row_number?: number
  from_position?: number
  to_position?: number
  tree_id?: string | null
  notes?: string
}

type ActivityFormInput = {
  plot_id: string
  tree_id?: string | null
  activity_type:
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
    | "other"
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  activity_date: string
  title: string
  description?: string
  status: "planned" | "done" | "skipped" | "cancelled"
  work_duration_minutes?: number
  cost_amount?: number
  weather_notes?: string
  result_notes?: string
  performed_by_profile_id?: string | null
  performed_by?: string
  season_year?: number
  season_phase?: string
  scopes?: ActivityScopeInput[]
  materials?: ActivityMaterialInput[]
}

type ActivitySummary = {
  id: string
  plot_id: string
  tree_id?: string | null
  activity_type: ActivityFormInput["activity_type"]
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  activity_date: string
  season_year: number
  season_phase?: string | null
  status: "planned" | "done" | "skipped" | "cancelled"
  title: string
  plot_name?: string
  tree_display_name?: string | null
  scope_count?: number
  performed_by_display?: string | null
}

type ActivityListFilters = {
  date_from?: string
  date_to?: string
  plot_id?: string
  tree_id?: string
  activity_type?: ActivityFormInput["activity_type"] | "all"
  status?: "planned" | "done" | "skipped" | "cancelled" | "all"
  performed_by_profile_id?: string
}

type ActivityScopeSummary = {
  id: string
  scope_order?: number | null
  scope_level: "plot" | "section" | "row" | "location_range" | "tree"
  section_name?: string | null
  row_number?: number | null
  from_position?: number | null
  to_position?: number | null
  tree_id?: string | null
  tree_display_name?: string | null
  notes?: string | null
}

type ActivityMaterialSummary = {
  id: string
  name: string
  category?: string | null
  quantity?: number | null
  unit?: string | null
  notes?: string | null
}

type ActivityDetails = ActivitySummary & {
  orchard_id: string
  description?: string | null
  work_duration_minutes?: number | null
  cost_amount?: number | null
  weather_notes?: string | null
  result_notes?: string | null
  performed_by_profile_id?: string | null
  created_by_profile_id: string
  scopes: ActivityScopeSummary[]
  materials: ActivityMaterialSummary[]
  created_at: string
  updated_at: string
}

type SeasonalActivitySummary = {
  season_year: number
  activity_type: ActivityFormInput["activity_type"]
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  total_done_count: number
  affected_plots: Array<{
    plot_id: string
    plot_name: string
    total_done_count: number
    last_activity_date: string | null
  }>
}

type SeasonalActivityCoverage = Array<{
  activity_id: string
  activity_date: string
  status: "planned" | "done" | "skipped" | "cancelled"
  plot_id: string
  plot_name: string
  activity_type: ActivityFormInput["activity_type"]
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  scope: ActivityScopeSummary
}>
```

Uwagi Phase 3:

- `ActivityFormInput.scopes` powinno zawierac co najmniej jeden scope dla dedykowanych
  sezonowych flow `pruning`, `mowing` i `spraying`; dla calej dzialki jest to scope `plot`
- `getActivityDetails` powinno zwracac parent record razem z uporzadkowanymi
  `activity_scopes` i `activity_materials` w jednym payloadzie
- `getSeasonalActivityCoverage` powinno opierac sie na zapisanych `activity_scopes`,
  a nie na inferencji z samych statusow drzew lub dzialek

## 8. Kontrakt formularza zbioru

```ts
type HarvestRecordFormInput = {
  plot_id?: string | null
  variety_id?: string | null
  tree_id?: string | null
  activity_id?: string | null
  scope_level: "orchard" | "plot" | "variety" | "location_range" | "tree"
  harvest_date: string
  season_year?: number
  section_name?: string
  row_number?: number
  from_position?: number
  to_position?: number
  quantity_value: number
  quantity_unit: "kg" | "t"
  notes?: string
}

type HarvestRecordSummary = {
  id: string
  harvest_date: string
  season_year: number
  scope_level: "orchard" | "plot" | "variety" | "location_range" | "tree"
  quantity_unit: "kg" | "t"
  quantity_value: number
  quantity_kg: number
  plot_name?: string | null
  variety_name?: string | null
}

type HarvestSeasonSummary = {
  season_year: number
  total_quantity_kg: number
  by_variety: Array<{
    variety_id: string | null
    variety_name: string | null
    total_quantity_kg: number
  }>
  by_plot: Array<{
    plot_id: string | null
    plot_name: string | null
    total_quantity_kg: number
  }>
}
```

## 8. Kontrakt batch create - etap 0.2

```ts
type BulkTreeBatchInput = {
  plot_id: string
  species: string
  variety_id?: string | null
  section_name?: string
  row_number: number
  from_position: number
  to_position: number
  generated_tree_code_pattern?: string
  default_condition_status?: "new" | "good" | "warning" | "critical" | "removed"
  default_planted_at?: string
  default_rootstock?: string
  default_notes?: string
}
```

## 9. Kontrakt masowego oznaczania drzew jako `removed` - etap 0.2

```ts
type BulkDeactivateTreesInput = {
  plot_id: string
  row_number: number
  from_position: number
  to_position: number
  reason?: string
}

type BulkDeactivateTreesResult = {
  plot_id: string
  row_number: number
  from_position: number
  to_position: number
  matched_trees_count: number
  deactivated_trees_count: number
  already_inactive_count: number
  empty_positions_count: number
}
```

## 10. Kontrakt dashboardu

```ts
type DashboardSummary = {
  active_plots_count: number
  active_trees_count: number
  recent_activities: Array<{
    id: string
    title: string
    activity_date: string
    status: string
    plot_name: string
  }>
  recent_harvests: Array<{
    id: string
    harvest_date: string
    quantity_kg: number
    plot_name?: string | null
  }>
  upcoming_activities: Array<{
    id: string
    title: string
    activity_date: string
    plot_name: string
  }>
}
```

## 11. Kontrakt eksportu

```ts
type ExportAccountDataResult = {
  version: "1"
  exported_at: string
  profile: {
    id: string
    email: string
    display_name?: string | null
    locale?: string | null
    timezone?: string | null
  }
  orchards: Array<{
    orchard: {
      id: string
      name: string
      code?: string | null
      description?: string | null
      status: "active" | "archived"
      created_by_profile_id: string
      created_at: string
      updated_at: string
    }
    orchard_memberships: OrchardMembershipSummary[]
    plots: PlotSummary[]
    varieties: Array<Record<string, unknown>>
    trees: Array<Record<string, unknown>>
    activities: Array<Record<string, unknown>>
    activity_scopes: Array<Record<string, unknown>>
    activity_materials: Array<Record<string, unknown>>
    harvest_records: Array<Record<string, unknown>>
  }>
}
```

## 12. Zasada dla mapowania danych

- Formularze nie musza znac calego rekordu bazy.
- Widoki list powinny dostawac lekkie `summary`.
- Widoki detali powinny dostawac bogatsze payloady, ale tylko dla jednego obiektu.
