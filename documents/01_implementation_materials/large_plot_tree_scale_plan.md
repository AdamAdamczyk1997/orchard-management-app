# Large plot tree scale plan

Status: active plan. Phase 0 fixture, Phase 1 `/trees` pagination, Phase 2
async tree picker for activity/harvest forms, Phase 3 PVO scale overview,
the first Phase 4 focused PVO row detail slice, a long-row range action
refinement, a local long-row measurement fixture, long-row browser measurement
and Phase 7 report read model hardening for `harvest-locations` and
`variety-locations` are implemented. Measurement-driven index hardening and
deeper long-row rendering refinements remain.
Scope: make OrchardLog / Sadownik+ work well when one plot contains hundreds
or low thousands of trees.

## Goal

Prepare the application for real orchard structure at field scale:

- hundreds of trees in one plot should feel normal,
- low thousands of trees in one plot should still be usable,
- workers should be able to quickly record field work without scrolling through
  huge lists,
- owners should be able to inspect structure, reports and gaps without the UI
  becoming slow or visually noisy,
- existing `active_orchard`, RLS, ownership, baseline QA and PVO fixtures must
  remain safe.

This plan is intentionally staged. Do not implement all changes in one slice.
The safest path is: measure first, then improve read models, then change UI
surfaces one by one.

## Current Implementation Facts

These facts are based on the current repo state, not on archive documents.

- `/plots/[plotId]` first reads `getPlotTreeScaleProfileForOrchard()`.
- `/plots/[plotId]` expects the plot UUID in the route. Performance fixture
  codes such as `PERF-1500` are labels; the deterministic fixture route uses
  `92000000-0000-4000-8000-000000000002`.
- The local `PERF-LONG-ROW` fixture route uses
  `92000000-0000-4000-8000-000000000004` and has one row with 350 trees,
  intentionally above `PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT`.
- Small plots still read all trees through `listTreesForPlotInOrchard()` and
  render `PlotVisualOverview`.
- Medium and large plots render `PlotTreeScaleOverview` instead of a full marker
  grid, so they avoid unbounded `TreeSummary` payloads and DOM marker output.
- `/plots/[plotId]?section=A&row=12` renders `PlotVisualFocusedRow` from
  `getPlotVisualRowDetailForOrchard()` and reuses `PlotVisualOverview` only for
  the narrowed row when it is under the focused marker limit.
- Focused rows above `PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT` use
  `PlotVisualRowRangeActions` plus a table preview capped by
  `PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT`.
- Active tree logical location uniqueness is enforced by
  `uq_trees_active_logical_location` on `(plot_id, row_number, position_in_row)`;
  `section_name` is not part of that uniqueness key in the current migrations.
- `/trees` uses `listTreePageForOrchard()` with explicit `.range()`, exact count
  and deterministic database ordering.
- `ActivityForm` and `HarvestForm` use `TreePicker` and `GET /api/tree-options`
  instead of receiving every tree option on initial page load.
- `/activities` list filters also use the async `TreePicker` for `tree_id`,
  so the list page no longer loads all orchard tree options on first render.
- `listTreeOptionsForOrchard()` still exists as a legacy helper and selects all
  orchard trees before sorting; do not use it for new large-plot selectors.
- `getVarietyLocationsReportForOrchard()` reads active trees for one variety
  through paginated `.range()` chunks and groups ranges in TypeScript.
- `getHarvestLocationSummaryForOrchard()` uses
  `list_harvest_location_source_records(...)`, a read-only SQL RPC that joins
  `harvest_records` to `trees`/`plots` for plot filtering and tree-scoped
  fallback without building a large `tree_id.in(...)` filter.
- Batch preview flows already use range-based queries, which is good, but their
  UI can still become too verbose for large ranges.

## Scale Targets

Use these targets for design and testing. They are not product limits unless a
later slice explicitly turns them into validation limits.

- Small plot: up to 200 trees.
  - Current full-marker PVO can remain available.
- Medium plot: 201-800 trees.
  - UI should default to row/section overview, then focus into one row or one
    filtered subset.
