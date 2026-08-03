# Large plot Phase 0 measurements

Status: local measurement snapshots.
Initial snapshot date: 2026-06-21.

## Setup

Commands used:

```bash
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Current fixture as of 2026-08-03:

- orchard: `PERF` / `Sad Performance Fixture`
- `PERF-500`: rows plot, 500 trees
- `PERF-1500`: rows plot, 1,500 trees
- `PERF-MIX`: mixed plot, 126 trees with inferred gaps
- `PERF-LONG-ROW`: rows plot, one 350-tree row for focused row fallback
- harvest report rows: 183 records for the 2026 season, including 150
  `location_range`, 30 `tree`, 2 `plot` and 1 `orchard` record
- plot detail routes use deterministic fixture UUIDs, not plot codes:
  - `PERF-500`: `/plots/92000000-0000-4000-8000-000000000001`
  - `PERF-1500`: `/plots/92000000-0000-4000-8000-000000000002`
  - `PERF-MIX`: `/plots/92000000-0000-4000-8000-000000000003`
  - `PERF-LONG-ROW`: `/plots/92000000-0000-4000-8000-000000000004`

Measurement method:

- local Next dev server on `http://localhost:3000`
- headless Chromium through Playwright
- logged in as `jan.owner@orchardlog.local`
- active orchard set to `PERF`
- desktop viewport: `1440 x 1100`
- each route was warmed once, then loaded again for the recorded numbers

These numbers are directional. They are enough to identify the first bottlenecks,
not a final performance benchmark.

## Route Results

| Route | Elapsed | DOM nodes | Notes |
| --- | ---: | ---: | --- |
| `/trees?is_active=true` | 13,233 ms | 22,140 | Unbounded list render; 1,014 links and 301k body text chars. |
| `/activities/new` | 1,314 ms | 208 | Initial DOM is small; code still fetches `treeOptions` server-side. |
| `/harvests/new` | 1,401 ms | 150 | Initial DOM is small; code still fetches `treeOptions` server-side. |
| `/plots/92000000-0000-4000-8000-000000000001` (`PERF-500`) | 1,312 ms | 1,257 | 500 plot markers and 504 buttons. |
| `/plots/92000000-0000-4000-8000-000000000002` (`PERF-1500`) | 1,542 ms | 2,315 | Only 1,000 plot markers rendered despite 1,500 fixture trees. |
| `/plots/92000000-0000-4000-8000-000000000003` (`PERF-MIX`) | 1,033 ms | 517 | 144 plot markers including inferred empty positions. |
| `/reports/variety-locations` | 870 ms | 134 | No variety filter selected in this first pass. |
| `/reports/harvest-locations` | 1,003 ms | 174 | No plot filter selected in this first pass. |

## Findings

1. `/trees` is the first confirmed problem.
   - It took about 13 seconds on local dev.
   - It rendered over 22k DOM nodes.
   - It is not safe as an unbounded production list for large orchards.

2. Current unbounded Supabase reads probably hit a 1,000-row cap.
   - Fixture SQL inserted 1,500 trees for `PERF-1500`.
   - PVO rendered exactly 1,000 markers for that plot.
   - `/trees` also looked capped around 1,000 rendered records.
   - This is worse than a pure performance issue because the UI can silently miss records.

3. PVO full-marker rendering is acceptable for 500 only as a temporary small/medium behavior.
   - 500 markers produced a usable but already button-heavy page.
   - 1,500 trees must not rely on the current full-list/full-marker path.

4. Activity and harvest forms need a payload measurement pass.
   - Initial DOM is small because tree options are not all visible immediately.
   - Code inspection still shows server-side `listTreeOptionsForOrchard()` on page load.
   - The next measurement should capture RSC/HTML payload size and selected-plot interaction.

5. Reports need filtered measurements.
   - This first pass only measured default report pages.
   - The risky paths are variety-selected and plot-selected report queries.

## Recommended Next Slice

Phase 1 should start with paginated `/trees`, but it should also explicitly
address the silent 1,000-row truncation risk:

- add a paginated `listTreePageForOrchard()` read model,
- request exact counts from Supabase,
- use database ordering instead of TypeScript sorting,
- make page size explicit,
- add tests proving page size and total count behavior.

After that, Phase 2 async tree picker should remove `treeOptions` from initial
activity and harvest form payloads.

Update:

- Phase 1 `/trees` pagination has been implemented after this measurement snapshot.
- Phase 2 async tree picker for activity and harvest forms has been implemented
  after the Phase 1 follow-up measurement.

## Phase 1 Follow-Up Measurement

After paginating `/trees` with explicit `page_size`, the same local fixture and
desktop viewport produced:

| Route | Elapsed | DOM nodes | Notes |
| --- | ---: | ---: | --- |
| `/trees?is_active=true&page_size=50` | 2,741 ms | 1,355 | First page, 50 rows. |
| `/trees?is_active=true&page=2&page_size=50` | 2,546 ms | 1,353 | Second page, 50 rows. |
| `/trees?is_active=true&page_size=100` | 3,402 ms | 2,491 | First page, 100 rows. |

This confirms that Phase 1 removed the biggest `/trees` DOM explosion from the
first snapshot. It also gives us a useful provisional default: `page_size=50`
is a reasonable starting point until production-like measurements say otherwise.

## Phase 2 Follow-Up Measurement

After replacing initial form `treeOptions` payloads with async `TreePicker`, the
same local fixture and desktop viewport produced:

| Route / interaction | Elapsed | DOM nodes | Tree options | Notes |
| --- | ---: | ---: | ---: | --- |
| `/activities/new` | 1,930 ms | 249 | 1 | Initial page has only the empty main tree option. |
| `/harvests/new` | 1,818 ms | 188 | 0 | Tree select is not rendered until tree scope is selected. |
| `/activities/new`, select `Performance Rows 1500` | 2,000 ms | 274 | 51 | Async picker loads 50 trees plus empty option. |
| `/activities/new`, search `R20/P1` | 893 ms | 274 | 12 | Search narrows options without loading the full plot. |

This confirms that Phase 2 removes the initial 2,126-tree option payload from
activity and harvest form loads. The remaining large-plot risks are PVO
full-marker rendering and report queries that still need filtered measurements.

## Phase 3 Follow-Up Measurement

After adding `getPlotTreeScaleProfileForOrchard()` and medium/large
`PlotTreeScaleOverview`, the same local fixture and desktop viewport produced:

| Route | Elapsed | DOM nodes | Overview | Markers | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| `/plots/92000000-0000-4000-8000-000000000002` (`PERF-1500`) | 3,554 ms | 647 | 1 | 0 | Large plot overview mode; full marker grid intentionally not rendered. |

The original Phase 0 measurement for the `PERF-1500` plot was faster in local
dev at 1,542 ms, but it rendered 2,315 DOM nodes and only 1,000 markers despite
the fixture containing 1,500 trees. Phase 3 trades that unsafe truncated marker
view for a complete row/section summary with no marker explosion.

## Phase 4 Follow-Up Measurement

After adding focused row detail, the same local fixture and desktop viewport
produced:

| Route | Elapsed | DOM nodes | Row detail | Grid | Markers | Notes |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| `/plots/92000000-0000-4000-8000-000000000002?section=A&row=1` | 3,603 ms | 359 | 1 | 1 | 50 | Focused row mode for `PERF-1500`; one 50-tree row rendered with existing PVO marker interactions. |

Measurement note: the active orchard cookie was set directly to `PERF`
(`ol_active_orchard=90000000-0000-4000-8000-000000000001`) before the measured
request. In this local run the dashboard redirect tended to restore the
preferred baseline orchard cookie, so the measurement pinned the cookie
immediately before route navigation.

## Post Read-Model Hardening Measurement

Status: local follow-up snapshot after:

- `6b4a6db feat: harden large tree read models`
- `da654e0 feat: add long row range actions`

Date: 2026-08-03.

Setup:

```bash
pnpm seed:baseline-reset
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Measurement method:

- local Next dev server on `http://localhost:3000`,
- headless Chromium through Playwright,
- logged in as `jan.owner@orchardlog.local`,
- active orchard pinned to `PERF` by setting `ol_active_orchard`,
- desktop viewport: `1440 x 1100`,
- each route was warmed once, then loaded again for the recorded numbers.

These numbers are still directional. They include local Next dev behavior and
should not be treated as production latency.

| Route / interaction | Elapsed | DOM nodes | Key count | Notes |
| --- | ---: | ---: | ---: | --- |
| `/trees?is_active=true&page_size=50` | 3,222 ms | 1,392 | 50 visible rows | Pagination remains bounded. |
| `/trees?is_active=true&page=2&page_size=50` | 3,173 ms | 1,391 | 50 visible rows | Page 2 remains similar to page 1. |
| `/activities` | 1,661 ms | 301 | 1 tree filter option | Activity list no longer loads all tree options initially. |
| `/activities/new` | 1,786 ms | 225 | 1 tree option | Create form still has small initial payload. |
| `/harvests/new` | 1,797 ms | 163 | 0 tree options | Tree picker remains hidden until tree scope is selected. |
| `/plots/92000000-0000-4000-8000-000000000002` (`PERF-1500`) | 3,340 ms | 647 | 1 overview, 0 markers | Large plot overview still avoids full marker render. |
| `/plots/92000000-0000-4000-8000-000000000002?section=A&row=1` | 3,281 ms | 359 | 50 markers | Focused row remains bounded for fixture rows. |
| `/reports/variety-locations?variety_id=93000000-0000-4000-8000-000000000001` | 3,245 ms | 4,261 | 34,964 body chars | Paginated read avoids data cap, but output is the largest DOM/text surface measured. |
| `/reports/harvest-locations?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002` | 1,955 ms | 191 | 0 table rows | SQL RPC path avoids large `tree_id.in(...)`; fixture has no harvest rows. |
| `/activities`, select `Performance Rows 1500` in tree filter | 2,297 ms | 373 | 51 tree options | Async tree filter loads 50 trees plus empty option. |
| `/activities/new`, select `Performance Rows 1500` | 1,261 ms | 313 | 51 tree options | Async picker remains bounded after plot selection. |

