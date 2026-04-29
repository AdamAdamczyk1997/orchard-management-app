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
  layout_type: "rows" | "mixed" | "irregular"
  row_numbering_scheme?:
    | "left_to_right_from_entrance"
    | "right_to_left_from_entrance"
    | "north_to_south"
    | "south_to_north"
    | "custom"
  tree_numbering_scheme?: "from_row_start" | "from_row_end" | "custom"
  entrance_description?: string
  layout_notes?: string
  default_row_count?: number
  default_trees_per_row?: number
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
  layout_type: "rows" | "mixed" | "irregular"
  row_numbering_scheme?:
    | "left_to_right_from_entrance"
    | "right_to_left_from_entrance"
    | "north_to_south"
    | "south_to_north"
    | "custom"
    | null
  tree_numbering_scheme?: "from_row_start" | "from_row_end" | "custom" | null
  entrance_description?: string | null
  layout_notes?: string | null
  default_row_count?: number | null
  default_trees_per_row?: number | null
  status: "planned" | "active" | "archived"
  is_active: boolean
  created_at: string
  updated_at: string
}

type PlotOption = {
  id: string
  name: string
  status: "planned" | "active" | "archived"
  layout_type: "rows" | "mixed" | "irregular"
  row_numbering_scheme?:
    | "left_to_right_from_entrance"
    | "right_to_left_from_entrance"
    | "north_to_south"
    | "south_to_north"
    | "custom"
    | null
  tree_numbering_scheme?: "from_row_start" | "from_row_end" | "custom" | null
  entrance_description?: string | null
  layout_notes?: string | null
  default_row_count?: number | null
  default_trees_per_row?: number | null
}

type PlotListFilters = {
  status?: "active" | "planned" | "archived" | "all"
}
```

Uwagi Phase 6E:

- `layout_type` jest wymagane i domyslnie przyjmuje `rows`
- `row_numbering_scheme` oraz `tree_numbering_scheme` pozostaja opcjonalne, bo nie kazda dzialka ma ustalona numeracje
- `default_row_count` i `default_trees_per_row` sa dodatnimi liczbami calkowitymi, jesli sa podane

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

Uwagi Phase 6F:

- `PlotOption` niesie juz wystarczajaco duzo danych do plot-aware guidance na formularzach `trees` i batchowych.
- `TreeFormInput` pozostaje ten sam shape, ale server-side walidacja zalezy teraz od `plot.layout_type`.
- Dla `rows` wymagane sa `row_number` i `position_in_row`.
- Dla `mixed` i `irregular` wymagane jest co najmniej jedno praktyczne oznaczenie lokalizacji.

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

type VarietyLocationsReportFilters = {
  variety_id?: string
}

type VarietyLocationRange = {
  from_position: number
  to_position: number
  tree_count: number
  verified_trees_count: number
  unverified_trees_count: number
}

type VarietyLocationGroup = {
  plot_id: string
  plot_name: string
  plot_status: "planned" | "active" | "archived"
  section_name?: string | null
  row_number: number
  tree_count: number
  verified_trees_count: number
  unverified_trees_count: number
  ranges: VarietyLocationRange[]
}

type VarietyLocationsReport = {
  variety_id: string
  variety_name: string
  variety_species: string
  total_active_trees_count: number
  located_trees_count: number
  unlocated_trees_count: number
  verified_trees_count: number
  unverified_trees_count: number
  groups: VarietyLocationGroup[]
}
```

Uwagi Phase 2:

- `plots`, `varieties` i `trees` maja osobne listy `new` / `edit`, ale bez dedykowanych detail pages.
- formularz drzewa nie pozwala wybrac archiwalnej dzialki do zapisu.
- standardowe formularze nadal nie przesylaja `orchard_id`; wszystko rozstrzyga `active_orchard`.

Uwagi Phase 6C:

- `VarietyLocationsReport.groups` obejmuja tylko aktywne drzewa z kompletnym `row_number` i `position_in_row`.
- `unlocated_trees_count` pokazuje aktywne drzewa wybranej odmiany, ktore nie trafily do grup terenowych.
- `verified_trees_count` i `unverified_trees_count` odnosza sie do drzew obecnych w raporcie, nie do wszystkich historycznych rekordow odmiany.

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
  orchard_id: string
  plot_id: string
  tree_id?: string | null
  activity_type: ActivityFormInput["activity_type"]
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  activity_date: string
  season_year: number
  season_phase?: string | null
  status: "planned" | "done" | "skipped" | "cancelled"
  title: string
  description?: string | null
  plot_name?: string
  tree_display_name?: string | null
  scope_count?: number
  material_count?: number
  performed_by_display?: string | null
  created_at?: string
  updated_at?: string
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
  work_duration_minutes?: number | null
  cost_amount?: number | null
  weather_notes?: string | null
  result_notes?: string | null
  performed_by_profile_id?: string | null
  created_by_profile_id: string
  scopes: ActivityScopeSummary[]
  materials: ActivityMaterialSummary[]
}

