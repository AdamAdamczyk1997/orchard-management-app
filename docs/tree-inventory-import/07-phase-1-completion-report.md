# Tree Inventory XLSX Import - Phase 1 completion report

## Phase completed

Phase 1 - Import contracts, diagnostics and limits

## Files changed

- `lib/tree-inventory-import/contracts.ts`
- `lib/tree-inventory-import/limits.ts`
- `tests/fixtures/tree-inventory-import/canonical-examples.ts`
- `tests/unit/tree-inventory-import-contracts.spec.ts`

## Contracts added

- `tree_inventory_v1` contract/version constants.
- Worksheet and field constants for `METADANE`, `NASADZENIA`, `WYJATKI`,
  `SLOWNIKI` and optional `RZEDY`.
- Accepted enum values:
  - import mode: `incremental_create`
  - conflict strategy: `reject`
  - variety confidence: `known`, `unknown`, `uncertain`, `new_candidate`
  - exception types: `missing_tree`, `different_variety`,
    `condition_override`, `dead_tree`, `replacement`, `notes_only`
  - condition inputs and mappings to current `TreeConditionStatus`
- Source provenance types for workbook, sheet, row, column and raw value.
- Structured diagnostic shape with `code`, `severity`, `source`, `message`,
  `normalized_value` and `entity_refs`.
- Canonical JSON types for generated context, requested behavior, segments,
  exceptions, expanded positions and diagnostics.
- Import limits:
  - `max_workbook_bytes = 5 MB`
  - `max_segment_rows = 500`
  - `max_exception_rows = 1000`
  - `max_expanded_tree_positions_mvp = 5000`
  - `max_diagnostics_returned = 500`

## Tests added

- Unit tests for contract versions and required worksheets.
- Unit tests for enum parsing and condition mappings.
- Diagnostic shape snapshot with sheet, row, column and raw value.
- Canonical JSON example fixture with `missing_tree` expanded as
  `skip_missing`.
- Unit checks for JSON-safe canonical examples and import limits.

## Verification commands and results

Baseline before Phase 1 changes:

- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts` - passed;
  Vitest ran the configured unit suite: 44 files, 187 tests.
- `pnpm test -- tests/unit/plot-visual-grid.spec.ts` - passed; Vitest ran the
  configured unit suite: 44 files, 187 tests.

After Phase 1 changes:

- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts` - passed;
  Vitest ran the configured unit suite: 45 files, 194 tests.
- `pnpm test -- tests/unit/plot-visual-grid.spec.ts` - passed; Vitest ran the
  configured unit suite: 45 files, 194 tests.
- `pnpm test tests/unit/tree-inventory-import-contracts.spec.ts` - passed:
  1 file, 7 tests.
- `git diff --check` - passed.
- `git status --short` - showed existing untracked `docs/` and
  `documents/08_prototype_import_export_templates/`, plus Phase 1 untracked
  files under `lib/tree-inventory-import/`, `tests/fixtures/` and
  `tests/unit/tree-inventory-import-contracts.spec.ts`.

## Stop conditions hit

None.

## Checkpoint

The repo has a stable in-code import vocabulary and diagnostic shape for
`tree_inventory_v1`. It is safe to stop because no runtime XLSX, DB, RLS, RPC,
UI, parser, normalizer, preview or confirm behavior has changed.

## Next planned step

Phase 2 - XLSX dependency spike and library decision.

Phase 2 should evaluate currently relevant XLSX libraries against server-only
Next.js usage, generation/parsing support, hidden sheets/columns, dropdowns,
deterministic tests, memory behavior, maintenance, licensing, security history
and bundle impact. Do not implement the production template generator or parser
before the Phase 2 checkpoint is complete.
