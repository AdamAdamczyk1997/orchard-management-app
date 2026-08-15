import { describe, expect, it } from "vitest";
import {
  normalizeTreeInventoryParsedWorkbook,
} from "@/lib/tree-inventory-import/normalizer";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import { parseTreeInventoryWorkbook } from "@/lib/tree-inventory-import/parser.server";
import type {
  TreeInventoryParsedRow,
  TreeInventoryParsedWorkbook,
} from "@/lib/tree-inventory-import/parser.server";
import { buildFilledParserWorkbookBuffer } from "@/tests/fixtures/tree-inventory-import/parser-workbooks";

const workbookSource = {
  workbook_name: "normalizer.xlsx",
  workbook_byte_size: 1234,
  workbook_sha256: "sha256:normalizer",
};

describe("tree inventory normalizer", () => {
  it("normalizes parsed workbook rows into canonical expanded positions", async () => {
    const parsed = await parseTreeInventoryWorkbook({
      workbook: await buildFilledParserWorkbookBuffer(),
      workbook_name: "filled.xlsx",
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(canonical.xlsx_contract_version).toBe("tree_inventory_v1");
    expect(canonical.canonical_contract_version).toBe("tree_inventory_v1");
    expect(canonical.generated_context).toMatchObject({
      orchard_id: "90000000-0000-4000-8000-000000000001",
      plot_id: "92000000-0000-4000-8000-000000000002",
      plot_code: "SAD-01",
      plot_layout_type: "rows",
    });
    expect(canonical.requested_behavior).toEqual({
      import_mode: "incremental_create",
      conflict_strategy: "reject",
      allow_new_varieties: false,
    });
    expect(canonical.segments).toHaveLength(2);
    expect(canonical.expanded_positions).toHaveLength(5);
    expect(
      canonical.expanded_positions.map((position) => ({
        row: position.location.row_number,
        position: position.location.position_in_row,
        action: position.planned_action,
      })),
    ).toEqual([
      { row: 1, position: 1, action: "create_tree" },
      { row: 1, position: 2, action: "skip_missing" },
      { row: 1, position: 3, action: "create_tree" },
      { row: 2, position: 1, action: "create_tree" },
      { row: 2, position: 2, action: "create_tree" },
    ]);
    expect(canonical.expanded_positions[0]?.tree?.variety).toEqual({
      status: "known",
      raw_name: "Szampion",
      raw_variety_id: "93000000-0000-4000-8000-000000000001",
      resolved_variety_id: "93000000-0000-4000-8000-000000000001",
    });
    expect(canonical.expanded_positions[1]?.tree).toBeNull();
    expect(canonical.expanded_positions[3]?.tree?.variety).toEqual({
      status: "unknown",
      raw_name: null,
      raw_variety_id: null,
      resolved_variety_id: null,
    });
  });

  it("keeps unknown, uncertain and new_candidate as first-class unresolved states", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position: 1,
          variety_id: null,
          variety_name: "",
          variety_confidence: "unknown",
        }),
        segmentRow(3, {
          segment_key: "S2",
          row_number: 1,
          from_position: 2,
          to_position: 2,
          variety_id: null,
          variety_name: "Szampjon",
          variety_confidence: "uncertain",
        }),
        segmentRow(4, {
          segment_key: "S3",
          row_number: 1,
          from_position: 3,
          to_position: 3,
          variety_id: null,
          variety_name: "Szampion",
          variety_confidence: "new_candidate",
        }),
      ],
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(
      canonical.expanded_positions.map((position) => position.tree?.variety),
    ).toEqual([
      {
        status: "unknown",
        raw_name: null,
        raw_variety_id: null,
        resolved_variety_id: null,
      },
      {
        status: "uncertain",
        raw_name: "Szampjon",
        raw_variety_id: null,
        resolved_variety_id: null,
      },
      {
        status: "new_candidate",
        raw_name: "Szampion",
        raw_variety_id: null,
        resolved_variety_id: null,
      },
    ]);
    expect(canonical.diagnostics).toEqual([]);
  });

  it("reports known varieties without names and allows named new candidates without ids", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position: 1,
          variety_name: "",
          variety_confidence: "known",
        }),
        segmentRow(3, {
          segment_key: "S2",
          row_number: 1,
          from_position: 2,
          to_position: 2,
          variety_id: null,
          variety_name: "Szampion",
          variety_confidence: "new_candidate",
        }),
      ],
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(canonical.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "INVALID_REQUIRED_VALUE",
          severity: "error",
          source: expect.objectContaining({
            sheet: "NASADZENIA",
            row_number: 2,
            column: "variety_name",
            raw_value: "",
          }),
        }),
      ]),
    );
    expect(canonical.expanded_positions[1]?.tree?.variety).toEqual({
      status: "new_candidate",
      raw_name: "Szampion",
      raw_variety_id: null,
      resolved_variety_id: null,
    });
  });

  it("detects overlaps and gaps inside the file without DB access", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position: 3,
        }),
        segmentRow(3, {
          segment_key: "S2",
          row_number: 1,
          from_position: 3,
          to_position: 4,
        }),
        segmentRow(4, {
          segment_key: "S3",
          row_number: 1,
          from_position: 7,
          to_position: 8,
        }),
      ],
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(canonical.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "SEGMENT_OVERLAP",
          severity: "error",
          entity_refs: expect.objectContaining({
            segment_key: "S2",
            row_number: 1,
            position_in_row: 3,
          }),
        }),
        expect.objectContaining({
          code: "ROW_POSITION_GAP",
          severity: "warning",
          normalized_value: {
            previous_position: 4,
            next_position: 7,
          },
        }),
      ]),
    );
  });

  it("applies exception behavior and reports exception conflicts", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position: 3,
        }),
      ],
      exceptions: [
        exceptionRow(2, {
          exception_key: "E1",
          row_number: 1,
          position_in_row: 2,
          exception_type: "condition_override",
          condition_status: "warning",
        }),
        exceptionRow(3, {
          exception_key: "E2",
          row_number: 1,
          position_in_row: 3,
          exception_type: "dead_tree",
        }),
        exceptionRow(4, {
          exception_key: "E3",
          row_number: 1,
          position_in_row: 3,
          exception_type: "notes_only",
          notes: "duplicate exception",
        }),
        exceptionRow(5, {
          exception_key: "E4",
          row_number: 9,
          position_in_row: 1,
          exception_type: "missing_tree",
        }),
      ],
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(canonical.expanded_positions[1]?.tree?.condition_status).toBe(
      "warning",
    );
    expect(canonical.expanded_positions[2]?.tree?.condition_status).toBe(
      "critical",
    );
    expect(canonical.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "CONFLICTING_EXCEPTIONS",
          severity: "error",
          entity_refs: expect.objectContaining({
            exception_key: "E3",
          }),
        }),
        expect.objectContaining({
          code: "EXCEPTION_OUTSIDE_SEGMENT",
          severity: "error",
          entity_refs: expect.objectContaining({
            exception_key: "E4",
          }),
        }),
      ]),
    );
  });

  it("bounds expanded positions at the MVP import limit", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position:
            TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp + 1,
        }),
      ],
    });
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);

    expect(canonical.expanded_positions).toHaveLength(
      TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
    );
    expect(canonical.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "IMPORT_LIMIT_EXCEEDED",
          severity: "error",
        }),
      ]),
    );
  });

  it("normalizes the accepted MVP limit within the Phase 5 performance smoke", () => {
    const parsed = buildParsedWorkbook({
      segments: [
        segmentRow(2, {
          segment_key: "S1",
          row_number: 1,
          from_position: 1,
          to_position:
            TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
        }),
      ],
    });
    const startedAt = Date.now();
    const { canonical } = normalizeTreeInventoryParsedWorkbook(parsed);
    const elapsedMs = Date.now() - startedAt;

    expect(canonical.expanded_positions).toHaveLength(
      TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
    );
    expect(elapsedMs).toBeLessThan(1_000);
  });
});