- Large plot: 801-2,000 trees.
  - UI must avoid full DOM marker rendering by default.
  - Tree selection should be search/range based.
- Large orchard: 5,000-20,000 trees across many plots.
  - Global lists and form selectors must be paginated or async searched.

Thresholds should be measured and adjusted after the performance fixture exists.

## Non-goals

- Do not redesign the whole domain model.
- Do not remove existing PVO small-plot behavior.
- Do not put large performance data into the canonical baseline seed.
- Do not weaken server-side `active_orchard` resolution or RLS.
- Do not trust client-provided `orchard_id`.
- Do not make `documents/archive/` normative again.
- Do not add DB indexes blindly before checking real query plans.
- Do not introduce a heavy rendering library unless measurements justify it.

## Product Principles

### 1. Field work first

A worker in the orchard should not need to pick from 900 tree options. The UI
should help them record by natural field language:

- plot,
- section,
- row,
- range of positions,
- single tree only when truly needed.

### 2. Progressive disclosure

Large plots should use this flow:

1. Overview: sections and rows with counts and warnings.
2. Focus: one row, one section, one range, or one filtered subset.
3. Detail: one tree or a small set of trees.

The app should avoid showing every tree at once when that makes the page slower
or harder to understand.

### 3. Server-side narrowing

Every heavy screen should ask the server for the smallest useful dataset:

- count summaries for overview,
- page slices for lists,
- row/range detail for focused PVO,
- search-limited options for forms.

### 4. Keep writes boring and safe

Even if read UX changes, writes must still go through:

- server actions,
- Zod validation,
- active orchard context,
- relation checks,
- RLS,
- constraints and RPC guards.

### 5. Keep canonical baseline readable

The enriched baseline is for normal QA/demo. Large-scale data should live in a
separate performance fixture workflow so normal E2E and manual smoke stay fast.

## Proposed Architecture Strategy

### Read Model Layers

Introduce separate read models for large tree workloads instead of reusing the
same "full tree summary list" everywhere.

Suggested read models:

- `TreeListPage`
  - paginated result for `/trees`
  - includes rows, total count, page, page size and active filters
- `TreeOptionSearchResult`
  - small search result for comboboxes
  - limit default: 20-50
  - supports selected IDs for hydration in edit/prefill flows
- `PlotTreeScaleProfile`
  - count-only profile for one plot
  - active count, removed count, located count, unlocated count, row count,
    max positions per row, warning count
- `PlotVisualOverviewSummary`
  - section and row summaries for PVO overview
  - no full tree list by default for medium/large plots
- `PlotVisualRowDetail`
  - details for one section + row + filters
  - used after user focuses a row
- `PlotVisualTreeDetail`
  - single tree detail or very small selected set

These can start as TypeScript helpers over Supabase queries. Add SQL RPC only
when PostgREST queries become awkward or too slow.

### UI Surfaces

Prioritize these surfaces in order:

1. `/trees`
2. tree selectors in activity and harvest forms
3. `/plots/[plotId]` PVO
4. batch preview output
5. location reports

That order improves daily usability before the more ambitious PVO rendering
work.

## Implementation Roadmap

## Phase 0 - Performance Fixture And Baseline Measurements

Purpose: stop guessing.

Fixture entrypoint implemented:

- `pnpm seed:large-plot-fixture`
- SQL source: `supabase/seeds/010_large_plot_performance_fixture.sql`
- metadata: `scripts/shared/large-plot-fixture.mjs`
- measurement snapshots: `documents/01_implementation_materials/large_plot_phase0_measurements.md`
- cleanup: `pnpm seed:baseline-reset`

The fixture creates a separate local-only orchard `PERF`, which is ignored by
`pnpm qa:baseline-status` and is not part of canonical baseline counts.

### Implementation

1. Run `pnpm seed:baseline-reset`.
2. Run `pnpm seed:large-plot-fixture`.
3. Fixture data:
   - one rows plot with 500 trees: `PERF-500`,
   - one rows plot with 1,500 trees: `PERF-1500`,
   - one mixed plot with partial row coverage: `PERF-MIX`,
   - one rows plot with a single 350-tree row: `PERF-LONG-ROW`,
   - six varieties distributed across rows,
   - deterministic warning/critical/unverified trees.
