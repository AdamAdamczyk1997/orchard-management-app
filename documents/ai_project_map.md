# AI Project Map

This document is a fast orientation map for another AI agent entering the OrchardLog / Sadownik+ repository.

## Application Purpose

OrchardLog / Sadownik+ is a web application for running an operational orchard log. It helps orchard owners and workers manage orchard structure, field work, harvest records, and reports.

The core product is `orchard`-scoped:

- a user account is represented by `profiles`;
- access to orchard data is represented by `orchard_memberships`;
- all operational work happens in one active orchard context at a time;
- the active orchard is resolved server-side and persisted as `httpOnly` cookie `ol_active_orchard`.

## Current Architecture

Stack:

- Next.js App Router (`app/`)
- React 19
- Supabase Auth + Supabase PostgreSQL
- Supabase SSR clients in `lib/supabase/*`
- Server actions in `server/actions/*`
- Zod validation in `lib/validation/*`
- Domain helpers in `lib/domain/*`
- Feature components in `features/*`
- Shared UI primitives in `components/ui/*`
- Tests with Vitest and Playwright

Primary request flow:

1. `middleware.ts` calls `updateSession()` and refreshes Supabase session cookies.
2. Root or protected layouts call `resolveActiveOrchardContext()`.
3. Protected pages call `requireActiveOrchard()`.
4. Server pages read data through `lib/orchard-data/*`.
5. Client forms submit to `server/actions/*`.
6. Server actions validate with Zod, verify orchard relations, then write through Supabase.
7. PostgreSQL RLS, triggers, constraints, and RPC functions enforce final data safety.

## Route Groups

- `(auth)`: `/login`, `/register`, `/reset-password`
- `(onboarding)`: `/orchards/new`
- `(app)`: active-orchard operational app
- `(account)`: account-level profile/export settings

Important files:

- `app/page.tsx`
- `app/(app)/layout.tsx`
- `app/(account)/layout.tsx`
- `app/(auth)/layout.tsx`
- `app/(onboarding)/layout.tsx`
- `components/layouts/protected-app-shell.tsx`
- `components/layouts/account-shell.tsx`
- `lib/orchard-context/resolve-active-orchard.ts`
- `lib/orchard-context/require-active-orchard.ts`
- `lib/orchard-context/active-orchard-cookie.ts`

## Domain Model

Main entities:

- `profiles`: account profile linked 1:1 with `auth.users`
- `orchards`: business container
- `orchard_memberships`: profile-to-orchard role and status
- `plots`: physical orchard areas
- `varieties`: orchard-local variety catalog
- `trees`: physical trees, assigned to plots and optionally varieties
- `activities`: operational work log entries
- `activity_scopes`: detailed activity coverage
- `activity_materials`: materials used in activity
- `harvest_records`: quantitative harvest records
- `bulk_tree_import_batches`: technical batch-create records

Key relationships:

- `orchards` owns operational data through `orchard_id`.
- `trees` belongs to `plots`; optional `variety_id`.
- `activities` belongs to `plots`; optional parent `tree_id`.
- `activity_scopes` and `activity_materials` inherit ownership through `activities`.
- `harvest_records` belongs to `orchards` and can optionally link to `plots`, `varieties`, `trees`, and `activities`.

Source of truth:

- `supabase/migrations/*.sql`
- `types/contracts.ts`
- `documents/03_domain_and_business_rules/orchardlog_database_model.md`

## Roles And Permissions

Current product roles:

- `owner`: can manage orchard, members, operational data, and owned-orchard export.
- `worker`: can write operational data but cannot manage membership or export account data.
- `super_admin`: global system role via `profiles.system_role = 'super_admin'`; can access profile/export without active orchard.
- outsider: authenticated user without membership; blocked from orchard data by context and RLS.

Future-ready but not product-complete:

- `manager`
- `viewer`

Important files:

- `supabase/migrations/012_add_core_integrity_and_rls_helpers.sql`
- `supabase/migrations/013_create_v1_security_helpers.sql`
- `supabase/migrations/014_enable_rls_and_v1_policies.sql`
- `documents/05_technical/authorization_and_rls_strategy.md`
- `tests/security/*`

## Implemented Features

Auth and onboarding:

- login
- register
- reset password link request
- profile bootstrap trigger
- first orchard creation
- active orchard cookie sync
- orchard switcher

Orchard/account:

- owner orchard settings
- owner member management for existing accounts
- worker restriction on membership/export
- account profile edit
- owner/super_admin account export

Structure:

- plots create/list/edit/archive/restore
- plot layout settings
- plot detail with Plot Visual Operations
- varieties create/list/edit/search
- trees create/list/edit/filter
- batch create trees with preview/confirmation
- bulk deactivate trees with preview/confirmation

Activities:

- create/list/detail/edit/delete
- status changes
- scopes and materials
- seasonal activity summary and coverage
- PVO selection prefill into `/activities/new`

Harvest:

- create/list/detail/edit/delete
- normalized `quantity_kg`
- season summary report
- harvest locations report
- harvest feed on dashboard

Reports:

- `/reports/season-summary`
- `/reports/harvest-locations`
- `/reports/variety-locations`
- dashboard summary

PVO:

- `/plots` operational plot cards with active tree count, removed/inactive count, and dominant varieties from active trees
- `/plots/[plotId]` visual overview
- rows/mixed/irregular rendering behavior
- tree detail panel
- selection compression to activity scopes
- single-tree Add Activity prefill
- multi-range Add Activity prefill
- bulk deactivate prefill for one complete `location_range`
- Plant New / batch create prefill for one continuous inferred empty row range

## Planned Or Missing Features

Do not assume these exist:

- `/trees/[treeId]` detail page
- `/varieties/[varietyId]` detail page
- true Accept Invitation route/action
- role-change UI for orchard memberships
- storage/attachments
- import/restore counterpart to account export
- future harvest entry points from the PVO map
- richer planning/calendar workflow beyond upcoming activities feed
- report export/download artifacts

Important current-state note:

- `orchard_memberships.status` supports `invited`, but current `invite_orchard_member_by_email()` creates/reactivates membership as `active` immediately. Treat Accept Invitation as future work.

## Important Entry Points

Start here for app behavior:

- `app/page.tsx`
- `app/(app)/layout.tsx`
- `components/layouts/protected-app-shell.tsx`
- `lib/orchard-context/resolve-active-orchard.ts`
- `server/actions/orchards.ts`

Start here for operational modules:

- `app/(app)/plots/page.tsx`
- `app/(app)/plots/[plotId]/page.tsx`
- `features/plots/plot-visual-overview.tsx`
- `app/(app)/trees/page.tsx`
- `app/(app)/activities/page.tsx`
- `app/(app)/harvests/page.tsx`

Start here for data access:

- `lib/orchard-data/plots.ts`
- `lib/orchard-data/trees.ts`
- `lib/orchard-data/activities.ts`
- `lib/orchard-data/harvests.ts`
- `lib/orchard-data/dashboard.ts`
- `lib/orchard-data/export.ts`

Start here for domain logic:

- `lib/domain/plots.ts`
- `lib/domain/plot-visual-grid.ts`
- `lib/domain/plot-selection.ts`
- `lib/domain/activity-prefill.ts`
- `lib/domain/tree-batch-prefill.ts`
- `lib/domain/activities.ts`
- `lib/domain/harvests.ts`
- `lib/domain/variety-locations.ts`

Start here for validation:

- `lib/validation/plots.ts`
- `lib/validation/trees.ts`
- `lib/validation/activities.ts`
- `lib/validation/activity-prefill.ts`
- `lib/validation/tree-batch-prefill.ts`
- `lib/validation/harvests.ts`
- `lib/validation/orchards.ts`

Start here for SQL:

- `supabase/migrations/002_create_profiles.sql`
- `supabase/migrations/003_create_orchards.sql`
- `supabase/migrations/004_create_orchard_memberships.sql`
- `supabase/migrations/005_create_plots.sql`
- `supabase/migrations/006_create_varieties.sql`
- `supabase/migrations/007_create_trees.sql`
- `supabase/migrations/008_create_activities.sql`
- `supabase/migrations/009_create_activity_scopes.sql`
- `supabase/migrations/010_create_activity_materials.sql`
- `supabase/migrations/011_create_harvest_records.sql`
- `supabase/migrations/013_create_v1_security_helpers.sql`
- `supabase/migrations/014_enable_rls_and_v1_policies.sql`
- `supabase/migrations/018_create_activity_mutation_rpcs.sql`
- `supabase/migrations/023_create_tree_batch_tools.sql`
- `supabase/migrations/024_extend_plots_with_layout_settings.sql`
- `supabase/migrations/025_add_plot_layout_guards_for_activity_and_harvest_locations.sql`

## Important Directories

- `app/`: App Router pages, layouts, route handlers
- `components/layouts/`: app/account/auth shells
- `components/ui/`: shared UI primitives and state cards
- `features/`: feature-specific React components
- `lib/auth/`: session/profile helpers
- `lib/orchard-context/`: active orchard resolution and cookie handling
- `lib/orchard-data/`: server-side read models
- `lib/domain/`: pure domain logic and labels
- `lib/validation/`: Zod schemas and query prefill parsers
- `lib/supabase/`: Supabase SSR/browser clients and config
- `server/actions/`: mutating server actions
- `supabase/migrations/`: database schema, constraints, RLS, RPC
- `supabase/seeds/`: baseline seed data
- `tests/unit/`: pure/unit/mocked action tests
- `tests/integration/`: database-backed integration tests
- `tests/security/`: RLS/security tests
- `tests/e2e/`: Playwright browser flows
- `documents/diagrams/`: generated Mermaid architecture package

## Testing Commands

From `package.json`:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm seed:baseline-reset
pnpm qa:baseline-status
pnpm test:e2e
```

E2E and integration tests mutate the local database. If the next step is manual QA on seeded baseline, run `pnpm seed:baseline-reset` and `pnpm qa:baseline-status` again.

## Documentation Package

Architecture diagrams generated for this map:

- `documents/diagrams/01_app_map.md`
- `documents/diagrams/02_auth_and_onboarding_flow.md`
- `documents/diagrams/03_orchard_context_flow.md`
- `documents/diagrams/04_roles_permissions.md`
- `documents/diagrams/05_database_domain_map.md`
- `documents/diagrams/06_ui_routes_map.md`
- `documents/diagrams/07_component_dependency_map.md`
- `documents/diagrams/08_data_flow.md`
- `documents/diagrams/09_testing_map.md`
- `documents/diagrams/10_orchard_business_flow.md`
- `documents/diagrams/11_reporting_flow.md`
- `documents/diagrams/12_membership_flow.md`

Implementation index:

- `documents/ui_implementation_map.md`

## Assumptions And Divergences

- Current code is source of truth when active documentation and code disagree.
- `documents/archive/` is historical and should not be used as implementation truth.
- The current repo contains PVO implementation for `/plots/[plotId]`; older docs that call it planned are stale.
- Accept Invitation is not implemented even though membership status enum has `invited`.
- Report aggregations are application-level TypeScript helpers, not materialized SQL views.
- Query prefill parameters are UI defaults only; writes still go through server actions, relation validation, RLS, and DB constraints/RPC.
