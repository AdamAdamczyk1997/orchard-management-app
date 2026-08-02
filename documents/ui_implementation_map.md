# UI Implementation Map

This document maps the current UI implementation to routes, components, server actions, tables, tests, status, and known gaps. It is based on the repository state at the time of writing, not on archived documents.

## Notes

- Technical names, routes, files, DTOs, entities, and SQL names are kept in English.
- `documents/archive/` was not used as source of truth.
- Current code contains `app/(app)/plots/[plotId]/page.tsx`, so `/plots/[plotId]` is treated as implemented PVO surface.
- `manager` and `viewer` exist in schema/types, but current product/UI behavior is centered on `owner`, `worker`, `super_admin`, and outsider.

## Pages

### Root Decision Route

Route: `/`

Purpose: Resolve session/profile/active orchard and redirect to the correct area: `/login`, `/bootstrap-error`, `/orchards/new`, `/settings/profile`, or `/dashboard`.

Main components: none; redirect-only server page.

Server actions: none.

Database tables: `profiles`, `orchard_memberships`, `orchards` through `resolveActiveOrchardContext()`.

Related tests: `tests/unit/active-orchard-resolution.spec.ts`, `tests/e2e/auth-onboarding.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: none known for current scope.

Source file: `app/page.tsx`.

### Bootstrap Error

Route: `/bootstrap-error`

Purpose: Safe stop screen when authenticated user has no `profiles` row.

Main components: `Card`.

Server actions: none.

Database tables: none directly; represents failure of `profiles` bootstrap.

Related tests: `tests/integration/profile-bootstrap.spec.ts`, `tests/e2e/auth-onboarding.spec.ts`.

Status: Implemented.

Missing functionality: no self-healing UI; user is instructed to verify DB trigger/migrations.

Source file: `app/bootstrap-error/page.tsx`.

### Login

Route: `/login`

Purpose: Sign in with email/password.

Main components: `LoginForm`, `AuthShell`.

Server actions: `signIn`.

Database tables: Supabase Auth session; `profiles` read later by context.

Related tests: `tests/e2e/auth-onboarding.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: no social login in current code.

Source file: `app/(auth)/login/page.tsx`.

### Register

Route: `/register`

Purpose: Create Supabase Auth account with initial metadata used by profile bootstrap.

Main components: `RegisterForm`, `AuthShell`.

Server actions: `signUp`.

Database tables: Supabase Auth `auth.users`, `profiles` via `handle_new_user_profile()`.

Related tests: `tests/e2e/auth-onboarding.spec.ts`, `tests/integration/profile-bootstrap.spec.ts`.

Status: Implemented.

Missing functionality: email confirmation behavior depends on Supabase Auth configuration; no custom confirmation page is implemented.

Source file: `app/(auth)/register/page.tsx`.

### Reset Password

Route: `/reset-password`

Purpose: Request password reset email.

Main components: `ResetPasswordForm`, `AuthShell`.

Server actions: `resetPassword`.

Database tables: Supabase Auth only.

Related tests: auth validation is covered by `lib/validation/auth.ts`; no dedicated E2E reset-password completion flow was found.

Status: Partially implemented.

Missing functionality: current UI sends reset link only; no separate set-new-password form after callback was found.

Source file: `app/(auth)/reset-password/page.tsx`.

### Create Orchard / Onboarding

Route: `/orchards/new`

Purpose: Create first or additional orchard and owner membership.

Main components: `OnboardingIntro`, `OrchardForm`, `(onboarding) layout`.

Server actions: `createOrchard`.

Database tables: `orchards`, `orchard_memberships`, optionally `profiles.orchard_onboarding_dismissed_at`; RPC `create_orchard_with_owner_membership`.

Related tests: `tests/integration/orchard-creation-flow.spec.ts`, `tests/e2e/auth-onboarding.spec.ts`.

Status: Implemented.

Missing functionality: no separate orchard template/import flow.

Source file: `app/(onboarding)/orchards/new/page.tsx`.

