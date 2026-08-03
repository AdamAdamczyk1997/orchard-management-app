# OrchardLog / Sadownik+ - Project Context For New Chat

## Purpose

This is the active startup context for a new AI chat or a new implementation session.

Use this file to understand how to enter the repository, which documents matter,
what is already implemented, and how to decide the next step without starting
architecture or planning from scratch.

This file is not a full specification. It is an orientation layer over:

- current code,
- Supabase migrations,
- seeds,
- tests,
- active documentation in `documents/`.

## Working Rules For AI Agents

- Rozmawiamy po polsku.
- Technical names, files, DTOs, endpoints, entities and SQL names stay in English.
- Always start by checking `git status --short`; the worktree may be dirty.
- Never revert or overwrite changes you did not make unless the user explicitly asks.
- Treat `documents/archive/` as historical context, not source of truth.
- If docs, migrations, tests and code disagree, inspect the actual implementation and name the divergence clearly.
- Do not design from zero. Base work on the current repo, active docs, migrations, seeds, tests and already implemented vertical slices.
- Before proposing a new slice, identify whether the user is asking for QA, cleanup, docs, a bug fix, or a real product feature.
- Keep `orchard_id` trusted only server-side. Client query params and forms may prefill UI state, but writes must still go through validation, server actions, RLS and DB constraints.
- If the user asks about large plots, hundreds of trees, performance, pagination, async tree selectors or PVO scaling, start from `documents/01_implementation_materials/large_plot_tree_scale_plan.md`.
- The large-plot scale plan is active; Phase 0 fixture exists, but measurements and production scale changes are not completed behavior.

## Startup Prompt

Use this prompt when opening a new chat:

```text
Pracujemy nad OrchardLog / Sadownik+.
Rozmawiamy po polsku, ale nazwy techniczne, pliki, DTO, endpointy, encje i SQL trzymamy po angielsku.

Najpierw przeczytaj:
- documents/00_overview_and_checklists/project_context_for_new_chat.md
- documents/00_overview_and_checklists/codex_working_prompt.md
- documents/00_overview_and_checklists/app_high_level_overview.md
- documents/README.md
- documents/00_overview_and_checklists/documentation_map.md
- documents/ai_project_map.md
- documents/ui_implementation_map.md
- documents/01_implementation_materials/README.md
- documents/01_implementation_materials/large_plot_tree_scale_plan.md

Potem zorientuj sie w repo:
- sprawdz `git status --short`, bo worktree moze byc brudny,
- nie cofaj i nie nadpisuj zmian, ktorych sam nie zrobiles,
- traktuj `documents/archive/` jako material historyczny, nie source of truth,
- jesli dokumenty, migracje, testy i kod sa niespojne, sprawdz faktyczny stan implementacji i jasno nazwij rozjazd.

Nie zaczynaj projektowania od zera.
Bazuj na aktualnym repo, aktywnej dokumentacji, migracjach Supabase, seedach, testach i juz wdrozonych vertical slice'ach.
Najpierw ustal, czy kontynuujemy QA/cleanup/docs/bugfix, czy zaczynamy nowy slice.
Po rozpoznaniu albo po zakonczonej pracy zapytaj usera o kolejny kierunek, jesli nie wynika on jasno z requestu.

Szczegolnie zwracaj uwage na:
- `active_orchard` rozwiazywany po stronie serwera i cookie `ol_active_orchard`,
- orchard-scoped ownership i RLS,
- role `owner`, `worker`, `super_admin` oraz outsider bez membership,
- aktualny pakiet migracji Supabase,
- workflow baseline: `pnpm seed:baseline-reset` -> `pnpm qa:baseline-status`,
- gate jakosci: `supabase db lint`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm test:e2e`,
- aktywny plan skalowania duzych dzialek: `documents/01_implementation_materials/large_plot_tree_scale_plan.md`,
- zarchiwizowane dokumenty PVO, baseline enrichment i stare handoffy nie sa aktywnym planem.
```

## Current Product State

OrchardLog / Sadownik+ is a Next.js + Supabase web app for an operational orchard log.
The product is `orchard`-scoped and assumes one active orchard context at a time.

Implemented core:

- auth, register, login and reset-password request,
- onboarding with first orchard creation,
- active orchard resolution through server context and `ol_active_orchard` cookie,
- protected app shell and account shell,
- orchard settings and membership management for `owner`,
- operational access for `worker`,
- account profile and eligible account export,
- `plots`, `varieties`, `trees`,
- tree batch create with preview / confirmation,
- tree bulk deactivate with preview / confirmation,
- `activities` with scopes, materials, detail, edit, delete and status changes,
- `harvests` with detail, edit, delete, activity linkage and normalized quantities,
- dashboard with orchard snapshot, recent records and `upcoming_activities`,
- reports: season summary, harvest locations, variety locations,
- `Plot Visual Operations MVP` on `/plots` and `/plots/[plotId]`.
- enriched baseline seed for regular QA/demo:
  - 3 orchards,
  - 5 plots,
  - 12 varieties,
  - 45 trees,
  - `EMPTY` remains true empty-state orchard.

PVO current state:

- `/plots` has operational plot cards with active tree count, removed/inactive count and dominant varieties.
- `/plots/[plotId]` has grid/fallback visual overview for `rows`, `mixed` and `irregular` plots.
- Medium/large `/plots/[plotId]` now uses `PlotTreeScaleOverview` instead of a
  full marker grid on first load.
- `/plots/[plotId]?section=A&row=12` now opens focused row detail through
  `PlotVisualFocusedRow` and `getPlotVisualRowDetailForOrchard()`.
- The plot detail view supports local filters, Browse mode, tree detail panel, Select mode and selection compression.
- Add Activity from selection pre-fills `/activities/new` safely through query parsing and active-orchard option validation.
- Structural actions from the plot map pre-fill `/trees/batch/deactivate` and `/trees/batch/new`.
- PVO planning docs are complete and archived:
  - `documents/archive/plot_visual_operations_roadmap.md`
  - `documents/archive/plot_visual_operations_implementation_master_plan.md`

Baseline seed enrichment current state:

- The baseline enrichment plan has been implemented and archived:
  - `documents/archive/baseline_seed_enrichment_plan.md`
- The active baseline metadata lives in:
  - `supabase/seeds/001_baseline_reference_seed.sql`
  - `scripts/shared/baseline-seed.mjs`
  - `tests/unit/baseline-qa.spec.ts`
- If baseline counts change, update seed SQL, shared baseline metadata, baseline QA tests and minimal docs together.

Active technical plan:

- There is no active execution master plan for the whole product.
- There is an active technical plan for large plots and tree-scale performance:
  - `documents/01_implementation_materials/large_plot_tree_scale_plan.md`
- Phase 0 fixture entrypoint is implemented:
  - `pnpm seed:large-plot-fixture`
  - `supabase/seeds/010_large_plot_performance_fixture.sql`
- First Phase 0 measurement snapshot:
  - `documents/01_implementation_materials/large_plot_phase0_measurements.md`
- Phase 1 `/trees` pagination is implemented.
- Phase 2 async tree picker is implemented for activity and harvest create/edit forms:
  - `GET /api/tree-options` resolves active orchard server-side,
  - `TreePicker` hydrates selected values through `include_ids`,
  - activity/harvest forms no longer receive all orchard `treeOptions` on initial load.
- `/activities` list filters use the same async tree option path for `tree_id`,
  so the activity list no longer loads all orchard tree options on first render.
- Phase 3 PVO scale profile and overview mode is implemented:
  - `getPlotTreeScaleProfileForOrchard()` reads lightweight tree rows through
    paginated `.range()` chunks,
  - small plots still render full `PlotVisualOverview`,
  - medium/large plots render section and row summaries through
    `PlotTreeScaleOverview`.
- Phase 4 focused PVO row detail first slice is implemented:
  - `parsePlotVisualRowFocusParams()` parses `section`, `row`, `lifecycle`,
    `variety_id`, `condition_status` and `location_verified`,
  - `PlotTreeScaleOverview` row summaries link to focused row URLs,
  - focused rows reuse existing PVO marker actions below the marker limit and
    fall back to range-first Add Activity controls plus a table preview above it,
  - the fallback table preview is capped separately from marker payloads.
- Phase 7 first report hardening slice is implemented for
  `/reports/harvest-locations`:
  - `list_harvest_location_source_records(...)` resolves plot filters through
    SQL joins to `trees`/`plots`,
  - `getHarvestLocationSummaryForOrchard()` no longer builds a large
    `tree_id.in(...)` filter for large plots.
- Phase 7 report hardening is also implemented for `/reports/variety-locations`:
  - `getVarietyLocationsReportForOrchard()` reads active variety trees through
    paginated `.range()` chunks,
  - integration coverage includes more than 1,000 active trees for one variety.
- Performance fixture plot detail routes use deterministic UUIDs, not plot
  codes. `PERF-1500` is
  `/plots/92000000-0000-4000-8000-000000000002`.
- `PERF-LONG-ROW` is
  `/plots/92000000-0000-4000-8000-000000000004` and exists to exercise focused
  row fallback/range actions above `PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT`.
- Current migrations enforce active logical tree location uniqueness on
  `(plot_id, row_number, position_in_row)`. `section_name` is not part of
  `uq_trees_active_logical_location`.
- Focused-row E2E coverage for the large plot overview -> row detail path is
  implemented in `tests/e2e/plot-visual-operations.spec.ts`; the same file
  covers the `PERF-LONG-ROW` range action fallback when the local `PERF` fixture
  is present.
- The recommended next production slice is harvest report fixture measurement,
  report UI summarization, or query-plan/index hardening based on evidence.
- Do not put large-scale performance data into the canonical baseline seed.

## Active Documentation Priority

Start here:

1. `documents/00_overview_and_checklists/project_context_for_new_chat.md`
2. `documents/README.md`
3. `documents/00_overview_and_checklists/documentation_map.md`
4. `documents/ai_project_map.md`
5. `documents/ui_implementation_map.md`
6. `documents/01_implementation_materials/README.md`
7. `documents/01_implementation_materials/large_plot_tree_scale_plan.md`
8. `documents/00_overview_and_checklists/app_high_level_overview.md`

For domain and backend work:

- `documents/03_domain_and_business_rules/orchardlog_database_model.md`
- `documents/03_domain_and_business_rules/business_rules.md`
- `documents/03_domain_and_business_rules/validations_and_integrity.md`
- `documents/05_technical/authorization_and_rls_strategy.md`
- `documents/06_backend_and_contracts/api_and_system_operations.md`
- `documents/06_backend_and_contracts/data_contracts.md`
- `supabase/migrations/*.sql`
- `types/contracts.ts`

For UI and route work:

- `documents/ui_implementation_map.md`
- `documents/04_ux_and_screen_design/screens_and_views.md`
- `documents/04_ux_and_screen_design/forms_and_fields.md`
- `documents/04_ux_and_screen_design/navigation_map.md`
- `documents/04_ux_and_screen_design/ui_states.md`
- `documents/diagrams/06_ui_routes_map.md`
- `app/`
- `features/`
- `components/`

For testing and QA:

- `documents/07_security_and_quality/test_plan.md`
- `documents/07_security_and_quality/mvp_acceptance_criteria.md`
- `documents/00_overview_and_checklists/manual_testing_quickstart.md`
- `documents/00_overview_and_checklists/local_dev_tools_quickstart.md`
- `tests/`

For large plot / tree-scale performance work:

- `documents/01_implementation_materials/large_plot_tree_scale_plan.md`
- `app/(app)/plots/[plotId]/page.tsx`
- `features/plots/plot-tree-scale-overview.tsx`
- `features/plots/plot-visual-focused-row.tsx`
- `features/plots/plot-visual-overview.tsx`
- `lib/domain/plot-tree-scale.ts`
- `lib/domain/plot-visual-row-detail.ts`
- `lib/domain/plot-visual-grid.ts`
- `lib/orchard-data/trees.ts`
- `lib/orchard-data/activities.ts`
- `lib/orchard-data/harvests.ts`
- `app/(app)/trees/page.tsx`
- `features/activities/activity-form.tsx`
- `features/harvests/harvest-form.tsx`

## Source Of Truth Order

When there is a mismatch, use this order:

1. Current code and migrations.
2. Current tests and seed scripts.
3. Active documentation in `documents/`, excluding `documents/archive/`.
4. Archived documents only as historical context.

Never use archived plans as a command to implement something unless the user explicitly reopens that archived scope.

## Important Entry Points

App and context:

- `app/page.tsx`
- `app/(app)/layout.tsx`
- `app/(account)/layout.tsx`
- `components/layouts/protected-app-shell.tsx`
- `components/layouts/account-shell.tsx`
- `lib/orchard-context/resolve-active-orchard.ts`
- `lib/orchard-context/require-active-orchard.ts`
- `lib/orchard-context/active-orchard-cookie.ts`
- `middleware.ts`

Server actions:

- `server/actions/auth.ts`
- `server/actions/orchards.ts`
- `server/actions/plots.ts`
- `server/actions/varieties.ts`
- `server/actions/trees.ts`
- `server/actions/activities.ts`
- `server/actions/harvests.ts`
- `server/actions/profile.ts`

Domain and validation:

- `lib/domain/`
- `lib/validation/`
- `lib/orchard-data/`
- `types/contracts.ts`

PVO-specific:

- `app/(app)/plots/page.tsx`
- `app/(app)/plots/[plotId]/page.tsx`
- `features/plots/plot-tree-scale-overview.tsx`
- `features/plots/plot-visual-focused-row.tsx`
- `features/plots/plot-visual-overview.tsx`
- `features/plots/plot-tree-detail-panel.tsx`
- `lib/domain/plot-tree-scale.ts`
- `lib/domain/plot-visual-row-detail.ts`
- `lib/domain/plot-visual-grid.ts`
- `lib/domain/plot-selection.ts`
- `lib/domain/activity-prefill.ts`
- `lib/domain/tree-batch-prefill.ts`
- `lib/validation/activity-prefill.ts`
- `lib/validation/tree-batch-prefill.ts`
- `tests/e2e/plot-visual-operations.spec.ts`
- `tests/integration/plot-tree-scale-profile.spec.ts`
- `tests/integration/plot-visual-row-detail.spec.ts`
- `tests/unit/plot-tree-scale.spec.ts`
- `tests/unit/plot-visual-row-detail.spec.ts`

Large plot scale-specific:

- `documents/01_implementation_materials/large_plot_tree_scale_plan.md`
- `app/(app)/trees/page.tsx`
- `lib/orchard-data/trees.ts`
- `lib/orchard-data/activities.ts`
- `lib/orchard-data/harvests.ts`
- `app/(app)/plots/[plotId]/page.tsx`
- `features/plots/plot-tree-scale-overview.tsx`
- `features/plots/plot-visual-focused-row.tsx`
- `features/plots/plot-visual-overview.tsx`
- `lib/domain/plot-tree-scale.ts`
- `lib/domain/plot-visual-row-detail.ts`
- `features/activities/activity-form.tsx`
- `features/harvests/harvest-form.tsx`
- `scripts/seed-large-plot-fixture.mjs`
- `supabase/seeds/010_large_plot_performance_fixture.sql`
- `documents/01_implementation_materials/large_plot_phase0_measurements.md`

## Planned Or Missing Areas

Do not assume these exist:

- `/trees/[treeId]` detail page,
- `/varieties/[varietyId]` detail page,
- true Accept Invitation route/action,
- role-change UI for orchard memberships,
- storage/attachments,
- import UI,
- restore counterpart to account export,
- future harvest entry points from the PVO map,
- richer planning/calendar workflow beyond `upcoming_activities`,
- report export/download artifacts,
- deeper long-row visual fallback refinements,
- report read model hardening for very large plot filters.

Notes:

- `manager` and `viewer` exist in schema/types, but current product/UI behavior is centered on `owner`, `worker`, `super_admin` and outsider.
- `orchard_memberships.status` supports `invited`, but current invite flow activates membership immediately for an existing account.
- Current PVO works well for regular baseline data. Medium/large first load and
  focused row detail now avoid loading the whole plot marker grid.
- `/trees`, `/activities` tree filtering, `ActivityForm`, `HarvestForm`,
  first-load PVO, focused-row PVO, `/reports/harvest-locations` and
  `/reports/variety-locations`
  have large-plot-safe first-pass read models. Remaining known scale risks are
  measurement-driven index hardening and deeper long-row rendering refinements.

## Verification Commands

Use commands according to risk:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm seed:baseline-reset
pnpm qa:baseline-status
pnpm test:e2e
```

Database/security checks when relevant:

```bash
supabase db lint
supabase db reset
```

Remember:

- Integration and E2E tests may mutate local baseline data.
- Before manual seeded QA, run `pnpm seed:baseline-reset` and confirm `pnpm qa:baseline-status`.
- For docs-only edits, `git diff --check` can be enough unless links, generated docs or code snippets need deeper validation.
- For large-plot performance work, start with the plan's Phase 0 fixture and measurements before changing UI strategy.
- After running `pnpm seed:large-plot-fixture`, reset baseline again before manual seeded QA.

## How To Choose The Next Step

1. Read the user's latest request literally.
2. Check `git status --short`.
3. If the request touches implementation, inspect the existing slice before proposing changes.
4. If the request touches docs, update active entry points and avoid making archive docs normative.
5. If the request touches DB/RLS/security, verify migrations, policies, seed data and tests before changing code.
6. If the request touches large plots/performance/PVO scaling, follow `large_plot_tree_scale_plan.md` and prefer Phase 0 measurement work before production UI rewrites.
7. Keep changes scoped and update tests/docs when behavior changes.
8. Before final response, report what changed and which checks ran.

## Archived Context

Historical materials live in `documents/archive/`.

Useful archived snapshots:

- `documents/archive/2026-06-06_session_handoff_pvo_closeout_snapshot.md`
- `documents/archive/plot_visual_operations_roadmap.md`
- `documents/archive/plot_visual_operations_implementation_master_plan.md`
- `documents/archive/baseline_seed_enrichment_plan.md`
- `documents/archive/implementation_master_plan.md`

These files explain how the project got here, but they are not active implementation plans.