4. Fixture IDs are deterministic and outside canonical baseline ranges.
5. `pnpm qa:baseline-status` ignores the fixture orchard `PERF`.
6. Cleanup path: rerun `pnpm seed:baseline-reset`.

### Measurements

Record before/after numbers for:

- `/trees`
  - server render time,
  - number of rows returned,
  - DOM node count,
  - filter response time.
- `/activities/new`
  - payload size caused by `treeOptions`,
  - time to interactive,
  - select responsiveness after choosing plot.
- `/harvests/new`
  - same as activity form.
- `/plots/[plotId]`
  - server render time,
  - client hydration time,
  - DOM node count,
  - selection responsiveness.
- `/reports/variety-locations`
  - query time and render time for a popular variety.
- `/reports/harvest-locations`
  - behavior when filtering by a plot with many trees.

### Tests

- Add no production E2E yet unless the fixture runner is fast enough.
- Add a small unit test for fixture metadata if a shared helper is introduced.
- Manual check is acceptable in this phase.

### Acceptance Criteria

- We can generate a large local plot deterministically.
- We know which pages degrade first.
- We have agreed provisional thresholds for small/medium/large plots.

Current Phase 0 finding:

- `/trees` is the first confirmed bottleneck and should lead Phase 1.
- Unbounded reads appear to hit a 1,000-row cap in the current Supabase/PostgREST path, so Phase 1 should address correctness and total counts, not only UI speed.

## Phase 1 - Paginated `/trees`

Purpose: make the global tree list safe for large orchards.

Status: implemented in the production `/trees` route.

Current implementation:

- `listTreePageForOrchard(orchardId, filters)` uses Supabase `.range()` and exact count.
- `TreeListFilters` accepts `page` and `page_size`.
- `/trees` exposes page size options and previous/next pagination links.
- Filter form submissions reset to page 1 because the form does not submit a `page` field.

### Implementation

1. Extend `TreeListFilters` and validation with:
   - `page`,
   - `page_size`,
   - optional sort key if needed later.
2. Replace `listTreesForOrchard()` use on `/trees` with a paginated read model:
   - `listTreePageForOrchard(orchardId, filters)`.
3. Query Supabase with:
   - `.range(from, to)`,
   - count metadata,
   - deterministic order in SQL.
4. Keep existing filters:
   - `q`,
   - `plot_id`,
   - `variety_id`,
   - `species`,
   - `condition_status`,
   - `is_active`.
5. Move sort from TypeScript into database order:
   - plot name may require either joined ordering or a simplified tree order
     by `plot_id`, `row_number`, `position_in_row`, `tree_code`.
6. Update `TreeList` with pagination controls.
7. Preserve query-string filters when moving pages.
8. Reset to page 1 when filters change.

### Tests

- Unit:
  - filter parser accepts page and page size,
  - invalid page falls back safely.
- Integration:
  - list returns only requested page,
  - total count is correct,
  - filters remain orchard-scoped.
- E2E:
  - baseline list still works,
  - performance fixture list can move to page 2,
  - clearing filters resets pagination.

### Acceptance Criteria

- `/trees` never renders unbounded tree rows.
- Existing worker/owner RLS expectations remain unchanged.
- Normal baseline E2E still passes.

## Phase 2 - Async Tree Picker For Forms

Purpose: remove huge `treeOptions` payloads from activity and harvest forms.

Status: implemented for activity and harvest create/edit forms.

Current implementation:

- `searchTreeOptionsForOrchard(orchardId, input)` supports `plot_id`, `q`,
  `include_ids`, `active_only` and `limit`.
- `GET /api/tree-options` resolves the active orchard server-side and never
  accepts client-provided `orchard_id`.
- `TreePicker` keeps the native `<select>` contract while loading options
  asynchronously.