### Dashboard

Route: `/dashboard`

Purpose: Active-orchard operational summary with counts, recent activities, upcoming activities, recent harvests, and quick actions.

Main components: `ProtectedAppShell`, local dashboard feed/card components, `FeedbackBanner`, `EmptyStateCard`.

Server actions: sign out in shell through `signOut`; dashboard page itself has no mutation action.

Database tables: `plots`, `trees`, `activities`, `harvest_records`.

Related tests: `tests/integration/dashboard-summary.spec.ts`, `tests/e2e/orchard-access.spec.ts`, `tests/e2e/owner-operational-flow.spec.ts`.

Status: Implemented.

Missing functionality: dashboard stats are intentionally summary-level; richer analytics widgets are not implemented.

Source file: `app/(app)/dashboard/page.tsx`.

### Plots List

Route: `/plots`

Purpose: List and filter plots in active orchard; show operational plot card stats; expose create, detail, edit, archive, and restore flows.

Main components: `PlotList`, `FeedbackBanner`, filter form, `ListPageLoading`.

Server actions: `archivePlot`, `restorePlot` from list component.

Database tables: `plots`, `trees`, `varieties`.

Related tests: `tests/unit/plot-card-stats.spec.ts`, `tests/integration/phase2-management-flow.spec.ts`, `tests/security/core-orchard-structure-rls.spec.ts`, `tests/e2e/owner-operational-flow.spec.ts`.

Status: Implemented.

Missing functionality: no physical delete UI for plots in current flow.

Source file: `app/(app)/plots/page.tsx`.

### New Plot

Route: `/plots/new`

Purpose: Create physical plot with layout metadata and suggested code.

Main components: `PlotForm`, `Card`.

Server actions: `createPlot`.

Database tables: `plots`.

Related tests: `tests/unit/phase2-validation.spec.ts`, `tests/integration/phase2-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no map/GIS import; no separate `plot_sections` model.

Source file: `app/(app)/plots/new/page.tsx`.

### Plot Detail / Plot Visual Operations

Route: `/plots/[plotId]`

Purpose: Show plot metadata, plot stats, visual grid/fallback view, tree detail panel, Add Activity prefill, bulk deactivate prefill, and Plant New / batch create prefill.

Main components: `PlotVisualOverview`, `PlotTreeDetailPanel`, `Card`, `LinkButton`.

Server actions: none on page; CTAs link to `/activities/new`, `/trees/batch/deactivate`, and `/trees/batch/new`.

Database tables: `plots`, `trees`.

Related tests: `tests/unit/plot-visual-grid.spec.ts`, `tests/unit/plot-selection.spec.ts`, `tests/unit/activity-prefill.spec.ts`, `tests/unit/phase6-tree-batch-validation.spec.ts`, `tests/e2e/plot-visual-operations.spec.ts`.

Status: Implemented through current PVO slice.

Missing functionality: future harvest entry points from the visual map are still pending.

Source file: `app/(app)/plots/[plotId]/page.tsx`.

### Edit Plot

Route: `/plots/[plotId]/edit`

Purpose: Edit plot core fields and layout settings.

Main components: `PlotForm`, `RecordNotFoundCard`, `Card`.

Server actions: `updatePlot`.

Database tables: `plots`.

Related tests: `tests/integration/phase2-management-flow.spec.ts`, `tests/unit/plot-layout-policy.spec.ts`.

Status: Implemented.

Missing functionality: no ownership transfer or hard-delete flow.

Source file: `app/(app)/plots/[plotId]/edit/page.tsx`.

### Varieties List

Route: `/varieties`

Purpose: List and search orchard-local varieties; link to report and create flow.

Main components: `VarietyList`, `FeedbackBanner`, search form.

Server actions: none from list page.

Database tables: `varieties`.

Related tests: `tests/integration/phase2-management-flow.spec.ts`, `tests/unit/list-filters.spec.ts`.

Status: Implemented.

Missing functionality: no variety detail page and no delete UI.

Source file: `app/(app)/varieties/page.tsx`.

### New Variety

Route: `/varieties/new`

Purpose: Create orchard-local variety record.

Main components: `VarietyForm`, `Card`.

Server actions: `createVariety`.

Database tables: `varieties`.

Related tests: `tests/unit/phase2-validation.spec.ts`, `tests/integration/phase2-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no import from shared/global variety catalog.

