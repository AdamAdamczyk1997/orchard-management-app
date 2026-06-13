# Baseline seed enrichment plan

Status: plan only, not implemented.
Scope: richer baseline varieties and trees for demo/QA readability.

## Goal

Make the baseline seed feel more like a real orchard while keeping it deterministic,
small enough for fast QA, and safe for existing E2E tests.

The enrichment should add records, not redesign the seed system.

## Current baseline snapshot

Current expected baseline totals:

- orchards: 3
- plots: 5
- varieties: 6
- trees: 13
- activities: 8
- harvestRecords: 7

Current orchard split:

- `MAIN` / `Sad Glowny`: 3 plots, 4 varieties, 10 trees
- `SOUTH` / `Sad Poludniowy`: 2 plots, 2 varieties, 3 trees
- `EMPTY` / `Sad Pusty`: 0 domain records

Important existing fixtures:

- `EMPTY` must stay fully empty.
- `Kwatera Luki PVO` must stay a read-only gap fixture:
  - row 1 position 1 occupied
  - row 1 position 2 empty
  - row 1 position 3 occupied
- `Gala Report` should stay stable for report/PVO tests.
- Existing harvest records should stay stable in this slice.

## Proposed target

Recommended first enrichment target:

- varieties: from 6 to 12
- trees: from 13 to about 45
- `MAIN`: from 10 to about 36 trees
- `SOUTH`: from 3 to about 9 trees
- `EMPTY`: still 0 trees

This should be enough to make list views, filters, PVO, and variety-location views feel
fuller without turning baseline into a large fixture database.

## Non-goals

- Do not add an `ARCHIVED` orchard in this slice.
- Do not add records to `EMPTY`.
- Do not change Jan/MAIN default behavior.
- Do not change active orchard cookie behavior.
- Do not change RLS or ownership rules.
- Do not mutate existing canonical baseline records unless a hard constraint requires it.
- Do not add harvest/report fixture changes in the same slice.
- Do not add new E2E tests in the seed-enrichment slice unless existing assertions need a
  small compatibility update.

## Seed design rules

- Use deterministic IDs.
- Use deterministic names and codes.
- Avoid duplicate active logical tree locations:
  - same `orchard_id`
  - same `plot_id`
  - same `section_name`
  - same `row_number`
  - same `position_in_row`
- Prefer adding new trees in existing active plots.
- Keep `Kwatera Luki PVO` unchanged.
- Do not add more `Gala Report` trees in this slice, so current report/PVO tests stay stable.
- Keep most new trees active and healthy, with only a few varied statuses if useful for UI.
- Keep dates deterministic and not dependent on current day.

## Proposed new varieties

Add 6 new varieties, all deterministic and preferably in `MAIN`:

1. `Apple - Golden Delicious`
2. `Apple - Jonagold`
3. `Apple - Red Jonaprince`
4. `Apple - Pinova`
5. `Pear - Williams`
6. `Pear - Bosc`

Suggested ID range:

- `30000000-0000-4000-8000-000000000010` to
  `30000000-0000-4000-8000-000000000015`

Rationale:

- Adds common apple varieties for richer orchard structure.
- Adds pear varieties so `Kwatera Poludniowa` can feel mixed without overloading reports.
- Keeps `Gala Report` as a narrow immutable QA fixture.

## Proposed tree expansion

### MAIN / Kwatera Polnocna

Purpose: make the main production block visibly fuller.

Existing pattern:

- `Ligol` row 1 positions 1-3
- `Szampion` row 2 positions 1-2

Recommended additions: about 16 trees.

Proposed layout:

- row 1, positions 4-8: `Ligol`
- row 2, positions 3-8: `Szampion`
- row 3, positions 1-5: `Golden Delicious`

Expected result:

- `Kwatera Polnocna` becomes the densest reference plot.
- Existing harvest fixtures for `Ligol` and `Szampion` stay meaningful.
- No new `Gala Report` dependency is introduced.

### MAIN / Kwatera Poludniowa

Purpose: make the mixed plot visibly different from the northern plot.

Existing pattern:

- `Conference` at row 1 position 1
- one removed/inactive `Ligol` example at row 1 position 2

Recommended additions: about 10 trees.

Proposed layout:

- section `B`, row 1, positions 3-6: `Conference` / `Williams`
- section `C`, row 1, positions 1-3: `Pinova`
- section `C`, row 2, positions 1-3: `Red Jonaprince`

Expected result:

- Mixed-species and mixed-section UI becomes more realistic.
- Existing removed-tree example remains useful.
- Variety filters have more realistic distribution.

### MAIN / Kwatera Luki PVO

Purpose: preserve the PVO gap fixture.

Do not add or remove trees here.

Expected unchanged state:

- `Gala Gap R1/P1`
- empty row 1 position 2
- `Gala Gap R1/P3`

### SOUTH / Sad Poludniowy plots

Purpose: make the secondary orchard more plausible without making it a second full demo.

Recommended additions: about 6 trees.

Use existing SOUTH varieties:

- `Apple - Idared`
- `Plum - President`

Proposed distribution:

- add 3 `Idared` trees to the apple-focused area
- add 3 `President` trees to the plum/lower-terrace area

Expected result:

- Orchard switcher demos still show a smaller secondary orchard.
- Worker/owner membership tests remain readable.
- SOUTH stays meaningfully lighter than MAIN.

## Expected counts after enrichment

Approximate target counts:

- `MAIN` trees: 36
- `SOUTH` trees: 9
- `EMPTY` trees: 0
- total trees: 45
- total varieties: 12

The exact count should be finalized after auditing current tree locations in
`supabase/seeds/001_baseline_reference_seed.sql`.

## Files likely affected in implementation slice

Seed and QA:

- `supabase/seeds/001_baseline_reference_seed.sql`
- `scripts/shared/baseline-seed.mjs`
- `scripts/shared/baseline-qa.mjs`
- `tests/unit/baseline-qa.spec.ts`

Optional E2E fixture references:

- `tests/e2e/support/fixtures.ts`

Minimal documentation:

- `documents/00_overview_and_checklists/manual_testing_quickstart.md`
- `documents/07_security_and_quality/test_plan.md`

Avoid touching unrelated docs.

## Implementation order

1. Audit existing tree locations and IDs.
2. Pick deterministic ID ranges for new varieties and trees.
3. Add new varieties to the baseline SQL seed.
4. Add new tree rows, grouped by orchard, plot, section, row, and position.
5. Update expected counts in shared baseline metadata.
6. Update baseline QA readiness snapshot/unit test.
7. Add fixture exports only for records that future tests should reference directly.
8. Update minimal docs with the new expected totals.
9. Run baseline reset and QA gates.

## Verification commands

Run in this order after implementation:

```bash
pnpm seed:baseline-reset
pnpm qa:baseline-status
pnpm typecheck
pnpm test -- tests/unit/baseline-qa.spec.ts
pnpm test:e2e
git diff --check
```

Recommended extra check:

```bash
supabase db lint
```

## Acceptance criteria

- `pnpm qa:baseline-status` reports `READY`.
- `EMPTY` still has exactly zero plots, varieties, trees, activities, and harvest records.
- `Kwatera Luki PVO` still has exactly the intended gap fixture:
  - row 1 position 1 occupied
  - row 1 position 2 empty
  - row 1 position 3 occupied
- No active duplicate logical tree locations are introduced.
- Existing report E2E around `Gala Report` still passes.
- Existing Jan/MAIN default context still passes.
- Full `pnpm test:e2e` passes on a clean baseline reset.

## Risks and mitigations

- Risk: tree additions accidentally change PVO/report assertions.
  - Mitigation: do not add trees to `Kwatera Luki PVO` or `Gala Report`.
- Risk: count assertions fail.
  - Mitigation: update baseline metadata and `baseline-qa.spec.ts` in the same slice.
- Risk: repeated local E2E runs pollute dashboard data.
  - Mitigation: run `pnpm seed:baseline-reset` before final full E2E.
- Risk: seed becomes too large and harder to maintain.
  - Mitigation: stop near 45 total tree records for the first enrichment.