- `/activities/new` hydrates PVO prefill tree IDs through `include_ids` instead
  of loading the whole orchard.
- Activity and harvest edit pages hydrate only the currently selected tree IDs.
- `createActivity`/`updateActivity` relation validation now fetches only the
  submitted tree IDs instead of all tree options.

Additional fixture finding:

- Account export also hit the PostgREST 1,000-row cap when `PERF` was visible
  to `super_admin`; `getExportAccountDataForProfile()` now paginates exported
  tables with `.range()` before grouping them into the JSON payload.

### Implementation

1. Add a server-side tree option search read model:
   - `searchTreeOptionsForOrchard(orchardId, input)`.
2. Input:
   - `plot_id?: string`,
   - `q?: string`,
   - `include_ids?: string[]`,
   - `active_only?: boolean`,
   - `limit?: number`.
3. The search must resolve orchard from server context or server-validated
   active orchard. Never accept trusted `orchard_id` from the client.
4. Add a route handler or server action for async search.
   Suggested route shape if using a route handler:
   - `GET /api/tree-options`
   - query: `plot_id`, `q`, `include_id`
   - internally calls active orchard context.
5. Add a shared client component:
   - `TreePicker`
   - supports empty state, loading state, selected value, clear action.
6. Replace plain tree `<Select>` in:
   - `ActivityForm` main tree field,
   - `ActivityForm` scope tree field,
   - `HarvestForm` tree field.
7. Keep plot-first UX:
   - if plot is selected, search within plot by default,
   - if no plot is selected, require search text before loading options.
8. Preserve PVO prefill:
   - prefilled `tree_id` must hydrate its label via `include_ids`,
   - invalid prefill still shows current warning behavior.
9. Server actions continue to validate:
   - tree exists in active orchard,
   - tree belongs to selected plot when needed,
   - activity scope tree belongs to parent activity plot.

### Tests

- Unit:
  - search input sanitization is covered by
    `tests/unit/tree-option-search.spec.ts`,
  - selected ID hydration normalization is covered through `include_ids`
    helper tests.
- Integration:
  - worker can search trees in own orchard,
  - outsider cannot search foreign orchard,
  - plot filter only returns trees from that plot.
- E2E:
  - create activity for single tree,
  - create activity with tree scope,
  - create harvest with tree scope,
  - PVO prefill still hydrates selected tree.

### Acceptance Criteria

- Activity and harvest forms no longer fetch all tree options on initial load.
- A plot with 1,500 trees does not make the form sluggish.
- Existing prefill and validation behavior remains intact.

## Phase 3 - PVO Scale Profile And Overview Mode

Purpose: make `/plots/[plotId]` safe before changing rendering deeply.

Status: implemented as the first PVO scale pass.

Current implementation:

- `getPlotTreeScaleProfileForOrchard(orchardId, plotId)` reads lightweight tree
  columns in paginated `.range()` chunks.
- `buildPlotTreeScaleProfile()` classifies plots as:
  - `small`: up to 200 trees,
  - `medium`: 201-800 trees,
  - `large`: 801+ trees.
- `/plots/[plotId]` renders full `PlotVisualOverview` only when
  `should_render_full_visual` is true.
- Medium/large plots render `PlotTreeScaleOverview` with section and row
  summaries, count badges and CTAs to tree search/activity creation.
- `tests/integration/plot-tree-scale-profile.spec.ts` covers a 1,005-tree plot
  to catch PostgREST truncation.

### Implementation

1. Add `getPlotTreeScaleProfileForOrchard(orchardId, plotId)`.
2. Return count summary:
   - total trees,
   - active trees,
   - removed/inactive trees,
   - located trees,
   - unlocated trees,
   - unverified trees,
   - row count,
   - maximum row length,
   - duplicate active location count if relevant.
3. Use scale profile on `/plots/[plotId]`.
4. Keep current full `listTreesForPlotInOrchard()` path only for small plots.
5. For medium/large plots, show a new overview card:
   - section summaries,
   - row summaries,
   - count badges,
   - warning/critical/unverified counts,
   - CTA to focus row or search tree.
