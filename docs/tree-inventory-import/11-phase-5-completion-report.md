# Phase 5 completion report - Normalization, segment expansion and pure validation

## Phase completed

Phase 5 - Normalization, segment expansion and pure validation

## Canonical JSON status

- Canonical JSON v1 is finalized for downstream MVP phases.
- Added `TreeInventoryVarietyReference` to canonical tree defaults and exception
  overrides:
  - `status`
  - `raw_name`
  - `raw_variety_id`
  - `resolved_variety_id`
- `known`, `unknown`, `uncertain` and `new_candidate` are first-class canonical
  variety states before DB validation/resolution.
- Parser and normalizer still do not access DB and do not trust hidden XLSX IDs
  as authority.
- Canonical examples were updated to include explicit variety reference data.

## Validation rules added

- Trim and normalize text fields.
- Parse positive integers for row and position fields.
- Parse planting years/ranges structurally without inventing `planted_at`.
- Map condition input values to current tree `condition_status` semantics.
- Normalize variety references without DB access:
  - `known` with empty `variety_name` is a pure-validation error.
  - `unknown` with empty `variety_name` is allowed.
  - `uncertain` preserves raw candidate names.
  - `new_candidate` with a human name is valid without `variety_id`.
- Generate missing segment/exception keys deterministically.
- Expand `from_position..to_position` into logical positions.
- Apply MVP exceptions:
  - `missing_tree`
  - `different_variety`
  - `condition_override`
  - `dead_tree`
  - `replacement`
  - `notes_only`
- Detect:
  - invalid ranges
  - segment overlaps
  - row position gaps as warnings
  - exceptions outside segments
  - contradictory exceptions
  - expanded position limit violations

## Tests added

- Added pure normalizer tests:
  `tests/unit/tree-inventory-normalizer.spec.ts`.
- Covered parser-to-normalizer handoff from generated/filled workbook fixtures.
- Covered unresolved variety states, known-without-name error, new candidate
  without ID, overlaps, gaps, exception behavior, exception conflicts, outside
  exceptions, expanded limit and 5k performance smoke.

## Performance smoke

- 5k expanded positions normalize within the local unit-test threshold.
- Expanded position count is capped by
  `TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp`.

## Verification commands and results

- Pre-change baseline:
  - `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
  - Result: passed, 48 files / 210 tests.
  - `pnpm test -- tests/unit/plot-selection.spec.ts`
  - Result: passed, 48 files / 210 tests.
- Targeted new tests:
  - `pnpm test -- tests/unit/tree-inventory-normalizer.spec.ts`
  - Result: passed, 49 files / 217 tests.
- Final verification:
  - `pnpm typecheck`
  - Result: passed.
  - `pnpm lint`
  - Result: passed.
  - `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
  - Result: passed.
  - `pnpm test -- tests/unit/plot-selection.spec.ts`
  - Result: passed.
  - `pnpm test -- tests/unit/tree-inventory-normalizer.spec.ts`
  - Result: passed.
  - `git diff --check`
  - Result: passed.
  - `git status --short`
  - Result: reviewed after implementation.

## Checkpoint

Filled XLSX files can now be parsed and converted into canonical domain input
with pure errors and warnings. No DB writes, DB validation, variety ownership
checks, active tree conflict checks, staging, upload UI, preview, confirm,
migration, RLS or RPC behavior was added. It is safe to stop before Phase 6.
