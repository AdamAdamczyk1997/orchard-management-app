# Phase 8A completion report - Variety Resolution workflow

## Phase completed

Phase 8A - Variety Resolution workflow

## Resolution behavior

- Added client/server resolution contracts in
  `lib/tree-inventory-import/upload-preview-contract.ts` for candidate
  resolution requests, results and supported submit actions.
- Added `resolveTreeInventoryVarietyCandidateForOrchard` in
  `lib/tree-inventory-import/variety-resolution.server.ts`.
- Supported explicit resolution actions:
  - `use_existing`: revalidates an orchard-local `variety`, checks species and
    updates staged positions to that `variety_id`;
  - `create_new`: stores the owner decision for create-new-at-confirm while
    leaving staged positions with `variety_id=null`;
  - `keep_unknown`: marks the candidate as accepted unknown and leaves staged
    positions with `variety_id=null`.
- No final `trees` writes were added.
- No `varieties` rows are inserted before Phase 9 confirm.
- No silent fuzzy matching or automatic raw-name dictionary creation was added.

## Permission behavior

- Owner and `super_admin` are allowed to finalize candidate resolution.
- Worker can upload/preview unresolved candidates, but cannot submit resolution
  actions through the service/action/UI.
- Cross-orchard `variety_id` mapping is rejected through active orchard
  filtering and returns a generic validation message.
- Revoked members and outsiders cannot resolve staged candidates through RLS
  visibility.
- No migration or RLS policy change was required because Phase 6 already limits
  `inventory_import_variety_candidates` updates to owner/super_admin semantics.

## Staging/status behavior

- Resolution updates `inventory_import_variety_candidates` provenance fields:
  `resolution_status`, `resolution_action`, `resolved_variety_id`,
  `resolved_by_profile_id` and `resolved_at`.
- `inventory_import_positions.variety_id` is updated only for `use_existing`.
- Import `summary_json` is refreshed for grouped/unresolved/suggested candidate
  counts.
- Import `status` moves to `ready_for_owner_confirm` when diagnostics are clean
  and all blocking candidates are resolved or accepted.
- Import `confirm_version` increments after each successful resolution so Phase
  9 can reject stale confirm attempts.

## Tests added

- Added `tests/integration/tree-inventory-variety-resolution.spec.ts`.
- Extended `tests/security/tree-inventory-import-rls.spec.ts` with resolution
  owner/worker/outsider/revoked/cross-orchard coverage.
- Extended `tests/e2e/tree-inventory-import.spec.ts` with first-import
  empty-orchard resolution and worker no-finalize coverage.

## Verification commands and results

Pre-change baseline:

- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 1 file / 4 tests.
- `pnpm test:e2e tests/e2e/tree-inventory-import.spec.ts`
  - Result: passed, 5 tests.

Post-change checks:

- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test tests/integration/tree-inventory-variety-resolution.spec.ts`
  - Result: passed, 1 file / 4 tests.
- `pnpm test tests/security/tree-inventory-import-rls.spec.ts`
  - Result: passed, 1 file / 5 tests.
- `pnpm test:e2e tests/e2e/tree-inventory-import.spec.ts`
  - Result: passed, 6 tests.
- `git diff --check`
  - Result: passed.
- `git status --short`
  - Result: Phase 8A changes plus existing uncommitted
    `supabase/.temp/cli-latest` local Supabase CLI temp drift.

Note: Vitest targets were run as `pnpm test tests/...` because, in this local
tool session, the extra separator form `pnpm test -- tests/...` passed a literal
separator through to Vitest and did not target the file reliably.

## Manual QA notes

- E2E covers the owner flow from template download through upload, three
  `create_new` candidate resolutions, one accepted unknown group and the
  ready-for-confirm preview gate.
- E2E covers worker upload/preview of an unresolved candidate without visible
  resolution controls.
- One intermediate full E2E rerun hit a Playwright `context` teardown timeout
  after five passed tests; the immediate full rerun passed all six tests.
- No manual browser-only issue was found beyond the automated E2E coverage.

## Checkpoint

Blocking variety candidates can now be resolved or explicitly accepted before
confirm. The importer still does not mutate final `trees` or create new
`varieties` before confirm. Safe stop before Phase 9 owner confirm transaction.
