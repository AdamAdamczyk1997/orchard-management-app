# Tree Inventory XLSX Import - Phase 3 completion report

## Phase completed

Phase 3 - Server-side XLSX template generator

## Template worksheets generated

The server-side generator creates a `tree_inventory_v1` workbook with these
worksheets:

- `INSTRUKCJA` - visible worker-facing instructions.
- `METADANE` - hidden protected metadata sheet.
- `NASADZENIA` - visible segment input sheet.
- `WYJATKI` - visible single-position exceptions sheet.
- `SLOWNIKI` - `veryHidden` protected dictionary sheet.

The generator is exposed as pure server-side functions in
`lib/tree-inventory-import/template-generator.server.ts`:

- `generateTreeInventoryTemplateWorkbook(...)`
- `generateTreeInventoryTemplateBuffer(...)`
- `buildTreeInventoryTemplateFileName(...)`

No download route or server action was added in this phase.

## Dictionary behavior

- The generator accepts an already validated active-orchard context, one plot
  and orchard-local varieties.
- The selected plot must belong to the input orchard.
- Varieties with a provided `orchard_id` must belong to the input orchard.
- MVP template generation supports `plot.layout_type = rows` only.
- `SLOWNIKI` includes:
  - species presets plus orchard-local species from varieties;
  - orchard-local varieties with hidden `variety_id`;
  - variety confidence values;
  - tree condition statuses;
  - exception types;
  - locked one-plot dictionary values;
  - boolean values for `location_verified`.
- `NASADZENIA` and `WYJATKI` use dropdowns pointing to dictionary ranges.
- Technical ID columns are hidden where supported by `exceljs`.

## Security checks

- The generator rejects a plot whose `orchard_id` does not match the active
  orchard input.
- The generator rejects varieties that declare a different `orchard_id`.
- The generator rejects unsupported MVP plot layouts before workbook creation.
- Hidden IDs remain a template convenience only; no parser, preview or confirm
  trusts them yet.
- `exceljs` is imported only by the `.server.ts` generator module and unit
  tests. No client component import was added.

## Tests added

- `tests/unit/tree-inventory-template-generator.spec.ts`

Coverage:

- workbook contains required v1 worksheets in expected order;
- `METADANE` contains contract versions, generated context, import mode and
  conflict strategy;
- `NASADZENIA` headers match `TREE_INVENTORY_SEGMENT_FIELDS`;
- `WYJATKI` headers match `TREE_INVENTORY_EXCEPTION_FIELDS`;
- `SLOWNIKI` is `veryHidden` and contains orchard-local species/varieties;
- dictionary technical ID columns are hidden;
- dropdown formulas point to dictionary ranges;
- plot/variety cross-orchard input is rejected;
- unsupported `irregular` layout is rejected;
- deterministic download filename helper is covered.

## Verification commands and results

- `pnpm test tests/unit/tree-inventory-template-generator.spec.ts` - passed:
  1 file, 7 tests.
- `pnpm typecheck` - passed.
- `pnpm lint` - passed.
- `pnpm test -- tests/integration/core-orchard-structure.spec.ts` - passed;
  Vitest ran the configured suite: 47 files, 204 tests.
- `pnpm test -- tests/security/core-orchard-structure-rls.spec.ts` - passed;
  Vitest ran the configured suite: 47 files, 204 tests.

## Manual inspection notes

- The workbook is generated and round-tripped in tests through `exceljs`.
- Manual GUI opening was not performed in this environment.
- Worker-facing sheets remain visible and simple; technical metadata/dictionary
  surfaces are hidden/protected.

## Checkpoint

Users cannot download the template from the app yet because no route/server
action was added in Phase 3. The generator itself can produce a v1 workbook for
one active orchard and one `rows` plot. The app still cannot ingest, parse,
preview, stage, confirm or write import data.

## Next planned step

Phase 4 - XLSX parser with raw source preservation.

Phase 4 should parse `tree_inventory_v1` workbooks into source-preserving raw
representations and parser diagnostics only. Do not implement normalizer,
database/domain preview, staging, upload UI or confirm in Phase 4.
