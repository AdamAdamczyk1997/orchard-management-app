# Tree Inventory full-cycle E2E acceptance plan

Status: implemented and verified; keep as closeout checklist until archived.
Created: 2026-08-15.
Last updated: 2026-08-15.

## Purpose

This document tracks the acceptance work for the full `tree_inventory_v1`
browser flow:

1. create a fresh account and orchard,
2. create a row-based plot,
3. download the generated XLSX template,
4. fill the workbook with deterministic inventory data,
5. upload and preview the workbook,
6. resolve variety candidates,
7. confirm the import,
8. verify final trees, plot visual output and variety-location reporting.

The goal is to have one visible checklist that lets us say, with evidence, that
the Excel-based planting inventory flow works from first setup to final report.
When every checkbox in the completion criteria is done, this file can be moved
to `documents/archive/tree_inventory_import/` as a closed acceptance plan.

## Source Of Truth

- Current code, migrations, tests and seed scripts are the primary source of
  truth.
- Active import docs in this directory are the supporting source of truth.
- `documents/archive/` is historical context only.
- The MVP import contract remains:
  - one active `orchard`,
  - one target `plot`,
  - `plot.layout_type = rows`,
  - `incremental_create`,
  - `reject`,
  - owner or `super_admin` resolution and confirm,
  - maximum 1k expanded positions per import.

## Design Decision For Test Data

Do not use one static XLSX file as the only test source.

Reason:

- generated workbooks contain hidden context such as `orchard_id` and `plot_id`;
- in a full-cycle E2E test those IDs are created during the test;
- the safest realistic flow is to download the live template for the fresh plot
  and fill it with stable fixture data.

Recommended shape:

- keep deterministic import rows in a TypeScript fixture;
- generate/fill XLSX during E2E from the current app template;
- attach the generated XLSX to Playwright artifacts for human inspection;
- optionally generate a manual demo XLSX later from the same fixture after the
  automated flow is stable.

## Baseline Analysis

- [x] Confirm active import maintenance docs exist in
  `documents/01_implementation_materials/tree_inventory_import/`.
- [x] Confirm current E2E already covers owner import, empty-orchard candidate
  preview, candidate resolution, worker preview-only, invalid workbook and
  outsider denied path.
- [x] Confirm current E2E generates a workbook dynamically by downloading the
  app template and filling `NASADZENIA`.
- [x] Confirm performance coverage exists for 1k import through parser,
  normalizer, preview, confirm and post-confirm read models.
- [x] Identify the missing acceptance gap: one full browser story from fresh
  orchard setup through final UI/report verification.

## Proposed Reference Fixture

The first full-cycle fixture should stay small but cover the important product
branches:

- fresh orchard with zero initial `trees` and zero initial `varieties`;
- one new `rows` plot created through the UI;
- two `new_candidate` variety groups resolved with `create_new`;
- one accepted `unknown` group left without `trees.variety_id`;
- one `missing_tree` exception that creates no final `trees` record;
- final output around 5-7 created trees, so the E2E remains fast and readable.

Suggested data shape:

| Sheet | Row | Meaning | Expected result |
|---|---:|---|---|
| `NASADZENIA` | S1 | Apple candidate A, row 1, positions 1-3 | 2 trees after missing position 2 |
| `WYJATKI` | E1 | `missing_tree` for S1 row 1 position 2 | no tree created |
| `NASADZENIA` | S2 | Apple candidate B, row 2, positions 1-2 | 2 trees |
| `NASADZENIA` | S3 | Pear unknown, row 3, position 1 | 1 tree with `variety_id = null` |

Expected first acceptance counts:

- total expanded positions: 6;
- planned final tree records: 5;
- missing positions: 1;
- created varieties: 2;
- unknown-variety trees: 1;
- active conflicts: 0.

These values can change only if we consciously revise the fixture and update the
expected report in the same change.

## Phase 1 - Fixture Contract

- [x] Create `tests/fixtures/tree-inventory-import/e2e-full-cycle.ts`.
- [x] Store fixture rows as structured data, not as cell-address mutations only.
- [x] Include expected preview summary counts.
- [x] Include expected confirm report counts.
- [x] Include expected `/trees` texts.
- [x] Include expected `/reports/variety-locations` ranges for created
  varieties.
