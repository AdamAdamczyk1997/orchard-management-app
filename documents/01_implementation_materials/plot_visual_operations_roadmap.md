# Plot Visual Operations MVP Roadmap

## 1. Purpose

`Plot Visual Operations MVP` ma przeniesc prace z dzialka z modelu list i formularzy w strone operacyjnego, wizualnego widoku terenu.

Problem uzytkownika: sadownik nie mysli o pracy wylacznie przez liste rekordow `trees`, tylko przez rzedy, pozycje i grupy drzew w konkretnej dzialce. Widok `/plots/[plotId]` ma pozwolic szybko zobaczyc uklad dzialki, znalezc drzewo, ocenic statusy, zaznaczyc zakres i uruchomic akcje robocza.

Najwazniejszy produktowy cel MVP: umozliwic dodanie `activities` dla drzewa albo zakresu drzew z poziomu schematycznej mapy dzialki, bez tworzenia nowego modelu domenowego.

## 2. Current State

Aplikacja ma juz solidny fundament pod ten slice.

- `plots`:
  - `/plots`, `/plots/new`, `/plots/[plotId]/edit` sa wdrozone.
  - `features/plots/plot-list.tsx` renderuje liste jako karty z metadanymi, layoutem i akcjami `edit`, `archive`, `restore`.
  - Nie ma jeszcze `/plots/[plotId]`.
  - `lib/orchard-data/plots.ts` ma `listPlotsForOrchard`, `readPlotByIdForOrchard`, `listPlotOptionsForOrchard`.
- `trees`:
  - `/trees`, `/trees/new`, `/trees/[treeId]/edit` sa wdrozone.
  - `TreeSummary` zawiera `plot_id`, `section_name`, `row_number`, `position_in_row`, `row_label`, `position_label`, `tree_code`, `location_verified`, `condition_status`, `is_active`.
  - `listTreesForOrchard` obsluguje filtry po `plot_id`, `variety_id`, `species`, `condition_status`, `is_active`, `q`.
  - `readTreeByIdForOrchard` istnieje, ale nie ma detail page `/trees/[treeId]`.
- `activities`:
  - `/activities`, `/activities/new`, `/activities/[activityId]`, `/activities/[activityId]/edit` sa wdrozone.
  - `ActivityForm` obsluguje `plot_id`, opcjonalne `tree_id`, `activity_scopes`, `activity_materials`.
  - `activity_scopes` wspieraja `plot`, `section`, `row`, `location_range`, `tree`.
  - `normalizeActivityPayload` potrafi uzupelnic scope `tree` dla pojedynczego drzewa, ale nie ma jeszcze prefill z zaznaczenia mapy.
- `harvests`:
  - `/harvests`, `/harvests/new`, `/harvests/[harvestRecordId]`, `/harvests/[harvestRecordId]/edit` sa wdrozone.
  - `HarvestForm` wspiera `scope_level = orchard | plot | variety | location_range | tree`.
  - `location_range` jest blokowany dla `layout_type = irregular`.
- `batch create`:
  - `/trees/batch/new` istnieje.
  - `BulkTreeBatchForm` pracuje na `plot_id`, `row_number`, `from_position`, `to_position`.
  - Preview wykrywa konflikty aktywnych drzew.
  - Write idzie przez RPC `create_bulk_tree_batch`.
  - Dziala tylko dla `rows` i `mixed`.
- `bulk deactivate`:
  - `/trees/batch/deactivate` istnieje.
  - Preview pokazuje aktywne drzewa i ostrzezenia dla pustych lub nieaktywnych pozycji.
  - Write idzie przez RPC `bulk_deactivate_trees`.
  - Operacja ustawia `condition_status = removed` i `is_active = false`, bez fizycznego usuwania.
  - Dziala tylko dla `rows` i `mixed`.
- `layout_type`:
  - `plots.layout_type` istnieje i jest wymagane.
  - `rows`: wymaga `row_number + position_in_row` dla `trees`.
  - `mixed`: dopuszcza czesciowa lokalizacje, ale row-range workflows sa wspierane.
  - `irregular`: nie wspiera row-range workflows; UI i server actions blokuja `row`, `location_range`, batch create i bulk deactivate.

## 3. Product Direction

Docelowy kierunek po MVP:

- `/plots`:
  - lista dzialek powinna stac sie bardziej kafelkowa i operacyjna;
  - karta dzialki pokazuje `name`, `layout_type`, aktywne drzewa, removed/inactive trees, dominujace odmiany, ewentualnie ostatnia aktywnosc;
  - karta ma CTA `Otworz dzialke` albo `Otworz mape`.
