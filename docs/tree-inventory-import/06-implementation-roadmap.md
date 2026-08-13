# Tree Inventory XLSX Import - implementation roadmap

## 1. Executive summary

This roadmap is the controlling implementation plan for `tree_inventory_v1`.
It is intentionally phased to avoid a big-bang importer. Each phase is a safe
checkpoint with its own verification gate and a required stop for human review.

The MVP imports one XLSX inventory file for exactly one `plot` in one active
`orchard`. It uses `incremental_create`, expands homogeneous row segments into
materialized `trees`, treats `missing_tree` as no tree record, rejects conflicts
with existing active trees, and requires owner confirmation for the final write.
First import into an empty orchard is an explicit MVP scenario: the orchard and
plot must exist, but `trees=0` and `varieties=0` are valid starting states.
Workers may inventory varieties that are not yet registered, and owners resolve
those new candidates before final confirmation.

Proposed number of implementation checkpoints: 11. The plan keeps the original
10 numbered phases and adds `Phase 8A - Variety Resolution` as a dedicated stop
between preview UI and confirm.

Critical path:

```text
Phase 1 contracts
  -> Phase 2 XLSX dependency decision
  -> Phase 3 template generator
  -> Phase 4 parser
  -> Phase 5 normalizer + pure validation
  -> Phase 6 staging/RLS schema
  -> Phase 7 DB/domain preview + variety candidate grouping
  -> Phase 8 upload/preview UI
  -> Phase 8A variety resolution
  -> Phase 9 confirm transaction
  -> Phase 10 hardening/release readiness
```

The most important architectural boundary is canonical Tree Inventory JSON. XLSX
UX may evolve, but importer behavior should depend on the canonical contract,
not on worksheet layout details.

### Current checkpoint

Status after Phase 8:

- Phase 1 is complete.
- Phase 2 is complete.
- Phase 3 is complete.
- Phase 4 is complete.
- Phase 5 is complete.
- Phase 6 is complete.
- Phase 7 is complete.
- Phase 8 is complete.
- `exceljs@4.4.0` is selected and installed as the server-side XLSX
  read/write dependency.
- `pnpm.overrides` pins `exceljs>uuid` to `11.1.1` and old
  `brace-expansion` ranges to `1.1.18` to avoid known audit findings in the
  selected dependency chain.
- The server-only spike proves workbook generation/parsing, hidden worksheets,
  hidden columns, sheet protection, cell protection, dropdown data validation,
  deterministic normalized assertions and a 1k-position equivalent workbook.
- The server-side `tree_inventory_v1` template generator exists for one active
  orchard and one `rows` plot. It creates `INSTRUKCJA`, `METADANE`,
  `NASADZENIA`, `WYJATKI` and `SLOWNIKI` worksheets with metadata,
  orchard-local dictionaries, hidden/protected technical fields and dropdown
  validation.
- The server-side `tree_inventory_v1` parser exists. It reads XLSX buffers into
  raw source-preserving metadata, segment, exception and dictionary rows,
  preserves sheet/row/column/address/raw values, keeps formulas as untrusted raw
  objects, validates required sheets/headers, enforces workbook size limits and
  rejects unsupported `xlsx_contract_version` through structured diagnostics.
- The pure `tree_inventory_v1` normalizer exists. It converts raw parser output
  into canonical JSON, trims and parses primitive fields, represents
  `known`/`unknown`/`uncertain`/`new_candidate` variety references before DB
  resolution, expands segments into logical positions, applies MVP exceptions,
  detects overlaps, gaps, outside exceptions, conflicting exceptions and expanded
  position limits, and keeps all diagnostics deterministic.
- The Phase 6 staging/audit schema exists through
  `037_create_tree_inventory_import_staging.sql`:
  - `inventory_imports`
  - `inventory_import_source_rows`
  - `inventory_import_variety_candidates`
  - `inventory_import_positions`
  - `inventory_import_created_trees`
- Phase 6 RLS uses the existing orchard helper semantics plus staging helpers:
  active members and `super_admin` can read, owner/worker/`super_admin` can
  stage open imports, confirmed/final audit writes are owner/`super_admin`
  guarded, and revoked members lose access.
- Phase 6 added database guards for cross-orchard plot, variety, staged
  position and created-tree audit references. No import-only columns were added
  to `trees`.
- The Phase 7 server-side preview service exists in
  `lib/tree-inventory-import/preview.server.ts`. It accepts canonical JSON plus
  file metadata, revalidates active orchard, plot, current orchard-local
  varieties and current tree locations, groups variety candidates, writes Phase
  6 staging rows and produces diagnostics/summary/status output.
- Phase 7 detects active tree conflicts, keeps inactive historical tree context
  non-blocking, rejects unsupported layouts/cross-orchard context/stale variety
  IDs/species mismatches, treats current DB varieties as authority and stages
  exact current matches for `new_candidate` rows as suggested owner mappings
  instead of auto-creating varieties.
- The Phase 8 upload/preview UI exists under `/trees/import`. It lets active
  orchard members download a one-plot `tree_inventory_v1` XLSX template, upload
  a completed workbook, run server-side parse/normalize/stage, and review
  summary counts, diagnostics, variety candidates and active conflicts.
- Phase 8 composes the Phase 3 template generator, Phase 4 parser, Phase 5
  normalizer and Phase 7 preview service through
  `server/actions/tree-inventory-import.ts`.
- Phase 8 keeps confirm disabled for everyone. Workers can upload/preview but
  see that confirm is owner-only; owners see that blocking variety candidates
  require Phase 8A resolution and final confirm requires Phase 9.
- Phase 8 did not add owner variety resolution actions, confirm transactions or
  final `trees` writes.
- Checkpoint reports are recorded in
  `docs/tree-inventory-import/07-phase-1-completion-report.md` and
  `docs/tree-inventory-import/08-phase-2-completion-report.md` and
  `docs/tree-inventory-import/09-phase-3-completion-report.md` and
  `docs/tree-inventory-import/10-phase-4-completion-report.md` and
  `docs/tree-inventory-import/11-phase-5-completion-report.md` and
  `docs/tree-inventory-import/12-phase-6-completion-report.md` and
  `docs/tree-inventory-import/13-phase-7-completion-report.md` and
  `docs/tree-inventory-import/14-phase-8-completion-report.md`.

Next planned step:

- Phase 8A - Variety Resolution workflow.
- Phase 8A may add owner/super_admin resolution actions for staged
  `new_candidate` and `uncertain` variety groups.
- Do not start Phase 9 final DB confirm before required variety resolution is
  implemented and verified.

## 2. Verified repository assumptions

### Current implementation facts

- `active_orchard` is resolved server-side and synchronized with cookie
  `ol_active_orchard`.
- Orchard-scoped access is based on `orchard_memberships`.
- Current operational roles are effectively `owner`, `worker`,
  `super_admin`, and outsider/no membership.
- `plots` are the user-facing dzialka for MVP import.
- `trees` are materialized records. There is no permanent station/table for
  empty positions.
- `section_name` is not part of active logical location uniqueness.
- Active logical location uniqueness is `(plot_id, row_number,
  position_in_row)` for active trees.
- `varieties` are orchard-local and unique by `(orchard_id, species, name)`.
- Existing bulk create is single plot, single row, one continuous range, one
  species and optional one variety.
- Existing bulk create/deactivate provide useful preview/confirm patterns, but
  they are not sufficient for multi-segment inventory import.
- Account export JSON exists; importer/restore do not exist.
- `exceljs@4.4.0` is currently installed after Phase 2 as the server-side XLSX
  dependency.
- Existing scripts include `pnpm typecheck`, `pnpm lint`, `pnpm test`,
  `pnpm test:e2e`, `pnpm seed:baseline-reset`, `pnpm qa:baseline-status`, and
  `pnpm seed:large-plot-fixture`.

### Prototype files inspected

New prototype files exist under:

- `documents/08_prototype_import_export_templates/Sadownik_Tree_Inventory_Template_v1.xlsx`
- `documents/08_prototype_import_export_templates/Instrukcja_inwentaryzacji_nasadzen_v1.docx`

The XLSX prototype contains these worksheets:

- `INSTRUKCJA`
- `NASADZENIA`
- `WYJATKI`
- `SLOWNIKI`
- `METADANE`

Observed prototype worksheet shape:

- `NASADZENIA` has human columns for row, from position, to position, computed
  position count, species, variety, variety confidence, condition, planting year
  from/to, rootstock, notes.
- `WYJATKI` has single-position exception columns for row, position, exception
  type, optional species/variety/confidence/condition, planting year from/to,
  notes.
- `SLOWNIKI` contains prototype species, variety confidence, condition and
  exception lists.
- `METADANE` contains `contract_version = tree_inventory_v1`,
  `incremental_create`, and `reject`.
- The prototype is consistent with the accepted product decisions, but it is not
  yet generated from database dictionaries and does not yet contain hidden
  technical IDs.

### Repository differences since docs 01-05

The repository now has additional untracked prototype files under
`documents/08_prototype_import_export_templates/`. They do not contradict the
five import design documents. They refine the XLSX UX baseline and should be
used as the visual/human reference for the generator phase.

## 3. Accepted product decisions

For the initial implementation:

- User-facing "dzialka" means current `plot`.
- One XLSX inventory file represents exactly one `plot`.
- One XLSX file belongs to one active orchard.
- First import into a new orchard is supported when the orchard exists and the
  plot exists, even if the orchard currently has `trees=0` and `varieties=0`.
- Plot creation happens before template generation. Variety creation does not
  have to happen before template generation.
- MVP import mode is `incremental_create`.
- Absence of an existing tree from XLSX does not remove or deactivate it.
- Conflict strategy is `reject`.
- Confirm is all-or-nothing.
- Segment `row = 3`, `from_position = 1`, `to_position = 20` means positions
  `1..20`, adjusted by `WYJATKI`.
- `missing_tree` creates no synthetic `tree` record.
- Tree status mapping:
  - healthy/normal -> `good`
  - needs attention -> `warning`
  - dead/severely damaged -> `critical`
  - physically removed -> `removed` + `is_active=false`
  - missing position -> no tree record
- Importer must not silently auto-create varieties.
- Variety confidence values are conceptually `known`, `unknown`, `uncertain`,
  and `new_candidate`.
- Existing varieties are suggestions and dictionary aids, not the only allowed
  human-facing input. `variety_name` must remain usable when the dictionary is
  empty or stale.
- Excel dropdowns are not authoritative mappings between display names and
  UUIDs. Hidden IDs are hints only.
- `known` means the row is intended to resolve to an existing orchard-local
  `variety_id`. If the ID is missing, stale, cross-orchard, or inconsistent with
  the current database, preview reports a diagnostic. There is no silent fuzzy
  match.
- `unknown` means no variety name is known. Confirm may create a tree with
  `variety_id=null`, while staging/provenance preserves that uncertainty.
- `uncertain` means a raw candidate name may exist but the worker is not sure.
  The raw candidate is preserved, preview may offer candidates, and product
  policy may allow it to remain unresolved/null. It is never silently mapped.
- `new_candidate` means the worker knows a real variety name that is not
  registered for this orchard. It is valid during parse/normalization even when
  no `variety_id` exists, but it must enter owner resolution before confirm.
- New variety creation is an explicit authenticated owner/super_admin action.
  Do not convert an unknown raw string into `insert into varieties`.
- Current database dictionaries are authoritative at preview and confirm. Hidden
  dictionary data from the generated XLSX may be stale.
- Candidate grouping must include at least `species`, normalized raw variety
  name, and variety status. `Apple / X` and `Pear / X` are separate candidates.
- Fuzzy matching may suggest/warn but must not silently select or create.
- Planting year/range is optional and must not be converted to artificial exact
  dates like `2016-01-01`.
- For v1, preserve `planted_year_from`/`planted_year_to` structurally in
  canonical/staging provenance. Do not invent `planted_at` and do not append
  synthetic text to `trees.notes` unless a later explicit product decision says
  so.
