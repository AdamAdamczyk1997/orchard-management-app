## Archival note

Ten dokument zostal przeniesiony do `documents/archive/` po domknieciu roli aktywnego execution guide.
Zachowujemy go jako historyczny indeks realizacji faz i slad decyzji delivery, a nie jako
biezacy punkt startowy do pracy.

Aktualne wejscia robocze to:

- `documents/README.md`
- `documents/00_overview_and_checklists/documentation_map.md`
- `documents/00_overview_and_checklists/session_handoff.md`
- `documents/01_implementation_materials/README.md`

Niezaznaczone checkboxy w tym pliku oznaczaja backlog swiadomie odlozony albo zalozenia,
ktore zostaly zastapione przez nowsze aktywne source-of-truth docs.

# OrchardLog / Sadownik+ Implementation Master Plan

## Purpose of this document

This document is the top-level execution guide for OrchardLog / Sadownik+.
It does not replace the detailed source-of-truth documents for schema, API, RLS, UI, or testing. Its job is to convert the current documentation set into a practical implementation sequence that can be executed phase by phase.

Use this document in the following order:

1. Review the implementation overview and confirm the current phase.
2. Execute the checklist for the active phase as a vertical slice.
3. Use the linked source documents for exact schema, contract, UI, and RLS details.
4. Confirm the phase `Expected output`, `Deliverables`, and `Definition of done`.
5. Update this file and linked source documents whenever scope or sequencing changes.

This file is intentionally written as an execution index.
It should stay concise enough to drive delivery, while the detailed logic remains in the normative documents linked throughout the plan.

## Implementation principles

- Orchard data is scoped by `orchard`, not by a single `profile`.
- The UI always works in one `active_orchard`, while the database and RLS remain multi-orchard-ready.
- `MVP 0.1` includes Phases 0-5. `0.2` starts with Phase 6.
- Production-first decisions take priority over temporary shortcuts unless an explicit MVP simplification is documented.
- Work should be delivered in vertical slices: schema + validation + backend + UI + RLS + tests + documentation.
- Standard domain forms do not send `orchard_id` manually; server-side context resolves it from `active_orchard`.
- Validation must exist in the backend and database layer, not only in the UI.
- RLS is part of the implementation baseline, not a final hardening task deferred to the end.
- Mobile-first workflows take priority for operational screens used in the field.
- Naming must stay aligned with active source-of-truth documents and avoid introducing parallel aliases.
- Documentation must be kept in sync whenever schema, contracts, or flow assumptions change.

## Project implementation overview

| Phase | Release target | Goal | Depends on | Can run in parallel |
|---|---|---|---|---|
| Phase 0 - Project readiness and implementation baseline | MVP 0.1 | Establish repo, environments, migration workflow, test baseline, and execution conventions | none | limited parallel work inside setup and documentation |
| Phase 1 - Identity, orchard onboarding, membership, and active context | MVP 0.1 | Deliver auth, `profiles`, `orchards`, `orchard_memberships`, onboarding, and `active_orchard` | Phase 0 | some frontend shell and auth UI can overlap once contracts are fixed |
| Phase 2 - Core orchard structure | MVP 0.1 | Deliver `plots`, `varieties`, `trees`, location basics, and orchard-scoped CRUD | Phase 1 | plot, variety, and tree UI can overlap after migrations and DTOs stabilize |
| Phase 3 - Seasonal activities and field operations | MVP 0.1 | Deliver `activities`, `activity_scopes`, `activity_materials`, and field-work flows | Phase 2 | activity UI, summaries, and tests can overlap once contracts are fixed |
| Phase 4 - Harvest records and seasonal reporting | MVP 0.1 | Deliver `harvest_records`, quantity normalization, season summary, and harvest timelines | Phase 2, partial overlap with Phase 3 | reporting UI and summary queries can overlap after write flows stabilize |
| Phase 5 - MVP hardening and release readiness | MVP 0.1 | Integrate modules, tighten quality, finalize RLS/security, and prepare release | Phases 1-4 | selected QA, documentation, and monitoring work can overlap late in Phases 3-4 |
| Phase 6 - Operational scale and data portability | 0.2 | Deliver batch tree tools, export UI, location reports, and optional storage extensions | Phases 2-5 | features can be split into separate vertical slices |

## Detailed implementation phases

### Phase 0 - Project readiness and implementation baseline

**Goal**

Create the technical and execution baseline that allows the rest of the project to be implemented without revisiting foundational decisions.

**Scope**

- repo and application bootstrap
- environment strategy
- Supabase project setup
- migration workflow
- shared validation and type conventions
- base test tooling and seed strategy
- source-of-truth references for daily development

**Dependencies**

- none

**Expected output**

- runnable application shell
- documented environment setup
- agreed migration and testing workflow
- initial CI baseline
- clear development entrypoint for all next phases

**Parallel work**

Backend tooling, UI shell scaffolding, and documentation cleanup can run in parallel after the project structure and conventions are fixed.

**Main tasks**

#### Database and migrations

- [x] Establish the migration workflow based on [schema_migration_plan.md](../05_technical/schema_migration_plan.md).
- [x] Decide the shared `updated_at` trigger strategy and add it to the base setup if used globally.
- [x] Prepare local Supabase development workflow and a repeatable reset path for schema + seed.

#### Backend / server actions

- [x] Scaffold the application structure according to [application_architecture.md](../05_technical/application_architecture.md).
- [x] Establish the server-side session access pattern that will later resolve `active_orchard`.
- [x] Define the standard `ActionResult<T>` handling pattern used by server actions.