- `/plots/[plotId]`:
  - nowy operacyjny detail page dzialki;
  - header z nazwa, statusem i metadanymi layoutu;
  - toolbar dla filtrowania i trybu pracy;
  - schematyczna siatka rzedow i pozycji;
  - drzewa jako proste punkty/kolka;
  - legenda statusow;
  - panel szczegolow kliknietego drzewa;
  - selection bar po zaznaczeniu;
  - akcje operacyjne: `Add Activity`, pozniej `Add Harvest`, `Plant New`, `Bulk Deactivate`.

Pierwsza wersja ma byc desktop/laptop-first, ale bez decyzji blokujacych pozniejszy mobile polish.

## 4. Non-Goals for MVP

W MVP nie robimy:

- GPS map.
- Pelnej mapy geometrycznej dzialki.
- Edytora graficznego dzialki.
- Canvas/lasso editor.
- Lasso selection.
- Drag-and-drop drzew.
- Nowych encji `TreeSlot`, `PlantingSlot`, `plot_rows`.
- Redesignu modelu danych.
- Trwalego modelu pustych miejsc.
- Falszywej mapy rzedowej dla `layout_type = irregular`.
- Mutowania `trees` jako skrotu do oznaczania wykonanej pracy, np. `is_pruned`.
- Zmian migracji jako warunku pierwszego MVP.

## 5. Domain Assumptions

- `tree` reprezentuje konkretny egzemplarz drzewa, nie slot.
- Lokalizacja siedzi na rekordzie `trees`.
- Aktywna logiczna lokalizacja w MVP pozostaje zgodna z obecnym modelem i constraintami: `plot_id + row_number + position_in_row`.
- `section_name`, `row_label`, `position_label` i `tree_code` moga doprecyzowac opis oraz UX lokalizacji, ale nie legalizuja dwoch aktywnych drzew w tej samej aktywnej logicznej lokalizacji.
- Removed tree zostaje w historii jako `condition_status = removed` i `is_active = false`.
- Nowe nasadzenie w tej samej lokalizacji to nowy rekord `tree`.
- Nie moze istniec wiecej niz jedno aktywne drzewo w tej samej logicznej lokalizacji.
- Puste miejsca w MVP sa stanem wyliczanym z zakresu rzedow i istniejacych rekordow, nie encja domenowa.
- Historyczne `removed` trees moga wizualnie sygnalizowac dawniej zajete miejsce.
- Pelna definicja trwalych miejsc moze byc przyszlym etapem, ale nie czescia pierwszego MVP.

## 6. UX Model

### `/plots`

- Render jako kafelki, nie tylko pionowe karty informacyjne.
- Kazda karta:
  - `name`, `code`, `status`;
  - `layout_type`;
  - `default_row_count`, `default_trees_per_row`;
  - licznik aktywnych drzew;
  - licznik inactive/removed trees;
  - dominujace odmiany jako 2-3 etykiety;
  - CTA `Otworz dzialke`;
  - istniejace akcje `Edytuj`, `Archiwizuj`, `Przywroc`.

### `/plots/[plotId]`

- Header:
  - `plot.name`, `code`, `status`, `layout_type`;
  - layout metadata: numeracja rzedow, numeracja drzew, punkt odniesienia.
- Toolbar:
  - mode: `Browse` / `Select`;
  - filters: active/removed/all, variety, condition, location verified;
  - reset filters.
- Grid:
  - rows rendered as horizontal bands;
  - positions rendered as fixed-size markers;
  - row labels on the left;
  - optional section grouping.
- Legend:
  - active tree;
  - selected tree;
  - removed/inactive tree;
  - inferred empty position;
  - unverified location.
- Tree marker:
  - color/status by `condition_status`;
  - visual dimming for `is_active = false`;
  - outline or badge for `location_verified = false`;
  - selected state distinct from hover.
- Tree detail panel:
  - opens on click in `Browse` mode;
  - shows display name/code, species, variety, row/position, status, dates, notes;
  - links to `/trees/[treeId]/edit`;
  - CTA `Dodaj aktywnosc dla drzewa`.
- Selection bar:
  - appears only in `Select` mode after selection;
  - shows selected count and compressed range summary;
  - CTA `Dodaj aktywnosc`;
  - later CTA `Wytnij drzewa`, `Dodaj zbior`.