Source file: `app/(app)/varieties/new/page.tsx`.

### Edit Variety

Route: `/varieties/[varietyId]/edit`

Purpose: Edit variety details.

Main components: `VarietyForm`, `RecordNotFoundCard`, `Card`.

Server actions: `updateVariety`.

Database tables: `varieties`.

Related tests: `tests/integration/phase2-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no `/varieties/[varietyId]` detail route and no delete UI.

Source file: `app/(app)/varieties/[varietyId]/edit/page.tsx`.

### Trees List

Route: `/trees`

Purpose: Paginated list and filter trees by search, plot, variety, species, condition, and active state; expose batch operations.

Main components: `TreeList`, `FeedbackBanner`, filter form with page size control.

Server actions: none from list page.

Database tables: `trees`, `plots`, `varieties`.

Related tests: `tests/unit/list-filters.spec.ts`, `tests/unit/tree-pagination.spec.ts`, `tests/integration/phase2-management-flow.spec.ts`, `tests/security/core-orchard-structure-rls.spec.ts`, `tests/e2e/tree-batch-and-export.spec.ts`.

Status: Implemented.

Missing functionality: no tree detail route; no physical delete UI.

Source file: `app/(app)/trees/page.tsx`.

### New Tree

Route: `/trees/new`

Purpose: Create a single tree with plot-aware location validation.

Main components: `TreeForm`, `PrerequisiteCard`, `Card`.

Server actions: `createTree`.

Database tables: `trees`, `plots`, `varieties`.

Related tests: `tests/unit/tree-actions.spec.ts`, `tests/unit/plot-layout-policy.spec.ts`, `tests/integration/core-orchard-structure.spec.ts`.

Status: Implemented.

Missing functionality: no direct single-tree create prefill from PVO empty slot; PVO uses `/trees/batch/new` for inferred empty ranges, including a one-position range.

Source file: `app/(app)/trees/new/page.tsx`.

### Edit Tree

Route: `/trees/[treeId]/edit`

Purpose: Edit tree metadata, plot, variety, lifecycle, and location.

Main components: `TreeForm`, `PrerequisiteCard`, `RecordNotFoundCard`.

Server actions: `updateTree`.

Database tables: `trees`, `plots`, `varieties`.

Related tests: `tests/unit/tree-actions.spec.ts`, `tests/integration/phase2-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no `/trees/[treeId]` detail route.

Source file: `app/(app)/trees/[treeId]/edit/page.tsx`.

### Bulk Tree Batch Create

Route: `/trees/batch/new`

Purpose: Preview and create a row range of trees transactionally; accepts safe PVO prefill for inferred empty row ranges.

Main components: `BulkTreeBatchForm`, `PrerequisiteCard`, `Card`.

Server actions: `submitBulkTreeBatch`.

Database tables: `bulk_tree_import_batches`, `trees`, `plots`, `varieties`; RPC `create_bulk_tree_batch`.

Related tests: `tests/unit/phase6-tree-batch-validation.spec.ts`, `tests/integration/tree-batch-operations.spec.ts`, `tests/security/tree-batch-rls.spec.ts`, `tests/e2e/tree-batch-and-export.spec.ts`, `tests/e2e/plot-visual-operations.spec.ts`.

Status: Implemented.

Missing functionality: no multi-row plant-new operation from the visual map; current PVO prefill is one continuous inferred empty range in one row.

Source file: `app/(app)/trees/batch/new/page.tsx`.

### Bulk Tree Deactivate

Route: `/trees/batch/deactivate`

Purpose: Preview and confirm logical removal of active trees in one plot row range.

