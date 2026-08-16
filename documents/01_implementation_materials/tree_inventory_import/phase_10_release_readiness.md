# Phase 10 release readiness notes

## User workflow

1. User opens `/trees/import` in the active orchard.
2. User downloads a `tree_inventory_v1` template for one `rows` plot.
3. Worker or owner fills `NASADZENIA` and optional `WYJATKI`.
4. User uploads the XLSX workbook.
5. Server parses XLSX, normalizes canonical JSON and stages preview data.
6. Preview shows summary counts, diagnostics, active conflicts and variety
   candidate groups.
7. Owner or `super_admin` resolves blocking candidate groups.
8. Owner or `super_admin` confirms the staged import.
9. Confirm creates final `trees`, optional explicitly approved `varieties`,
   created-tree audit mappings and the final confirm report.

## First Import Into Empty Orchard

Supported MVP starting state:

- active orchard exists;
- target `plot` exists and has `layout_type=rows`;
- `trees=0`;
- `varieties=0`.

Expected behavior:

- `new_candidate` varieties are grouped in preview;
- owner can mark candidates as `create_new`;
- allowed `unknown`/`uncertain` groups can stay without `trees.variety_id`;
- confirm creates explicitly approved varieties atomically with trees;
- missing positions still create no `trees` records.

## Variety Resolution

Supported owner actions:

- `use_existing`: maps candidate positions to an orchard-local variety with the
  same species.
- `create_new`: stores the decision in staging and creates the variety only
  during confirm.
- `keep_unknown`: allows tree materialization with `variety_id=null`.

Guardrails:

- workers can upload and preview but cannot finalize resolution or confirm;
- stale or deleted resolved varieties block confirm;
- raw XLSX variety names never create final `varieties` silently;
- `confirm_version` changes after resolution so stale confirm attempts fail.

## Known MVP Limits

- One XLSX file targets exactly one active orchard and one plot.
- Only `plot.layout_type=rows` is supported.
- Import mode is `incremental_create`.
- Conflict strategy is `reject`.
- Max expanded positions per import: `1000`.
- Larger plots should be split into smaller imports.
- No full snapshot, `update_existing`, `deactivate_and_create`,
  multi-plot XLSX or permanent station model in MVP.
- Stable 5k imports are tracked in
  `documents/01_implementation_materials/tree_inventory_import/future_5k_import_hardening_plan.md`.

## Support And Troubleshooting

| Symptom | Likely cause | Support response |
|---|---|---|
| Workbook is rejected before preview | Invalid XLSX, missing worksheet/header, unsupported contract or file too large | Ask user to download a fresh template and copy values into it |
| Import exceeds position limit | More than 1k expanded positions | Ask user to split the plot into smaller row/position ranges |
| Preview shows active conflicts | Active tree already exists at the same plot row/position | User must remove conflict from workbook or resolve existing tree data outside import |
| Confirm button is disabled | Blocking diagnostics or unresolved candidate groups | Owner resolves candidates or fixes workbook and uploads again |
| Worker sees preview but no confirm | Owner-only confirm policy | Owner or `super_admin` must confirm |
| Confirm says preview is stale | Candidate resolution, token/version or DB state changed | Refresh preview/resolution and confirm again |
| Candidate mapping fails | Target variety was deleted or belongs to another orchard/species | Reopen preview and map to a current orchard-local variety |

## Rollback And Recovery

Before production rollout:

- keep migrations reversible through normal database backup/restore process;
- deploy feature after full Phase 10 gate;
- keep import route documented as MVP-limited to 1k positions.

After a failed preview:

- no final `trees` are created;
- user can upload a corrected workbook.

After a failed confirm:

- confirm is all-or-nothing;
- failed attempts should not create partial final trees;
- user should refresh preview because DB conflicts, membership, candidates or
  tokens may have changed.

After an accidental confirmed import:

- use `inventory_import_created_trees` to identify created tree IDs;
- review the persisted `confirm_report`;
- perform manual corrective operations through existing tree workflows or an
  operator-reviewed SQL recovery using the audit mapping;
- do not rely on automatic rollback in MVP.

## Manual QA Checklist

Browser QA coverage is currently automated through Playwright E2E and targeted
integration/security tests.

| Scenario | Status | Evidence |
|---|---|---|
| Owner full import | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| First import into empty orchard | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| Owner resolves `new_candidate` and accepted unknown groups | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| Worker preview-only path | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| Outsider denied path | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| Revoked membership after preview | Passed via automation | `tests/security/tree-inventory-import-rls.spec.ts` |
| Active orchard switch/access handling | Passed via automation | `tests/e2e/orchard-access.spec.ts` |
| Invalid workbook | Passed via automation | `tests/e2e/tree-inventory-import.spec.ts` |
| 1k accepted-limit import | Passed via benchmark | `tests/performance/tree-inventory-import-performance.spec.ts` |
| Above-limit behavior | Passed via unit coverage | `tests/unit/tree-inventory-normalizer.spec.ts` |
| `/trees`, PVO, focused row, variety locations, harvest/account export | Covered by regression gate | E2E/integration suites listed in Phase 10 report |

Dedicated human browser exploratory QA remains optional before a wider rollout,
but no untested MVP-critical scenario is known after the final Phase 10 gate.