6. Do not render full marker grid for medium/large plots by default.
7. Add a clear UI message:
   - the plot is large,
   - overview mode is intentional,
   - user can focus a row or use filters/search.

### Tests

- Unit:
  - scale classification helper,
  - overview decision thresholds.
- Integration:
  - scale profile counts are orchard-scoped.
- E2E:
  - small baseline PVO still uses current full grid,
  - performance fixture large plot shows overview mode.

### Acceptance Criteria

- Large plot detail page avoids unbounded full tree fetch and marker render.
- Existing baseline PVO tests continue to pass for small plots.
- Sadownik sees useful row-level information instead of a frozen map.

## Phase 4 - Focused PVO Row Detail

Purpose: allow precise work after overview.

Status: first focused row slice implemented.

Current implementation:

- `parsePlotVisualRowFocusParams()` normalizes shareable query params:
  `section`, `row`, `lifecycle`, `variety_id`, `condition_status`,
  `location_verified`.
- `getPlotVisualRowDetailForOrchard(orchardId, plotId, filters)` is
  orchard-scoped, plot-scoped and row-scoped.
- The row read model fetches the full focused row only up to
  `PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT` and separately returns a filtered table
  preview capped by `PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT`, including the
  default no-filter case.
- `PlotTreeScaleOverview` row summaries link to focused row URLs.
- `PlotVisualFocusedRow` renders:
  - row metadata and filter GET form,
  - row-level Add Activity prefill,
  - existing `PlotVisualOverview` marker interactions for reasonably sized rows,
  - range-first Add Activity controls plus table fallback for rows above the
    focused marker limit.
- Existing selection actions remain available in marker mode:
  browse tree detail panel, range select, Add Activity from selection, Bulk
  deactivate prefill and Plant New from inferred empty ranges.
- `tests/integration/plot-visual-row-detail.spec.ts` covers long-row fallback
  read model behavior above the marker limit and the separate table preview
  cap.
- `tests/e2e/plot-visual-operations.spec.ts` covers the large plot overview to
  focused row path and the `PERF-LONG-ROW` range action fallback when the local
  `PERF` fixture is present.
- Current DB uniqueness treats active logical location as
  `(plot_id, row_number, position_in_row)`, without `section_name`. Tests and
  scale helper duplicate counts now follow the migration source of truth.

### Implementation

1. Add focused row read model:
   - `getPlotVisualRowDetailForOrchard(orchardId, plotId, filters)`.
2. Filters:
   - `section_name`,
   - `row_number`,
   - lifecycle,
   - variety,
   - condition,
   - location verification.
3. Return only one row or a small filtered subset.
4. Page URL should be shareable:
   - `/plots/[plotId]?section=A&row=12`
   - implemented query names: `section`, `row`, `lifecycle`, `variety_id`,
     `condition_status`, `location_verified`.
5. In focused mode, render current marker-style row if row size is reasonable.
6. For very long rows, render:
   - range-first Add Activity controls,
   - a table/list fallback,
   - compact row segments later if measurements require them,
   - or windowed markers.
7. Preserve actions:
   - Browse tree detail,
   - Add Activity from one tree,
   - Select range,
   - Bulk deactivate,
   - Plant New for inferred empty ranges.
8. For selection mode, prefer range controls for large rows:
   - start position,
   - end position,
   - pending: preview selected active count.

### Tests

- Unit:
  - focused row query param parsing,
  - focused row href building,
  - focused row range activity href building,
  - scale duplicate location semantics aligned with the DB constraint.
- Integration:
  - row detail returns only active orchard rows,
  - row detail handles mixed sections.
  - row detail caps marker payload and switches to fallback above the marker
    limit.
- E2E:
  - focus a row in large plot from `PlotTreeScaleOverview`,
  - pending: select range and prefill activity,
  - pending: select empty range and prefill batch create,
  - pending: removed tree stays disabled for Add Activity.

### Acceptance Criteria

- Users can inspect and act on one row without loading the whole plot.
- Current PVO behaviors remain available for focused rows.
- Rows above the marker limit do not render an oversized marker grid.
- Rows above the marker limit can still create activity prefill for a typed
  location range.