- Replacement MVP behavior is conservative: replacement on a free position may
  create a planned tree; replacement on an occupied active position is a
  conflict. Do not automatically deactivate an existing active tree.
- Worker can download template, upload, validate and preview.
- Worker can see unresolved/new variety candidates and may suggest resolutions
  only if the implementation phase explicitly models suggestion permissions.
  Worker must not implicitly gain permission to finalize new dictionary entries.
- Owner can do all worker actions and confirm.
- Owner can resolve `new_candidate` values, explicitly create orchard-local
  varieties through the import-resolution workflow, map candidates to existing
  varieties, mark candidates unknown when allowed, and then confirm.
- `super_admin` follows existing admin behavior.
- Human XLSX stays simple; technical identifiers are generated/hidden/locked.
- Initial format is `tree_inventory_v1`.

## 4. Target architecture

The importer should be composed from separately testable layers:

```text
XLSX template
  -> XLSX parser
  -> raw parsed representation
  -> normalizer
  -> canonical Tree Inventory JSON
  -> schema validation
  -> domain/database validation
  -> variety candidate grouping
  -> preview
  -> persisted staging/audit
  -> owner variety resolution
  -> confirm
  -> final DB transaction
  -> final import report
```

Core rules:

- Parser has no DB access.
- Normalizer has no DB access.
- Pure validation has no DB access.
- Domain preview validation uses current active orchard and DB state.
- Variety handling is staged:
  `raw XLSX text -> normalized variety reference -> unresolved/resolved
  candidate -> resolved orchard-local variety_id -> confirm`.
- Raw XLSX variety text must not be coupled directly to final `trees.variety_id`.
- Staging records every import attempt before confirm.
- Staging/resolution data, not `trees`, stores import-only variety provenance
  such as `raw_variety_name`, `variety_status`, `resolved_variety_id`,
  `resolution_action`, `resolved_by_profile_id` and `resolved_at`.
- Confirm revalidates current DB state and uses a DB transaction/RPC.
- Confirm never trusts orchard/plot/variety IDs from XLSX without server-side
  membership and ownership checks.
- Confirm must reject unresolved blocking `new_candidate` values. Allowed
  `unknown`/`uncertain` states may materialize trees with `variety_id=null`
  only if product policy and Phase 8A resolution status allow it.
- Existing single tree create, bulk tree create, bulk deactivate, PVO,
  activities, harvests, reports, export and RLS semantics must not change.

## 5. Canonical data flow

### Versioning recommendation

Use two fields from the beginning:

- `xlsx_contract_version`
- `canonical_contract_version`

For MVP both are `tree_inventory_v1`.

Why:

- A future worksheet layout can normalize into the same canonical version.
- A future canonical domain model can evolve even if the sheet remains similar.
- The overhead is small and helps keep the XLSX UX from leaking into DB logic.

Tradeoff:

- Two versions add a little ceremony.
- A single `contract_version` would be simpler now but harder to evolve later.

### Canonical boundary

Canonical JSON is frozen in Phase 1 at the type level and finalized by Phase 5
after parser/normalizer behavior is implemented and tested. After Phase 5,
later phases must treat canonical JSON as the stable boundary for preview,
staging and confirm.

### Canonical payload summary

The canonical payload should include:

- `xlsx_contract_version`
- `canonical_contract_version`
- generated context: `orchard_id`, `plot_id`, `plot_code`,
  `plot_layout_type`
- requested behavior: `incremental_create`, `reject`,
  `allow_new_varieties=false`
- source provenance for every row/cell
- normalized `segments`
- normalized `exceptions`
- expanded logical positions
- normalized variety references before DB resolution
- import-only fields such as planting year/range and raw uncertain values
- diagnostics produced so far

Do not add importer-specific columns to `trees` for canonical source data.
Use staging/audit tables and a mapping table for provenance.

### Variety references in canonical/staging

Canonical v1 must be able to represent a variety before and after resolution
without requiring DB access from the parser or normalizer.

Before resolution, an expanded planned tree may carry:

```json
{
  "species": "Apple",
  "variety": {
    "status": "new_candidate",
    "raw_name": "Szampion",
    "resolved_variety_id": null
  }
}
```

After owner resolution, staging or a resolution overlay may carry:

```json
{
  "species": "Apple",
  "variety": {
    "status": "known",
    "raw_name": "Szampion",
    "resolved_variety_id": "uuid"
  }
}
```

The exact storage split is decided in Phase 6/7, but the roadmap requires the
distinction to exist across canonical payload, staging rows and the resolution
layer. Do not flatten unresolved human text into final `tree.variety_id`.

### Hash inputs

Define hashes before Phase 7 implementation:

- `file_hash` is SHA-256 of the original uploaded XLSX bytes.
- `normalized_hash` is SHA-256 of deterministic semantic canonical import data.

`normalized_hash` must not depend on formatting, XLSX ZIP byte layout, file
name, timestamps, `import_id`, diagnostics, warnings, or source row numbers when
row order/location has no semantic meaning. The exact canonical hash input must
be documented before Phase 7 implementation starts.

## 6. Phase dependency graph

```text
Phase 1 - contracts and diagnostics
  |
  v
Phase 2 - XLSX dependency spike
  |
  v
Phase 3 - template generator
  |
  v
Phase 4 - parser
  |
  v
Phase 5 - normalizer and pure validation
  |
  v
Phase 6 - staging schema and RLS
  |
  v
Phase 7 - DB/domain preview services
  |
  v
Phase 8 - upload and preview UI
  |
  v
Phase 8A - variety resolution workflow
  |
  v
Phase 9 - owner confirm transaction
  |
  v
Phase 10 - compatibility, performance and release hardening
```

Potentially parallel after Phase 1:

- UX copy refinements for the template can happen while Phase 2 evaluates XLSX
  libraries, but they must not modify the accepted product contract silently.
- Documentation/manual QA drafts can start after Phase 5, but production docs
  should wait for Phase 10.

Non-parallel dependencies:

- Parser depends on the library decision.
- Normalizer depends on parser/raw representations.
- DB preview depends on canonical JSON and staging schema.
- Upload/preview UI depends on parser, normalizer, validation and staging.
- Variety resolution depends on grouped candidates from preview and staging.
- Confirm depends on staging, preview status, completed required variety
  resolution and final DB validation.

## 7. Phase-by-phase implementation plan

### Phase 1 - Import contracts, diagnostics and limits

#### Goal

Establish versioned TypeScript contracts, enums, diagnostics, source provenance,
limits and canonical JSON types for `tree_inventory_v1`, with no XLSX dependency
and no database writes.

#### Why now

Every later phase depends on stable names for statuses, worksheet fields,
diagnostics, limits and canonical payloads.

#### Preconditions

- Current docs 01-06 are read.
- Prototype XLSX/DOCX files are inspected.
- `git status --short` is reviewed.

#### Scope

- Add server/shared domain modules for tree inventory import contracts.
- Define accepted enums:
  - import mode: `incremental_create`
  - conflict strategy: `reject`
  - variety confidence: `known`, `unknown`, `uncertain`, `new_candidate`
  - condition mapping to tree statuses
  - exception types: `missing_tree`, `different_variety`,
    `condition_override`, `dead_tree`, `replacement`, `notes_only`
- Define source provenance types: workbook, sheet, row, column, raw value.
- Define structured diagnostic shape: code, severity, source, message,
  normalized value, entity refs.
- Define canonical JSON TypeScript shape without DB IO.
- Canonical examples must show unresolved variety references for `unknown`,
  `uncertain` and `new_candidate`, not only final `variety_id` references.
- Define import limits constants:
  - max workbook bytes
  - max segment rows
  - max exception rows
  - max expanded tree positions for MVP
  - max diagnostics returned
- Add pure fixtures for canonical examples, not XLSX files yet.

#### Explicitly out of scope

- Installing XLSX libraries.
- Reading or writing XLSX.
- Creating migrations.
- Upload routes, UI, RPC, RLS, DB validation.
- Changing tree/bulk/PVO behavior.

#### Expected code areas

- New `lib/domain` or `lib/tree-inventory-import` modules.
- New unit tests under `tests/unit`.
- Possibly `types/contracts.ts` only if the repo convention strongly favors
  central DTO exports.

#### Database impact

NONE.

#### API / contract impact

New internal TypeScript contracts only. No route/server action contract yet.

#### Security considerations

- Types must model `orchard_id` and `plot_id` as untrusted parsed/generated
  context until validated server-side.
- Diagnostics must avoid leaking data from other orchards.

#### Tests to add

Unit:

- Enum parsing/mapping.
- Diagnostic shape snapshots.
- Canonical example type validation.
- Canonical unresolved variety examples before/after conceptual resolution.
- Limits constants.

Integration:

- None.

Security/RLS:

- None.

E2E:

- None.

Performance:

- None.

#### Existing regression tests to run

- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
- `pnpm test -- tests/unit/plot-visual-grid.spec.ts`

#### Manual verification

- Review naming against prototype worksheets.
- Review no DB/client imports slipped into contract modules.
- Review no existing contracts were broken.

#### Acceptance criteria

- [ ] `tree_inventory_v1` contract constants exist.
- [ ] Canonical JSON types are documented in code comments or tests.
- [ ] Canonical examples can represent variety references before DB resolution.
- [ ] Diagnostics preserve source sheet/row/column/raw value.
- [ ] Parser/DB/UI are not implemented.
- [ ] Existing tree batch/PVO unit tests still pass.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts
pnpm test -- tests/unit/plot-visual-grid.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- Type contracts require changing existing tree/plot/variety DTO semantics.
- Tests require weakening existing validation/security behavior.
- Contract conflicts with accepted product decisions.

#### Completion report format

```text
## Phase completed
Phase 1 - Import contracts, diagnostics and limits

## Files changed

## Contracts added

## Tests added

## Verification commands and results

## Stop conditions hit
None / details

## Checkpoint
```

#### Checkpoint

The repo has a stable in-code import vocabulary and diagnostic shape. It is safe
to stop because no runtime XLSX, DB or UI behavior has changed.

#### Suggested commit

`feat(tree-inventory): add v1 import contracts`

### Phase 2 - XLSX dependency spike and library decision

#### Goal

Select and install an XLSX read/write dependency through a small server-only
spike, proving template generation, parsing, hidden sheets/columns, dropdowns,
and deterministic tests.

#### Why now

Template generator and parser should not be built on an unevaluated dependency.

#### Preconditions

- Phase 1 is complete.
- Contract and diagnostics names are available.

#### Scope

- Evaluate currently relevant options against project runtime:
  - `exceljs`
  - `xlsx` / SheetJS
  - `read-excel-file` plus separate generator option if needed
- Check server-side Next.js compatibility.
- Check generation and parsing support.
- Check data validation/dropdowns.
- Check hidden worksheets/columns.
- Check memory behavior with generated small and medium files.
- Check deterministic output strategy for tests.
- Check maintenance, licensing, security history and bundle impact.
- Install the chosen dependency only after the checkpoint decision.
- Add a server-only proof-of-concept test utility if useful.

#### Explicitly out of scope

- Production template generator.
- Production parser.
- Upload UI.
- DB staging.
- Confirm.

#### Expected code areas

- `package.json`, lockfile.
- A small test-only utility or spike module.
- `tests/unit` for dependency proof.
- Optional documentation note in the phase report, not permanent app docs unless
  needed.

#### Database impact

NONE.

#### API / contract impact

No app API. Dependency decision becomes an implementation constraint.

#### Security considerations

- Dependency must be server-only and not enter client bundle.
- Evaluate malformed workbook behavior.
- Do not parse unbounded buffers.

#### Tests to add

Unit:

- Generate workbook with 5 worksheets.
- Parse workbook and preserve visible text values.
- Verify hidden/locked technical field support if library exposes it.
- Verify dropdown/list validation support.
- Verify deterministic normalized workbook data rather than byte-for-byte ZIP
  equality if necessary.