- `irregular` fallback:
  - no row grid;
  - list/tree cards with filters and location descriptions;
  - explicit message: schemat rzedowy nie jest wspierany dla tej dzialki;
  - actions remain available for single tree and non-row scopes.

## 7. Data Loading Strategy

Route `/plots/[plotId]` should use server-side loading, consistent with existing App Router patterns.

Required data:

- active orchard context:
  - via `requireActiveOrchard("/plots/[plotId]")`;
  - no client-supplied `orchard_id`.
- plot metadata:
  - likely via existing `readPlotByIdForOrchard(orchardId, plotId)`.
- trees for plot:
  - new query likely near `lib/orchard-data/trees.ts`;
  - can reuse `TreeSummary` shape initially;
  - filter by `.eq("orchard_id", orchardId).eq("plot_id", plotId)`.
- varieties referenced by trees:
  - already joined by `treeSelect` in `listTreesForOrchard`;
  - for MVP, no separate query needed unless dominant varieties are computed for `/plots`.
- optional activity context:
  - for later card stats or last activity;
  - can be separate lightweight read model, not required for read-only grid MVP.
- membership:
  - `owner` and `worker` should read and operate inside their orchard;
  - outsider should be blocked by RLS and active orchard resolution.
- RLS:
  - still enforced by Supabase;
  - app layer must also constrain by `orchardId` and `plotId`.

## 8. Grid Building Strategy

Grid builder should be a pure domain helper, not embedded in React.

Suggested input:

- `plot: PlotSummary`
- `trees: TreeSummary[]`
- optional filters

Suggested output:

- sections;
- rows;
- positions;
- marker type: `active_tree`, `removed_tree`, `empty_inferred`, `unlocated`;
- warnings.

Rules:

- Group by `section_name ?? ""`, then `row_number`.
- `section_name` jest grupa wizualna i kontekstem UX, a nie czescia aktywnej unikalnosci lokalizacji drzewa w MVP.
- Sort rows by `row_number`.
- Sort positions by `position_in_row`.
- A row is renderable only if it has `row_number`.
- A tree is renderable on grid only if it has both `row_number` and `position_in_row`.
- Trees without complete row coordinates go to fallback list `unlocated_trees`.
- Active tree wins the visible marker for a logical location.
- Removed/inactive trees can appear as historical marker only if no active tree exists at the same location.
- Inferred empty positions are calculated per row:
  - use min/max from existing positions;
  - optionally extend to `plot.default_trees_per_row` when available;
  - never persist inferred positions.
- Rows can have different lengths:
  - row 1 may render positions `1-100`;
  - row 2 may render positions `1-120`;
  - do not force all rows to same width unless UI needs a scrollable viewport.
- For `rows`, missing coordinates are data quality warnings.
- For `mixed`, grid is allowed only for records with complete row coordinates; other trees stay in fallback list.
- For `irregular`, skip row grid and render fallback.

## 9. Selection Strategy

Selection should be predictable and compressible.

Modes:

- `Browse`:
  - click marker opens tree detail panel;
  - no selection state changes.
- `Select`:
  - click active tree toggles selection;
  - click removed tree is disabled for `Add Activity` by default;
  - inferred empty positions are not selectable for `Add Activity`.

Selection state:

- Store selected tree IDs and row positions in local client state.
- Range selection:
  - user selects first and last position in the same row;
  - system selects active trees inside the range;
  - missing/removed positions are skipped for `Add Activity`, but shown in summary.
- Multi-row selection:
  - allow multiple independent ranges.
- Compression:
  - sort selected active trees by `section_name`, `row_number`, `position_in_row`;
  - consecutive positions in the same `row_number` and same `section_name` become one `location_range`;
  - `section_name` moze dzielic summary i scopes jako kontekst UI, ale nie pozwala zapisac dwoch aktywnych drzew z tym samym `plot_id + row_number + position_in_row`;
  - isolated trees without full coordinates become `tree` scopes.
- Example:
  - row 1 positions 1-5 -> one `location_range`;
  - row 2 positions 10-12 -> one `location_range`;
  - no eight separate `tree` scopes if range scope is valid.

Validation before action:

- selection must contain at least one active tree for `Add Activity`;
- all selected row ranges must belong to same `plot_id`;
- `location_range` scopes must not be generated for `irregular`;
- if selection has incomplete coordinates, use `tree` scopes or block with message;
- if compressed scopes exceed a practical UI limit, show confirmation and summary.