#### Frontend / UI

- [x] Create the base app shell, auth route groups, protected route groups, and layout placeholders.
- [x] Prepare global navigation placeholders for dashboard, orchard switcher, and core module entrypoints.
- [x] Confirm mobile-first layout and form conventions from [mobile_first_guidelines.md](../04_ux_and_screen_design/mobile_first_guidelines.md).

#### Authorization / RLS

- [x] Confirm the baseline Supabase Auth integration strategy.
- [x] Prepare the initial RLS rollout order so domain tables never go live without policies.
- [x] Document the rule that privileged `service_role` access is never exposed to the client.

#### Validation / error handling

- [x] Establish shared validation tooling and naming conventions for input schemas.
- [x] Align UI error handling with [errors_and_system_messages.md](../06_backend_and_contracts/errors_and_system_messages.md).
- [x] Define how business errors will map to `error_code`, `message`, and `field_errors`.

#### Testing / seed data

- [x] Set up the baseline test stack from [test_plan.md](../07_security_and_quality/test_plan.md).
- [x] Prepare a seed strategy for local development and integration tests.
- [x] Add CI checks for `typecheck`, `lint`, and at least the first unit/integration test entrypoints.

#### Documentation sync

- [x] Confirm that the team uses [documents/README.md](../README.md) as the documentation index.
- [x] Confirm that `documents/archive/` is never used as an implementation source.
- [x] Keep this file aligned with the current MVP scope and migration strategy.

**Deliverables**

- Next.js project bootstrap
- environment documentation and `.env.example`
- base migration workflow
- base CI pipeline
- initial seed strategy
- updated implementation entrypoint documentation

**Risks / open questions**

- The integration-test environment strategy still needs a final decision: local Supabase versus heavier mocking for some layers.
- CI scope for E2E tests is still deferred and should not block Phase 1.

**Source documents**

- [documents/README.md](../README.md)
- [application_architecture.md](../05_technical/application_architecture.md)
- [project_conventions.md](../05_technical/project_conventions.md)
- [schema_migration_plan.md](../05_technical/schema_migration_plan.md)
- [state_and_data_fetching_strategy.md](../05_technical/state_and_data_fetching_strategy.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)

### Phase 1 - Identity, orchard onboarding, membership, and active context

**Goal**

Deliver authentication, orchard ownership, membership, onboarding, and the `active_orchard` context required by every orchard-scoped module.

**Scope**

- `profiles`
- `orchards`
- `orchard_memberships`
- `orchard_onboarding_dismissed_at`
- auth flows
- orchard onboarding
- orchard switcher
- orchard members management
- base RLS for identity and membership

**Dependencies**

- Phase 0 completed

**Expected output**

- working auth
- first-orchard onboarding for users without membership
- active orchard selection and resolution
- membership list and role management
- stable base for orchard-scoped CRUD in later phases

**Parallel work**

Auth UI, onboarding UI, and membership screens can proceed in parallel once the contract layer and route structure are stable.

**Main tasks**

#### Database and migrations

- [x] Create `profiles` according to [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md).
- [x] Create `orchards` and `orchard_memberships` with the current constraints and indexes.
- [x] Include `profiles.orchard_onboarding_dismissed_at`.
- [x] Add the single-active-owner-per-orchard MVP constraint.

#### Backend / server actions

- [x] Implement `signUp`, `signIn`, `signOut`, `resetPassword`, `getCurrentProfile`, and `updateProfile`.
- [x] Implement `createOrchard`, `listMyOrchards`, `getActiveOrchardContext`, and `setActiveOrchard`.
- [x] Implement `updateOrchard`, `listOrchardMembers`, `inviteOrchardMember`, and `deactivateOrchardMembership`.
- [ ] Implement `updateOrchardMembershipRole`.
- [x] Make `ActiveOrchardContext` the standard server-side input for protected layouts and orchard-aware screens.

#### Frontend / UI

- [x] Build the auth flow screens and protected app shell.
- [x] Build the `Create orchard` onboarding screen for first login without membership.
- [x] Build the orchard switcher and `No active orchard` / `No orchard yet` states.
- [x] Build `Orchard members` list and invite form.
- [x] Build orchard settings/edit flow.

#### Authorization / RLS

- [x] Enable RLS for `profiles`, `orchards`, and `orchard_memberships`.
- [x] Implement `is_super_admin()`, `is_active_orchard_member(target_orchard_id uuid)`, `has_orchard_role(target_orchard_id uuid, allowed_roles text[])`, and `is_orchard_owner(target_orchard_id uuid)`.
- [x] Enforce that `worker` cannot mutate membership records.
- [x] Enforce that `setActiveOrchard` requires active membership in the selected orchard.

#### Validation / error handling

- [x] Validate one active `owner` per orchard in MVP.
- [ ] Validate invite/update membership role transitions.
- [x] Implement `NO_ACTIVE_ORCHARD` and `ORCHARD_ONBOARDING_REQUIRED`.
- [ ] Implement `ORCHARD_MEMBERSHIP_REQUIRED`.
- [x] Enforce that "Never show again" only dismisses onboarding guidance and does not bypass first orchard creation.

#### Testing / seed data

- [x] Add unit tests for active orchard selection and onboarding decision logic.
- [x] Add integration tests for auth profile creation, orchard creation, membership rules, and RLS isolation.
- [x] Add E2E coverage for first login, orchard creation, active orchard switching, and worker membership restrictions.
- [x] Add seed data with at least one orchard containing `owner` and `worker`.