Findings:

1. The biggest confirmed DOM/text surface after hardening is now
   `/reports/variety-locations` for a popular variety.
   - It no longer risks the default PostgREST page cap because the read model
     uses paginated `.range()` chunks.
   - The rendered report can still become verbose because it expands many
     grouped ranges as text.

2. `/activities` list filtering is now scale-safe on initial load.
   - The page starts with only the empty tree option.
   - Selecting `PERF-1500` loads 50 tree options plus the empty option.

3. `/reports/harvest-locations` now exercises the SQL RPC path for plot filters.
   - This snapshot confirms the route stays small with the `PERF-1500` plot
     filter.
   - The current fixture does not include PERF harvest rows, so this does not
     measure large harvest result rendering.

4. `PERF-1500` does not exercise the new long-row range action UI.
   - Its rows have 50 trees each.
   - Long-row fallback above `PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT` is covered by
     unit/integration tests, but not by the current performance fixture.

Fixture update after this snapshot:

- `PERF-LONG-ROW` now exists with one 350-tree row so browser measurements can
  exercise `PlotVisualRowRangeActions`.

## Long-Row Fallback Measurement

Status: local follow-up snapshot after:

- `d30c027 test: add long row performance fixture`
- table preview cap cleanup in `getPlotVisualRowDetailForOrchard()`

Date: 2026-08-03.

Setup:

```bash
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Measurement method:

- local Next dev server on `http://localhost:3000`,
- headless Chromium through Playwright,
- logged in as `jan.owner@orchardlog.local`,
- active orchard pinned to `PERF` by setting `ol_active_orchard`,
- desktop viewport: `1440 x 1100`,
- each route was warmed once, then loaded again for the recorded numbers.

These numbers are still directional. They include local Next dev behavior and
should not be treated as production latency.

| Route / interaction | Elapsed | DOM nodes | Key count | Notes |
| --- | ---: | ---: | ---: | --- |
| `/plots/92000000-0000-4000-8000-000000000004` (`PERF-LONG-ROW`) | 1,557 ms | 263 | 1 overview, 0 markers | Single-row large plot overview stays small. |
| `/plots/92000000-0000-4000-8000-000000000004?section=A&row=1` | 2,955 ms | 1,224 | 100 table rows, 0 markers | Focused long row uses range actions and capped table preview. |
| `PERF-LONG-ROW` range action -> `/activities/new` | 946 ms | 492 | 1 prefill message, 1 scope | Add Activity prefill stays compact for positions 1-50. |

Finding:

- The first measurement run exposed that the default unfiltered long-row table
  inherited the 300-row marker payload. The read model now caps
  `filtered_trees` with `PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT` even when
  no filters are active.
- After the cap, the same focused long-row route renders 100 table rows instead
  of 300, with DOM size reduced from 3,155 to 1,224 nodes in this local run.
- The Add Activity range href remains compact at 249 characters and resolves to
  one `location_range` scope on `/activities/new`.

## Harvest Location Report Fixture Measurement

Status: local follow-up snapshot after adding PERF harvest records to
`supabase/seeds/010_large_plot_performance_fixture.sql`.

Date: 2026-08-03.

Setup:

```bash
pnpm seed:baseline-reset
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Fixture harvest shape:

- 183 total harvest records for `PERF`,
- 150 `location_range` records on `PERF-1500` across 30 rows x 5 ranges,
- 30 `tree` records whose plot is resolved through the RPC tree join,
- 2 `plot` records and 1 `orchard` record for unresolved-location coverage.

Measurement method:

- local Next dev server on `http://localhost:3000`,
- headless Chromium through Playwright,
- logged in as `jan.owner@orchardlog.local`,
- active orchard pinned to `PERF` by setting `ol_active_orchard`,
- desktop viewport: `1440 x 1100`,
- each route was warmed once, then loaded again for the recorded numbers.

