import { describe, expect, it } from "vitest";
import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_CONDITION_MAPPINGS,
  TREE_INVENTORY_CONFLICT_STRATEGIES,
  TREE_INVENTORY_CONTRACT_VERSION,
  TREE_INVENTORY_DIAGNOSTIC_SEVERITIES,
  TREE_INVENTORY_EXCEPTION_TYPES,
  TREE_INVENTORY_IMPORT_MODES,
  TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES,
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_TREE_CONDITION_STATUSES,
  TREE_INVENTORY_VARIETY_CONFIDENCES,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  createTreeInventoryDiagnostic,
  getTreeInventoryConditionMapping,
  isTreeInventoryContractVersion,
  parseTreeInventoryConditionInput,
  parseTreeInventoryConflictStrategy,
  parseTreeInventoryExceptionType,
  parseTreeInventoryImportMode,
  parseTreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import { TREE_INVENTORY_CANONICAL_EXAMPLES } from "@/tests/fixtures/tree-inventory-import/canonical-examples";

describe("tree inventory import contracts", () => {
  it("defines the accepted v1 contract versions and worksheet set", () => {
    expect(TREE_INVENTORY_CONTRACT_VERSION).toBe("tree_inventory_v1");
    expect(TREE_INVENTORY_XLSX_CONTRACT_VERSION).toBe("tree_inventory_v1");
    expect(TREE_INVENTORY_CANONICAL_CONTRACT_VERSION).toBe(
      "tree_inventory_v1",
    );
    expect(isTreeInventoryContractVersion("tree_inventory_v1")).toBe(true);
    expect(isTreeInventoryContractVersion("tree_inventory_v2")).toBe(false);

    expect(TREE_INVENTORY_REQUIRED_WORKSHEETS).toEqual([
      "INSTRUKCJA",
      "METADANE",
      "NASADZENIA",
      "WYJATKI",
      "SLOWNIKI",
    ]);
    expect(TREE_INVENTORY_REQUIRED_WORKSHEETS).not.toContain("RZEDY");
  });

  it("parses only accepted Phase 1 enum values", () => {
    expect(TREE_INVENTORY_IMPORT_MODES).toEqual(["incremental_create"]);
    expect(parseTreeInventoryImportMode("incremental_create")).toBe(
      "incremental_create",
    );
    expect(parseTreeInventoryImportMode("full_snapshot")).toBeNull();

    expect(TREE_INVENTORY_CONFLICT_STRATEGIES).toEqual(["reject"]);
    expect(parseTreeInventoryConflictStrategy("reject")).toBe("reject");
    expect(parseTreeInventoryConflictStrategy("skip_conflicts")).toBeNull();

    expect(TREE_INVENTORY_VARIETY_CONFIDENCES).toEqual([
      "known",
      "unknown",
      "uncertain",
      "new_candidate",
    ]);
    expect(parseTreeInventoryVarietyConfidence("uncertain")).toBe("uncertain");
    expect(parseTreeInventoryVarietyConfidence("certain")).toBeNull();

    expect(TREE_INVENTORY_EXCEPTION_TYPES).toEqual([
      "missing_tree",
      "different_variety",
      "condition_override",
      "dead_tree",
      "replacement",
      "notes_only",
    ]);
    expect(parseTreeInventoryExceptionType("missing_tree")).toBe(
      "missing_tree",
    );
    expect(parseTreeInventoryExceptionType("range_exception")).toBeNull();
  });

  it("maps import condition inputs to current tree status semantics", () => {
    expect(TREE_INVENTORY_TREE_CONDITION_STATUSES).toEqual([
      "new",
      "good",
      "warning",
      "critical",
      "removed",
    ]);
    expect(TREE_INVENTORY_CONDITION_MAPPINGS.healthy_normal).toEqual({
      tree_condition_status: "good",
      is_active: true,
      creates_tree_record: true,
    });
    expect(getTreeInventoryConditionMapping("needs_attention")).toEqual({
      tree_condition_status: "warning",
      is_active: true,
      creates_tree_record: true,
    });
    expect(getTreeInventoryConditionMapping("dead_severely_damaged")).toEqual({
      tree_condition_status: "critical",
      is_active: true,
      creates_tree_record: true,
    });
    expect(getTreeInventoryConditionMapping("physically_removed")).toEqual({
      tree_condition_status: "removed",
      is_active: false,
      creates_tree_record: true,
    });
    expect(getTreeInventoryConditionMapping("missing_position")).toEqual({
      tree_condition_status: null,
      is_active: false,
      creates_tree_record: false,
    });

    expect(parseTreeInventoryConditionInput("critical")).toBe("critical");
    expect(parseTreeInventoryConditionInput("dead")).toBeNull();
  });

  it("keeps diagnostics structured and source-aware", () => {
    expect(TREE_INVENTORY_DIAGNOSTIC_SEVERITIES).toEqual([
      "info",
      "warning",
      "error",
    ]);

    const diagnostic = createTreeInventoryDiagnostic({
      code: "INVALID_ENUM_VALUE",
      severity: "error",
      source: {
        workbook: {
          workbook_name: "inventory.xlsx",
          workbook_byte_size: 1234,
          workbook_sha256: "sha256:abc",
        },
        sheet: "NASADZENIA",
        row_number: 12,
        column: "variety_confidence",
        raw_value: "certain",
      },
      message: "Unsupported variety confidence.",
      normalized_value: null,
      entity_refs: {
        orchard_id: "90000000-0000-4000-8000-000000000001",
        plot_id: "92000000-0000-4000-8000-000000000002",
        segment_key: "S1",
      },
    });

    expect(diagnostic).toMatchInlineSnapshot(`
      {
        "code": "INVALID_ENUM_VALUE",
        "entity_refs": {
          "orchard_id": "90000000-0000-4000-8000-000000000001",
          "plot_id": "92000000-0000-4000-8000-000000000002",
          "segment_key": "S1",
        },
        "message": "Unsupported variety confidence.",
        "normalized_value": null,
        "severity": "error",
        "source": {
          "column": "variety_confidence",
          "raw_value": "certain",
          "row_number": 12,
          "sheet": "NASADZENIA",
          "workbook": {
            "workbook_byte_size": 1234,
            "workbook_name": "inventory.xlsx",
            "workbook_sha256": "sha256:abc",
          },
        },
      }
    `);
  });

  it("keeps canonical examples JSON-safe and aligned with v1 behavior", () => {
    const [example] = TREE_INVENTORY_CANONICAL_EXAMPLES;

    expect(example?.xlsx_contract_version).toBe("tree_inventory_v1");
    expect(example?.canonical_contract_version).toBe("tree_inventory_v1");
    expect(example?.requested_behavior).toEqual({
      import_mode: "incremental_create",
      conflict_strategy: "reject",
      allow_new_varieties: false,
    });
    expect(example?.generated_context.plot_layout_type).toBe("rows");
    expect(example?.segments).toHaveLength(1);
    expect(example?.exceptions[0]?.exception_type).toBe("missing_tree");
    expect(
      example?.expanded_positions.map((position) => position.planned_action),
    ).toEqual(["create_tree", "skip_missing"]);
    expect(example?.diagnostics[0]?.source?.raw_value).toBe(2015);

    expect(JSON.parse(JSON.stringify(example))).toEqual(example);
  });

  it("defines bounded MVP import limits", () => {
    expect(TREE_INVENTORY_IMPORT_LIMITS).toEqual({
      max_workbook_bytes: 5_242_880,
      max_segment_rows: 500,
      max_exception_rows: 1000,
      max_expanded_tree_positions_mvp: 5000,
      max_diagnostics_returned: 500,
    });
    expect(TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes).toBeGreaterThan(0);
    expect(TREE_INVENTORY_IMPORT_LIMITS.max_segment_rows).toBeGreaterThan(0);
    expect(TREE_INVENTORY_IMPORT_LIMITS.max_exception_rows).toBeGreaterThan(0);
    expect(
      TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
    ).toBeGreaterThanOrEqual(TREE_INVENTORY_IMPORT_LIMITS.max_segment_rows);
    expect(TREE_INVENTORY_IMPORT_LIMITS.max_diagnostics_returned).toBeLessThanOrEqual(
      TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
    );
  });

  it("keeps Phase 1 constrained to row-layout MVP imports", () => {
    expect(TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES).toEqual(["rows"]);
  });
});