Integration/security/E2E:

- None.

Performance:

- Lightweight memory/time smoke for generated 1k-position equivalent workbook.

#### Existing regression tests to run

- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`

#### Manual verification

- Inspect dependency license/security notes.
- Inspect bundle impact and ensure server-only imports.
- Open generated spike workbook manually if helpful.

#### Acceptance criteria

- [ ] One XLSX dependency choice is documented in the phase report.
- [ ] Dependency is installed only if selected.
- [ ] Server-only generation and parsing are proven.
- [ ] Hidden sheets/columns and dropdown strategy are proven or explicitly
      rejected.
- [ ] No importer runtime behavior exists yet.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- No evaluated library can safely support both generation and parsing.
- Chosen dependency must be imported into client components.
- Dependency licensing/security is unacceptable.
- Installing dependency causes broad unrelated lockfile churn.

#### Completion report format

```text
## Phase completed
Phase 2 - XLSX dependency spike and library decision

## Options evaluated

## Dependency selected

## Why selected

## Risks accepted

## Tests added

## Verification commands and results

## Checkpoint
```

#### Checkpoint

The repo has a deliberate XLSX dependency decision and a proven server-only
capability. It is safe to stop before production generator/parser work starts.

#### Suggested commit

`chore(tree-inventory): select xlsx dependency`

### Phase 3 - Server-side XLSX template generator

#### Goal

Generate a `tree_inventory_v1` XLSX template for one active orchard and one
plot, based on the prototype UX and orchard-local dictionaries.

#### Why now

Users need a system-generated template with trusted hidden IDs and current
dictionaries before upload parsing can be meaningful.

#### Preconditions

- Phase 1 contracts exist.
- Phase 2 selected XLSX dependency.
- Active orchard resolver and plot/variety read helpers are understood.

#### Scope

- Server-only generator for one `plot`.
- Worksheets: `INSTRUKCJA`, `NASADZENIA`, `WYJATKI`, `SLOWNIKI`, `METADANE`.
- Use prototype copy/shape as UX baseline.
- Generate metadata:
  - `xlsx_contract_version`
  - `canonical_contract_version`
  - orchard id/name
  - plot id/name/code/layout
  - generated timestamp
  - import mode `incremental_create`
  - conflict strategy `reject`
- Generate `SLOWNIKI` from active orchard:
  - species presets plus orchard-local species
  - varieties with hidden `variety_id`
  - variety confidence values
  - tree condition values
  - exception types
- Support orchards with many, one or zero existing varieties. An empty variety
  dictionary must still produce a usable workbook.
- Keep the human `variety_name` entry usable for `new_candidate`, `unknown` and
  `uncertain`; strict dropdown validation must not prevent new candidate names.
- Hide/lock technical identifiers where supported.
- Add dropdowns/data validation.
- Make output deterministic enough for tests.
- Add a download route or server action only if this phase is scoped to include
  download; otherwise expose generator function only.

#### Explicitly out of scope

- Uploading/parsing filled workbook.
- Staging.
- Preview.
- Confirm.
- New DB tables.
- Editing prototype DOCX/XLSX files.

#### Expected code areas

- Server-only generator module.
- Possibly a route under app settings/import area if download is included.
- Unit tests for workbook structure.
- Integration test for orchard-local dictionary generation if route/helper uses
  Supabase.

#### Database impact

NONE.

#### API / contract impact

Potential download route contract:

- authenticated
- active orchard required
- plot id belongs to active orchard
- worker/owner can download
- `super_admin` behavior follows existing active orchard/admin pattern

#### Security considerations

- Do not trust plot id without active orchard check.
- Worker can download template.
- Hidden IDs are convenience, not authority.
- Empty or stale variety dropdown data is allowed; preview/confirm use current
  DB state as authority later.
- Template must not expose data from other orchards.

#### Tests to add

Unit:

- Workbook contains required worksheets.
- `METADANE` contains version, mode and conflict strategy.
- `NASADZENIA` and `WYJATKI` headers match v1 contract.
- Dropdown sources point to dictionary ranges.
- Zero-variety orchard still gets a usable `NASADZENIA` and `WYJATKI` sheet.
- Existing varieties are offered as suggestions without blocking
  `new_candidate`, `unknown` or `uncertain`.

Integration:

- Generated dictionary contains only active orchard varieties.
- Plot from other orchard is rejected.

Security/RLS:

- Owner/worker can generate for own orchard.
- Outsider cannot generate.

E2E:

- Optional in this phase; can be deferred to Phase 8.

Performance:

- Generator handles dictionary sizes from baseline and PERF fixtures.

#### Existing regression tests to run

- `pnpm test -- tests/integration/core-orchard-structure.spec.ts`
- `pnpm test -- tests/security/core-orchard-structure-rls.spec.ts`

#### Manual verification

- Open generated XLSX manually.
- Confirm worker-facing worksheets are simple.
- Confirm technical fields are hidden/locked where supported.
- Confirm prototype UX is still recognizable.

#### Acceptance criteria

- [ ] Template is generated server-side for one plot.
- [ ] Template uses `tree_inventory_v1`.
- [ ] Dictionaries are orchard-local.
- [ ] Template generation succeeds when orchard-local varieties are empty.
- [ ] `variety_name` remains usable for new candidate names.
- [ ] Worker can download/generate if route included.
- [ ] Outsider cannot access another orchard template.
- [ ] No parser/preview/confirm exists yet.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/integration/core-orchard-structure.spec.ts
pnpm test -- tests/security/core-orchard-structure-rls.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- Template generation requires client-side XLSX code.
- Hidden IDs cannot be represented safely and no alternative is agreed.
- Excel validation strategy makes first-import/new-candidate entry impossible.
- Dictionary generation leaks cross-orchard data.
- Plot layout information cannot be reliably included.

#### Completion report format

```text
## Phase completed
Phase 3 - Server-side XLSX template generator

## Template worksheets generated

## Dictionary behavior

## Security checks

## Tests added

## Verification commands and results

## Manual inspection notes

## Checkpoint
```

#### Checkpoint

Users can receive a generated v1 workbook, but the app still cannot ingest or
write import data. Safe stop.

#### Suggested commit

`feat(tree-inventory): generate v1 xlsx template`

### Phase 4 - XLSX parser with raw source preservation

#### Goal

Parse `tree_inventory_v1` workbooks into raw parsed representations with source
provenance and structured parser diagnostics. No DB access.

#### Why now

Parsing must be independently testable before normalization or business rules.

#### Preconditions

- Phase 1 contracts.
- Phase 2 XLSX dependency.
- Phase 3 generated template or committed test fixture.

#### Scope

- Parse workbook sheets by expected names.
- Recognize `METADANE`, `NASADZENIA`, `WYJATKI`, `SLOWNIKI`.
- Preserve raw values, formulas where relevant, empty cells and source
  locations.
- Validate required worksheets and required headers.
- Reject unsupported `xlsx_contract_version`.
- Preserve raw `species`, `variety_name`, `variety_status` and hidden
  dictionary metadata as source data only.
- Produce parser-level diagnostics only.
- Add fixture workbooks.

#### Explicitly out of scope

- Normalizing species/varieties.
- Resolving varieties.
- Expanding segments.
- DB validation.
- Upload routes/UI.
- Staging.

#### Expected code areas

- Parser module under import feature/domain directory.
- Test fixtures under `tests/fixtures` or similar existing pattern.
- Unit parser tests.

#### Database impact

NONE.

#### API / contract impact

Internal parser input/output only.

#### Security considerations

- Enforce workbook size limits before parsing.
- Treat all cell values as untrusted.
- Avoid formula evaluation.
- Avoid parsing external links/macros if library exposes them.

#### Tests to add

Unit:

- Missing `METADANE`.
- Unsupported contract version.
- Missing required sheet.
- Missing required header.
- Raw cell preservation.
- Source sheet/row/column preservation.
- Empty vs blank vs string.
- Raw variety name/status preservation, including empty name with
  `unknown`/`uncertain` status.
- Formula cell in computed count column does not become trusted input.

Performance:

- Parser smoke for 1k tree equivalent workbook.

#### Existing regression tests to run

- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`

#### Manual verification

- Inspect diagnostics for a deliberately broken workbook.
- Confirm parser module has no Supabase imports.

#### Acceptance criteria

- [ ] Parser does not access DB.
- [ ] Unsupported contract version is rejected.
- [ ] Source row/column/raw values are preserved.
- [ ] Required worksheets and headers are validated.
- [ ] Parser ignores or safely records formulas without trusting them.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts
pnpm test -- tests/unit/tree-inventory-parser.spec.ts
git diff --check
git status --short
```

If exact parser test filename differs, use the actual file created in the phase.

#### Stop conditions

- Parser requires DB context.
- Parser cannot preserve source locations.
- Parser silently accepts unknown version.
- Parser evaluates formulas or external workbook data unsafely.

#### Completion report format

```text
## Phase completed
Phase 4 - XLSX parser with raw source preservation

## Parser capabilities

## Fixtures added

## Diagnostics covered

## Verification commands and results

## Checkpoint
```

#### Checkpoint

The app can safely read workbook structure into raw data, but no domain
interpretation or writes exist. Safe stop.

#### Suggested commit

`feat(tree-inventory): parse v1 xlsx workbooks`

### Phase 5 - Normalization, segment expansion and pure validation

#### Goal

Convert raw parsed workbook data into canonical Tree Inventory JSON, expand
segments into logical positions, apply exceptions, and run pure validation
without DB access.

#### Why now

Canonical JSON must be frozen before DB preview and staging depend on it.

#### Preconditions

- Phase 4 parser is complete.
- Phase 1 contracts exist.

#### Scope

- Trim and normalize text.
- Parse positive integers.
- Parse planting year and year ranges without creating fake dates.
- Map human values to canonical enums.
- Normalize variety references without DB access:
  - `known` requires a usable current or hidden variety reference later; missing
    `variety_name` for `known` is a pure-validation error.
  - `unknown` may have empty `variety_name` and maps conceptually to
    `resolved_variety_id=null`.
  - `uncertain` preserves raw candidate text and remains unresolved until
    preview/resolution policy handles it.
  - `new_candidate` with a non-empty human name is valid even when no
    `variety_id` exists.
- Generate segment keys and exception keys when absent.
- Expand positions from `from_position..to_position`.
- Apply `missing_tree`, `different_variety`, `condition_override`,
  `dead_tree`, `replacement`, `notes_only`.
- Detect overlaps within the file.
- Detect gaps as warning, not blocker, unless clearly invalid.
- Detect exception outside segment.
- Detect contradictory exceptions.
- Produce canonical JSON and diagnostics.
- Freeze canonical JSON v1 at the end of this phase.

#### Explicitly out of scope

- Variety ownership checks.
- Active tree conflicts.
- Staging tables.
- UI.
- Confirm.

#### Expected code areas

- Normalizer/validator modules.
- Unit tests for scenarios in `05-test-scenarios.md`.
- Fixture canonical JSON snapshots.

#### Database impact

NONE.

#### API / contract impact

Canonical JSON v1 becomes stable boundary for later phases.

#### Security considerations

- Do not trust hidden IDs.
- Diagnostics must be deterministic and not include secrets.
- Expanded count limits must stop maliciously huge ranges.

#### Tests to add

Unit:

- One row / one variety.
- Multiple varieties in one row.
- Different species in one row.
- Missing position.
- Dead tree maps to `critical`.
- Replacement.
- Unknown variety status.
- New candidate absent from dictionary is valid at pure-validation level.
- `variety_name=""` with `variety_status=known` is an error.
- `variety_name=""` with `variety_status=unknown` may be valid.
- `variety_name="Szampion"` with `variety_status=new_candidate` is valid
  without `variety_id`.
- Typo/case/diacritics variations as diagnostics, not silent match.
- Duplicate candidate spelling such as `Szampion` and `szampion` is not merged
  unless Phase 5 explicitly defines a normalization policy.
- Overlapping ranges.
- Gaps.
- Exception outside segment.
- Contradictory exceptions.
- Expanded tree count limit.

Performance:

- Normalize 1k and 5k expanded positions within agreed local threshold.

#### Existing regression tests to run

- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
- `pnpm test -- tests/unit/plot-selection.spec.ts`

#### Manual verification

- Compare canonical JSON output to `04-recommended-import-contract.md`.
- Review diagnostic wording.

#### Acceptance criteria

- [ ] Raw parsed data normalizes into canonical JSON.
- [ ] Segment expansion is deterministic.
- [ ] `missing_tree` produces no planned tree.
- [ ] `unknown`, `uncertain` and `new_candidate` are first-class canonical
      states before DB resolution.
- [ ] `new_candidate` does not require a DB variety id.
- [ ] Overlaps block.
- [ ] Gaps warn.
- [ ] Parser/normalizer still have no DB access.
- [ ] Canonical JSON v1 is declared frozen for downstream phases.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts
pnpm test -- tests/unit/plot-selection.spec.ts
pnpm test -- tests/unit/tree-inventory-normalizer.spec.ts
git diff --check
git status --short
```