- [x] Add comments explaining why hidden workbook context is generated at runtime.
- [x] Keep fixture size below the MVP/performance boundary; use performance tests
  for 1k evidence.

## Phase 2 - Workbook Builder For E2E

- [x] Extract current workbook fill helper from
  `tests/e2e/tree-inventory-import.spec.ts` into a reusable helper.
- [x] Make the helper accept the structured full-cycle fixture.
- [x] Fill `NASADZENIA` from fixture segments.
- [x] Fill `WYJATKI` from fixture exceptions.
- [x] Preserve the live `METADANE`, `SLOWNIKI` and hidden IDs from the downloaded
  template.
- [x] Return upload metadata compatible with Playwright `setInputFiles`.
- [x] Attach the generated XLSX to `test.info()` so failed and passed runs have
  an inspectable artifact.
- [x] Add a unit-level smoke check for the fixture-to-workbook helper if it can
  be tested without browser state.

## Phase 3 - Full-Cycle Browser Test

Target file:

- `tests/e2e/tree-inventory-import-full-cycle.spec.ts`

Checklist:

- [x] Register a fresh user with `registerFreshUser`.
- [x] Complete onboarding by creating a fresh orchard.
- [x] Verify dashboard empty-state for the new orchard.
- [x] Create a row-based plot through `/plots/new`.
- [x] Open `/trees/import`.
- [x] Select the newly created plot in the template selector.
- [x] Download the live template.
- [x] Fill it with the full-cycle fixture.
- [x] Upload the generated workbook.
- [x] Assert preview is visible.
- [x] Assert preview summary counts match the fixture.
- [x] Assert there are no active conflicts.
- [x] Assert two blocking `new_candidate` groups are visible.
- [x] Resolve both blocking groups with `create_new`.
- [x] Keep the unknown group as accepted unknown if required by current UI state.
- [x] Assert preview reaches `Gotowy do confirm`.
- [x] Confirm import.
- [x] Assert confirm message says the expected number of trees was created.
- [x] Assert confirm report shows created trees, new varieties, unknown variety
  trees and missing positions.

## Phase 4 - Post-Confirm UI Evidence

- [x] Open `/trees` filtered by the new plot.
- [x] Assert pagination/range text shows the exact expected tree count.
- [x] Assert each expected row/position appears.
- [x] Assert the missing position does not appear as a tree.
- [x] Assert the unknown-variety tree is still visible and located.
- [x] Open `/plots` and then the new plot detail.
- [x] Assert small PVO renders `PlotVisualOverview`, not a missing/fallback error.
- [x] Assert plot visual count matches final created trees.
- [x] Assert at least one imported tree can open the tree detail panel.
- [x] Open `/reports/variety-locations` for candidate A.
- [x] Assert the report shows the created variety and expected row/range.
- [x] Open `/reports/variety-locations` for candidate B.
- [x] Assert the report shows the created variety and expected row/range.
- [x] Confirm unknown-variety trees are not incorrectly included in a variety
  report.

## Phase 5 - Test Stability And Selectors

- [x] Add stable `data-testid` attributes to variety-location report summary
  cards if text-only assertions prove brittle.
- [x] Add stable `data-testid` attributes to range rows in the variety-location
  report if needed.
- [x] Keep assertions focused on product outcomes, not CSS or incidental copy.
- [x] Avoid relying on exact generated UUIDs for fresh user/orchard/plot data.
- [x] Use unique names for orchard, plot and candidate varieties.
- [x] Make cleanup/reset assumptions explicit in test comments.
- [x] Confirm the test remains safe when run after `pnpm seed:baseline-reset`.

## Phase 6 - Documentation Updates

- [x] Update `documents/01_implementation_materials/tree_inventory_import/README.md`
  with the full-cycle plan/test link.
- [x] Update `documents/01_implementation_materials/tree_inventory_import/test_scenarios.md`
  with the final accepted full-cycle E2E scenario.
- [x] Review `documents/00_overview_and_checklists/manual_testing_quickstart.md`;
  no change needed because the user-facing manual QA flow did not change.
- [x] Update `documents/ui_implementation_map.md` only if new test IDs, routes or
  user-visible states are added.
