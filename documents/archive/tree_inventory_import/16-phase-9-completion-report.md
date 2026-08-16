# Phase 9 completion report - Owner confirm transaction and final report

## Phase completed

Phase 9 - Owner confirm transaction and final report

## Confirm behavior

- Added `confirm_tree_inventory_import` in
  `supabase/migrations/038_create_tree_inventory_confirm_rpc.sql`.
- Confirm is owner/`super_admin` only and validates authenticated identity,
  active orchard, staged import orchard, membership permission, import status,
  confirm token and `confirm_version`.
- Confirm revalidates unresolved/suggested variety candidates, resolved variety
  IDs, species/orchard ownership and active tree location conflicts against the
  current database state.
- Worker, outsider and revoked membership confirm attempts are denied.
- No silent fuzzy matching or raw-name variety creation was added.

## Idempotency behavior

- Confirm locks the staged import row and moves an open import through
  `ready_for_owner_confirm` -> `confirming` -> `confirmed`.
- Retrying confirm for an already `confirmed` import returns the persisted final
  report without inserting duplicate `trees` or duplicate audit rows.
- Stale `confirm_version` or stale token requires a fresh preview/resolution
  state.

## Trees/materialization behavior

- Planned `create_tree` positions are bulk inserted into `trees`.
- `missing_tree` positions create no `trees` records.
- `keep_unknown` and accepted unknown positions materialize with
  `trees.variety_id=null`.
- `use_existing` materializes with a revalidated staged/resolved `variety_id`.
- `resolution_action=create_new` creates orchard-local `varieties` inside the
  same final transaction before tree insert, then updates staged candidates and
  positions to the created `variety_id`.
- Created trees are mapped back through `inventory_import_created_trees`.
- Import-only planting year evidence is preserved in `notes` without adding
  import-only columns to `trees` or faking `planted_at`.

## Final report

- Confirm returns and persists a final `confirm_report` with created tree count,
  created variety count, missing position count, unknown-variety tree count,
  mapped-existing-variety tree count, created-variety tree count, confirmer and
  confirmation timestamp.
- The `/trees/import` UI shows the persisted report after successful confirm.
- The owner E2E flow verifies that `/trees` shows materialized records after
  confirm.

## Tests added

- Added `tests/integration/tree-inventory-confirm.spec.ts`.
- Extended `tests/security/tree-inventory-import-rls.spec.ts` with confirm
  owner/worker/outsider/revoked coverage and created-tree audit visibility.
- Extended `tests/e2e/tree-inventory-import.spec.ts` so owner flows confirm real
  imports and verify `/trees` output.
- Updated `tests/integration/tree-inventory-upload.spec.ts` for confirm token and
  confirm result shape.

## Verification commands and results

Pre-change baseline:

- `supabase db lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test tests/integration/tree-batch-operations.spec.ts`
  - Result: passed, 1 file / 2 tests.
- `pnpm test tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 1 file / 1 test.
- `pnpm test tests/integration/variety-locations-report.spec.ts`
  - Result: passed, 1 file / 2 tests.
- `pnpm test tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 1 file / 5 tests.
- `pnpm test:e2e tests/e2e/tree-inventory-import.spec.ts`
  - Result: passed, 6 tests.
- `pnpm test:e2e tests/e2e/plot-visual-operations.spec.ts`
  - Result: passed, 2 passed / 2 skipped.
- `pnpm test:e2e tests/e2e/tree-batch-and-export.spec.ts`
  - Result: passed, 1 test.

Post-change checks:

- `supabase db reset`
  - Result: passed after the local Kong upstream was restarted following an
    intermediate local Supabase Auth 502 caused by container address drift.
- `pnpm test tests/integration/tree-inventory-confirm.spec.ts`
  - Result: passed, 1 file / 5 tests.
- `supabase db lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 1 file / 6 tests.
- `pnpm test tests/integration/tree-batch-operations.spec.ts`
  - Result: passed, 1 file / 2 tests.
- `pnpm test tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 1 file / 1 test.
- `pnpm test tests/integration/variety-locations-report.spec.ts`
  - Result: passed, 1 file / 2 tests.
- `pnpm seed:baseline-users`
  - Result: passed after rerun with local Supabase Auth access outside the
    sandbox.
- `pnpm seed:baseline-sql`
  - Result: passed.
- `pnpm test:e2e tests/e2e/tree-inventory-import.spec.ts`
  - Result: passed, 6 tests.
- `pnpm test:e2e tests/e2e/plot-visual-operations.spec.ts`
  - Result: passed, 2 passed / 2 skipped.
- `pnpm test:e2e tests/e2e/tree-batch-and-export.spec.ts`
  - Result: passed, 1 test after rerun. An earlier parallel run failed because
    both Playwright commands tried to bind `127.0.0.1:3000`.
- `pnpm test tests/integration/tree-inventory-upload.spec.ts`
  - Result: passed, 1 file / 4 tests.

- `git diff --check`
  - Result: passed.
- `git status --short`
  - Result: Phase 9 changes plus existing uncommitted
    `supabase/.temp/cli-latest` local Supabase CLI temp drift.

Note: Vitest targets were run as `pnpm test tests/...` because, in this local
tool session, the extra separator form `pnpm test -- tests/...` passed a literal
separator through to Vitest and did not target the file reliably.

## Manual QA notes

- E2E covers owner preview -> confirm -> final report -> `/trees` for a known
  existing variety.
- E2E covers first import into an empty orchard with three explicit
  `create_new` candidate groups, one accepted unknown group, confirm and `/trees`
  verification.
- E2E covers worker upload/preview without confirm access.
- E2E covers invalid workbook diagnostics and outsider denied path.
- Dedicated manual browser QA, accepted 1k performance evidence,
  above-limit behavior and rollback/recovery rehearsal remain for Phase 10.

## Checkpoint

The MVP importer can now write data safely for owner-confirmed staged imports.
Safe stop before Phase 10 compatibility, performance and release hardening.
