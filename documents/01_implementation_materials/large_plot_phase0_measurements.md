# Large plot Phase 0 measurements

Status: first local measurement snapshot.
Date: 2026-06-21.

## Setup

Commands used:

```bash
pnpm seed:large-plot-fixture
pnpm qa:baseline-status
pnpm dev
```

Fixture:

- orchard: `PERF` / `Sad Performance Fixture`
- `PERF-500`: rows plot, 500 trees
- `PERF-1500`: rows plot, 1,500 trees
- `PERF-MIX`: mixed plot, 126 trees with inferred gaps
- plot detail routes use deterministic fixture UUIDs, not plot codes:
  - `PERF-500`: `/plots/92000000-0000-4000-8000-000000000001`
  - `PERF-1500`: `/plots/92000000-0000-4000-8000-000000000002`
  - `PERF-MIX`: `/plots/92000000-0000-4000-8000-000000000003`

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