function buildParsedWorkbook(input: {
  segments?: TreeInventoryParsedRow[];
  exceptions?: TreeInventoryParsedRow[];
}): TreeInventoryParsedWorkbook {
  return {
    workbook: workbookSource,
    is_supported_contract: true,
    metadata: {
      rows: [],
      values: {
        xlsx_contract_version: "tree_inventory_v1",
        canonical_contract_version: "tree_inventory_v1",
        orchard_id: "90000000-0000-4000-8000-000000000001",
        orchard_name: "MAIN Orchard",
        plot_id: "92000000-0000-4000-8000-000000000002",
        plot_code: "SAD-01",
        plot_name: "Kwatera 1",
        plot_layout_type: "rows",
        import_mode: "incremental_create",
        conflict_strategy: "reject",
        allow_new_varieties: false,
      },
    },
    segments: input.segments ?? [],
    exceptions: input.exceptions ?? [],
    dictionaries: [],
    diagnostics: [],
  };
}

function segmentRow(
  rowNumber: number,
  overrides: Record<string, unknown> = {},
): TreeInventoryParsedRow {
  const rawValues = {
    segment_key: `S${rowNumber - 1}`,
    plot_code: "SAD-01",
    section_name: null,
    row_number: 1,
    from_position: 1,
    to_position: 1,
    species: "Apple",
    variety_id: "93000000-0000-4000-8000-000000000001",
    variety_name: "Szampion",
    variety_confidence: "known",
    condition_status: "good",
    planted_at: null,
    planted_year: null,
    planted_year_from: null,
    planted_year_to: null,
    rootstock: null,
    pollinator_info: null,
    location_verified: false,
    notes: null,
    ...overrides,
  };

  return parsedRow("NASADZENIA", rowNumber, rawValues.segment_key, rawValues);
}

function exceptionRow(
  rowNumber: number,
  overrides: Record<string, unknown> = {},
): TreeInventoryParsedRow {
  const rawValues = {
    exception_key: `E${rowNumber - 1}`,
    segment_key: null,
    plot_code: "SAD-01",
    section_name: null,
    row_number: 1,
    position_in_row: 1,
    exception_type: "missing_tree",
    species: null,
    variety_id: null,
    variety_name: null,
    variety_confidence: null,
    condition_status: null,
    planted_at: null,
    planted_year: null,
    planted_year_from: null,
    planted_year_to: null,
    rootstock: null,
    pollinator_info: null,
    location_verified: null,
    notes: null,
    ...overrides,
  };

  return parsedRow("WYJATKI", rowNumber, rawValues.exception_key, rawValues);
}

function parsedRow(
  sheet: string,
  rowNumber: number,
  rowKey: unknown,
  rawValues: Record<string, unknown>,
): TreeInventoryParsedRow {
  return {
    sheet,
    row_number: rowNumber,
    row_key: typeof rowKey === "string" ? rowKey : null,
    raw_values: rawValues,
    cells: Object.entries(rawValues).map(([column, rawValue], index) => ({
      sheet,
      row_number: rowNumber,
      column,
      column_number: index + 1,
      address: `${String.fromCharCode(65 + index)}${rowNumber}`,
      raw_value: rawValue,
    })),
  } as TreeInventoryParsedRow;
}