type SeasonalActivitySummary = {
  season_year: number
  activity_type: "pruning" | "mowing" | "spraying"
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  total_done_count: number
  affected_plots: Array<{
    plot_id: string
    plot_name: string
    total_done_count: number
    last_activity_date: string | null
  }>
}

type SeasonalActivitySummaryFilters = {
  season_year: number
  plot_id?: string
  activity_type: "pruning" | "mowing" | "spraying"
  activity_subtype?: "winter_pruning" | "summer_pruning"
  performed_by_profile_id?: string
}

type SeasonalActivityCoverageFilters = SeasonalActivitySummaryFilters & {
  plot_id: string
}

type SeasonalActivityCoverage = Array<{
  activity_id: string
  activity_date: string
  status: "planned" | "done" | "skipped" | "cancelled"
  plot_id: string
  plot_name: string
  activity_type: "pruning" | "mowing" | "spraying"
  activity_subtype?: "winter_pruning" | "summer_pruning" | null
  scope: ActivityScopeSummary
}>
```

Uwagi Phase 3:

- `ActivityFormInput.scopes` powinno zawierac co najmniej jeden scope dla dedykowanych
  sezonowych flow `pruning`, `mowing` i `spraying`; dla calej dzialki jest to scope `plot`
- formularz aktywnosci korzysta z `PlotOption` do guidance po wyborze dzialki
- dla dzialki `irregular` scope `row` i `location_range` sa blokowane, nawet jesli sam shape `ActivityScopeInput` nadal je opisuje
- `getActivityDetails` powinno zwracac parent record razem z uporzadkowanymi
  `activity_scopes` i `activity_materials` w jednym payloadzie
- `SeasonalActivitySummaryFilters` odpowiadaja query params `summary_*` na `/activities`
- `summary_activity_subtype` ma sens tylko dla `activity_type = 'pruning'`
- `SeasonalActivitySummary` agreguje tylko rekordy `status = 'done'`
- `getSeasonalActivityCoverage` powinno opierac sie na zapisanych `activity_scopes`,
  a nie na inferencji z samych statusow drzew lub dzialek
- `SeasonalActivityCoverageFilters.plot_id` jest wymagane, bo coverage renderuje sie
  dopiero po wyborze konkretnej dzialki

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

type HarvestSeasonSummaryFilters = {
  season_year: number
  plot_id?: string
  variety_id?: string
}

type HarvestSeasonSummary = {
  season_year: number
  total_quantity_kg: number
  record_count: number
  by_variety: Array<{
    variety_id: string
    variety_name: string | null
    total_quantity_kg: number
    record_count: number
  }>
  by_plot: Array<{
    plot_id: string
    plot_name: string | null
    total_quantity_kg: number
    record_count: number
  }>
}

type HarvestTimelineEntry = {
  harvest_date: string
  total_quantity_kg: number
  record_count: number
}

type HarvestTimeline = Array<HarvestTimelineEntry>

type HarvestLocationSummaryFilters = {
  season_year: number
  plot_id?: string
  variety_id?: string
}

type HarvestLocationRangeSummary = {
  from_position: number
  to_position: number
  total_quantity_kg: number
  record_count: number
}

type HarvestLocationRowSummary = {
  section_name?: string | null
  row_number: number
  total_quantity_kg: number
  record_count: number
  ranges: HarvestLocationRangeSummary[]
}

type HarvestLocationPlotSummary = {
  plot_id: string
  plot_name: string | null
  plot_status: "planned" | "active" | "archived"
  total_quantity_kg: number
  record_count: number
  precisely_located_quantity_kg: number
  precisely_located_record_count: number
  unresolved_quantity_kg: number
  unresolved_record_count: number
  rows: HarvestLocationRowSummary[]
}

type HarvestLocationSummary = {
  season_year: number
  total_quantity_kg: number
  record_count: number
  precisely_located_quantity_kg: number
  precisely_located_record_count: number
  unresolved_quantity_kg: number
  unresolved_record_count: number
  orchard_level_quantity_kg: number
  orchard_level_record_count: number
  plots: HarvestLocationPlotSummary[]
}
```

