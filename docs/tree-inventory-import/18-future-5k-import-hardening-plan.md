# Future 5k import hardening plan

## Purpose

Keep stable 5k `tree_inventory_v1` imports as an explicit future plan without
blocking the MVP release path.

## MVP decision

The accepted MVP import limit is 1k expanded positions. Larger plots should be
split into smaller imports for now.

Why:

- 1k imports pass end to end in the local Phase 10 benchmark.
- 5k imports pass parser, normalizer and staging/preview.
- A scoped read-side hardening allowed 5k post-confirm read models to pass when
  confirm succeeded.
- Repeat 5k runs still hit the local statement timeout in
  `confirm_tree_inventory_import` around 8s.

## Future target

Make 5k imports stable through:

- parse
- normalize
- staging/preview
- confirm transaction
- post-confirm read models
- `/trees`
- PVO large overview
- focused row detail
- variety locations
- account export

## Investigation path

1. Add SQL timing evidence inside a disposable/local diagnostic version of
   `confirm_tree_inventory_import`.
2. Measure final conflict check, report counts, `insert into trees`, audit
   insert and final import update separately.
3. Inspect query plans for the slowest confirm stage.
4. Decide whether the fix is:
   - RPC restructuring without schema changes;
   - an approved index/migration;
   - chunked confirm inside a controlled server workflow;
   - an async job/staging flow.
5. Rerun 1k and 5k performance gates plus full Phase 10 regression.

## Constraints

- Do not silently raise the MVP limit above 1k.
- Do not add new product modes such as full snapshot, `update_existing`,
  `deactivate_and_create` or multi-plot XLSX as part of this hardening.
- Do not add migrations/indexes without explicit review and approval.
- Preserve all Phase 9 safety properties: owner/`super_admin` confirm only,
  final DB revalidation, unresolved candidate blocking, active conflict
  rejection, idempotent confirmed retry and audit provenance.

## User-facing fallback until then

For plots above 1k positions, split the inventory into smaller imports. Each
import should cover at most 1k expanded positions for one active orchard and one
plot.
