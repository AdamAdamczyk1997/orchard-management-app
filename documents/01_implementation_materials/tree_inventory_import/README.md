# Tree Inventory import

## Status

`tree_inventory_v1` MVP is complete and release-ready for the accepted scope:

- one active `orchard`;
- one target `plot` with `layout_type=rows`;
- `incremental_create`;
- `reject` conflict strategy;
- owner/`super_admin` variety resolution and confirm;
- up to 1k expanded positions per import.

Workers can download templates, upload workbooks and review preview results, but
they cannot resolve variety candidates or confirm final writes.

## Active Maintenance Docs

Use these files for future maintenance, support and scoped follow-up work:

- [recommended_import_contract.md](./recommended_import_contract.md) - current
  `tree_inventory_v1` workbook/canonical contract notes.
- [test_scenarios.md](./test_scenarios.md) - scenarios worth preserving when
  refactoring parser, normalizer, preview, resolution or confirm.
- [phase_10_release_readiness.md](./phase_10_release_readiness.md) - user
  workflow, support/troubleshooting, rollback/recovery and manual QA checklist.
- [full_cycle_e2e_acceptance_plan.md](./full_cycle_e2e_acceptance_plan.md) -
  active checklist for the fresh orchard -> XLSX import -> final report browser
  acceptance story.
- [mvp_import_support_notes.md](./mvp_import_support_notes.md) - support policy
  for the 1k MVP limit and split-import guidance.
- [future_5k_import_hardening_plan.md](./future_5k_import_hardening_plan.md) -
  future plan for stable 5k imports.

## Historical Context

The implementation roadmap, phase reports, initial audit/gap analysis and final
completion evidence are archived under
[documents/archive/tree_inventory_import](../../archive/tree_inventory_import).

Treat those archived files as decision history, not as current source of truth.
When an archived file disagrees with current code, tests or the active docs in
this directory, use the current code/tests and this active directory first.

## Important Code Entry Points

- `app/(app)/trees/import/page.tsx`
- `app/(app)/trees/import/template/route.ts`
- `features/trees/tree-inventory-import-form.tsx`
- `server/actions/tree-inventory-import.ts`
- `lib/tree-inventory-import/`
- `supabase/migrations/037_create_tree_inventory_import_staging.sql`
- `supabase/migrations/038_create_tree_inventory_confirm_rpc.sql`

## Important Tests

- `tests/unit/tree-inventory-import-contracts.spec.ts`
- `tests/unit/tree-inventory-template-generator.spec.ts`
- `tests/unit/tree-inventory-e2e-workbook-builder.spec.ts`
- `tests/unit/tree-inventory-parser.spec.ts`
- `tests/unit/tree-inventory-normalizer.spec.ts`
- `tests/integration/tree-inventory-preview.spec.ts`
- `tests/integration/tree-inventory-variety-resolution.spec.ts`
- `tests/integration/tree-inventory-confirm.spec.ts`
- `tests/security/tree-inventory-import-rls.spec.ts`
- `tests/e2e/tree-inventory-import-full-cycle.spec.ts`
- `tests/e2e/tree-inventory-import.spec.ts`
- `tests/performance/tree-inventory-import-performance.spec.ts`