If exact normalizer test filename differs, use the actual file created.

#### Stop conditions

- Normalizer needs DB lookup to make basic canonical JSON.
- Normalizer cannot represent unresolved variety states without changing the
  roadmap contract.
- Expanded positions cannot be bounded.
- Accepted product decisions require changing.
- Diagnostics are nondeterministic.

#### Completion report format

```text
## Phase completed
Phase 5 - Normalization, segment expansion and pure validation

## Canonical JSON status

## Validation rules added

## Tests added

## Performance smoke

## Verification commands and results

## Checkpoint
```

#### Checkpoint

Filled XLSX files can be converted into canonical domain input with pure errors
and warnings. No DB writes or staging exist yet. Safe stop.

#### Suggested commit

`feat(tree-inventory): normalize inventory workbook data`

### Phase 6 - Staging and audit schema with RLS

#### Goal

Introduce persistent staging/audit tables, RLS policies and supporting indexes
for import attempts, without upload UI or confirm writes to `trees`.

#### Why now

Preview/confirm require durable state, idempotency fields, owner approval and
audit/provenance. Schema/RLS should be reviewed before app code depends on it.

#### Preconditions

- Phase 5 canonical JSON is frozen.
- Migration strategy below is reviewed.

#### Scope

- Add migrations for staging/audit tables.
- Add RLS policies.
- Add helper RPCs/functions only if needed for secure staging status updates.
- Add generated TypeScript/database types if repo uses them manually.
- Add staging shape for grouped unresolved/resolved variety candidates and
  enough provenance to avoid adding import-only fields to `trees`.
- Add integration and RLS tests for table access.

#### Explicitly out of scope

- Upload UI.
- Parsing real files into staging.
- Confirm inserting trees.
- Modifying `trees` unless explicitly justified.

#### Expected code areas

- `supabase/migrations`.
- Tests under `tests/integration` and `tests/security`.
- Possibly DB helper modules for reading staged imports.

#### Database impact

MIGRATION and RLS CHANGE.

Expected tables:

- `inventory_imports`
- `inventory_import_source_rows`
- `inventory_import_variety_candidates`
- `inventory_import_positions`
- `inventory_import_created_trees`

No direct columns on `trees` are recommended in MVP. Use
`inventory_import_created_trees` as the provenance mapping.

#### API / contract impact

Internal DB persistence contract for staging statuses and diagnostics.

#### Security considerations

- Staging is orchard-scoped and plot-scoped.
- A normal FK does not guarantee that `inventory_imports.orchard_id` matches the
  orchard owning `plot_id`, `variety_id` or `tree_id`. Phase 6 must design
  explicit cross-orchard integrity checks through constraints, triggers, RPCs or
  server-owned write paths.
- Read allowed to active members and `super_admin`.
- Create/upload allowed to owner/worker/super_admin.
- Confirm status transition must be owner/super_admin only, preferably through
  RPC rather than broad direct update.
- Outsider must not infer existence of imports.
- RLS must use existing helper semantics and not weaken operational table RLS.
- The `active_orchard` cookie is an application convenience, not an RLS
  boundary. RLS and RPCs must check membership and orchard ownership directly.

#### Tests to add

Integration:

- Insert staging import for active orchard.
- Store normalized JSON/diagnostics.
- Store source rows and positions.
- Store grouped variety candidates with raw name, status, resolved id/action and
  resolver provenance.
- Enforce unique `import_id`.
- Enforce status constraints.
- Reject or prevent cross-orchard `plot_id`, `variety_id` and `tree_id`
  references in staging writes.

Security/RLS:

- Owner reads own orchard imports.
- Worker reads/uploads but cannot confirm status if direct policy models this.
- Outsider cannot read/write.
- Revoked membership loses access.
- Cross-orchard `plot_id` rejected by FK/domain trigger/RPC.
- Cross-orchard `variety_id` and created-tree mapping rejected by integrity
  checks/RPC.

E2E:

- None.

Performance:

- Insert 1k/5k staged positions in test/helper if practical.

#### Existing regression tests to run

- `supabase db lint`
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
- `pnpm test -- tests/security/core-orchard-structure-rls.spec.ts`

#### Manual verification

- Review migration SQL carefully.
- Review RLS policy matrix.
- Inspect indexes for import lookup/conflict queries.
- Confirm rollback path is clear.

#### Acceptance criteria

- [ ] Staging tables exist.
- [ ] RLS protects all staging tables.
- [ ] Worker can stage but not confirm if direct confirm status is represented.
- [ ] Owner can manage/confirm staging according to policy.
- [ ] Staging can represent unresolved variety candidates without `trees`
      columns.
- [ ] Cross-orchard integrity is enforced beyond plain foreign keys.
- [ ] Outsider cannot access.
- [ ] No `trees` writes occur.
- [ ] Existing RLS tests still pass.

#### Verification commands

```bash
supabase db lint
pnpm typecheck
pnpm lint
pnpm test -- tests/security/tree-batch-rls.spec.ts
pnpm test -- tests/security/core-orchard-structure-rls.spec.ts
pnpm test -- tests/integration/tree-inventory-staging.spec.ts
pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
git diff --check
git status --short
```

Use actual new test filenames if different.

#### Stop conditions

- Migration fails.
- RLS requires weakening existing policies.
- Cross-orchard access cannot be blocked cleanly.
- Schema needs importer-specific columns on `trees` without strong reason.
- Existing RLS regressions fail.

#### Completion report format

```text
## Phase completed
Phase 6 - Staging and audit schema with RLS

## Migrations added

## Tables/policies added

## RLS test results

## Existing regressions

## Rollback notes

## Checkpoint
```

#### Checkpoint

The database can safely store import attempts and provenance, but no user upload
or final tree mutation exists. Safe stop for schema/RLS review.

#### Suggested commit

`feat(tree-inventory): add import staging schema`

### Phase 7 - Domain/database preview validation services

#### Goal

Validate canonical imports against current DB state, persist preview results in
staging, group unresolved variety candidates, and produce a preview summary. No
UI and no final tree writes.

#### Why now

Preview must prove active orchard, plot, variety candidate and conflict behavior
before UI, resolution and confirm are built.

#### Preconditions

- Phase 5 canonical JSON.
- Phase 6 staging schema/RLS.

#### Scope

- Server action/service to accept canonical payload and create/update staging.
- Validate active orchard server-side.
- Validate plot belongs to active orchard and has supported layout.
- Validate worker/owner upload/preview permission.
- Validate varieties belong to orchard.
- Validate species/variety consistency.
- Resolve `known` references only when they match a current orchard-local
  variety. Stale hidden IDs or names from another orchard produce diagnostics.
- Build grouped variety candidates for unresolved states using a key that
  includes species and normalized raw name/status.
- Detect whether a `new_candidate` now matches a current DB variety created
  after the XLSX was generated, and offer mapping rather than creating a
  duplicate.
- Keep `unknown` as a countable first-class state with `variety_id=null`.
- Keep `uncertain` as unresolved unless resolution policy maps or permits null.
- Produce summary counts:
  - known varieties
  - new variety candidates
  - uncertain varieties
  - unknown-variety trees
- Detect active-tree conflicts using current DB.
- Include inactive historical tree context as warning/info.
- Persist diagnostics, preview summary, `file_hash`, `normalized_hash`,
  status, confirm version/token seed.
- No owner confirm yet.

#### Explicitly out of scope

- XLSX upload UI.
- Final confirm.
- PVO visual preview.
- Auto-create varieties.
- Owner resolution actions.
- Updating existing trees.

#### Expected code areas

- Server/domain import service modules.
- DB read helpers.
- Integration tests.
- Security tests.

#### Database impact

Uses Phase 6 tables. No new migration expected unless Phase 6 missed a needed
index/constraint.

#### API / contract impact

Internal preview service contract:

- input: canonical JSON + file metadata
- output: import id, diagnostics, summary, status, confirm version/token

#### Security considerations

- Do not trust IDs from canonical payload without DB checks.
- Active orchard change between generation and preview must block or warn.
- Worker can preview.
- Outsider cannot preview.
- Diagnostics must not reveal names from inaccessible orchards.

#### Tests to add

Integration:

- Valid canonical import creates staged preview.
- First-import empty orchard preview with `trees=0` and `varieties=0` succeeds
  when the plot exists.
- Plot from another orchard rejected.
- Irregular plot rejected.
- Variety from another orchard rejected.
- Existing active tree conflict blocks ready-to-confirm.
- Existing inactive tree produces non-blocking context.
- Unknown variety produces expected diagnostic.
- `new_candidate` absent from dictionary is staged as an unresolved candidate,
  not rejected.
- Duplicate candidate spelling is reported according to Phase 5 policy and not
  merged silently.
- Typo may produce suggestions but is not auto-created.
- Same raw name across different species produces separate candidate groups.
- Stale hidden dictionary data is revalidated against current DB.
- Candidate matching an existing variety after template generation is offered as
  a mapping instead of duplicate creation.
- Active orchard changed blocks preview.

Security/RLS:

- Worker can preview.
- Owner can preview.
- Outsider cannot preview.
- Revoked membership cannot preview.

Performance:

- Preview conflict detection for 1k positions.

#### Existing regression tests to run

- `pnpm test -- tests/integration/tree-batch-operations.spec.ts`
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`

#### Manual verification

- Review query shape and indexes.
- Inspect summary for user usefulness.
- Verify staged diagnostics are bounded.

#### Acceptance criteria

- [ ] Canonical import can be staged and previewed.
- [ ] Worker can preview but cannot confirm.
- [ ] Active-tree conflicts are detected.
- [ ] Inactive historical tree context is non-blocking.
- [ ] Cross-orchard plot/variety IDs are rejected.
- [ ] Unresolved `new_candidate` groups are visible in staged preview and block
      ready-for-confirm until Phase 8A resolves them.
- [ ] Current DB dictionaries, not generated XLSX dictionaries, are authority.
- [ ] No `trees` writes occur.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/integration/tree-inventory-preview.spec.ts
pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
pnpm test -- tests/integration/tree-batch-operations.spec.ts
pnpm test -- tests/security/tree-batch-rls.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- Preview cannot detect conflicts efficiently for 1k positions.
- Preview requires owner-only permission contrary to accepted MVP.
- RLS leaks cross-orchard data.
- Preview would need to auto-create or silently match varieties to proceed.
- Existing bulk tree tests regress.

#### Completion report format

```text
## Phase completed
Phase 7 - Domain/database preview validation services

## Preview validations implemented

## Staging status behavior

## Security behavior

## Tests added

## Verification commands and results