## Phase 5 - Better Rendering If Measurements Require It

Purpose: optimize only after read models and overview mode exist.

### Options

Use the simplest option that meets measured targets.

1. CSS/DOM windowing:
   - render only visible row segments,
   - simplest to keep accessible buttons.
2. Compact row segment rendering:
   - render ranges as blocks,
   - click segment to open detail list.
3. Canvas/SVG overview:
   - useful for thousands of markers,
   - harder for accessibility and selection,
   - should not be first choice.

### Tests

- Playwright screenshot for large overview.
- Keyboard navigation smoke.
- DOM node count check.
- Mobile no-horizontal-overflow check.

### Acceptance Criteria

- Large plot page remains responsive on desktop and mobile.
- Interaction still works with keyboard and screen-reader labels.

## Phase 6 - Batch Preview Output For Large Ranges

Purpose: prevent batch forms from dumping huge lists.

### Implementation

1. Keep range queries; they are the right domain model.
2. Add summary-first preview UI:
   - requested positions count,
   - matched active trees count,
   - conflicts count,
   - missing/inactive positions count.
3. For long ranges, show only first N details by default.
4. Add "show details" or paginated conflict list if needed.
5. Consider guardrails:
   - warn above 500 positions,
   - require explicit confirmation above a threshold,
   - never silently truncate write operations.
6. Ensure RPC write behavior remains atomic.

### Tests

- Unit:
  - preview summarization,
  - truncation display rules.
- Integration:
  - large preview returns correct counts,
  - write remains transactional.
- E2E:
  - large range preview does not overflow,
  - confirmation still works for safe range.

### Acceptance Criteria

- Batch flows remain understandable for real field operations.
- Users see the risk and scale before confirming.

## Phase 7 - Report Read Models For Large Trees

Purpose: keep reports fast and avoid giant client-side or URL-level filters.

### Harvest Location Report

Status: first hardening slice implemented.

Current implementation:

- `getHarvestLocationSummaryForOrchard()` calls
  `list_harvest_location_source_records(...)`.
- The RPC is orchard-scoped through `p_orchard_id` and
  `can_read_orchard_data(p_orchard_id)`.
- Plot filtering is resolved by SQL joins:
  - direct `harvest_records.plot_id`,
  - tree-scoped fallback through `trees.plot_id`.
- The TypeScript aggregation contract remains unchanged.
- Integration coverage includes a plot with more than 1,000 trees and a
  tree-scoped harvest beyond the previous unbounded read cap.

Remaining work:

1. Measure filtered report performance on the `PERF` fixture.
2. Move more aggregation to SQL only if measurements justify it.
3. Add indexes only after query-plan evidence.

### Variety Locations Report

Status: first hardening slice implemented.

Current implementation:

- `getVarietyLocationsReportForOrchard()` reads active trees for one variety
  through paginated `.range()` chunks.
- The TypeScript grouping contract remains unchanged.
- Integration coverage includes more than 1,000 active trees for one variety,
  proving the report does not stop at the default PostgREST page cap.

Remaining work:

1. Measure filtered report performance on the `PERF` fixture.
2. Move grouping closer to SQL only if measurements justify it.
3. Keep output grouped by plot/section/row ranges, never raw giant lists.

### Tests

- Integration:
  - harvest location report with tree-scoped records in a large plot,
  - no leak across orchard,
  - variety report groups contiguous ranges beyond 1,000 active trees.
- E2E:
  - report pages still load on performance fixture.

### Acceptance Criteria

- `/reports/harvest-locations` does not build a huge `tree_id.in(...)` string
  for large plots.
- Reports remain grouped and readable for a farmer.

## Phase 8 - Index And Query Plan Hardening

Purpose: add only indexes that measured queries need.

### Candidate Indexes To Evaluate

Do not add all blindly. Use `EXPLAIN` or Supabase inspection first.