## 10. Actions from Selection

### Add Activity

- MVP priority.
- Allowed on active trees.
- For complete row coordinates: generate compressed `activity_scopes` with `location_range`.
- For one selected tree: can prefill `tree_id` and a `tree` scope.
- For mixed selection with incomplete coordinates: use `tree` scopes where needed.
- Should reuse `ActivityForm` and existing `createActivity`.
- Likely approach:
  - route to `/activities/new?plot_id=...&prefill_scopes=...`;
  - or introduce server-safe draft/preload mechanism later if query becomes too large.
- Risks:
  - current `ActivityForm` does not parse prefill query params;
  - hidden JSON `scopes` already exists, but initial state is not query-driven.

### Add Harvest

- Later after Add Activity.
- Allowed on active trees and location ranges.
- Should reuse `HarvestForm`.
- For `location_range`, prefill `scope_level = location_range`, `plot_id`, `row_number`, `from_position`, `to_position`.
- For single tree, prefill `scope_level = tree`, `tree_id`, `plot_id`, maybe `variety_id`.
- Risk: quantity is required, so selection only defines location, not full harvest record.

### Bulk Deactivate / Remove

- Allowed only on active trees.
- Should use existing `/trees/batch/deactivate` for row ranges.
- MVP integration can be link-with-prefill rather than embedded mutation.
- Works naturally for one row range.
- Multi-row selections need either repeated operations or later multi-range support.
- Must keep preview + confirmation.
- Must not physically delete records.

### Plant New / Batch Create

- For inferred empty positions or removed-only locations.
- Single position can link to `/trees/new` with `plot_id`, `row_number`, `position_in_row`.
- Continuous empty range can link to `/trees/batch/new`.
- MVP can expose CTA without full prefill if prefill work is deferred.
- Must still rely on existing conflict preview and database uniqueness.

## 11. Suggested Implementation Phases

### Phase 0 - Audit and Preparation

- Confirm route inventory and lack of `/plots/[plotId]`.
- Confirm `TreeSummary` and `PlotSummary` fields are sufficient.
- Confirm existing query and server action boundaries.
- Add roadmap doc and link it from implementation docs if desired.
- No schema changes.

### Phase 1 - Improve `/plots` Cards

- Make `/plots` cards more operational.
- Add active tree count and removed/inactive tree count.
- Add dominant varieties if cheap enough from a new read model.
- Add CTA to `/plots/[plotId]`.
- Keep existing edit/archive/restore actions.

### Phase 2 - Create Read-Only `/plots/[plotId]`

- Add route `app/(app)/plots/[plotId]/page.tsx`.
- Use `requireActiveOrchard`.
- Read plot and plot trees.
- Render header and metadata.
- Render read-only grid for `rows`.
- Render partial grid + warnings for `mixed`.
- Render fallback list for `irregular`.
- Add legend and filters.
- Use record-not-found recovery if plot is missing.

### Phase 3 - Tree Detail Interaction

- Add client component for grid interactions.
- In `Browse` mode, click tree marker opens side panel/drawer.
- Panel shows tree metadata and links to `/trees/[treeId]/edit`.
- Add CTA to create activity for a single tree.
- No mutation on the detail page itself.

### Phase 4 - Selection MVP

- Add `Select` mode.
- Implement single tree toggle.
- Implement same-row range selection.
- Show selection summary.
- Add pure helper for compression to `ActivityScopeInput[]`.
- Validate active-only selection for operational actions.

### Phase 5 - Add Activity from Selection

- Extend `/activities/new` to accept safe prefill for `plot_id`, `tree_id`, and/or `scopes`.
- Reuse `ActivityForm` and existing server validations.
- Preserve `activity_scopes` model.
- Add regression tests for compressed scopes.
- Do not create shortcut status fields on `trees`.

### Phase 6 - Structural Actions

- Add links/prefill into `/trees/batch/deactivate`.
- Add links/prefill into `/trees/batch/new`.
- Keep preview-before-write.
- Keep row-range limitation for `rows` and `mixed`.
- For multi-row selection, either split operations clearly or defer.

### Phase 7 - Future Domain Hardening

- Consider persistent row definitions.
- Consider persistent empty positions only if real workflows require them.
- Consider future `TreeSlot` / `PlantingSlot` only after validating operational need.
- Consider stronger planting history per logical location.
- Consider dedicated `/trees/[treeId]` detail page and activity history timeline.