These numbers are still directional. They include local Next dev behavior and
should not be treated as production latency.

| Route | Elapsed | DOM nodes | Key count | Notes |
| --- | ---: | ---: | ---: | --- |
| `/reports/harvest-locations?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002` | 2,414 ms | 2,096 | 30 row groups, 180 range blocks | RPC path now measured with real PERF harvest rows. |
| `/reports/harvest-locations?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002&variety_id=93000000-0000-4000-8000-000000000001` | 2,118 ms | 697 | 25 row groups, 30 range blocks | Variety-filtered report stays small. |
| `/harvests?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002` | 4,519 ms | 5,007 | 150 range blocks, 42,439 body chars | The harvest list is now the larger surface for this fixture. |

Findings:

1. `/reports/harvest-locations` stays bounded with actual PERF harvest rows.
   - The plot-filtered report renders grouped rows/ranges instead of raw record
     tables.
   - Tree-scoped harvest records with `plot_id = null` are included through the
     RPC tree join.

2. The route that now needs the next cleanup evidence is `/harvests`.
   - It renders a full list for the 150 direct plot-scoped range records.
   - It also does not include the 30 tree-scoped records with `plot_id = null`
     when filtering by plot, because the list query still filters direct
     `harvest_records.plot_id`.

Recommended next slice:

1. Add pagination or a capped read model for `/harvests` before using it with
   very large harvest datasets.
2. Decide whether `/harvests` plot filtering should include tree-scoped records
   through the same tree join semantics as `harvest-locations`.
3. Consider report UI summarization for `/reports/variety-locations` if manual
   review confirms the 4k-node / 35k-text output is too noisy.
4. Keep `PERF-LONG-ROW` as regression coverage for future deeper long-row UI
   refinements.
5. Do not add indexes yet; use query-plan evidence first.

## Harvest List Pagination Follow-Up Measurement

Status: local closeout snapshot after `/harvests` pagination/read-model cleanup.

Date: 2026-08-03.

Setup:

```bash
pnpm seed:baseline-reset
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Implementation under test:

- `/harvests` uses `listHarvestRecordPageForOrchard()`.
- The list page calls read-only SQL RPCs
  `count_harvest_record_list_rows(...)` and
  `list_harvest_record_list_rows(...)`.
- Plot filtering now includes:
  - direct `harvest_records.plot_id`,
  - tree-scoped fallback through `trees.plot_id`.
- Default UI page size is 50, with 25/50/100 page-size options.

Measurement method:

- local Next dev server on `http://localhost:3000`,
- headless Chromium through Playwright,
- logged in as `jan.owner@orchardlog.local`,
- active orchard pinned to `PERF` by setting `ol_active_orchard`,
- desktop viewport: `1440 x 1100`,
- each route was warmed once, then loaded again for the recorded numbers.

These numbers are still directional. They include local Next dev behavior and
should not be treated as production latency.

| Route | Elapsed | DOM nodes | Key count | Notes |
| --- | ---: | ---: | ---: | --- |
| `/harvests?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002&page_size=50` | 2,772 ms | 1,823 | `Pokazano 1-50 z 182 wpisow` | First page, 50 rows, 4 total pages. |
| `/harvests?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002&page=2&page_size=50` | 2,346 ms | 1,833 | `Pokazano 51-100 z 182 wpisow` | Second page stays bounded. |
| `/harvests?season_year=2026&plot_id=92000000-0000-4000-8000-000000000002&page_size=100` | 3,893 ms | 3,443 | `Pokazano 1-100 z 182 wpisow` | Larger page size remains usable but costs almost twice the DOM of page size 50. |

Findings:

1. `/harvests` no longer renders all plot-filtered PERF harvest rows in one
   page.
   - The previous local snapshot for the same plot filter was 4,519 ms,
     5,007 DOM nodes and 42,439 body text chars.
   - Page size 50 now renders about 1.8k DOM nodes and about 15k body text
     chars in this local run.

2. `/harvests` plot-filter semantics now match `/reports/harvest-locations`.
   - The filtered total is 182 records:
     - 150 `location_range` records on `PERF-1500`,
     - 30 `tree` records resolved through `trees.plot_id`,
     - 2 direct `plot` records.
   - The one orchard-scoped fixture record is intentionally excluded by the
     plot filter.

3. `page_size=50` is the safer default for the current list UI.
   - `page_size=100` is available for denser review.
   - It roughly doubles DOM/text output compared with page size 50 in this
     measurement.

Closeout follow-ups:

- Consider `/reports/variety-locations` UI summarization if manual review
  confirms the grouped text output is too noisy.
- Add indexes only after query-plan evidence for measured slow queries.
- Keep `PERF-LONG-ROW` as regression coverage for future deeper long-row UI
  refinements.
