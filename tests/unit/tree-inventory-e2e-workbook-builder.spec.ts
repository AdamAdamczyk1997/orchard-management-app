import { describe, expect, it } from "vitest";
import { parseTreeInventoryWorkbook } from "@/lib/tree-inventory-import/parser.server";
import { generateTreeInventoryTemplateBuffer } from "@/lib/tree-inventory-import/template-generator.server";
import { buildTreeInventoryFullCycleFixture } from "@/tests/fixtures/tree-inventory-import/e2e-full-cycle";
import { fillTreeInventoryWorkbookBuffer } from "@/tests/fixtures/tree-inventory-import/e2e-workbook-builder";
import { buildParserTemplateInput } from "@/tests/fixtures/tree-inventory-import/parser-workbooks";

describe("tree inventory E2E workbook builder", () => {
  it("fills the live template with the full-cycle fixture while preserving metadata", async () => {
    const fixture = buildTreeInventoryFullCycleFixture("unit");
    const buffer = await fillTreeInventoryWorkbookBuffer(
      await generateTreeInventoryTemplateBuffer(
        buildParserTemplateInput({
          varieties: [],
        }),
      ),
      fixture.workbook,
    );

    const parsed = await parseTreeInventoryWorkbook({
      workbook: buffer,
      workbook_name: "tree-inventory-full-cycle.xlsx",
    });

    expect(parsed.is_supported_contract).toBe(true);
    expect(parsed.metadata.values).toMatchObject({
      orchard_id: "90000000-0000-4000-8000-000000000001",
      plot_id: "92000000-0000-4000-8000-000000000002",
      import_mode: "incremental_create",
      conflict_strategy: "reject",
    });
    expect(parsed.segments).toHaveLength(3);
    expect(parsed.exceptions).toHaveLength(1);
    expect(parsed.segments.map((row) => row.raw_values.segment_key)).toEqual([
      "S1",
      "S2",
      "S3",
    ]);
    expect(parsed.segments[0]?.raw_values).toMatchObject({
      row_number: 1,
      from_position: 1,
      to_position: 3,
      species: "Apple",
      variety_name: fixture.candidateAName,
      variety_confidence: "new_candidate",
      condition_status: "good",
    });
    expect(parsed.exceptions[0]?.raw_values).toMatchObject({
      exception_key: "E1",
      segment_key: "S1",
      row_number: 1,
      position_in_row: 2,
      exception_type: "missing_tree",
    });
    expect(parsed.diagnostics).toEqual([]);
  });
});