Main components: `BulkTreeDeactivateForm`, `PrerequisiteCard`, prefill status card.

Server actions: `submitBulkDeactivateTrees`.

Database tables: `trees`, `plots`; RPC `bulk_deactivate_trees`.

Related tests: `tests/unit/phase6-tree-batch-validation.spec.ts`, `tests/integration/tree-batch-operations.spec.ts`, `tests/security/tree-batch-rls.spec.ts`, `tests/e2e/tree-batch-and-export.spec.ts`, `tests/e2e/plot-visual-operations.spec.ts`.

Status: Implemented, including PVO prefill for one complete `location_range`.

Missing functionality: only row-range deactivate is supported; irregular layouts are intentionally blocked.

Source file: `app/(app)/trees/batch/deactivate/page.tsx`.

### Activities List

Route: `/activities`

Purpose: List/filter activities and show seasonal activity summary/coverage panel.

Main components: `ActivityList`, `ActivitySeasonSummary`, `FeedbackBanner`, filter forms.

Server actions: `changeActivityStatus`, `deleteActivity` from list/detail components.

Database tables: `activities`, `activity_scopes`, `activity_materials`, `plots`, `trees`, `orchard_memberships`.

Related tests: `tests/unit/phase3-activities-validation.spec.ts`, `tests/integration/activity-management-flow.spec.ts`, `tests/security/activity-management-rls.spec.ts`, `tests/e2e/owner-operational-flow.spec.ts`.

Status: Implemented.

Missing functionality: no attachments and no dedicated calendar/planning board.

Source file: `app/(app)/activities/page.tsx`.

### New Activity

Route: `/activities/new`

Purpose: Create activity with optional tree/selection prefill, scopes, materials, performer, and status.

Main components: `ActivityForm`, `TreePicker`, `PrerequisiteCard`, prefill status card.

Server actions: `createActivity`.

Database tables: `activities`, `activity_scopes`, `activity_materials`, `plots`, `trees`, `orchard_memberships`; RPC `create_activity_with_children`.

Related tests: `tests/unit/activity-prefill.spec.ts`, `tests/unit/phase3-activities-validation.spec.ts`, `tests/integration/activity-management-flow.spec.ts`, `tests/security/activity-management-rls.spec.ts`, `tests/e2e/plot-visual-operations.spec.ts`.

Status: Implemented, including PVO selection prefill and async tree option
hydration through `GET /api/tree-options`.

Missing functionality: no attachment/material inventory stock integration.

Source file: `app/(app)/activities/new/page.tsx`.

### Activity Detail

Route: `/activities/[activityId]`

Purpose: Read activity detail with scopes/materials and expose status/delete/edit actions.

Main components: `ActivityDetail`, `FeedbackBanner`, `RecordNotFoundCard`.

Server actions: `changeActivityStatus`, `deleteActivity`.

Database tables: `activities`, `activity_scopes`, `activity_materials`, `plots`, `trees`, `profiles`.