## 12. Technical Risks and Decisions

- No slot entity:
  - inferred empty positions may not reflect real terrain.
- Removed tree history:
  - multiple historical trees can exist at same location; grid must avoid visual ambiguity.
- Mixed layout:
  - row grid can be incomplete; must communicate partial coverage.
- Irregular layout:
  - must not fake a row map.
- Performance:
  - around 1000 trees per plot should be handled by server query + client rendering without canvas;
  - avoid expensive per-marker server calls.
- Selection semantics:
  - selected active trees should compress to few scopes, but incomplete coordinates may force `tree` scopes.
- Prefill transport:
  - query params may become too long for large selections; MVP should set a practical limit or defer large multi-range prefill.
- RLS and active orchard:
  - route must always resolve server-side `active_orchard`.
- Bulk operations:
  - accidental destructive logical operations require preview and confirmation.
- Consistency:
  - do not bypass existing `createActivity`, `create_bulk_tree_batch`, `bulk_deactivate_trees`.
- Test coverage:
  - grid builder and selection compression need unit tests before UI complexity grows.

## 13. Testing Strategy

- Unit tests:
  - grid builder groups by section and row;
  - handles different row lengths;
  - active tree wins over removed historical records;
  - inferred empty positions are virtual;
  - incomplete-location trees go to fallback;
  - `irregular` returns fallback model;
  - selection compression turns consecutive positions into `location_range`;
  - non-consecutive positions split ranges;
  - incomplete-coordinate selected trees become `tree` scopes.
- Integration tests:
  - `/plots/[plotId]` read model returns only active orchard data;
  - missing plot returns recovery state;
  - owner and worker can read plot detail;
  - outsider cannot read another orchard's plot data.
- Playwright E2E:
  - owner opens `/plots/[plotId]` from `/plots`;
  - row grid renders seeded `rows` plot;
  - click tree opens detail panel;
  - select range and start Add Activity;
  - activity form receives expected plot/scopes prefill;
  - `irregular` plot shows fallback instead of row map.
- Manual seeded QA:
  - use `pnpm seed:baseline-reset`;
  - verify `pnpm qa:baseline-status = READY`;
  - test owner and worker;
  - verify outsider cannot access operational detail;
  - test `rows`, `mixed`, `irregular` baseline plots.

## 14. Files and Modules Likely Affected

Likely routes:

- `app/(app)/plots/page.tsx`
- `app/(app)/plots/[plotId]/page.tsx` new
- `app/(app)/activities/new/page.tsx`
- later `app/(app)/trees/batch/new/page.tsx`
- later `app/(app)/trees/batch/deactivate/page.tsx`

Likely feature components:

- `features/plots/plot-list.tsx`
- `features/plots/plot-visual-grid.tsx` new, name tentative
- `features/plots/plot-detail-panel.tsx` new, name tentative
- `features/activities/activity-form.tsx`
- later `features/trees/bulk-tree-batch-form.tsx`
- later `features/trees/bulk-tree-deactivate-form.tsx`

Likely data/domain modules:

- `lib/orchard-data/plots.ts`
- `lib/orchard-data/trees.ts`
- `lib/domain/plots.ts`
- `lib/domain/plot-visual-grid.ts` new, name tentative
- `lib/domain/plot-selection.ts` new, name tentative
- `types/contracts.ts`

Likely tests:

- `tests/unit/plot-visual-grid.spec.ts` new
- `tests/unit/plot-selection.spec.ts` new
- `tests/integration/plot-visual-operations.spec.ts` new
- `tests/e2e/plot-visual-operations.spec.ts` new
- existing `tests/unit/plot-layout-policy.spec.ts`
- existing `tests/e2e/owner-operational-flow.spec.ts`
- existing `tests/e2e/tree-batch-and-export.spec.ts`

Docs:

- `documents/01_implementation_materials/plot_visual_operations_roadmap.md` new
- optional link from `documents/01_implementation_materials/README.md`
- optional link from `documents/00_overview_and_checklists/documentation_map.md`

## 15. Open Questions