- `trees (orchard_id, plot_id, is_active, row_number, position_in_row)`
- `trees (orchard_id, plot_id, row_number, position_in_row)`
- `trees (orchard_id, variety_id, is_active, plot_id, row_number, position_in_row)`
- `trees (orchard_id, tree_code)`
- optional text search support for `tree_code` / `display_name`
  - consider `pg_trgm` only if substring search is required and slow.
- harvest records indexes for season/plot/variety/tree report filters if current
  indexes are not enough.

### Tests

- `supabase db lint`
- migration reset
- targeted integration tests
- compare query plan before/after for performance fixture.

### Acceptance Criteria

- Query plans use indexes for high-cardinality tree screens.
- No redundant overwide indexes are added.

## Phase 9 - Documentation And Rollout

Purpose: make the new strategy understandable and maintainable.

### Documentation Updates

Update after each implemented slice:

- `documents/ui_implementation_map.md`
- `documents/00_overview_and_checklists/manual_testing_quickstart.md`
- `documents/07_security_and_quality/test_plan.md`
- relevant UX docs if user-facing behavior changes.

### Manual QA Script

Add a large-plot manual pass:

1. Reset baseline.
2. Apply performance fixture.
3. Log in as owner.
4. Open `/trees`; verify pagination.
5. Open `/activities/new`; search/select a tree.
6. Open `/harvests/new`; search/select a tree.
7. Open large `/plots/[plotId]`; verify overview mode.
8. Focus one row and select range.
9. Open reports.
10. Reset baseline again.

### Release Strategy

Ship in small slices:

1. Fixture and measurements.
2. `/trees` pagination.
3. async tree picker.
4. PVO scale overview.
5. PVO focused row actions.
6. batch/report hardening.
7. index hardening.

Do not merge a later phase if an earlier phase leaves baseline or E2E unstable.

## Quality Gates By Phase

Minimum gates for every implementation phase:

```bash
pnpm typecheck
pnpm lint
pnpm test
git diff --check
```

When database or read models change:

```bash
supabase db lint
pnpm seed:baseline-reset
pnpm qa:baseline-status
```

When PVO, forms or routes change:

```bash
pnpm test:e2e
```

When performance fixture is involved:

```bash
pnpm seed:baseline-reset
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
```

Important: after E2E or performance fixture runs, reset baseline again before
manual seeded QA.

## Risk Register

### Risk: UI gets faster but less useful

Mitigation:

- preserve small-plot full map,
- make large-plot overview explainable,
- keep row focus and search fast.

### Risk: async picker breaks PVO prefill

Mitigation:

- selected ID hydration must be part of the first picker slice,
- keep server action relation validation unchanged.

### Risk: pagination hides expected records

Mitigation:

- clear count labels,
- stable filters in query string,
- reset page on filter change.

### Risk: new indexes create maintenance overhead

Mitigation:

- add indexes only after query plan evidence,
- avoid duplicating shadowed indexes.

### Risk: performance fixture pollutes normal QA

Mitigation:

- keep it outside canonical baseline,
- document reset workflow,
- do not include it in `qa:baseline-status`.

## Open Decisions

These do not block Phase 0, but should be answered before PVO redesign.

1. Expected real-world upper bound per plot:
   - 300?
   - 1,000?
   - 3,000?
2. Do workers usually record by:
   - row range,
   - single tree,
   - whole plot,
   - variety?
3. Is mobile field use primary, or is tablet/desktop more common?
4. Should large PVO prefer:
   - row summaries,
   - table-first row detail,
   - compact visual map?
5. Do we need offline-first behavior later?

## Recommended Next Slice

The Phase 0-4 first-pass work, first long-row range action refinement and Phase
7 report read-model hardening are now in place.

The latest local measurement snapshots point to these next options:

1. Add PERF harvest rows and measure filtered `/reports/harvest-locations`
   output before adding harvest report indexes.
2. Consider `/reports/variety-locations` output summarization if manual review
   confirms that the current grouped text output is too noisy.
3. Keep `PERF-LONG-ROW` as regression coverage for deeper long-row UI
   refinements.
4. Add indexes only after query-plan evidence.
