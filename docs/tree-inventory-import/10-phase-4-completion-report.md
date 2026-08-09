# Phase 4 completion report - XLSX parser with raw source preservation

## Phase completed

Phase 4 - XLSX parser with raw source preservation

## Parser capabilities

- Added server-only parser module:
  `lib/tree-inventory-import/parser.server.ts`.
- Parser accepts XLSX bytes as `Buffer`, `ArrayBuffer` or `Uint8Array`.
- Parser records workbook provenance:
  - `workbook_name`
  - `workbook_byte_size`
  - `workbook_sha256`
- Parser enforces `TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes` before
  reading XLSX content.
- Parser recognizes required v1 worksheets:
  - `METADANE`
  - `NASADZENIA`
  - `WYJATKI`
  - `SLOWNIKI`
- Parser validates required worksheet presence and required headers.
- Parser rejects unsupported `xlsx_contract_version` through structured
  diagnostics.
- Parser returns raw source-preserving rows for:
  - metadata values
  - segment rows
  - exception rows
  - dictionary rows
- Raw cells preserve:
  - sheet name
  - source row number
  - column name
  - column number
  - Excel address
  - JSON-safe raw value
- Empty cells are preserved as `null`.
- Empty strings remain `""`.
- Formula cells are preserved as raw formula objects and are not evaluated or
  trusted as normalized values.
- Parser preserves raw `species`, `variety_name`, `variety_confidence` and
  hidden dictionary/technical metadata as source data only.

## Fixtures added

- Added parser workbook fixture helpers:
  `tests/fixtures/tree-inventory-import/parser-workbooks.ts`.
- Fixtures cover:
  - generated/filled v1 workbook
  - missing required worksheet
  - unsupported contract version
  - missing segment header
  - 1k-row parser smoke workbook

## Diagnostics covered

- `MISSING_REQUIRED_SHEET`
- `MISSING_REQUIRED_COLUMN`
- `UNSUPPORTED_CONTRACT_VERSION`
- `IMPORT_LIMIT_EXCEEDED`
- invalid unreadable XLSX path uses `INVALID_REQUIRED_VALUE`

## Verification commands and results

- Pre-change baseline:
  - `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
  - Result: passed, 47 files / 204 tests.
- `pnpm typecheck`
  - Result: passed.
- `pnpm lint`
  - Result: passed.
- `pnpm test -- tests/unit/phase6-tree-batch-validation.spec.ts`
  - Result: passed, 48 files / 210 tests.
- `pnpm test -- tests/unit/tree-inventory-parser.spec.ts`
  - Result: passed, 48 files / 210 tests.
- `git diff --check`
  - Result: passed.
- `git status --short`
  - Result: reviewed after implementation.

## Checkpoint

The app can safely read `tree_inventory_v1` XLSX workbooks into raw
source-preserving parser output with structured diagnostics. No DB access,
normalization, variety resolution, segment expansion, upload UI, staging,
preview, confirm, migration, RLS or RPC behavior was added. It is safe to stop
before Phase 5.
