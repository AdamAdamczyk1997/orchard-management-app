# OrchardLog / Sadownik+ - Phase 2 implementation note

## Purpose

This note documents the second implemented vertical slice:
`Core Orchard Structure`.

It is implementation-oriented and should be used together with:

- [implementation_master_plan.md](./implementation_master_plan.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [tree_location_policy.md](../03_domain_and_business_rules/tree_location_policy.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)

## Scope implemented in this slice

- protected shell navigation extended with:
  - `/plots`
  - `/varieties`
  - `/trees`
- `plots` module:
  - list
  - create
  - edit
  - archive
  - restore
- `varieties` module:
  - list
  - create
  - edit
  - search
- `trees` module:
  - list
  - create
  - edit
  - filters by plot, variety, species, condition, and active state
- server actions:
  - `createPlot`
  - `updatePlot`
  - `archivePlot`
  - `restorePlot`
  - `createVariety`
  - `updateVariety`
  - `createTree`
  - `updateTree`
- shared server-side data queries for orchard-scoped lists and edit forms
- validation schemas for:
  - `PlotFormInput`
  - `VarietyFormInput`
  - `TreeFormInput`
  - list filters for all three modules

## Route structure used in Phase 2

```text
app/
  (app)/
    dashboard/page.tsx
    plots/
      page.tsx
      new/page.tsx
      [plotId]/edit/page.tsx
    varieties/
      page.tsx
      new/page.tsx
      [varietyId]/edit/page.tsx
    trees/
      page.tsx
      new/page.tsx
      [treeId]/edit/page.tsx
```

Deliberately deferred:

- `/plots/[plotId]`
- `/varieties/[varietyId]`
- `/trees/[treeId]`

Detail pages are postponed to later slices so Phase 2 can focus on reliable list + form workflows.

## Server-side responsibilities

- every list, create, and edit screen resolves `active_orchard` on the server
- all reads stay orchard-scoped and rely on RLS instead of frontend-only filtering
- server actions validate form input with Zod before hitting Supabase
- `orchard_id` is never sent from the browser in standard domain forms
- plot and variety ownership is checked through orchard-scoped reads
- tree writes additionally verify:
  - selected `plot_id` belongs to the active orchard
  - selected `variety_id`, if present, belongs to the active orchard
  - archived plots cannot receive new or updated trees

## Client-side responsibilities

- forms use `useActionState`
- filter state is persisted in URL `searchParams`
- list views are card-based and mobile-friendly
- create and edit flows redirect back to the relevant list after success
- there is no flash-message system in Phase 2; validation and field errors remain inline

## Access assumptions

- `owner` can create, edit, archive, and restore `plots`
- `owner` can create and edit `varieties`
- `owner` can create and edit `trees`
- `worker` can perform the same operational mutations currently allowed by the RLS model
- `worker` still cannot manage memberships or bypass orchard scope
- outsider users cannot read or mutate orchard structure they do not belong to

## Validation strategy

- `plots`
  - `name` required
  - optional `code`
  - `area_m2` must be positive
  - duplicate `name` and duplicate `code` are mapped to user-facing errors
- `varieties`
  - `species` required
  - `name` required
  - duplicate `species + name` inside the same orchard is mapped to `DUPLICATE_VARIETY`
- `trees`
  - `plot_id` required
  - `variety_id` optional
  - `species` required
  - `row_number` and `position_in_row` must be provided together
  - location conflicts are mapped to `LOCATION_CONFLICT`
  - archived plots are rejected with `PLOT_ARCHIVED`

## Definition of done

### `plots`

- orchard-scoped list works in the protected shell
- create and edit flows work through server actions
- archive and restore work through RLS-safe updates
- status filter works through the URL
- empty state is usable and points to `Create plot`

### `varieties`

- orchard-scoped list works in the protected shell
- create and edit flows work through server actions
- search works through the URL
- duplicate `species + name` is surfaced clearly
- empty state is usable and points to `Create variety`

### `trees`

- orchard-scoped list works in the protected shell
- create and edit flows work through server actions
- plot and variety selection respect orchard scope
- baseline location fields are supported
- list filters work through the URL
- archived plots cannot be selected for new tree writes
- empty state guides the user back to plot creation when needed

## Verification status

Phase 2 is verified locally with:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`

Current automated coverage for this slice includes:

- validation schemas for `plots`, `varieties`, and `trees`
- tree write guards for archived plots and orchard-scoped variety references
- integration coverage for:
  - plot create / edit / archive / restore
  - variety create / edit / search
  - tree create / edit / filtering
- existing RLS coverage for owner / worker / outsider behavior on orchard structure

## Deferred items

- plot detail page
- variety detail page
- tree detail page
- delete UI for `varieties` and `trees`
- batch create and bulk deactivate tools
- browser E2E automation for Phase 2 flows
- `activities`, `activity_scopes`, `activity_materials`
- `harvest_records`