Uwagi Phase 6G:

- formularz zbioru korzysta z `PlotOption` do guidance po wyborze dzialki
- `HarvestRecordFormInput.scope_level = "location_range"` pozostaje wspierane tylko dla dzialek `rows` i `mixed`
- dla dzialki `irregular` user powinien wybrac `orchard`, `plot`, `variety` albo `tree`

Uwagi Phase 4:

- `HarvestSeasonSummaryFilters` odpowiadaja query params `season_year`, `plot_id`
  i `variety_id` na `/reports/season-summary`
- `HarvestSeasonSummary.total_quantity_kg` i `record_count` licza wszystkie rekordy
  po aktywnych filtrach
- `by_variety` pokazuje tylko rekordy z przypisana odmiana
- `by_plot` pokazuje tylko rekordy z przypisana dzialka
- `HarvestTimeline` grupuje rekordy po `harvest_date` i korzysta z tych samych filtrow
  co summary screen
- `HarvestLocationSummaryFilters` odpowiadaja tym samym query params na `/reports/harvest-locations`
- `HarvestLocationSummary` rozdziela wpisy precyzyjnie zlokalizowane od wpisow bez konkretnego rzedu i zakresu
- wpisy `tree` moga byc lokalizowane przez rekord drzewa, nawet jesli sam harvest nie ma zapisanego `plot_id`

## 9. Kontrakt batch create - etap 0.2

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
  default_condition_status: "new" | "good" | "warning" | "critical"
  default_planted_at?: string
  default_rootstock?: string
  default_notes?: string
}

type BulkTreeBatchPreviewResult = {
  plot_id: string
  plot_name: string
  variety_id?: string | null
  variety_name?: string | null
  species: string
  section_name?: string | null
  row_number: number
  from_position: number
  to_position: number
  requested_positions_count: number
  generated_tree_code_pattern?: string | null
  planned_trees: Array<{
    position_in_row: number
    tree_code?: string | null
    location_label: string
  }>
  conflicts: Array<{
    tree_id: string
    position_in_row: number
    tree_code?: string | null
    display_name?: string | null
    condition_status: TreeConditionStatus
    location_label: string
  }>
}

type BulkTreeBatchCreateResult = {
  batch_id: string
  created_trees_count: number
  plot_id: string
  plot_name: string
  row_number: number
  from_position: number
  to_position: number
}
```

Uwagi wykonawcze:

- `BulkTreeBatchInput` pozostaje row-range kontraktem i jest wspierany tylko dla dzialek `rows` i `mixed`.
- Dla dzialki `irregular` operacja powinna zwrocic czytelny blad domenowy zamiast probowac generowac preview.

## 10. Kontrakt masowego oznaczania drzew jako `removed` - etap 0.2

```ts
type BulkDeactivateTreesInput = {
  plot_id: string
  row_number: number
  from_position: number
  to_position: number
  reason?: string
}

type BulkDeactivateTreesPreviewResult = {
  plot_id: string
  plot_name: string
  row_number: number
  from_position: number
  to_position: number
  requested_positions_count: number
  matched_trees: Array<{
    tree_id: string
    position_in_row: number
    tree_code?: string | null
    display_name?: string | null
    condition_status: TreeConditionStatus
    location_label: string
    notes?: string | null
  }>
  missing_positions: number[]
  warnings: string[]
}

type BulkDeactivateTreesResult = {
  updated_trees_count: number
  plot_id: string
  plot_name: string
  row_number: number
  from_position: number
  to_position: number
}
```

Uwagi wykonawcze:

- `BulkDeactivateTreesInput` jest tym samym row-range kontraktem i takze pozostaje niedostepny dla dzialek `irregular`.

## 10. Kontrakt dashboardu

```ts
type DashboardSummary = {
  active_plots_count: number
  active_trees_count: number
  recent_activities: Array<{
    id: string
    title: string
    activity_date: string
    status: ActivityStatus
    plot_name: string
  }>
  recent_harvests: Array<{
    id: string
    harvest_date: string
    quantity_kg: number
    plot_name: string
  }>
}
```

Uwaga Phase 5A:

- `DashboardSummary` nie zawiera jeszcze `upcoming_activities`
- osobny planning block dla dashboardu jest odlozony do kolejnego sub-slice

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