Related tests: `tests/integration/activity-management-flow.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: no audit timeline for activity changes.

Source file: `app/(app)/activities/[activityId]/page.tsx`.

### Edit Activity

Route: `/activities/[activityId]/edit`

Purpose: Edit activity parent fields, scopes, materials, and performer.

Main components: `ActivityForm`, `TreePicker`, `RecordNotFoundCard`, `Card`.

Server actions: `updateActivity`.

Database tables: `activities`, `activity_scopes`, `activity_materials`, `plots`, `trees`, `orchard_memberships`; RPC `update_activity_with_children`.

Related tests: `tests/integration/activity-management-flow.spec.ts`, `tests/unit/phase3-activities-validation.spec.ts`.

Status: Implemented with async hydration of selected activity tree/scope options.

Missing functionality: no optimistic conflict resolution UI for concurrent edits.

Source file: `app/(app)/activities/[activityId]/edit/page.tsx`.

### Harvests List

Route: `/harvests`

Purpose: List/filter harvest records and link to harvest reports.

Main components: `HarvestList`, `FeedbackBanner`, filter form.

Server actions: `deleteHarvestRecord` from list/detail components.

Database tables: `harvest_records`, `plots`, `varieties`.

Related tests: `tests/unit/phase4-harvest-validation.spec.ts`, `tests/integration/harvest-management-flow.spec.ts`, `tests/security/harvest-management-rls.spec.ts`, `tests/e2e/owner-operational-flow.spec.ts`.

Status: Implemented.

Missing functionality: no export/report download UI for harvest reports.

Source file: `app/(app)/harvests/page.tsx`.

### New Harvest

Route: `/harvests/new`

Purpose: Create quantitative harvest record scoped to orchard, plot, variety, location range, or tree.

Main components: `HarvestForm`, `TreePicker`, `Card`.

Server actions: `createHarvestRecord`.

Database tables: `harvest_records`, `plots`, `varieties`, `trees`, `activities`.

Related tests: `tests/unit/phase4-harvest-validation.spec.ts`, `tests/integration/harvest-management-flow.spec.ts`.

Status: Implemented with async tree option search for tree-scoped records.

Missing functionality: no PVO/tree-detail harvest prefill currently wired.

Source file: `app/(app)/harvests/new/page.tsx`.

### Harvest Detail

Route: `/harvests/[harvestRecordId]`

Purpose: Read harvest record detail and expose edit/delete actions.

Main components: `HarvestDetail`, `FeedbackBanner`, `RecordNotFoundCard`.

Server actions: `deleteHarvestRecord`.

Database tables: `harvest_records`, `plots`, `varieties`, `trees`, `activities`, `profiles`.

Related tests: `tests/integration/harvest-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no audit trail or quality-grade detail model.

Source file: `app/(app)/harvests/[harvestRecordId]/page.tsx`.

### Edit Harvest

Route: `/harvests/[harvestRecordId]/edit`

Purpose: Edit harvest quantity, scope, optional links, and notes.

Main components: `HarvestForm`, `TreePicker`, `RecordNotFoundCard`, `Card`.

Server actions: `updateHarvestRecord`.

Database tables: `harvest_records`, `plots`, `varieties`, `trees`, `activities`.

Related tests: `tests/integration/harvest-management-flow.spec.ts`, `tests/unit/phase4-harvest-validation.spec.ts`.

Status: Implemented with async hydration of the selected tree option.

Missing functionality: no conflict-resolution UI for concurrent edits.

Source file: `app/(app)/harvests/[harvestRecordId]/edit/page.tsx`.

### Variety Locations Report

Route: `/reports/variety-locations`

Purpose: Show where active trees of a selected variety are located.

Main components: `VarietyLocationsReportView`.

Server actions: none.

Database tables: `varieties`, `trees`, `plots`.

Related tests: `tests/unit/variety-locations-report.spec.ts`, `tests/integration/variety-locations-report.spec.ts`, `tests/e2e/tree-batch-and-export.spec.ts`.

Status: Implemented.

Missing functionality: no visual plot overlay in this report; ranges are textual/grouped.

Source file: `app/(app)/reports/variety-locations/page.tsx`.

### Harvest Season Summary Report

Route: `/reports/season-summary`

Purpose: Aggregate harvest records by season, plot, variety, and timeline.

Main components: `HarvestSeasonSummaryView`.

Server actions: none.

Database tables: `harvest_records`, `plots`, `varieties`.

Related tests: `tests/unit/phase4-harvest-validation.spec.ts`, `tests/integration/harvest-management-flow.spec.ts`, `tests/e2e/owner-operational-flow.spec.ts`.

Status: Implemented.

Missing functionality: no printable/exportable report artifact.

Source file: `app/(app)/reports/season-summary/page.tsx`.

### Harvest Locations Report

Route: `/reports/harvest-locations`

Purpose: Aggregate harvest quantities by field location with fallback for tree-scoped records.

Main components: `HarvestLocationSummaryView`.

Server actions: none.

Database tables: `harvest_records`, `trees`, `plots`, `varieties`.