## Checkpoint
```

#### Checkpoint

Canonical imports can be safely validated and staged for review. No user-facing
upload flow and no final writes exist. Safe stop.

#### Suggested commit

`feat(tree-inventory): validate and stage import previews`

### Phase 8 - Upload and preview UI

#### Goal

Expose the worker/owner workflow to download a template, upload a completed
XLSX, parse/normalize/preview it, and show diagnostics and summary.

#### Why now

All underlying parser, normalizer, staging and preview services now exist and
can be composed safely.

#### Preconditions

- Phase 3 template generator.
- Phase 4 parser.
- Phase 5 normalizer.
- Phase 7 preview service.

#### Scope

- Add route/page for tree inventory import under the app shell.
- Download template entry for one plot.
- Upload XLSX form.
- Parse and normalize on server.
- Persist preview staging.
- Show diagnostics grouped by sheet/row/column.
- Show summary by row/species/variety/condition.
- Show variety summary counts: known, new candidates, uncertain and unknown.
- Show grouped unresolved variety candidates with source links and affected
  planned tree counts.
- Show conflict list.
- Show worker cannot confirm message.
- Show owner that resolution is required before confirm when blocking
  `new_candidate` groups exist.
- Show owner confirm affordance disabled until required Phase 8A resolution and
  Phase 9 confirm exist.
- Add UI states: loading, parse errors, validation errors, warnings, ready.

#### Explicitly out of scope

- Final DB confirm if Phase 9 is not yet complete.
- Variety resolution actions if Phase 8A is not yet complete.
- PVO import preview.
- Async background jobs.

#### Expected code areas

- App routes/pages.
- Feature components.
- Server actions for upload/preview.
- Possibly navigation links.
- E2E tests.

#### Database impact

NONE beyond using Phase 6 staging tables.

#### API / contract impact

Server action contracts for upload and preview. Must return `ActionResult` style
consistent with repo patterns.

#### Security considerations

- File size/type validation before parsing.
- Worker upload/preview allowed.
- Owner upload/preview allowed.
- Outsider denied.
- Active orchard is resolved server-side.
- User cannot choose arbitrary orchard id from hidden XLSX metadata.

#### Tests to add

Unit:

- UI state helpers if present.

Integration:

- Upload server action validates file and stages preview.

Security/RLS:

- Worker upload/preview.
- Outsider denied.

E2E:

- Owner downloads template, uploads valid one-row workbook, sees preview.
- Owner uploads first-import empty-orchard workbook and sees grouped new variety
  candidates plus unknown-variety counts.
- Worker uploads and sees preview but no confirm.
- Invalid workbook shows diagnostics.

Performance:

- Upload preview 1k equivalent in local test or scripted smoke if feasible.

#### Existing regression tests to run

- `pnpm test -- tests/unit/route-state-cards.spec.tsx`
- `pnpm test:e2e -- tests/e2e/orchard-access.spec.ts`
- `pnpm test:e2e -- tests/e2e/tree-batch-and-export.spec.ts`

#### Manual verification

- Browser-test owner and worker.
- Inspect mobile layout.
- Upload malformed workbook.
- Switch active orchard before upload and confirm behavior.

#### Acceptance criteria

- [ ] Worker can download template.
- [ ] Worker can upload and preview.
- [ ] Worker cannot confirm.
- [ ] Owner can upload and preview.
- [ ] Outsider cannot access.
- [ ] Parse/pure/domain diagnostics are visible and source-linked.
- [ ] Unresolved variety candidates and unknown/uncertain counts are visible.
- [ ] Confirm is clearly blocked until required variety resolution exists.
- [ ] Existing tree batch/export E2E still passes.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/unit/route-state-cards.spec.tsx
pnpm test -- tests/integration/tree-inventory-upload.spec.ts
pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts
pnpm test:e2e -- tests/e2e/tree-batch-and-export.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- Upload needs client-side workbook parsing.
- UI requires weakening active orchard checks.
- Large diagnostics make page unusable without pagination/limits.
- Existing tree batch/export E2E regresses.

#### Completion report format

```text
## Phase completed
Phase 8 - Upload and preview UI

## Routes/UI added

## Worker/owner behavior

## Diagnostics UX

## Tests added

## Verification commands and results

## Manual QA notes

## Checkpoint
```

#### Checkpoint

Users can safely preview import results, but the feature still cannot mutate
`trees`. Safe stop before owner confirm.

#### Suggested commit

`feat(tree-inventory): add upload preview flow`

### Phase 8A - Variety Resolution workflow

#### Goal

Let an owner/super_admin explicitly resolve grouped variety candidates before
final tree confirmation, without writing `trees` and without silently inserting
new dictionary entries.

#### Why now

First import into an empty orchard needs a human decision step between preview
and confirm. Hiding this inside confirm would make permissions, duplicate
handling and audit harder to review.

#### Preconditions

- Phase 7 grouped variety candidates are staged.
- Phase 8 upload/preview UI can display unresolved candidates.
- Phase 6 staging schema has fields/tables for resolution provenance.

#### Scope

- Backend/service actions to resolve a staged variety candidate.
- Owner/super_admin can:
  - map a candidate to an existing orchard-local variety;
  - choose explicit new orchard-local variety creation for final confirm;
  - mark a candidate as unknown when product policy permits null variety;
  - for `uncertain`, map, leave unresolved if permitted, or mark unknown.
- Worker can see unresolved/new varieties. Worker suggestions are optional and
  require explicit permission modeling; worker must not finalize new dictionary
  entries implicitly.
- Group candidates by semantic candidate, including species and raw normalized
  name/status. Do not group by raw name alone.
- Keep duplicate spelling/case candidates separate unless Phase 5 defined a
  deterministic normalization policy.
- Revalidate mapping targets against current DB at resolution time.
- Prefer MVP behavior where `resolution_action=create_new_variety_at_confirm`
  is stored in staging and the actual `varieties` row is created atomically in
  Phase 9 confirm. This avoids orphan/unused varieties if the import is never
  confirmed.
- If product later chooses pre-confirm variety creation, add explicit cleanup,
  ownership and unused-variety behavior before implementation.
- Update staged preview status when all blocking candidates are resolved.

#### Explicitly out of scope

- Final `trees` writes.
- Silent fuzzy matching.
- Automatic `unknown string -> INSERT variety`.
- Alias/duplicate dictionary policy beyond suggestions.
- Multi-orchard or global variety dictionaries.

#### Expected code areas

- Server/domain import resolution service modules.
- UI components in the import preview flow.
- Integration, security and E2E tests.

#### Database impact

Uses Phase 6 staging/resolution tables. MIGRATION only if Phase 6 missed required
resolution fields.

#### API / contract impact

Resolution server action/service contract:

- input: `import_id`, `candidate_id`, action, optional `variety_id` or new
  variety payload, current confirm/resolution version
- output: updated candidate, updated summary/status, diagnostics if stale

#### Security considerations

- Owner/super_admin can finalize resolution.
- Worker cannot create or finalize orchard-local variety entries unless an
  existing permission model explicitly allows it and this roadmap is updated.
- Mapping to existing variety must check orchard-local ownership, species
  consistency and current membership.
- Resolution diagnostics must not leak varieties from other orchards.

#### Tests to add

Integration:

- Owner maps `new_candidate` to an existing variety.
- Owner marks allowed candidate unknown and positions keep `variety_id=null`.
- Owner selects create-new-at-confirm and no `varieties` row is inserted yet.
- Candidate matching current DB after stale template maps to existing variety.
- Duplicate spelling candidates are not merged silently.
- Same raw name across species resolves independently.
- Resolution status blocks/opens ready-for-confirm correctly.

Security/RLS:

- Owner resolution allowed.
- Worker resolution finalize denied.
- Outsider denied.
- Revoked membership cannot resolve.
- Cross-orchard `variety_id` mapping denied without leaking details.

E2E:

- Owner previews first-import empty orchard, resolves three new candidates and
  leaves one unknown-variety group, then sees import ready for confirm.
- Worker previews first-import empty orchard and cannot finalize candidate
  resolution.

#### Existing regression tests to run

- `pnpm test -- tests/security/tree-inventory-import-rls.spec.ts`
- `pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts`

#### Manual verification

- Resolve candidate to existing variety.
- Mark candidate unknown where allowed.
- Choose create-new-at-confirm and verify no variety appears before confirm.
- Switch active orchard between preview and resolution.

#### Acceptance criteria

- [ ] `new_candidate` groups cannot reach confirm unresolved.
- [ ] Owner can map to existing orchard-local variety.
- [ ] Owner can choose explicit create-new-at-confirm.
- [ ] Allowed `unknown`/`uncertain` states are represented without
      `variety_id`.
- [ ] Worker cannot finalize new dictionary entries.
- [ ] No `trees` writes occur.
- [ ] No `varieties` rows are created before confirm in the preferred MVP path.

#### Verification commands

```bash
pnpm typecheck
pnpm lint
pnpm test -- tests/integration/tree-inventory-variety-resolution.spec.ts
pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts
git diff --check
git status --short
```

Use actual new test filenames if different.

#### Stop conditions

- Resolution requires worker owner-permission relaxation.
- Resolution would need to create varieties silently before owner action.
- Candidate grouping cannot preserve species/status distinctions.
- Pre-confirm variety creation is required without an orphan/cleanup decision.
- Cross-orchard variety mapping cannot be blocked cleanly.

#### Completion report format

```text
## Phase completed
Phase 8A - Variety Resolution workflow

## Resolution behavior

## Permission behavior

## Staging/status behavior

## Tests added

## Verification commands and results

## Manual QA notes

