# Phase 10 stop report - 5k confirm timeout

## Phase attempted

Phase 10 - Compatibility, performance and release hardening

## Stop condition hit

Phase 10 hit this roadmap stop condition:

- `5k import fails and no accepted MVP limit is set.`

The initial 5k import did not fail in parser, normalizer, staging or confirm.
It failed in read-model verification after confirm with:

```text
read_models_ms: canceling statement due to statement timeout
```

A scoped read-side hardening was then added:

- `getPlotVisualRowDetailForOrchard` now separates exact count queries from
  joined page reads.
- `getPlotTreeScaleProfileForOrchard` no longer asks PostgREST to sort source
  rows by fields that are already summarized and sorted in application code.

After that hardening, a targeted 5k run passed post-confirm read models when
confirm succeeded. Repeat runs now fail earlier in `confirm_tree_inventory_import`
with:

```text
confirm returned TREE_BATCH_MUTATION_FAILED: Confirm importu przekroczyl limit czasu lokalnej bazy.
```

Phase 10 was intentionally stopped at this point instead of silently adapting
the roadmap.

## Decision after stop

After reviewing the tradeoff, the accepted MVP limit is now 1k expanded
positions. Larger plots should be split into smaller imports for MVP. Stable 5k
imports remain future hardening and are tracked in
`documents/01_implementation_materials/tree_inventory_import/future_5k_import_hardening_plan.md`.

Post-decision accepted-limit benchmark:

- Command:
  `pnpm test tests/performance/tree-inventory-import-performance.spec.ts --mode tree-inventory-perf`
- Result: passed, 1 test.
- Created trees: `1000`.
- Confirmed tree count: `1000`.
- Tree scale total: `1000`.
- Row detail total: `1000`.
- Timings:
  - `template_ms=4663`
  - `parse_ms=262`
  - `normalize_ms=18`
  - `stage_preview_ms=2939`
  - `confirm_ms=1018`
  - `read_tree_count_ms=1078`
  - `read_tree_scale_ms=1203`
  - `read_row_detail_ms=1540`
  - `total=12726`

## Performance evidence

Benchmark command:

```bash
pnpm test tests/performance/tree-inventory-import-performance.spec.ts --mode tree-inventory-perf
```

1k targeted benchmark:

- Result: passed.
- Workbook bytes: `68528`.
- Created trees: `1000`.
- Created varieties: `0`.
- Confirmed tree count: `1000`.
- Tree scale total: `1000`.
- Row detail total: `1000`.
- Row detail truncated: `true`.
- Timings:
  - `template_ms=3675`
  - `parse_ms=183`
  - `normalize_ms=12`
  - `stage_preview_ms=1521`
  - `confirm_ms=691`
  - `read_models_ms=2953`
  - `total=9038`

5k targeted benchmark before read-side hardening:

- Result: failed during read models after confirm.
- Timings before failure:
  - `template_ms=4006`
  - `parse_ms=190`
  - `normalize_ms=67`
  - `stage_preview_ms=6542`
  - `confirm_ms=6583`
  - `read_models_ms=10639` then statement timeout

5k targeted benchmark after read-side hardening, successful run:

- Result: passed.
- Created trees: `5000`.
- Confirmed tree count: `5000`.
- Tree scale total: `5000`.
- Row detail total: `5000`.
- Row detail truncated: `true`.
- Timings:
  - `template_ms=4401`
  - `parse_ms=245`
  - `normalize_ms=120`
  - `stage_preview_ms=8036`
  - `confirm_ms=7902`
  - `read_tree_count_ms=2848`
  - `read_tree_scale_ms=15539`
  - `read_row_detail_ms=7473`
  - `total=46569`

5k repeat benchmark after read-side hardening:

- Result: failed during confirm RPC.
- Timings before failure:
  - `template_ms=3817`
  - `parse_ms=181`
  - `normalize_ms=65`
  - `stage_preview_ms=7339`
  - `confirm_ms=8010` then local statement timeout

## Regression results before blocker

- `supabase db lint`: passed.
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm test`: passed, 56 files / 248 tests.
- `pnpm seed:baseline-reset`: passed.
- `pnpm qa:baseline-status`: passed, status READY.
- `pnpm seed:large-plot-fixture`: passed.
- First full `pnpm test:e2e`: 22/23 passed. The failing
  `orchard-access` assertion assumed the worker had only one active orchard;
  this became false after the PERF fixture was seeded.
- `tests/e2e/orchard-access.spec.ts` was updated to use the revoked worker
  persona for the switcher-disabled assertion.
- `pnpm test:e2e tests/e2e/orchard-access.spec.ts`: passed, 7 tests.
- After `pnpm seed:baseline-reset`, `pnpm qa:baseline-status` and
  `pnpm seed:large-plot-fixture`, full `pnpm test:e2e` passed, 23 tests.

## Post-stop sanity checks

- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `git diff --check`: passed.
- `pnpm seed:baseline-reset`: passed after performance attempts.
- `pnpm qa:baseline-status`: passed, status READY.
- `git status --short`: contains Phase 9 changes, Phase 10 stop-report and
  benchmark changes, plus existing `supabase/.temp/cli-latest` local Supabase
  CLI temp drift.

Additional targeted checks after read-side/RPC hardening:

- `supabase db lint`: passed.
- `pnpm test tests/integration/plot-visual-row-detail.spec.ts`: passed, 2 tests.
- `pnpm test tests/integration/tree-inventory-confirm.spec.ts`: passed, 5 tests.
- `pnpm test tests/security/tree-inventory-import-rls.spec.ts`: passed, 6 tests.
- `pnpm qa:baseline-status`: passed, status READY.
- `git diff --check`: passed.

## Files changed in this attempt

- Added `tests/performance/tree-inventory-import-performance.spec.ts`.
- Added `perf:tree-inventory-import` script in `package.json`.
- Updated `lib/orchard-data/trees.ts` with scoped read-side query hardening.
- Updated `lib/tree-inventory-import/confirm.server.ts` to report local confirm
  statement timeouts explicitly.
- Optimized the uncommitted Phase 9 confirm RPC by combining confirm report
  position counts, caching `auth.uid()` in a local variable and removing
  unnecessary ordering from non-user-visible queries.
- Updated `tests/e2e/support/fixtures.ts` with `workerRevoked`.
- Updated `tests/e2e/orchard-access.spec.ts` to avoid relying on the PERF
  fixture's active worker membership side effect.
- Updated this roadmap with the Phase 10 blocker and next planned decision.

## Next recommended step

Resolved after this stop: the accepted MVP limit is 1k expanded positions, and
5k support moved to future hardening. Continue from
`documents/archive/tree_inventory_import/21-phase-10-completion-report.md` for final Phase 10
release readiness evidence.