Related tests: `tests/unit/phase4-harvest-validation.spec.ts`, `tests/integration/harvest-management-flow.spec.ts`.

Status: Implemented.

Missing functionality: no visual grid/map rendering for report output.

Source file: `app/(app)/reports/harvest-locations/page.tsx`.

### Orchard Settings

Route: `/settings/orchard`

Purpose: Owner-only edit of active orchard name/code/description.

Main components: `OrchardForm`, `AccessDeniedCard`, `RecordNotFoundCard`.

Server actions: `updateOrchard`.

Database tables: `orchards`.

Related tests: `tests/unit/orchard-management-actions.spec.ts`, `tests/integration/orchard-management-flow.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: orchard status is read-only in current MVP; no archive/delete orchard UI.

Source file: `app/(app)/settings/orchard/page.tsx`.

### Orchard Members

Route: `/settings/members`

Purpose: Owner-only member list, invite existing account as worker, revoke non-owner active membership.

Main components: `InviteMemberForm`, `MemberList`, `AccessDeniedCard`, `FeedbackBanner`.

Server actions: `inviteOrchardMember`, `deactivateOrchardMembership`.

Database tables: `orchard_memberships`, `profiles`, `orchards`; RPC `invite_orchard_member_by_email`.

Related tests: `tests/unit/orchard-management-actions.spec.ts`, `tests/integration/orchard-management-flow.spec.ts`, `tests/security/orchard-management-rls.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented for existing-account worker membership.

Missing functionality: no true accept-invitation route/action; no role change UI; invite currently activates membership immediately.

Source file: `app/(app)/settings/members/page.tsx`.

### Profile Settings

Route: `/settings/profile`

Purpose: Account-level profile edit and account export availability/download UI.

Main components: `ProfileForm`, `ProfileExportCard`, `AccountShell`, `RecordNotFoundCard`.

Server actions: `updateProfile`; export uses route handler `GET /settings/profile/export`.

Database tables: `profiles`, plus export reads owned/admin-visible `orchards`, `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials`, `harvest_records`.

Related tests: `tests/integration/account-export.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: no email/password account-management UI beyond reset-link request.

Source file: `app/(account)/settings/profile/page.tsx`.

## Route Handlers

### Active Orchard Sync

Route: `GET /auth/sync-active-orchard`

Purpose: Safely set or clear `ol_active_orchard` after verifying selected orchard access.

Main components: none.

Server actions: none; route handler.

Database tables: `orchard_memberships`, `orchards`.

Related tests: `tests/unit/orchard-management-actions.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented.

Missing functionality: none known.

Source file: `app/auth/sync-active-orchard/route.ts`.

### Account Export

Route: `GET /settings/profile/export`

Purpose: Download JSON export for owned orchards or all administratively visible orchards for `super_admin`.

Main components: `ProfileExportCard` calls this endpoint.

Server actions: none; route handler.

Database tables: `profiles`, `orchards`, `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials`, `harvest_records`.

Related tests: `tests/integration/account-export.spec.ts`, `tests/e2e/orchard-access.spec.ts`.

Status: Implemented. Export read model paginates table reads with `.range()`
so super-admin exports are not silently capped at 1,000 rows.

Missing functionality: no import/restore counterpart.

Source file: `app/(account)/settings/profile/export/route.ts`.

### Favicon

Route: `GET /favicon.ico`

Purpose: Serve app favicon route.

Main components: none.

Server actions: none.

Database tables: none.

Related tests: none found.

Status: Implemented.

Missing functionality: none known.

Source file: `app/favicon.ico/route.ts`.

## Known Unimplemented Routes

- `/trees/[treeId]` detail page is not implemented; current dynamic tree route is `/trees/[treeId]/edit`.
- `/varieties/[varietyId]` detail page is not implemented; current dynamic variety route is `/varieties/[varietyId]/edit`.
- A true `Accept Invitation` route/action is not implemented. Current member invite activates an existing user immediately.
