# Phase 6 completion report - Staging and audit schema with RLS

## Phase completed

Phase 6 - Staging and audit schema with RLS

## Migrations added

- Added `supabase/migrations/037_create_tree_inventory_import_staging.sql`.
- Added staging/audit schema only. No upload UI, parser-to-staging service,
  preview service, variety resolution flow, confirm transaction or `trees`
  columns were added.
- Verified the migration applies from a clean local database through:
  - `supabase db reset`
  - `pnpm seed:baseline-reset`

## Tables/policies added

Tables:

- `inventory_imports`
- `inventory_import_source_rows`
- `inventory_import_variety_candidates`
- `inventory_import_positions`
- `inventory_import_created_trees`

RLS and helper functions:

- `inventory_imports`:
  - read: active orchard members and `super_admin`
  - insert/update: owner/worker/`super_admin` for staging states
  - `confirming`/`confirmed`: owner/`super_admin` only
  - delete: owner/`super_admin`
- Child staging tables inherit access through:
  - `can_read_inventory_import(uuid)`
  - `can_write_inventory_import(uuid)`
  - `can_manage_inventory_import(uuid)`
- `inventory_import_created_trees` is owner/`super_admin` write-only through
  parent import management.
- Database triggers enforce cross-orchard integrity for:
  - `inventory_imports.plot_id`
  - staged source-row/candidate/position relationships
  - suggested/resolved variety references
  - staged position variety and existing tree references
  - created-tree audit mappings

## RLS test results

- `pnpm test -- tests/integration/tree-inventory-staging.spec.ts`
  - Result: passed, 51 files / 222 tests.
- `pnpm test -- tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 51 files / 222 tests.

The new tests cover owner/worker/outsider access, revoked membership loss,
worker staging without confirmed-status permission, owner confirm-status update,
owner-only created-tree audit writes, status/idempotency constraints and
cross-orchard plot/variety/tree guards.

## Existing regressions

Pre-change baseline:

- `supabase db lint`
  - Result: passed.
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 49 files / 217 tests.
- `pnpm test -- tests/security/core-orchard-structure-rls.spec.ts`
  - Result: passed, 49 files / 217 tests.

Post-change regression checks:

- `supabase db lint`
  - Result: passed.
- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 51 files / 222 tests.
- `pnpm test -- tests/security/core-orchard-structure-rls.spec.ts`
  - Result: passed, 51 files / 222 tests.
- `git diff --check`
  - Result: passed.
- `git status --short`
  - Result: reviewed. `supabase/.temp/cli-latest` was modified by the
    Supabase CLI during verification and is not part of the Phase 6 schema
    change.

Note: after a plain `supabase db reset`, `account-export.spec.ts` failed because
the project baseline `super_admin` auth user was not seeded. Running the
project baseline workflow with `pnpm seed:baseline-reset` restored the expected
local test dataset, after which the suite passed.

## Rollback notes

- Roll back by reverting migration
  `037_create_tree_inventory_import_staging.sql` and the associated tests/docs.
- No existing tables were altered.
- No `trees` columns, RLS policies or RPCs were modified.
- If the migration has already been applied, drop the Phase 6 objects in child
  order before dropping helper functions:
  - `inventory_import_created_trees`
  - `inventory_import_positions`
  - `inventory_import_variety_candidates`
  - `inventory_import_source_rows`
  - `inventory_imports`
  - `can_read_inventory_import(uuid)`
  - `can_write_inventory_import(uuid)`
  - `can_manage_inventory_import(uuid)`
  - validation trigger functions

## Checkpoint

The database can safely store Tree Inventory import attempts, canonical payload
snapshots, diagnostics, source-row provenance, unresolved/resolved variety
candidates, staged positions and created-tree audit mappings. No user upload or
final tree mutation exists. Safe stop for schema/RLS review before Phase 7.