## Checkpoint
```

#### Checkpoint

Blocking variety candidates can be resolved or explicitly allowed before confirm.
No final tree mutation exists. Safe stop before final transaction work.

#### Suggested commit

`feat(tree-inventory): resolve import variety candidates`

### Phase 9 - Owner confirm transaction and final report

#### Goal

Allow owner/super_admin confirmation of a validated staged import, with final
revalidation, idempotency, all-or-nothing DB transaction, materialized `trees`
and final report.

#### Why now

Only after preview, staging and UI are proven should the importer write to core
operational tables.

#### Preconditions

- Phase 8A required variety resolution is complete.
- Phase 8 upload/preview UI.
- Phase 7 domain validation.
- Phase 6 staging and mapping tables.

#### Scope

- DB RPC/function for confirm, or equivalent server-controlled transaction.
- Owner/super_admin authorization.
- Worker blocked from confirm.
- Row lock / status transition to prevent double confirm.
- Confirm token/version check.
- Confirm resolution version/checksum if Phase 8A stores one.
- Revalidate every resolved variety ID against current orchard, species and
  membership.
- Reject unresolved blocking `new_candidate` values.
- Allow permitted `unknown`/`uncertain` values to materialize as
  `variety_id=null`.
- Create explicitly approved new orchard-local varieties inside the same final
  transaction before tree insert, then use the resulting IDs for staged
  positions.
- Recompute/revalidate current conflicts before insert.
- Detect stale preview and require new preview.
- Bulk insert active planned tree records.
- Do not insert records for `missing_tree`.
- Map created trees in `inventory_import_created_trees`.
- Preserve import-only planting year/range in `notes` or import mapping, without
  fake `planted_at`.
- Produce final report.
- Update staged import final status.

#### Explicitly out of scope

- `update_existing`.
- `deactivate_and_create`.
- Auto-create varieties.
- Pre-confirm variety creation unless an approved cleanup/orphan policy exists.
- Full snapshot mode.
- PVO import preview.
- Async jobs unless Phase 10 proves needed.

#### Expected code areas

- Supabase migration for confirm RPC if not included in Phase 6.
- Server action for confirm.
- DB/integration tests.
- Security/RLS tests.
- E2E confirm flow.

#### Database impact

RPC CHANGE. Possibly MIGRATION if confirm status constraints/functions were not
completed in Phase 6.

#### API / contract impact

Confirm server action:

- input: `import_id`, `confirm_token`/version
- output: final report, created count, diagnostics if stale/conflict

#### Security considerations

- Owner-only confirm.
- Confirm does not trust active orchard cookie alone; checks staged orchard and
  membership.
- Confirm checks import still belongs to current active orchard/plot context or
  intentionally handles admin behavior.
- Use DB-level transaction and status lock for idempotency.
- If implemented as `SECURITY DEFINER`, the RPC must set a controlled/fixed
  `search_path`, check authenticated identity explicitly, check owner/super_admin
  permission, validate orchard/plot consistency, validate import status, validate
  confirm token/version, revalidate active-tree conflicts, and protect
  transaction/idempotency behavior.

#### Tests to add

Integration:

- Happy path creates trees.
- Missing positions create no trees.
- Multiple varieties/species materialize correctly.
- Explicit create-new-at-confirm creates orchard-local varieties and related
  trees atomically.
- Unresolved `new_candidate` blocks confirm and writes nothing.
- Allowed unknown/uncertain trees are inserted with `variety_id=null`.
- Variety deleted/changed after preview blocks or marks import stale.
- Current DB variety created after template generation can be mapped and
  confirmed without duplicate creation.
- Conflict added after preview blocks confirm and writes nothing.
- Existing inactive historical tree does not block.
- Duplicate confirm blocked.
- Duplicate request retry does not duplicate writes.
- Final report persisted.

Security/RLS:

- Owner confirm allowed.
- Worker confirm denied.
- Outsider denied.
- Revoked membership between preview and confirm denied.
- Active orchard changed between preview and confirm denied or stale.

E2E:

- Owner preview -> confirm -> `/trees` shows records.
- Empty orchard first import:
  - orchard exists;
  - plot exists;
  - `varieties=0`;
  - `trees=0`;
  - worker/owner enters Apple/Szampion, Apple/Gala, Pear/Konferencja as
    `new_candidate` plus Apple `unknown`;
  - preview groups three new candidates;
  - owner explicitly resolves them;
  - unknown Apple remains `variety_id=null`;
  - confirm creates trees and resolved orchard-local varieties correctly.
- Worker preview -> cannot confirm.
- Conflict preview blocks confirm.

Performance:

- Confirm 1k tree import within threshold.

#### Existing regression tests to run

- `pnpm test -- tests/integration/tree-batch-operations.spec.ts`
- `pnpm test -- tests/security/tree-batch-rls.spec.ts`
- `pnpm test -- tests/integration/variety-locations-report.spec.ts`
- `pnpm test:e2e -- tests/e2e/plot-visual-operations.spec.ts`
- `pnpm test:e2e -- tests/e2e/tree-batch-and-export.spec.ts`

#### Manual verification

- Confirm a small import and inspect `/trees`, plot detail and variety report.
- Attempt confirm as worker.
- Attempt browser back/retry duplicate confirm.
- Switch orchard between preview and confirm.

#### Acceptance criteria

- [ ] Owner can confirm.
- [ ] Worker cannot confirm.
- [ ] Confirm revalidates conflicts.
- [ ] Confirm revalidates all resolved variety IDs against current DB.
- [ ] Unresolved `new_candidate` cannot pass confirm.
- [ ] Explicit new variety creation and tree creation are atomic.
- [ ] Confirm is all-or-nothing.
- [ ] Duplicate confirm cannot create duplicate trees.
- [ ] Missing positions create no records.
- [ ] Final report is persisted/visible.
- [ ] Existing bulk/PVO/report tests still pass.

#### Verification commands

```bash
supabase db lint
pnpm typecheck
pnpm lint
pnpm test -- tests/integration/tree-inventory-confirm.spec.ts
pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
pnpm test -- tests/integration/tree-batch-operations.spec.ts
pnpm test -- tests/security/tree-batch-rls.spec.ts
pnpm test -- tests/integration/variety-locations-report.spec.ts
pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts
pnpm test:e2e -- tests/e2e/plot-visual-operations.spec.ts
pnpm test:e2e -- tests/e2e/tree-batch-and-export.spec.ts
git diff --check
git status --short
```

#### Stop conditions

- Confirm cannot be made idempotent.
- Confirm requires worker owner-permission relaxation.
- Confirm would need to silently create varieties from raw names.
- New variety creation cannot be kept atomic with tree creation or otherwise
  protected from orphan rows.
- Transaction timeouts on 1k import.
- Existing reports/PVO regress.
- Created trees cannot be mapped back to import rows.

#### Completion report format

```text
## Phase completed
Phase 9 - Owner confirm transaction and final report

## Confirm behavior

## Idempotency behavior

## Trees/materialization behavior

## Final report

## Tests added

## Verification commands and results

## Manual QA notes

## Checkpoint
```

#### Checkpoint

The MVP importer can write data safely for owner-confirmed staged imports. It is
safe to stop for broad regression/performance review before production release.

#### Suggested commit

`feat(tree-inventory): confirm staged imports`

### Phase 10 - Compatibility, performance and release hardening

#### Goal

Prove the feature is safe for release through regression coverage, performance
evidence, documentation, manual QA, rollback/recovery procedure and feature flag
or controlled rollout if appropriate.

#### Why now

Only after end-to-end functionality exists can we measure real compatibility
and release risk.

#### Preconditions

- Phase 9 confirm works.
- Baseline and PERF fixtures are available locally.

#### Scope

- 1k and 5k import performance measurements:
  - parse
  - normalize
  - staging
  - preview conflict query
  - confirm transaction
  - read models after confirm
- Regression verification:
  - single tree create/update
  - existing bulk tree create
  - existing bulk deactivate
  - PVO
  - large plot overview
  - focused row detail
  - activity prefill
  - harvest flows
  - variety locations
  - account export
  - RLS
  - active orchard handling
  - baseline seeds
- Documentation:
  - user workflow
  - first import into empty orchard
  - variety resolution workflow
  - support/troubleshooting
  - known MVP limits
  - rollback/recovery
- Optional feature flag or nav gating.
- Manual QA checklist.

#### Explicitly out of scope

- New product modes such as full snapshot.
- `update_existing`.
- `deactivate_and_create`.
- Multi-plot XLSX.
- Permanent station model.

#### Expected code areas

- Docs.
- Test fixtures.
- Performance scripts/tests if needed.
- Minor hardening fixes only if directly tied to release acceptance.

#### Database impact

NONE expected. MIGRATION only if Phase 9 revealed missing index/constraint and
human review approves.

#### API / contract impact

No new contract. Stabilization only.

#### Security considerations

- Confirm RLS still holds under full regression.
- Malformed/large file handling is documented and tested.
- No sensitive import data in logs.
- Staged import retention/expiry is documented.

#### Tests to add

Performance:

- 1k import benchmark.
- 5k import benchmark.
- Parser memory check.
- Conflict query evidence.
- Confirm transaction timing.

Regression:

- Any missing E2E or integration coverage from compatibility list.

Security/RLS:

- Full tree inventory RLS suite.

#### Existing regression tests to run

Recommended full quality gate:

```bash
supabase db lint
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
```

Baseline gate:

```bash
pnpm seed:baseline-reset
pnpm qa:baseline-status
```

Large plot fixture where needed:

```bash
pnpm seed:large-plot-fixture
```

#### Manual verification

- Owner full import.
- Owner first import into empty orchard with zero initial varieties.
- Owner resolves `new_candidate`, `unknown` and `uncertain` groups.
- Worker preview-only path.
- Outsider denied path.
- Revoked membership after preview.
- Active orchard switch after preview.
- Invalid workbook.
- Large preview and confirm.
- Inspect `/trees`, PVO, focused row, variety locations, harvest/account export.

#### Acceptance criteria

- [ ] 1k performance evidence recorded.
- [ ] 5k performance evidence recorded.
- [ ] Full test gate green or documented accepted exceptions.
- [ ] Manual QA checklist complete.
- [ ] Rollback/recovery procedure documented.
- [ ] Feature limits documented.
- [ ] Existing workflows protected.

#### Verification commands

```bash
supabase db lint
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm seed:baseline-reset
pnpm qa:baseline-status
git diff --check
git status --short
```

Run `pnpm seed:large-plot-fixture` before performance checks when needed.

#### Stop conditions

- 1k import fails or times out.
- 5k import fails and no accepted MVP limit is set.
- Full regression shows PVO, reports, RLS or active orchard regression.
- Rollback/recovery story is unclear.

#### Completion report format

```text
## Phase completed
Phase 10 - Compatibility, performance and release hardening

## Performance evidence

## Regression results

## Manual QA results

## Docs updated

## Release risks remaining

