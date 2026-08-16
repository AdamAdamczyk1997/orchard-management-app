# Phase 7 completion report - Domain/database preview validation services

## Phase completed

Phase 7 - Domain/database preview validation services

## Preview validations implemented

- Added server-side preview/staging service:
  `lib/tree-inventory-import/preview.server.ts`.
- The service accepts canonical `tree_inventory_v1` JSON plus file metadata.
- Validates:
  - supported XLSX/canonical contract versions
  - active orchard matches generated workbook context
  - plot belongs to the active orchard
  - plot layout is supported by MVP (`rows`)
  - current orchard-local varieties are authority
  - stale hidden variety IDs and foreign variety IDs are not trusted
  - species/variety consistency
  - active tree location conflicts
  - inactive historical tree context as non-blocking info
- Groups staged variety candidates by species, status and normalized raw name.
- Keeps `unknown` as a countable, non-blocking state with `variety_id=null`.
- Keeps `uncertain` and unresolved `new_candidate` values blocked for owner
  resolution.
- If a `new_candidate` now exactly matches a current orchard variety, stages it
  as a suggested owner mapping instead of auto-creating or silently matching.
- Detects normalized duplicate raw labels within a candidate group with a
  warning.
- Includes a 1k-position preview smoke test.

## Staging status behavior

- `ready_for_owner_confirm`: no blocking diagnostics and no unresolved/suggested
  candidate groups.
- `awaiting_variety_resolution`: preview is otherwise valid, but unresolved or
  suggested variety candidate groups require a later owner decision.
- `validated`: preview was staged with blocking diagnostics such as active tree
  conflicts, unsupported layout or variety validation errors.
- `failed`: preview was not staged because core context could not be trusted or
  staged safely, such as active orchard mismatch or inaccessible/foreign plot.

Phase 7 writes only Phase 6 staging/audit tables:

- `inventory_imports`
- `inventory_import_source_rows`
- `inventory_import_variety_candidates`
- `inventory_import_positions`

It does not write `trees` and does not write `inventory_import_created_trees`.

## Security behavior

- Owner can preview.
- Worker can preview.
- Outsider cannot preview a foreign orchard/plot.
- Revoked membership cannot preview after membership revocation.
- Preview uses the caller Supabase client, so existing RLS remains the DB
  boundary.
- Diagnostics for inaccessible plot/variety context are generic and do not rely
  on cross-orchard reads.

## Tests added

- Added `tests/integration/tree-inventory-preview.spec.ts`.
- Extended `tests/security/tree-inventory-import-rls.spec.ts` with preview
  service owner/worker/outsider/revoked scenarios.

Integration coverage includes:

- valid first-import preview for an empty orchard
- unresolved `new_candidate` staging
- duplicate normalized candidate label warning
- same raw candidate name across different species as separate groups
- current DB variety mapping suggestion for matching `new_candidate`
- active conflict and inactive context behavior
- unsupported layout, foreign plot and active orchard mismatch
- stale hidden variety IDs and species mismatch
- 1k staged positions

## Verification commands and results

Pre-change baseline:

- `pnpm test -- tests/integration/tree-batch-operations.spec.ts`
  - Result: passed, 51 files / 222 tests.
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 51 files / 222 tests.

Post-change checks:

- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test -- tests/integration/tree-inventory-preview.spec.ts`
  - Result: passed, 52 files / 229 tests.
- `pnpm test -- tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 52 files / 229 tests.
- `pnpm test -- tests/integration/tree-batch-operations.spec.ts`
  - Result: passed, 52 files / 229 tests.
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
  - Result: passed, 52 files / 229 tests.

## Checkpoint

Canonical imports can be safely validated against current DB state and staged
for review. No user-facing upload flow, owner variety resolution action, confirm
transaction or final `trees` write exists. Safe stop before Phase 8.
