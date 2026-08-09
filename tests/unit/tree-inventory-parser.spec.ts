import { describe, expect, it } from "vitest";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import { parseTreeInventoryWorkbook } from "@/lib/tree-inventory-import/parser.server";
import {
  buildFilledParserWorkbookBuffer,
  buildLargeParserWorkbookBuffer,
  buildWorkbookWithMissingSegmentHeaderBuffer,
  buildWorkbookWithUnsupportedVersionBuffer,
  buildWorkbookWithoutSheetBuffer,
} from "@/tests/fixtures/tree-inventory-import/parser-workbooks";

describe("tree inventory XLSX parser", () => {
  it("parses generated v1 workbooks into raw source-preserving rows", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildFilledParserWorkbookBuffer(),
      workbook_name: "inventory.xlsx",
    });

    expect(parsed.is_supported_contract).toBe(true);
    expect(parsed.workbook.workbook_name).toBe("inventory.xlsx");
    expect(parsed.workbook.workbook_byte_size).toBeGreaterThan(0);
    expect(parsed.workbook.workbook_sha256).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(parsed.metadata.values).toMatchObject({
      xlsx_contract_version: "tree_inventory_v1",
      canonical_contract_version: "tree_inventory_v1",
      orchard_id: "90000000-0000-4000-8000-000000000001",
      plot_id: "92000000-0000-4000-8000-000000000002",
      import_mode: "incremental_create",
      conflict_strategy: "reject",
    });

    expect(parsed.segments).toHaveLength(2);
    expect(parsed.exceptions).toHaveLength(1);
    expect(parsed.dictionaries.length).toBeGreaterThan(0);

    const [knownSegment, unknownSegment] = parsed.segments;
    expect(knownSegment).toMatchObject({
      sheet: "NASADZENIA",
      row_number: 2,
      row_key: "S1",
      raw_values: {
        segment_key: "S1",
        plot_code: "SAD-01",
        row_number: 1,
        from_position: 1,
        to_position: 3,
        species: "Apple",
        variety_id: "93000000-0000-4000-8000-000000000001",
        variety_name: "Szampion",
        variety_confidence: "known",
        condition_status: "good",
      },
    });
    expect(knownSegment?.cells.find((cell) => cell.column === "species")).toEqual(
      {
        sheet: "NASADZENIA",
        row_number: 2,
        column: "species",
        column_number: 7,
        address: "G2",
        raw_value: "Apple",
      },
    );
    expect(knownSegment?.raw_values.notes).toEqual({
      formula: 'CONCAT("not","trusted")',
      result: "nottrusted",
    });

    expect(unknownSegment?.raw_values.species).toBe("");
    expect(unknownSegment?.raw_values.variety_name).toBe("");
    expect(unknownSegment?.raw_values.variety_confidence).toBe("unknown");

    const [exception] = parsed.exceptions;
    expect(exception).toMatchObject({
      sheet: "WYJATKI",
      row_number: 2,
      row_key: "E1",
      raw_values: {
        exception_key: "E1",
        segment_key: "S1",
        exception_type: "missing_tree",
        variety_name: "",
        variety_confidence: "uncertain",
      },
    });
    expect(exception?.cells.find((cell) => cell.column === "variety_name")).toMatchObject({
      sheet: "WYJATKI",
      row_number: 2,
      column: "variety_name",
      address: "J2",
      raw_value: "",
    });

    expect(parsed.diagnostics).toEqual([]);
  });

  it("reports a structured diagnostic when METADANE is missing", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildWorkbookWithoutSheetBuffer("METADANE"),
      workbook_name: "missing-metadata.xlsx",
    });

    expect(parsed.is_supported_contract).toBe(false);
    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_REQUIRED_SHEET",
          severity: "error",
          source: expect.objectContaining({
            sheet: "METADANE",
          }),
        }),
      ]),
    );
  });

  it("rejects unsupported xlsx contract versions", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildWorkbookWithUnsupportedVersionBuffer(),
      workbook_name: "unsupported.xlsx",
    });

    expect(parsed.is_supported_contract).toBe(false);
    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNSUPPORTED_CONTRACT_VERSION",
          severity: "error",
          source: expect.objectContaining({
            sheet: "METADANE",
            column: "xlsx_contract_version",
            raw_value: "tree_inventory_v2",
          }),
          normalized_value: "tree_inventory_v1",
        }),
      ]),
    );
  });

  it("reports missing required headers with sheet and header source", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildWorkbookWithMissingSegmentHeaderBuffer(),
      workbook_name: "missing-header.xlsx",
    });

    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "MISSING_REQUIRED_COLUMN",
          severity: "error",
          source: expect.objectContaining({
            sheet: "NASADZENIA",
            row_number: 1,
            column: "from_position",
            raw_value: null,
          }),
        }),
      ]),
    );
  });

  it("stops before parsing workbooks above the Phase 1 size limit", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: Buffer.alloc(
        TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes + 1,
      ),
      workbook_name: "too-large.xlsx",
    });

    expect(parsed.segments).toEqual([]);
    expect(parsed.exceptions).toEqual([]);
    expect(parsed.dictionaries).toEqual([]);
    expect(parsed.diagnostics).toEqual([
      expect.objectContaining({
        code: "IMPORT_LIMIT_EXCEEDED",
        severity: "error",
        source: expect.objectContaining({
          workbook: expect.objectContaining({
            workbook_name: "too-large.xlsx",
          }),
        }),
      }),
    ]);
  });

  it("parses a 1k-row workbook without normalizing or expanding positions", async () => {
    const startedAt = Date.now();
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildLargeParserWorkbookBuffer(1_000),
      workbook_name: "large-parser-smoke.xlsx",
    });
    const elapsedMs = Date.now() - startedAt;

    expect(parsed.is_supported_contract).toBe(true);
    expect(parsed.segments).toHaveLength(1_000);
    expect(parsed.exceptions).toEqual([]);
    expect(parsed.segments[999]?.raw_values).toMatchObject({
      segment_key: "S1000",
      row_number: 1000,
      from_position: 1,
      to_position: 1,
    });
    expect(elapsedMs).toBeLessThan(5_000);
  });
});