## Checkpoint
```

#### Checkpoint

The MVP feature is release-ready or has explicit remaining blockers. Safe stop
before production rollout.

#### Suggested commit

`chore(tree-inventory): harden import release`

## 8. Migration sequence

Do not create these migrations until Phase 6.

### Recommended schema shape

Use a hybrid staging model:

- JSONB for canonical payload, raw summaries and diagnostics.
- Relational rows for source rows, variety candidates, expanded positions and
  created tree mapping.

Why hybrid:

- JSONB keeps canonical contract flexible.
- Relational variety candidates and expanded positions make resolution,
  conflict checks, source provenance and final mapping testable and queryable.
- Avoids adding importer-specific fields to `trees`.

### `inventory_imports`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `orchard_id uuid not null references orchards(id) on delete cascade`
- `plot_id uuid not null references plots(id) on delete restrict`
- `created_by_profile_id uuid not null references profiles(id) on delete restrict`
- `confirmed_by_profile_id uuid references profiles(id) on delete restrict`
- `xlsx_contract_version text not null`
- `canonical_contract_version text not null`
- `import_mode text not null check (import_mode in ('incremental_create'))`
- `conflict_strategy text not null check (conflict_strategy in ('reject'))`
- `status text not null`
- `file_name text`
- `file_size_bytes integer`
- `file_hash text not null`
- `normalized_hash text`
- `confirm_version integer not null default 1`
- `confirm_token_hash text`
- `summary_json jsonb not null default '{}'::jsonb`
- `diagnostics_json jsonb not null default '[]'::jsonb`
- `canonical_payload_json jsonb`
- `created_trees_count integer not null default 0`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- `validated_at timestamptz`
- `confirmed_at timestamptz`
- `expires_at timestamptz`

Status values:

- `draft`
- `parsed`
- `validated`
- `awaiting_variety_resolution`
- `ready_for_owner_confirm`
- `confirmed`
- `failed`
- `expired`
- `cancelled`

Indexes/constraints:

- index `(orchard_id, created_at desc)`
- index `(plot_id, created_at desc)`
- index `(created_by_profile_id, created_at desc)`
- index `(orchard_id, file_hash)`
- unique/guard for confirmed `file_hash` should be considered carefully. It can
  block legitimate reimports of corrected files with identical bytes only if
  behavior is desired. Prefer duplicate warning over hard unique in MVP.
- check `file_size_bytes > 0` when not null
- check `created_trees_count >= 0`

### `inventory_import_source_rows`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `import_id uuid not null references inventory_imports(id) on delete cascade`
- `row_kind text not null check (row_kind in ('segment','exception','metadata','dictionary'))`
- `sheet_name text not null`
- `source_row_number integer not null check (source_row_number > 0)`
- `source_row_key text`
- `raw_values jsonb not null default '{}'::jsonb`
- `normalized_values jsonb not null default '{}'::jsonb`
- `diagnostics_json jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`

Indexes/constraints:

- unique `(import_id, sheet_name, source_row_number)`
- index `(import_id, row_kind)`

### `inventory_import_variety_candidates`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `import_id uuid not null references inventory_imports(id) on delete cascade`
- `species text not null`
- `raw_variety_name text`
- `normalized_variety_name text`
- `variety_status text not null`
- `candidate_key text not null`
- `matching_variety_id uuid references varieties(id) on delete set null`
- `resolved_variety_id uuid references varieties(id) on delete set null`
- `resolution_action text`
- `resolution_payload_json jsonb not null default '{}'::jsonb`
- `resolved_by_profile_id uuid references profiles(id) on delete restrict`
- `resolved_at timestamptz`
- `diagnostics_json jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`

Resolution actions:

- `map_existing`
- `create_new_variety_at_confirm`
- `mark_unknown`
- `leave_unresolved_uncertain`

Indexes/constraints:

- unique `(import_id, candidate_key)`
- index `(import_id, variety_status)`
- index `(resolved_variety_id)`
- check `candidate_key` includes species and must not be raw name alone.

### `inventory_import_positions`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `import_id uuid not null references inventory_imports(id) on delete cascade`
- `source_row_id uuid references inventory_import_source_rows(id) on delete set null`
- `plot_id uuid not null references plots(id) on delete restrict`
- `section_name text`
- `row_number integer not null check (row_number > 0)`
- `position_in_row integer not null check (position_in_row > 0)`
- `planned_action text not null`
- `species text`
- `raw_variety_name text`
- `normalized_variety_name text`
- `variety_candidate_id uuid references inventory_import_variety_candidates(id) on delete set null`
- `variety_id uuid references varieties(id) on delete set null`
- `variety_status text`
- `resolution_action text`
- `resolved_by_profile_id uuid references profiles(id) on delete restrict`
- `resolved_at timestamptz`
- `condition_status text`
- `planted_year_from integer`
- `planted_year_to integer`
- `rootstock text`
- `notes text`
- `existing_tree_id uuid references trees(id) on delete set null`
- `diagnostics_json jsonb not null default '[]'::jsonb`
- `created_at timestamptz not null default now()`

Planned actions:

- `create_tree`
- `missing_tree`
- `blocked_conflict`
- `notes_only`

Indexes/constraints:

- unique `(import_id, plot_id, row_number, position_in_row)` for one v1 import
  position view. This intentionally ignores `section_name` to mirror current
  active location uniqueness.
- index `(import_id, planned_action)`
- index `(variety_candidate_id)`
- index `(plot_id, row_number, position_in_row)`
- index `(variety_id)`
- check planting years sensible if present.

Cross-orchard integrity:

- `inventory_imports.orchard_id` must match the orchard owning `plot_id`.
- Resolved `variety_id`/`resolved_variety_id` must belong to the same orchard
  and species expected by the staged candidate/position.
- `inventory_import_created_trees.tree_id` must refer to a tree belonging to the
  same orchard/plot import context.
- Implement with constraints, triggers, RPC-owned writes or server-owned write
  paths where plain foreign keys cannot express the relationship.

### `inventory_import_created_trees`

Required fields:

- `id uuid primary key default gen_random_uuid()`
- `import_id uuid not null references inventory_imports(id) on delete cascade`
- `position_id uuid references inventory_import_positions(id) on delete set null`
- `tree_id uuid not null references trees(id) on delete restrict`
- `source_sheet_name text`
- `source_row_number integer`
- `created_at timestamptz not null default now()`

Indexes/constraints:

- unique `(tree_id)`
- unique `(import_id, position_id)` where `position_id is not null`
- index `(import_id)`

### RLS policies

Use existing helper semantics:

- read staging data for active orchard members and `super_admin`;
- insert staging data for owner/worker/super_admin;
- update draft/preview status for owner/worker/super_admin if using direct
  updates;
- update/finalize variety resolution for owner/super_admin only unless a future
  worker suggestion model is explicitly added;
- confirm/final status should be owner/super_admin only, preferably through
  security definer RPC;
- delete/cancel policy should be owner/super_admin or creator before confirm,
  depending on product choice.

### Functions/RPC

Likely required:

- `resolve_tree_inventory_variety_candidate(...)` or equivalent server-owned
  action:
  - checks owner/super_admin for final resolution;
  - validates import status;
  - validates current orchard-local variety mapping;
  - stores resolution action/provenance.
- `confirm_tree_inventory_import(import_id uuid, confirm_token text)`:
  - security definer;
  - fixed `search_path`;
  - explicit auth identity check;
  - checks owner/super_admin;
  - validates orchard/plot consistency;
  - locks `inventory_imports` row;
  - checks status and token/version;
  - checks required variety resolution is complete;
  - creates explicitly requested orchard-local varieties if using
    `create_new_variety_at_confirm`;
  - revalidates current conflicts;
  - inserts trees;
  - writes mapping rows;
  - updates final report/status.

Optional:

- helper to expire stale imports.
- helper to mark preview ready after server validation if direct table update is
  too broad.

### Migration dependencies

- Phase 6 depends on current orchard/plot/tree/variety schema.
- `inventory_import_variety_candidates` depends on `varieties` and `profiles`
  only for optional current/resolved references.
- `inventory_import_positions.variety_id` depends on `varieties`.
- confirm RPC depends on staging tables and existing `can_*` helper functions.

### Rollback considerations

- Before confirm exists, rollback can drop staging tables without affecting core
  data.
- After confirm exists, dropping staging tables loses import provenance but not
  created `trees`.
- Do not cascade delete created trees through import mapping.
- Avoid adding `trees.inventory_import_id` in MVP so rollback does not require
  core table cleanup.

## 9. Security/RLS plan

Security invariants:

- Active orchard is resolved server-side.
- The `ol_active_orchard` cookie is not an RLS boundary. RLS/RPC checks must use
  authenticated identity, membership and orchard ownership.
- XLSX IDs are hints, never authority.
- Worker can download/upload/validate/preview.
- Worker can see unresolved/new variety candidates and may suggest only if a
  later explicit permission model allows suggestions.
- Worker cannot finalize new orchard-local variety entries through import unless
  an existing permission model clearly allows it and this roadmap is updated.
- Owner/super_admin resolves blocking variety candidates before confirm.
- Owner can confirm.
- `super_admin` follows existing admin behavior and should still operate through
  an explicit orchard/plot target.
- Outsider cannot see templates, dictionaries, staging, diagnostics, reports or
  confirm endpoints.
- Membership revoked between preview and confirm blocks confirm.
- Active orchard changed between preview and confirm blocks or requires a fresh
  preview.
- Cross-orchard `plot_id`, `variety_id`, `tree_id` must be rejected without
  leaking details.
- Cross-orchard integrity must be enforced beyond plain foreign keys where the
  import orchard must match plot/variety/tree ownership.
- Confirm must run inside DB transaction/RPC with final conflict and variety
  resolution checks.
- `SECURITY DEFINER` confirm RPCs must use fixed `search_path`, explicit auth
  identity checks, owner/super_admin permission checks, orchard/plot consistency
  checks, import status validation, confirm token/version validation, final
  active-tree conflict revalidation and transaction/idempotency protection.

Specific checks by phase:

- Phase 3: template generation checks active orchard and plot ownership.
- Phase 4/5: parser/normalizer no DB, no trust.
- Phase 6: staging RLS.
- Phase 7: preview validates DB ownership and worker permission.
- Phase 8: UI hides confirm for worker and handles access denied.
- Phase 8A: owner/super_admin resolves blocking variety candidates; worker
  finalize is denied.
- Phase 9: owner-only confirm with row lock/idempotency.
- Phase 10: full RLS regression and manual adversarial checks.

## 10. XLSX dependency decision checkpoint

The dependency decision must happen in Phase 2 before generator/parser work.

Evaluate:

| Criterion | `exceljs` | `xlsx` / SheetJS | `read-excel-file` |
|---|---|---|---|
| Server-side support | Phase 2 verifies | Phase 2 verifies | Phase 2 verifies |
| Next.js compatibility | Phase 2 verifies | Phase 2 verifies | Phase 2 verifies |
| Generation | likely yes | likely yes | likely no/read-focused |
| Parsing | likely yes | likely yes | yes/read-focused |
| Dropdowns/data validation | verify | verify | likely no |
| Hidden sheets/columns | verify | verify | likely limited |
| Memory use | measure | measure | measure |
| Deterministic tests | normalize output | normalize output | normalize output |
| Maintenance/security | review during spike | review during spike | review during spike |
| Licensing | review during spike | review during spike | review during spike |
| Bundle impact | must be server-only | must be server-only | must be server-only |

Checkpoint decision must answer:

- Which dependency is selected?
- Why is it safe for server-only use?
- How are hidden IDs/dropdowns supported?
- How will deterministic tests avoid ZIP byte instability?
- What file-size limits are enforced?
- What risks remain?

## 11. Test traceability matrix

| Test scenario | Phase introduced | Test layer | Must pass from phase |
|---|---:|---|---:|
| zero-variety template generation | 3 | unit/integration generator | 3 |
| one row / one variety | 5 | unit normalizer, later E2E | 5 |
| multiple varieties in one row | 5 | unit normalizer, later integration/E2E | 5 |
| different species | 5 | unit normalizer, DB variety validation later | 5 |
| missing position | 5 | unit normalizer, confirm integration later | 5 |
| dead tree | 5 | unit status mapping | 5 |
| replacement | 5 | unit exception handling, conflict integration later | 5 |
| unknown variety | 5 | unit normalizer, preview validation later | 5 |
| uncertain variety | 5/8A | unit normalizer, resolution UI/integration | 5 |
| new candidate absent from dictionary | 5/7/8A | unit normalizer, preview/resolution integration | 5 |
| typo in variety | 5 | unit diagnostics, preview suggestions later | 5 |
| case variation | 5 | unit diagnostics | 5 |
| diacritics variation | 5 | unit diagnostics | 5 |
| duplicate candidate spelling not auto-merged | 5/7 | unit diagnostics, preview grouping | 5 |
| overlapping ranges | 5 | unit pure validation | 5 |
| gaps | 5 | unit warning diagnostics | 5 |
| exception outside segment | 5 | unit pure validation | 5 |
| first import into empty orchard | 3/5/7/8A/9 | generator, normalizer, preview, resolution, confirm E2E | 9 |
| grouped unresolved candidates | 7 | integration preview | 7 |
| same raw name across species | 7 | integration preview/resolution | 7 |
| candidate matches variety created after template generation | 7/8A/9 | integration preview/resolution/confirm | 7 |
| variety deleted/changed after template generation | 7/9 | integration preview/confirm | 7 |
| existing active tree conflict | 7 | integration DB preview | 7 |
| existing inactive historical tree | 7 | integration DB preview | 7 |
| duplicate upload | 7 | integration staging/idempotency | 7 |
| owner maps variety candidate to existing | 8A | integration/security/E2E | 8A |
| owner chooses create-new-at-confirm | 8A/9 | integration/security/E2E | 8A |
| owner marks candidate unknown | 8A | integration/security/E2E | 8A |
| duplicate confirm | 9 | integration/RPC | 9 |
| unresolved new candidate blocks confirm | 8A/9 | integration/security/E2E | 8A |
| worker permissions | 7/8/8A/9 | security/RLS and E2E | 7 |
| outsider | 6/7/8 | security/RLS and E2E | 6 |
| membership revoked between preview and confirm | 9 | security/RLS/integration | 9 |
| active orchard changed between preview and confirm | 7/9 | integration/E2E | 7 |
| cross-orchard staging integrity | 6/7/9 | integration/security/RLS | 6 |
| SECURITY DEFINER confirm safeguards | 9 | SQL/integration/security review | 9 |
| 1k import | 5/7/9/10 | unit/performance/integration | 5 |
| 5k import | 5/10 | performance | 10 |
| malformed XLSX | 4/8 | unit parser/E2E | 4 |
| old contract version | 4 | unit parser | 4 |
| account export regression | 10 | integration/E2E regression | 10 |
| PVO regression | 9/10 | E2E/regression | 9 |
| variety locations regression | 9/10 | integration/regression | 9 |

## 12. Performance checkpoints

Performance must distinguish:

- file segment rows;
- exceptions;
- expanded materialized tree positions.

Recommended MVP limits are set in Phase 1 and may be adjusted after evidence.

Measure at least:

- 1k expanded positions:
  - parser time/memory;
  - normalizer time;
  - staging insert time;
  - preview conflict query time;
  - confirm transaction time;
  - `/trees` and plot detail after confirm.
- 5k expanded positions:
  - same metrics;
  - if 5k fails, either improve architecture or set explicit MVP max below 5k.

Do not claim support for 10k/100k until measured in a later dedicated phase.

Potential performance controls:

- file size limit before parsing;
- segment row limit;
- exception row limit;
- expanded position limit;
- diagnostic cap;
- batched DB lookups for varieties and conflicts;
- bulk insert in DB transaction;
- indexes on staging positions and core tree conflict lookup;
- no full PVO render for large plots; rely on existing scale overview.

## 13. Git/checkpoint strategy

Policy for future implementation phases:

1. Work only on the requested phase.
2. Do not opportunistically implement later phases.
3. Re-read the roadmap and phase prerequisites before starting.
4. Run the phase's baseline verification before changing code.
5. Implement the smallest coherent solution.
6. Add tests during the phase, not afterward.
7. Run targeted tests first.
8. Run required regression tests afterward.
9. Run `git diff --check`.
10. Review git diff for unrelated changes.
11. If a stop condition occurs, stop and report it.
12. Never weaken a test or security rule merely to make the phase pass.
13. Do not silently change the agreed product contract.
14. Finish with a checkpoint report.
15. Wait for human approval before the next phase.

Recommended Git shape:

- one implementation phase -> one coherent commit, or a very small reviewable
  commit series if the phase naturally splits;
- no commits during planning tasks unless explicitly requested;
- never mix schema/RLS changes with UI and confirm logic unless a phase
  explicitly says so.

Suggested commit names:

- Phase 1: `feat(tree-inventory): add v1 import contracts`
- Phase 2: `chore(tree-inventory): select xlsx dependency`
- Phase 3: `feat(tree-inventory): generate v1 xlsx template`
- Phase 4: `feat(tree-inventory): parse v1 xlsx workbooks`
- Phase 5: `feat(tree-inventory): normalize inventory workbook data`
- Phase 6: `feat(tree-inventory): add import staging schema`
- Phase 7: `feat(tree-inventory): validate and stage import previews`
- Phase 8: `feat(tree-inventory): add upload preview flow`
- Phase 8A: `feat(tree-inventory): resolve import variety candidates`
- Phase 9: `feat(tree-inventory): confirm staged imports`
- Phase 10: `chore(tree-inventory): harden import release`

## 14. Risk register

| Risk | Probability | Impact | Detected in phase | Mitigation | Blocking? |
|---|---|---|---:|---|---|
| XLSX library cannot support hidden sheets/dropdowns safely | Medium | High | 2 | Dedicated spike before generator/parser | Yes |
| XLSX dependency leaks into client bundle | Medium | High | 2/3 | Server-only modules, lint/review imports | Yes |
| Hidden ID corruption in XLSX | High | Medium | 3/7 | Treat IDs as hints; DB ownership validation | No |
| Stale generated dictionary | High | Medium | 7/9 | Revalidate varieties/plot at preview and confirm | No |
| Variety normalization creates wrong match | Medium | High | 5/7 | No silent fuzzy select; require IDs/diagnostics | Yes if silent |
| Empty orchard template blocks variety entry | Medium | High | 3/8 | Zero-variety generator tests and free-text `variety_name` | Yes |
| Silent new variety insertion | Medium | High | 7/8A/9 | Owner resolution action required; no raw string auto-insert | Yes |
| Duplicate variety from stale template | Medium | Medium | 7/8A/9 | Current DB lookup before resolution/confirm | No if mapped |
| Orphan variety created before abandoned import | Medium | Medium | 8A/9 | Prefer create-new-at-confirm in final transaction | Yes unless policy accepted |
| Same raw variety name across species merged incorrectly | Medium | High | 7/8A | Candidate key includes species | Yes if merged |
| RLS mistakes in staging tables | Medium | High | 6 | Separate schema/RLS phase and security tests | Yes |
| Cross-orchard references | Medium | High | 6/7/9 | Explicit integrity checks plus active orchard and DB ownership checks | Yes |
| Large transaction timeout | Medium | High | 9/10 | Limits, bulk insert, performance gates | Yes for agreed limit |
| Preview/confirm race | Medium | High | 9 | Confirm revalidation and row lock | Yes |
| Duplicate confirm | Medium | High | 9 | Status lock, token/version, mapping constraints | Yes |
| Conflicting active tree | High | Medium | 7/9 | Preview/confirm conflict checks, reject strategy | No if detected |
| Malformed XLSX | High | Medium | 4/8 | Parser limits and diagnostics | No |
| Old contract version | Medium | Medium | 4 | Version rejection | No |
| PVO regression after import | Medium | High | 9/10 | E2E/regression after confirm | Yes |
| Report regression | Medium | High | 9/10 | Variety/harvest report regression tests | Yes |
| Unknown planting year semantics | Medium | Medium | 5 | Keep import-only, no fake date | No |
| Future need for permanent tree positions | Medium | High | 10/future | Keep staging/provenance separate from core trees | No for MVP |
| Storage/original XLSX retention becomes required | Medium | Medium | 6/10 | Schema allows file metadata; storage can be later | No for MVP |
| `section_name` desired as unique axis | Medium | High | 5/7/future | Document current uniqueness; future schema decision | Blocking only if product changes |
| SECURITY DEFINER confirm flaw | Medium | High | 9 | Fixed search path, explicit auth/owner checks, token/version and revalidation | Yes |

## 15. Future-change cost analysis

| Future change | Cost | What makes it easier/harder |
|---|---|---|
| Optional XLSX column | LOW | Parser/normalizer source provenance and versioned contracts make optional fields easy |
| New dictionary value | LOW | Central enums and `SLOWNIKI` generator isolate lists |
| New exception type | MEDIUM | Requires enum, normalizer, validation, preview and confirm behavior |
| Multi-position exceptions | MEDIUM | Current MVP single-position exception model needs overlap/range logic extension |
| Full snapshot mode | HIGH | Needs absence semantics, deactivate candidates, stronger preview and undo/recovery |
| `update_existing` | HIGH | Needs field-level diff, conflict semantics and audit |
| `deactivate_and_create` | HIGH | Needs history semantics, owner confirmation and possibly activity/report review |
| Multi-plot XLSX | HIGH | Current single-plot assumptions affect template, staging, preview and UI |
| Permanent tree station model | ARCHITECTURAL | Current DB has no station; PVO/reports/activities would need broader changes |
| Row entity | ARCHITECTURAL | Current row is only `row_number`; per-row metadata requires new model |
| Richer planting age model | MEDIUM | Staging keeps year/range; core reporting needs migration if searchable |
| PVO import preview | MEDIUM | Canonical expanded positions can feed a preview adapter, but UI work is separate |
| Owner-guided variety resolution variants | MEDIUM | Phase 8A isolates mapping/create-new/unknown policy from parser and confirm |
| Automatic variety creation without resolution | HIGH | Current MVP forbids it; needs permissions, duplicate/alias policy, orphan behavior and safety review |
| Async/background imports | HIGH | Current plan is synchronous transaction; jobs need queue/status/retry architecture |
| Store original XLSX in Supabase Storage | MEDIUM | Staging has file metadata; storage policies and retention still needed |

## 16. Definition of Done for the complete feature

The Tree Inventory XLSX Import MVP is production-ready only when all items are
true:

- [ ] Versioned template generation exists for `tree_inventory_v1`.
- [ ] Template generation works for a new orchard with an existing plot, zero
      trees and zero varieties.
- [ ] XLSX parser is server-only and preserves source provenance.
- [ ] Canonical normalization is deterministic and covered by unit tests.
- [ ] Pure validation covers required values, ranges, enums, years, overlaps,
      gaps and exceptions.
- [ ] `known`, `unknown`, `uncertain` and `new_candidate` are first-class
      variety states before resolution.
- [ ] DB/domain preview validates active orchard, plot, layout, varieties,
      conflicts and permissions.
- [ ] Preview groups unresolved/new variety candidates and uses current database
      dictionaries as authority.
- [ ] Persisted staging/audit stores import status, hashes, diagnostics,
      canonical payload, source rows, variety candidates, positions and final
      mapping.
- [ ] Owner/super_admin can explicitly resolve variety candidates before
      confirm.
- [ ] New candidate varieties are never silently inserted from raw XLSX strings.
- [ ] Owner confirmation is implemented.
- [ ] Worker can download/upload/validate/preview but cannot confirm.
- [ ] Confirm is all-or-nothing and idempotent.
- [ ] Confirm revalidates current DB state, resolved variety IDs and stale
      preview/token.
- [ ] Explicit new variety creation, when selected, is atomic with tree
      creation.
- [ ] Final report is available after confirm.
- [ ] RLS covers all staging tables and confirm path.
- [ ] Existing single tree create/update still works.
- [ ] Existing bulk tree create/deactivate still works.
- [ ] PVO, focused row, large plot overview, activity prefill, harvest flows,
      variety locations and account export do not regress.
- [ ] 1k import performance evidence is recorded.
- [ ] 5k import performance evidence is recorded or a lower explicit MVP limit
      is accepted.
- [ ] Documentation and user instructions are updated.
- [ ] Manual QA checklist is complete.
- [ ] Rollback/recovery procedure is documented.
- [ ] `supabase db lint`, `pnpm typecheck`, `pnpm lint`, `pnpm test` and
      relevant `pnpm test:e2e` pass for release.

## 17. Recommended prompt/task for Phase 8A

Use this as the next implementation prompt:

```text
Pracujemy nad OrchardLog / Sadownik+.
Rozmawiamy po polsku, ale nazwy techniczne, pliki, DTO, endpointy, encje i SQL trzymamy po angielsku.