#### Documentation sync

- [x] Keep [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md) aligned with the actual server action names.
- [x] Keep [data_contracts.md](../06_backend_and_contracts/data_contracts.md) aligned with `OrchardFormInput`, `OrchardSummary`, `OrchardMembershipSummary`, `InviteOrchardMemberInput`, and `ActiveOrchardContext`.
- [x] Keep [user_flows.md](./user_flows.md) and [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md) aligned with onboarding and membership UI.

**Deliverables**

- SQL migrations for `profiles`, `orchards`, and `orchard_memberships`
- RLS policies and helper functions for the identity/membership layer
- auth screens, onboarding screen, orchard switcher, and members screen
- server actions and DTOs for orchard context and membership
- integration and E2E coverage for onboarding and membership flows

**Risks / open questions**

- Invitation acceptance flow can stay minimal in MVP, but role changes and revocation rules must still be safe.
- If multiple orchards per account become common early, orchard switching and session invalidation should receive extra UI polish during Phase 5.

**Source documents**

- [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [user_flows.md](./user_flows.md)
- [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
- [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)

### Phase 2 - Core orchard structure

**Goal**

Deliver the first operationally useful orchard structure: `plots`, `varieties`, and `trees` with orchard-scoped CRUD, filters, and baseline location fields.

**Scope**

- `plots`
- `varieties`
- `trees`
- baseline tree location fields already included in MVP
- list/create/edit/form flows
- orchard-scoped filtering and validation

**Dependencies**

- Phase 1 completed

**Expected output**

- owner and worker can manage orchard structure inside the active orchard
- plot, variety, and tree screens are usable on mobile and desktop
- relational integrity is enforced across plot, variety, and tree ownership
- detail pages stay consciously deferred until the next slices

**Parallel work**

Plot, variety, and tree frontend work can split after DTOs and server actions are stable. Filter views and validation hardening can progress in parallel once the create/edit flows are stable.

**Main tasks**

#### Database and migrations

- [x] Create `plots`, `varieties`, and `trees` with orchard-scoped foreign keys, indexes, and uniqueness rules.
- [x] Add baseline location fields required by current MVP documents.
- [x] Add tree constraints for location conflicts and cross-table orchard consistency.

#### Backend / server actions

- [x] Implement `listPlots`, `createPlot`, `updatePlot`, `archivePlot`, and `restorePlot`.
- [x] Implement `listVarieties`, `createVariety`, and `updateVariety`.
- [x] Implement `listTrees`, `createTree`, and `updateTree`.
- [x] Return data shapes aligned with `PlotFormInput`, `VarietyFormInput`, `TreeFormInput`, and corresponding summary/filter types.
- [ ] Defer `getPlotDetails`, `getVarietyDetails`, `getTreeDetails`, `deleteVariety`, and `deactivateTree` to later slices.

#### Frontend / UI

- [x] Build plot list, create/edit form, archive/restore actions, and empty states.
- [x] Build variety list, create/edit form, search, and empty states.
- [x] Build tree list with filters by plot, species, variety, condition, and active status.
- [x] Build single-tree create/edit form with baseline location fields and archived-plot guard.
- [ ] Defer dedicated plot, variety, and tree detail screens.

#### Authorization / RLS

- [x] Enable RLS for `plots`, `varieties`, and `trees`.
- [x] Allow `owner` and `worker` mutation access, keep `manager` and `viewer` future-ready.
- [x] Ensure all reads and writes resolve through `orchard_id`, never through legacy `user_id`.

#### Validation / error handling

- [x] Enforce unique plot names per orchard and optional unique plot codes.
- [x] Enforce unique `species + name` per orchard for `varieties`.
- [x] Enforce that `plot_id` and `variety_id` belong to the same active orchard in create/edit tree flows.
- [x] Enforce no active-tree location conflicts where required by the current model.
- [x] Map `DUPLICATE_PLOT_NAME`, `DUPLICATE_VARIETY`, `LOCATION_CONFLICT`, `PLOT_ARCHIVED`, and related field errors.

#### Testing / seed data

- [x] Add unit tests for core validation rules, tree write guards, and location label formatting.
- [x] Add integration tests for plot, variety, and tree CRUD under RLS.
- [x] Add integration tests for plot lifecycle, variety search/update, and tree filtering/update.
- [x] Add E2E flow for orchard creation -> plot creation -> variety creation -> tree creation.
- [x] Extend seed data with multiple plots, multiple varieties, and trees with and without location data.

#### Documentation sync

- [x] Keep schema details aligned with [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md).
- [x] Keep tree-location rules aligned with [tree_location_policy.md](../03_domain_and_business_rules/tree_location_policy.md).
- [x] Keep forms, filters, routes, and implementation notes aligned with [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md), [user_flows.md](./user_flows.md), and [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md).

**Deliverables**

- SQL migrations for `plots`, `varieties`, and `trees`
- indexes and constraints for orchard-scoped structure data
- CRUD server actions and DTOs for plots, varieties, and trees
- plot, variety, and tree screens with mobile-usable forms and lists
- unit and integration coverage for core orchard structure
- focused implementation note for Phase 2

**Risks / open questions**

- Tree location complexity should stay at the documented MVP level; additional numbering schemes remain Phase 6 unless reprioritized.
- Variety deletion must stay conservative if linked trees already exist.
- Dedicated detail screens for `plots`, `varieties`, and `trees` remain deferred and should be reconsidered together with Phase 3 activity/history needs.

**Source documents**

- [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [validations_and_integrity.md](../03_domain_and_business_rules/validations_and_integrity.md)
- [tree_location_policy.md](../03_domain_and_business_rules/tree_location_policy.md)
- [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
- [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)

### Phase 3 - Seasonal activities and field operations

**Goal**

Deliver the operational field-work layer with repeated seasonal activities, partial coverage tracking, performer attribution, and material usage for spraying.

**Scope**

- `activities`
- `activity_scopes`
- `activity_materials`
- `winter_pruning`
- `summer_pruning`
- `mowing`
- `spraying`
- activity history, filtering, and progress views

**Dependencies**

- Phase 2 completed

**Expected output**

- users can log field work at plot, section, row, range, and tree level
- multiple scopes can be stored in one activity
- spraying materials are recorded consistently
- seasonal activity summaries can be generated from structured data

**Parallel work**

Activity form implementation, summaries, and test cases can progress in parallel after the contracts for `ActivityFormInput`, `ActivityScopeInput`, and `ActivityMaterialInput` are fixed.

**Main tasks**

#### Database and migrations

- [x] Create `activities`, `activity_scopes`, and `activity_materials`.
- [x] Add required indexes for filtering by orchard, date, type, status, plot, and performer.
- [x] Add referential constraints for plot/tree/performer consistency.

#### Backend / server actions

- [x] Implement `listActivities`, `getActivityDetails`, `createActivity`, `updateActivity`, `changeActivityStatus`, and `deleteActivity`.
- [x] Implement `getSeasonalActivitySummary` and `getSeasonalActivityCoverage`.
- [x] Save `activities`, `activity_scopes`, and `activity_materials` transactionally as one logical operation.
- [x] Ensure `performed_by_profile_id` resolves only to active membership within the same orchard.

#### Frontend / UI

- [x] Build the activity list with filters by type, status, date, plot, and performer.
- [x] Build the activity form supporting multiple scopes and multiple materials.
- [x] Build UI for `winter_pruning` and `summer_pruning` as explicit `activity_subtype` choices.
- [x] Build UI for `mowing` on a whole plot or selected rows.
- [x] Build UI for `spraying` with materials, quantities, units, weather notes, and result notes.
- [x] Build details views and progress/history views for seasonal work.

#### Authorization / RLS

- [x] Enable RLS for `activities`, `activity_scopes`, and `activity_materials`.
- [x] Inherit activity-scope and material access from the parent `activities` record.
- [x] Ensure worker mutation permissions match the current RLS strategy.

#### Validation / error handling

- [x] Enforce `activity_type`, status, date, and seasonal mapping rules.
- [x] Enforce `activity_subtype` for pruning in MVP.
- [x] Enforce valid `activity_scopes` per `scope_level`.
- [x] Enforce plot/tree consistency and same-orchard performer membership.
- [x] Map `ACTIVITY_SCOPE_INVALID`, `PRUNING_SUBTYPE_REQUIRED`, `TREE_NOT_IN_PLOT`, and related business errors.

#### Testing / seed data

- [x] Add unit tests for `season_year`, `season_phase`, scope validation, and activity summaries.
- [x] Add integration tests for transactional writes of activities with scopes and materials.
- [x] Add E2E coverage for multi-scope spraying, pruning with subtype, and plot-wide mowing.
- [x] Extend seed data with repeated activities performed by different profiles across one season.

#### Documentation sync

- [x] Keep activity behavior aligned with [business_rules.md](../03_domain_and_business_rules/business_rules.md) and [statuses_and_lifecycles.md](../03_domain_and_business_rules/statuses_and_lifecycles.md).
- [x] Keep the activity form aligned with [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md).
- [x] Keep activity filters, route flow, and UI states aligned with the UX documents.

**Deliverables**

- SQL migrations for `activities`, `activity_scopes`, and `activity_materials`
- transactional server actions for seasonal activities
- field-usable activity list, form, details, and summary views
- validation schemas for scope and subtype rules
- unit, integration, and E2E coverage for seasonal activity flows

**Risks / open questions**

- Progress reporting must stay derived from history and scopes, not from a separate per-tree completion flag in MVP.
- Planned future work is supported by status design, but the exact UX depth for planned-only workflows can stay light in MVP.

**Source documents**

- [business_rules.md](../03_domain_and_business_rules/business_rules.md)
- [statuses_and_lifecycles.md](../03_domain_and_business_rules/statuses_and_lifecycles.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
- [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)

### Phase 4 - Harvest records and seasonal reporting

**Goal**

Deliver harvest quantity tracking, quantity normalization, orchard/plot/variety summaries, and seasonal timeline reporting.

**Scope**

- `harvest_records`
- quantity normalization to `quantity_kg`
- optional link to `activity_id`
- list/form/detail flows
- `Season Summary` screen
- harvest history and timeline reporting

**Dependencies**

- Phase 2 completed
- Phase 3 partially completed when harvest-to-activity linking is implemented

**Expected output**

- structured harvest entries at orchard, plot, variety, location-range, and tree scope
- stable season summary aggregates
- consistent reporting across `kg` and `t`
- usable seasonal reporting UI for orchard operators

**Parallel work**

Write flows, summary queries, and season summary UI can run in parallel after `HarvestRecordFormInput` and summary contracts are fixed.

**Main tasks**

#### Database and migrations

- [x] Create `harvest_records` with orchard-scoped foreign keys and summary-oriented indexes.
- [x] Add deterministic `quantity_kg` normalization rules for supported units.
- [x] Add constraints for scope-level location requirements and same-orchard references.

#### Backend / server actions

- [x] Implement `listHarvestRecords`, `getHarvestRecordDetails`, `createHarvestRecord`, `updateHarvestRecord`, and `deleteHarvestRecord`.
- [x] Implement `getHarvestSeasonSummary` as the read model behind the `Season Summary` screen, plus `getHarvestTimeline`.
- [x] Support optional linkage from `harvest_records.activity_id` to `activities`.
- [x] Return data aligned with `HarvestRecordFormInput` and `HarvestRecordSummary`.
- [x] Return data aligned with `HarvestSeasonSummary`.

#### Frontend / UI

- [x] Build the harvest list with filters by season, plot, variety, and date.
- [x] Build the harvest form for orchard, plot, variety, location-range, and tree scope.
- [x] Build harvest details and edit flows.
- [x] Build the `Season Summary` screen for total harvest, by-variety totals, by-plot totals, and time history.
- [x] Build timeline and aggregation views that remain clear on mobile.

#### Authorization / RLS

- [x] Enable RLS for `harvest_records`.
- [x] Keep `owner` and `worker` mutation permissions aligned with the current access model.
- [x] Ensure cross-orchard reads and writes are impossible through linked plot, variety, tree, or activity references.

#### Validation / error handling

- [x] Enforce `quantity_value > 0`, supported units, and deterministic `quantity_kg`.
- [x] Enforce `season_year` derivation from `harvest_date`.
- [x] Enforce correct requirements for `scope_level = 'location_range'`.
- [x] Enforce plot/tree/variety/activity orchard consistency.
- [x] Map `HARVEST_SCOPE_INVALID`, `HARVEST_UNIT_INVALID`, and related field errors.

#### Testing / seed data

- [x] Add unit tests for `kg` / `t` normalization.
- [x] Add unit tests for summary aggregation logic.
- [x] Add integration tests for harvest CRUD and read queries.
- [x] Add integration tests for season summary queries.
- [x] Add E2E coverage for adding harvest records and reviewing season summary results.
- [x] Add security / RLS coverage for harvest reads and writes.
- [x] Extend seed data with harvest records across plots, varieties, and units.

#### Documentation sync

- [x] Keep harvest behavior aligned with [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md) and [business_rules.md](../03_domain_and_business_rules/business_rules.md).
- [x] Keep CRUD UI aligned with [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md).
- [x] Keep `Season Summary` UI aligned with [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md).
- [x] Keep data contracts aligned with [data_contracts.md](../06_backend_and_contracts/data_contracts.md).

**Deliverables**

- SQL migration for `harvest_records`
- normalized harvest write path and season summary read path
- `HarvestRecordFormInput` and `HarvestSeasonSummary` aligned with the shipped read/write flows
- harvest list/form/details UI
- `Season Summary` screen and timeline view
- unit, integration, and E2E coverage for harvest normalization and reporting

**Risks / open questions**

- The model can support tree-level harvest detail, but the MVP UI should stay focused on orchard, plot, variety, and location-range entry unless business usage proves otherwise.
- More advanced harvest analytics remain Phase 6 and should not bloat the MVP summary screen.

**Source documents**

- [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
- [orchardlog_database_model.md](../03_domain_and_business_rules/orchardlog_database_model.md)
- [business_rules.md](../03_domain_and_business_rules/business_rules.md)
- [forms_and_fields.md](../04_ux_and_screen_design/forms_and_fields.md)
- [screens_and_views.md](../04_ux_and_screen_design/screens_and_views.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [data_contracts.md](../06_backend_and_contracts/data_contracts.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)

### Phase 5 - MVP hardening and release readiness

**Goal**

Turn the completed MVP modules into a stable, secure, documented release candidate that is ready for practical usage.

**Scope**

- cross-module navigation
- dashboard and recent summaries
- empty/loading/error states
- observability
- security review
- regression test coverage
- seed/demo data
- final documentation sync

**Dependencies**

- Phases 1-4 completed at functional level

**Expected output**

- coherent end-to-end product experience
- release-ready security and RLS posture
- stable QA baseline
- seeded demo environment
- final documentation aligned with shipped scope

**Parallel work**

Late-stage QA, observability wiring, final doc sync, and UX polish can overlap once feature work is functionally complete.

**Main tasks**

#### Database and migrations

- [x] Review all MVP migrations for naming consistency, reversibility, and index coverage.
- [x] Add reporting and performance indexes that are already justified by real MVP queries.
- [x] Confirm no MVP table is left without required constraints or RLS.

#### Backend / server actions

- [x] Implement dashboard-level read `getDashboardSummary` with `active_plots_count`, `active_trees_count`, `recent_activities`, and `recent_harvests`.
- [x] Add `upcoming_activities` as a dashboard planning read after the dashboard snapshot and empty states are stable.
- [x] Review server-action responses for consistent `ActionResult<T>` behavior.
- [x] Confirm `exportAccountData` stays deferred to Phase 6 and is not accidentally exposed in MVP.

#### Frontend / UI

- [x] Replace the dashboard placeholder with a real operational snapshot, quick actions, and links to harvest reporting.
- [x] Add loading skeletons plus `global empty state` / `filtered empty state` handling for the core list views: `plots`, `varieties`, `trees`, `activities`, and `harvests`.
- [x] Replace silent `record not found` redirects on critical detail/edit/settings routes with explicit recovery cards.
- [x] Reuse shared prerequisite cards for create/edit flows blocked by missing plot or active plot prerequisites.
- [x] Add shared success feedback after redirect for core create/edit/archive/delete/status flows in `plots`, `trees`, `varieties`, `activities`, and `harvests`.
- [x] Integrate the remaining final navigation polish and route-guard edge cases across all MVP views.
- [x] Audit empty, loading, error, and permission-denied states across all MVP views.
- [x] Complete responsive QA for the key mobile field flows.
- [x] Polish the orchard switcher, filter UX, and the remaining non-redirect success/error feedback patterns.

#### Authorization / RLS

- [x] Run a full RLS review across `profiles`, `orchards`, `orchard_memberships`, `plots`, `varieties`, `trees`, `activities`, `activity_scopes`, `activity_materials`, and `harvest_records`.
- [x] Confirm `worker` cannot manage memberships or export account data.
- [x] Confirm `super_admin`, `owner`, and `worker` behavior matches the current access matrix.
- [x] Clean up current Supabase DB lint findings for mutable `search_path`, duplicate permissive membership policies, and direct `auth.uid()` init-plan warnings in shipped MVP policies.

#### Validation / error handling

- [x] Verify the error catalog covers real MVP flows and returned codes.
- [x] Confirm UI messaging is consistent for the shipped `record not found` and prerequisite-blocked route states on critical MVP flows.
- [x] Confirm redirect-based success feedback is consistent for the shipped core CRUD/status flows.
- [x] Confirm UI messaging is consistent for form validation, remaining permission issues, and missing active orchard context across every MVP view.
- [x] Audit naming consistency across DTOs, database fields, and screen copy.

#### Testing / seed data

- [x] Complete regression coverage for the critical end-to-end flows.
- [x] Finalize the local/demo seed dataset for onboarding, orchard structure, activities, and harvests.
- [x] Add a local bootstrap command for seeded `auth.users` prerequisites used by manual QA.
- [x] Add a local readiness-check command for the full baseline QA dataset after the SQL seed is applied.
- [x] Add unit coverage for the shared recovery/prerequisite cards used by route-guarded MVP pages.
- [x] Run a focused security and isolation test pass for cross-orchard access.
- [x] Confirm the minimal CI gate for merge and release readiness.

#### Documentation sync

- [x] Reconcile the shipped MVP with [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md).
- [x] Reconcile implemented contracts with [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md) and [data_contracts.md](../06_backend_and_contracts/data_contracts.md).
- [x] Reconcile test coverage with [test_plan.md](../07_security_and_quality/test_plan.md) and [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md).

**Deliverables**

- dashboard reads and dashboard entry integration
- complete MVP error/empty/loading states
- reviewed RLS policies across all MVP tables
- final seed/demo dataset
- documented local baseline-user bootstrap for seeded QA
- explicit recovery cards for missing-record and missing-prerequisite route states
- release checklist and synchronized technical documentation

**Risks / open questions**

- If performance issues appear during realistic seed-data testing, add only targeted indexes and avoid premature denormalization.
- Monitoring depth can remain light in MVP, but security and auditability cannot.

**Source documents**

- [navigation_map.md](../04_ux_and_screen_design/navigation_map.md)
- [ui_states.md](../04_ux_and_screen_design/ui_states.md)
- [authorization_and_rls_strategy.md](../05_technical/authorization_and_rls_strategy.md)
- [errors_and_system_messages.md](../06_backend_and_contracts/errors_and_system_messages.md)
- [mvp_acceptance_criteria.md](../07_security_and_quality/mvp_acceptance_criteria.md)
- [test_plan.md](../07_security_and_quality/test_plan.md)
- [monitoring_and_observability.md](../07_security_and_quality/monitoring_and_observability.md)

### Phase 6 - Operational scale and data portability

**Goal**

Add the first post-MVP capabilities needed for larger orchards, data portability, and more operationally efficient workflows.

**Scope**

- bulk tree creation
- bulk tree deactivation
- variety location reporting
- `exportAccountData` backend and UI
- richer harvest location analytics
- optional storage / attachments only if explicitly prioritized

**Dependencies**

- Phases 2-5 completed

**Expected output**

- faster large-scale tree operations
- export capability for eligible owners
- better orchard location intelligence
- clear separation between stable MVP and early growth features

**Parallel work**

Batch tools, export flows, and reporting slices can be implemented independently once the underlying orchard structure and harvest data are stable.

**Main tasks**

#### Database and migrations

- [x] Create `bulk_tree_import_batches` and any required tree linkage fields.
- [x] Add the additional location/reporting indexes justified by batch and report use cases.
- [x] Add targeted hardening indexes for dashboard feeds, tree-filtered activity lookups, and harvest list/report queries through forward-only follow-up migrations.
- [ ] Add storage-related schema only if attachments are explicitly moved into scope.

#### Backend / server actions

- [x] Implement the bulk tree creation capability exposed in the UI as bulk tree creation and backed by `previewBulkTreeBatch` and `createBulkTreeBatch` in the current source docs.
- [x] Implement `previewBulkDeactivateTrees` and `bulkDeactivateTrees`.
- [x] Implement `getVarietyLocationsReport`.
- [x] Implement richer location-aware harvest summaries where already planned.
- [x] Implement `exportAccountData` with account-wide export for eligible owners and admin-wide export for `super_admin`.
- [x] Extend `activities` and `harvests` with plot-aware location guards that reuse `plots.layout_type` in field flows.

#### Frontend / UI

- [x] Build the bulk tree creation form and preview flow.
- [x] Build the bulk tree deactivation preview/confirmation flow.
- [x] Build the variety location report UI.
- [x] Build the harvest location report UI.
- [x] Build the export UI for eligible users and explicit forbidden state for `worker`.
- [x] Extend `plots` create/edit with layout settings, numbering schemes, and field-facing orientation metadata.
- [x] Make single-tree create/edit and both tree batch flows layout-aware, with plot guidance and explicit handling for `rows`, `mixed`, and `irregular`.
- [x] Add plot-aware guidance and unsupported states to `activities` and `harvests` location authoring flows.
- [ ] Build any richer season analytics screens only after confirming they still belong to `0.2`.

#### Authorization / RLS

- [x] Add RLS for `bulk_tree_import_batches`.
- [x] Ensure export availability stays limited to eligible `owner` access and `super_admin`.
- [x] Keep worker access limited to operational data, not account-wide export.

#### Validation / error handling

- [x] Validate preview-before-write behavior for bulk operations.
- [x] Validate that mass operations never cross orchard or plot boundaries.
- [x] Enforce logical removal instead of physical delete for bulk deactivation.
- [x] Validate `layout_type`, numbering schemes, and positive default grid counts for `plots`.
- [x] Enforce plot-aware tree-location rules and block row-range batch flows for layouts that cannot support them.
- [x] Enforce the same `irregular` vs row-range rules for `activity_scopes` and harvest `location_range` on both server and database layers.
- [x] Confirm export payload composition matches [import_export_spec.md](../06_backend_and_contracts/import_export_spec.md).

#### Testing / seed data

- [x] Add unit tests for batch range validation and location-range grouping.
- [x] Add unit and integration tests for `getVarietyLocationsReport`.
- [x] Add integration tests for preview/write batch flows and export authorization.
- [x] Add unit and integration tests for `getHarvestLocationSummary`.
- [x] Add unit and integration tests for plot layout settings persistence and validation.
- [x] Add unit tests for plot-aware tree workflow guards and layout-policy helpers.
- [x] Add unit and integration coverage for plot-aware activity and harvest location restrictions.
- [x] Add integration regression for `listActivities` with `tree_id` covering direct and scoped tree links.
- [x] Add E2E coverage for batch tree creation, bulk deactivation, and export denial for `worker`.
- [ ] Extend seed data to cover large row ranges, conflict scenarios, and export-worthy owner data.

#### Documentation sync

- [x] Keep batch behavior aligned with [batch_tree_creation_rules.md](../06_backend_and_contracts/batch_tree_creation_rules.md).
- [x] Keep migration inventory and data-model index notes aligned with the actual package state through `025` and `026`.
- [x] Keep export behavior aligned with [import_export_spec.md](../06_backend_and_contracts/import_export_spec.md) and [backup_restore_and_export.md](../07_security_and_quality/backup_restore_and_export.md).
- [ ] Update scope documents if any `0.2` item is promoted earlier.

**Deliverables**

- `bulk_tree_import_batches` migration and related indexes
- `plots` layout settings migration and UI
- bulk tree creation and deactivation flows
- variety location report
- harvest location report
- `exportAccountData` backend and UI
- post-MVP test coverage and documentation updates

**Risks / open questions**

- If large orchards become the primary audience before MVP completion, batch tree creation may need reprioritization.
- Import remains future-ready and documented, but should not be pulled into scope without dedicated validation and recovery design.
- Attachments should stay deferred unless a clear operational use case justifies their earlier addition.

**Source documents**

- [mvp_scope_and_priorities.md](../02_product_documents/mvp_scope_and_priorities.md)
- [tree_location_policy.md](../03_domain_and_business_rules/tree_location_policy.md)
- [schema_migration_plan.md](../05_technical/schema_migration_plan.md)
- [storage_and_attachments.md](../05_technical/storage_and_attachments.md)
- [api_and_system_operations.md](../06_backend_and_contracts/api_and_system_operations.md)
- [batch_tree_creation_rules.md](../06_backend_and_contracts/batch_tree_creation_rules.md)
- [import_export_spec.md](../06_backend_and_contracts/import_export_spec.md)
- [backup_restore_and_export.md](../07_security_and_quality/backup_restore_and_export.md)

## Recommended implementation order

1. Complete Phase 0 before any feature-specific implementation starts.
2. Deliver Phase 1 end to end before building orchard-scoped CRUD modules.
3. Deliver Phase 2 as the first orchard-structure vertical slice.
4. Start Phase 3 after Phase 2 DTOs, relations, and filters are stable.
5. Start Phase 4 once Phase 2 is stable and Phase 3 harvest linkage is understood.
6. Use Phase 5 to integrate, harden, and verify the actual shipped MVP.
7. Start Phase 6 only after MVP acceptance criteria are met or a documented reprioritization happens.

Rationale:

- Phase 1 blocks all orchard-scoped features because `active_orchard`, membership, and ownership are foundational.
- Phase 2 blocks most of the activity and harvest domain because plots, varieties, and trees are their main references.
- Phase 3 and Phase 4 can overlap once the core orchard structure and contracts are stable.
- Hardening must happen against real integrated flows, not against partially built modules.

## Cross-cutting concerns

### Auth and active orchard context

- Resolve `active_orchard` on the server at the start of protected requests.
- Never require standard domain forms to submit `orchard_id`.
- Revalidate layout and orchard-dependent views after `createOrchard` and `setActiveOrchard`.

### Authorization, roles, and membership

- Keep global role and orchard role separate.
- Treat `owner` and `worker` permissions as closed MVP decisions.
- Keep `manager` and `viewer` future-ready in schema and policy design without fully implementing them in MVP UI.

### Data integrity and validation

- Validate orchard ownership across all foreign-key combinations.
- Keep unique indexes, partial unique constraints, and range checks close to the schema.
- Do not rely on UI-only validation for location, membership, or scope rules.
- Treat final release closeout as a fresh-baseline workflow; after the full automated gate mutates seeded data, rerun `pnpm seed:baseline-reset` before manual QA.

### RLS and security

- Every domain table ships with RLS from the start.
- Worker access is operational, not administrative.
- Export and future storage must stay privilege-aware.

### Type safety and naming consistency

- Keep server actions, DTOs, and schema field names aligned with the active source-of-truth documents.
- Avoid creating new aliases unless the contract documents are updated first.
- Prefer explicit domain names such as `activity_scopes`, `harvest_records`, and `orchard_memberships`.

### Error handling

- Use the shared `ActionResult<T>` pattern.
- Keep `error_code` values aligned with the documented error catalog.
- Make field-level validation actionable in mobile forms.

### Migrations, seed data, and local environments

- Migrations should be small, ordered, and reversible when practical.
- Seed data must cover onboarding, ownership isolation, activities, and harvest summaries.
- Local development should be able to reset schema and seed without manual database patching.
- Seeded QA should have a documented bootstrap for required `auth.users`; current local command is `pnpm seed:baseline-users`.
- Seeded QA should have an automated local command for running the reference SQL seed; current local command is `pnpm seed:baseline-sql`.
- Seeded QA should have a one-command rebuild flow for the full local baseline; current local command is `pnpm seed:baseline-reset`.
- Seeded QA should have a repeatable readiness check for the reference dataset; current local command is `pnpm qa:baseline-status`.

### Testing strategy

- Unit tests protect core validation and aggregation rules.
- Integration tests protect schema, RLS, and server actions.
- E2E tests protect critical user journeys and permission boundaries.

### Import/export and future data portability

- `exportAccountData` is the first supported data portability feature.
- Import stays documented and future-ready, but is not a blocking MVP deliverable.
- Export payloads must remain consistent with the current ownership and membership model.

### Observability and auditability

- Add enough monitoring to trace onboarding, membership changes, activity writes, harvest writes, and export attempts.
- Keep mutation logs and timestamps consistent enough for operational troubleshooting.
- If audit depth grows later, extend from the current entity model rather than introducing parallel shadow tables too early.

## Definition of done for major stages

### Foundation ready

- [x] Repo structure, environment setup, migration workflow, and test baseline are documented and working.
- [x] Active source-of-truth documents are known and linked.

### Identity and orchard context ready

- [x] Auth works end to end.
- [x] A user without membership is routed to orchard onboarding.
- [x] The first orchard can be created and becomes the active context.
- [x] Membership rules and base RLS are covered by integration tests.

### Core orchard structure ready

- [x] `plots`, `varieties`, and `trees` CRUD flows work inside the active orchard.
- [x] Constraints and indexes cover uniqueness and core integrity rules.
- [x] `owner` and `worker` permissions behave as expected.

### Seasonal activities ready

- [x] Activities, scopes, and materials save and load transactionally.
- [x] Pruning subtype, spraying materials, and multi-scope activity rules are enforced.
- [x] Field-work history and filtering are usable on mobile.

### Harvest and season summary ready

- [x] Harvest quantities normalize correctly from `kg` and `t`.
- [x] Season summaries aggregate correctly by variety and plot.
- [x] Harvest write/read flows are covered by integration and E2E tests.

### MVP release ready

- [x] All MVP tables have reviewed migrations, constraints, indexes, and RLS.
- [x] DTOs and server actions are aligned with contract documents.
- [x] Empty/loading/error states are implemented for critical screens.
- [x] Seed/demo data works for realistic QA.
- [x] Documentation reflects the shipped MVP scope.

## Open questions and deferred decisions

### Locked assumptions for this plan

- UI works in one `active_orchard`; database and RLS remain multi-orchard-ready.
- `worker` can mutate `plots`, `varieties`, `trees`, `activities`, and `harvest_records`, but cannot manage membership or export.
- `exportAccountData` is account-wide; zwykly user eksportuje tylko orchard z aktywnym `owner`, a `super_admin` eksportuje wszystkie orchard dostepne administracyjnie.
- Import is documented for future expansion and is not a blocking MVP deliverable.

### Needs clarification later

- Decide whether integration tests will always use local Supabase or mix local Supabase with selective mocking.
- Decide whether stable E2E coverage runs on every PR or only on release-focused pipelines.
- Revisit whether batch tree creation should move earlier if large orchards become the primary deployment target.
- Revisit whether tree-level harvest entry needs first-class MVP UI or remains model-supported only.
- Revisit whether future-dated planned work needs richer UX before or after the first release.
- Revisit storage and attachments only when a concrete operational use case is approved.

## Suggested next implementation step

Start with one vertical slice covering all of Phase 0 and the minimum viable subset of Phase 1:

1. Bootstrap the Next.js app, environment files, and local Supabase workflow.
2. Create the first migrations for `profiles`, `orchards`, and `orchard_memberships`.
3. Implement auth and profile creation.
4. Implement `createOrchard`, `listMyOrchards`, `getActiveOrchardContext`, and `setActiveOrchard`.
5. Build the protected app shell with orchard onboarding and orchard switcher.
6. Add the first integration tests for onboarding, membership, and active orchard resolution.

This slice creates the non-negotiable execution baseline for every later module.
