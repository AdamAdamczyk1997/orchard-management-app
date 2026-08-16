# Tree Inventory XLSX Import - Phase 2 completion report

## Phase completed

Phase 2 - XLSX dependency spike and library decision

## Options evaluated

### `exceljs`

- Package: `exceljs@4.4.0`.
- License: MIT.
- Strengths:
  - One dependency supports XLSX read and write.
  - Supports workbook load/write from buffers in Node.
  - Supports multiple worksheets.
  - Supports worksheet state such as hidden and very hidden.
  - Supports hidden columns.
  - Supports sheet/cell protection metadata.
  - Supports data validation list dropdowns.
  - Ships TypeScript declarations.
- Risks:
  - Maintenance cadence is slow and external package health tools classify the
    latest stable package as inactive.
  - Pulls older transitive packages through `archiver` and `unzipper`.
  - Initial audit showed known transitive findings through `uuid@8.3.2` and
    `brace-expansion@1.1.14`.
- Mitigation:
  - Installed as a server-side dependency only.
  - Added `pnpm.overrides`:
    - `exceljs>uuid = 11.1.1`
    - `brace-expansion@<1.1.18 = 1.1.18`
  - Confirmed `exceljs` still loads and writes workbooks with the overrides.
  - Import limits from Phase 1 must remain enforced before any parsing.

### `xlsx` / SheetJS Community Edition

- Package: `xlsx@0.18.5` on npm.
- License: Apache-2.0.
- Strengths:
  - Broad spreadsheet format support.
  - Supports reading and writing workbook data.
  - Community docs describe sheet visibility and column visibility support.
- Risks:
  - npm package has not had a stable publish in years.
  - External package health tools classify npm maintenance as inactive.
  - Prior audit history includes parser-related vulnerabilities.
  - The Community Edition is data-oriented; template UX features like rich
    protection/dropdowns would need more manual OOXML handling or paid/pro
    features depending on final requirements.
- Decision:
  - Rejected for MVP template/parser foundation because the npm package
    maintenance profile is worse for this repo than `exceljs`.

### `read-excel-file` plus writer option

- Packages considered:
  - `read-excel-file`
  - `write-excel-file`
  - optional writer feature packages for data validation and hiding.
- License: MIT for the core packages.
- Strengths:
  - Recent releases.
  - Clear environment-specific imports for Node/browser.
  - Good fit for simple value-oriented parsing.
- Risks:
  - Requires at least two core packages to cover read/write.
  - Hidden columns and data validation are not core writer features; they rely
    on extra feature packages or lower-level custom XML hooks.
  - The target template needs hidden technical IDs and dropdowns from the
    beginning, so this would add more integration surface than `exceljs`.
- Decision:
  - Rejected for MVP because Phase 2 needs one proven read/write dependency
    with built-in template features.

## Dependency selected

`exceljs@4.4.0`

## Why selected

`exceljs` is the best fit for the planned server-side `tree_inventory_v1`
template and parser because it covers the required Phase 2 proof in one package:

- create a multi-worksheet workbook;
- write XLSX to a buffer server-side;
- load XLSX from a buffer server-side;
- preserve visible cell values;
- preserve hidden worksheets;
- preserve hidden columns;
- preserve sheet/cell protection metadata;
- preserve list data validation for dropdowns;
- support deterministic normalized test assertions.

## Risks accepted

- `exceljs@4.4.0` has a slow maintenance cadence.
- The package has deprecated transitive dependencies through `archiver` and
  `unzipper`.
- `pnpm audit --prod` still fails because of pre-existing production findings
  in `next`, `postcss` and `ws`. The post-override audit JSON does not report
  `exceljs`, `uuid` or `brace-expansion` findings.
- The dependency must stay server-only. It must not be imported from client
  components.
- Any future parser/upload path must enforce Phase 1 size limits before calling
  XLSX parsing.

## Tests added

- `tests/unit/tree-inventory-xlsx-dependency-spike.spec.ts`

Coverage:

- generate workbook with the five required MVP worksheets;
- write to XLSX buffer and read back with `exceljs`;
- preserve visible values;
- preserve a `veryHidden` dictionary worksheet;
- preserve a hidden technical column;
- preserve sheet protection and unlocked-cell metadata;
- preserve list/dropdown data validation;
- assert deterministic normalized workbook data instead of byte-for-byte ZIP
  equality;
- generate and parse a 1k-position equivalent workbook within a lightweight
  smoke threshold.

## Verification commands and results

- `pnpm install` - passed after network escalation; updated `pnpm-lock.yaml`.
- `pnpm why uuid` - `exceljs` resolves to `uuid 11.1.1`.
- `pnpm why brace-expansion` - old `1.x` paths resolve to
  `brace-expansion 1.1.18`.
- `pnpm audit --prod` - failed due to existing production findings in `next`,
  `postcss` and `ws`.
- `pnpm audit --prod --json | rg 'exceljs|uuid|brace-expansion'` - no matches
  after overrides.
- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts` - passed;
  Vitest ran the configured unit suite: 46 files, 197 tests.
- `pnpm test tests/unit/tree-inventory-xlsx-dependency-spike.spec.ts` - passed:
  1 file, 3 tests.

## Checkpoint

The repo has a deliberate XLSX dependency decision and a proven server-only
capability. `exceljs` is installed with security overrides for the dependency
chain used by the spike. It is safe to stop before production generator/parser
work starts.

## Next planned step

Phase 3 - Server-side XLSX template generator.

Phase 3 should build the production template generator for one active orchard
and one `plot`, using `exceljs`, current active-orchard/plot/variety helpers,
and the `tree_inventory_v1` contracts from Phase 1. Do not implement upload,
parser, staging, preview or confirm in Phase 3.