Najpierw przeczytaj:
- documents/00_overview_and_checklists/project_context_for_new_chat.md
- documents/00_overview_and_checklists/codex_working_prompt.md
- docs/tree-inventory-import/01-current-state-audit.md
- docs/tree-inventory-import/02-import-gap-analysis.md
- docs/tree-inventory-import/03-open-product-questions.md
- docs/tree-inventory-import/04-recommended-import-contract.md
- docs/tree-inventory-import/05-test-scenarios.md
- docs/tree-inventory-import/06-implementation-roadmap.md

Sprawdz `git status --short`. Nie cofaj cudzych zmian.

Wykonaj tylko Phase 8A z roadmapy:
"Variety Resolution workflow".

Zakres:
- dodaj backend/service actions do rozstrzygania staged variety candidates;
- owner/super_admin moze mapowac candidate do istniejacej orchard-local variety;
- owner/super_admin moze wybrac explicit create-new-at-confirm bez tworzenia `varieties` przed confirm;
- owner/super_admin moze oznaczyc dozwolona grupe jako unknown, zachowujac `variety_id=null`;
- dla `uncertain` zachowaj jawne decyzje zgodnie z roadmapa;
- worker moze widziec unresolved/new varieties, ale nie moze finalizowac resolution;
- rewaliduj mapping targets wzgledem current DB i active orchard;
- aktualizuj staged preview status, kiedy blocking candidates sa rozstrzygniete;
- dodaj integration/security/E2E tests zgodnie z Phase 8A;
- zaktualizuj dokumentacje/checkpoint;
- nie tworz finalnych `trees`;
- nie implementuj Phase 9 confirm transaction;
- nie dodawaj silent fuzzy matching;
- nie tworz `varieties` przed confirm w preferowanej sciezce MVP;
- nie zmieniaj RLS/migracji, chyba ze Phase 6 faktycznie nie ma wymaganego pola resolution i wtedy zatrzymaj sie/zaraportuj conflict.

Przed zmianami uruchom bazowa weryfikacje z Phase 8A.
Po zmianach uruchom:
- pnpm typecheck
- pnpm lint
- pnpm test -- tests/integration/tree-inventory-variety-resolution.spec.ts
- pnpm test -- tests/security/tree-inventory-import-rls.spec.ts
- pnpm test:e2e -- tests/e2e/tree-inventory-import.spec.ts
- git diff --check
- git status --short

Jesli trafisz na stop condition z roadmapy, zatrzymaj sie i zaraportuj.
Na koniec podaj checkpoint report zgodny z Phase 8A completion report format.
Nie przechodz do Phase 9.
```