- [x] Keep archived tree-inventory docs historical; do not edit them as source
  of truth.

## Phase 7 - Verification Gate

Run only the checks that fit the change size during each phase, but the closeout
gate should include:

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] `pnpm seed:baseline-reset`
- [x] `pnpm qa:baseline-status`
- [x] `pnpm test:e2e -- tests/e2e/tree-inventory-import-full-cycle.spec.ts`
- [x] `pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts`
- [x] `pnpm test:e2e`

Notes:

- E2E mutates local baseline data.
- After E2E, run `pnpm seed:baseline-reset` again before manual seeded QA.
- Do not run 1k performance gates as part of every iteration; keep them for
  release/readiness checks or import performance changes.

## Completion Criteria

The plan can be considered closed only when all of these are true:

- [x] The full-cycle fixture exists and is reusable.
- [x] The generated XLSX is attached as a Playwright artifact.
- [x] The full-cycle E2E creates a fresh orchard and row plot.
- [x] The E2E imports the workbook through the browser UI, not by bypassing the
  app.
- [x] Preview counts are asserted.
- [x] Candidate resolution is asserted.
- [x] Confirm report counts are asserted.
- [x] `/trees` post-confirm state is asserted.
- [x] `/plots/[plotId]` PVO post-confirm state is asserted.
- [x] `/reports/variety-locations` post-confirm state is asserted.
- [x] Worker/outsider coverage remains covered by existing tests.
- [x] The closeout verification gate passes or any skipped command has a clear
  documented reason.
- [x] Active docs point to the final E2E evidence.
- [x] This file is marked complete here. It can now be moved to
  `documents/archive/tree_inventory_import/` with a short completion note.

## Open Questions To Revisit During Implementation

- [x] Should the full-cycle E2E keep the unknown group through current automatic
  accepted-unknown behavior, or should it click `Keep unknown` explicitly if the
  UI exposes it? Decision: keep current automatic `accepted_unknown` behavior and
  assert it in the browser flow.
- [x] Do we want a generated manual demo workbook committed under
  `documents/08_prototype_import_export_templates/`, or is the Playwright
  artifact enough? Decision: Playwright artifact is enough for automated
  acceptance; a manual demo workbook can be generated later from the same fixture.
- [x] Should the final report expose a downloadable JSON/audit view in the UI, or
  is the current confirm report card enough for MVP acceptance? Decision: current
  confirm report cards are enough for this MVP acceptance slice.
- [x] Should variety-location report receive stable `data-testid` attributes as
  part of this slice? Decision: yes, added for summary cards, groups and ranges.

## Implementation Evidence

Implemented files:

- `tests/fixtures/tree-inventory-import/e2e-full-cycle.ts`
- `tests/fixtures/tree-inventory-import/e2e-workbook-builder.ts`
- `tests/unit/tree-inventory-e2e-workbook-builder.spec.ts`
- `tests/e2e/support/tree-inventory-import.ts`
- `tests/e2e/tree-inventory-import-full-cycle.spec.ts`

Updated existing coverage and selectors:

- `tests/e2e/tree-inventory-import.spec.ts` now reuses the shared workbook helper.
- `features/trees/tree-inventory-import-form.tsx` exposes stable preview and
  confirm report test IDs.
- `features/varieties/variety-locations-report-view.tsx` exposes stable summary,
  group and range test IDs.
- `eslint.config.mjs` ignores Playwright artifact directories so `pnpm lint`
  works before and after E2E runs.

Verification completed on 2026-08-15:

- `pnpm exec vitest run tests/unit/tree-inventory-e2e-workbook-builder.spec.ts`
  - passed.
- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm test` - passed, 57 files passed and 1 skipped; 249 tests passed and 1
  skipped.
- `pnpm seed:baseline-reset` - passed.
- `pnpm qa:baseline-status` - passed with `Baseline QA status: READY`.
- `pnpm test:e2e -- tests/e2e/tree-inventory-import-full-cycle.spec.ts` -
  passed.
- `pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts` - passed, 6 tests.
- `pnpm test:e2e` - passed, 22 tests passed and 2 skipped.
- Final `pnpm seed:baseline-reset` and `pnpm qa:baseline-status` were run after
  E2E; baseline ended in `READY` state.