- Czy `/plots/[plotId]` w MVP ma pokazywac removed trees na siatce domyslnie, czy dopiero po filtrze `inactive/all`?
- Czy inferred empty positions maja byc renderowane do `default_trees_per_row`, czy tylko miedzy min/max istniejacych pozycji?
- Jaki jest maksymalny rozmiar selection, ktory pozwalamy przekazac do `/activities/new` przez URL?
- Jak copy w UI ma najczytelniej tlumaczyc ostrzezenia dla `mixed`, gdy dane sugeruja powtarzalne rzedowe coordinates bez zmiany obecnej aktywnej unikalnosci lokalizacji?
- Czy dominujace odmiany na `/plots` liczymy tylko po aktywnych drzewach?
- Czy pierwsze Add Activity z selection ma obsluzyc tylko jeden plot i wiele ranges, czy tez tylko jeden row range jako najwezszy MVP?
- Czy single tree activity ma ustawiac `activities.tree_id`, `activity_scopes[0].tree_id`, czy oba, zgodnie z obecnym `normalizeActivityPayload`?
- Czy tree detail panel ma pokazywac ostatnie aktywnosci i zbiory juz w MVP, czy dopiero po read-only grid?

## Decision Log — Plot Visual Operations MVP

1. Removed trees are shown by default on `/plots/[plotId]` as muted placeholders, not as active trees. Users can switch visibility between active only, inactive/removed, and all.

2. Inferred empty positions are rendered only between the minimum and maximum known `position_in_row` for each row. MVP must not expand rows to `default_trees_per_row` unless future explicit row definitions are added.

3. Selection passed to `/activities/new` must be compressed into logical ranges/scopes. Do not pass large raw `tree_id` arrays through the URL. MVP limit: max 20 compressed scopes/ranges or approximately 2000 query-string characters.

4. For `mixed` plots, `row_number + position_in_row` are required to place a tree on the grid. `section_name` can group visual sections and provide UI context, but it is not part of active location uniqueness in the MVP.

5. Dominant varieties on `/plots` cards are calculated only from active trees. Removed/inactive trees are shown as separate counts.

6. Add Activity from selection should support one plot and multiple compressed ranges/scopes in MVP. Do not restrict the MVP to a single row range.

7. For a single-tree activity, set both `activities.tree_id` and `activity_scopes[0].tree_id`, keeping them synchronized. For multi-scope activities, `activities.tree_id` must be null and scopes are the canonical source of coverage.

8. The first read-only grid MVP should show tree metadata and actions in the detail panel. Recent activities and harvests should be added in the next iteration as a lazy-loaded history section.

### DEC-PVO-010 - section_name is visual grouping, not active location uniqueness

Status: Accepted

Decision:
W MVP aktywna logiczna lokalizacja drzewa pozostaje `plot_id + row_number + position_in_row`. `section_name` moze grupowac widok, etykietowac fragmenty dzialki, wspierac sortowanie, summary i ostrzezenia o niepelnych danych, ale nie moze byc traktowane jako sposob na posiadanie dwoch aktywnych drzew w tej samej pozycji logicznej.

Rationale:
Aktualny model i constrainty nie wlaczaja `section_name` do aktywnej unikalnosci lokalizacji. PVO MVP nie zmienia migracji ani modelu danych.

Implementation impact:

- Grid builder traktuje konflikt aktywnych drzew dla tego samego `plot_id + row_number + position_in_row` jako data integrity warning.
- UI moze pokazac `section_name` jako kontekst, ale nie rysuje dwoch legalnych aktywnych markerow w tej samej logicznej lokalizacji.
- Jesli przyszle wymagania produktu potrzebuja powtarzalnych `row_number + position_in_row` miedzy sekcjami tej samej dzialki, to jest future domain hardening wymagajacy osobnej decyzji i prawdopodobnie migracji albo rozszerzenia constraintu/modelu.

Implementation note:
If future product requirements need repeated `row_number + position_in_row` values across sections in the same plot, this is outside the MVP and requires explicit model/constraint redesign. MVP must stay aligned with the current active logical location uniqueness.

## 16. Recommended First Implementation Ticket

**Ticket: Add read-only plot visual detail foundation**

Zakres:

- Add route `/plots/[plotId]`.
- Use `requireActiveOrchard`.
- Read plot via `readPlotByIdForOrchard`.
- Read all trees for that plot using an orchard-scoped query.
- Add pure `buildPlotVisualGrid` helper.
- Render:
  - plot header;
  - layout metadata;
  - read-only row grid for `layout_type = rows`;
  - partial grid + warning for `mixed`;
  - fallback list for `irregular`;
  - legend;
  - CTA back to `/plots` and edit link.
- No selection.
- No mutations.
- No prefill into activities yet.
- Add unit tests for grid builder and one Playwright smoke for opening the plot detail page.
