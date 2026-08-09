import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  type TreeInventoryCanonicalImport,
  type TreeInventoryRawValues,
} from "@/lib/tree-inventory-import/contracts";

const orchardId = "90000000-0000-4000-8000-000000000001";
const plotId = "92000000-0000-4000-8000-000000000002";
const varietyId = "93000000-0000-4000-8000-000000000003";
const plantedYearRangeRawValues = {
  planted_year_from: 2015,
  planted_year_to: 2017,
} satisfies TreeInventoryRawValues;
const missingTreeRawValues = {
  missing_tree: true,
} satisfies TreeInventoryRawValues;

export const treeInventorySingleRowWithMissingExample = {
  xlsx_contract_version: TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  canonical_contract_version: TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  import_id: "94000000-0000-4000-8000-000000000004",
  file_hash: "sha256:example-tree-inventory-v1",
  generated_context: {
    orchard_id: orchardId,
    orchard_name: "MAIN Orchard",
    plot_id: plotId,
    plot_code: "SAD-01",
    plot_name: "Kwatera 1",
    plot_layout_type: "rows",
    generated_at: "2026-08-08T18:00:00.000Z",
    generated_by_profile_id: "95000000-0000-4000-8000-000000000005",
  },
  requested_behavior: {
    import_mode: "incremental_create",
    conflict_strategy: "reject",
    allow_new_varieties: false,
  },
  segments: [
    {
      source: {
        sheet: "NASADZENIA",
        row_number: 12,
        row_key: "S1",
        raw_values: {
          segment_key: "S1",
          row_number: 3,
          from_position: 1,
          to_position: 3,
          variety_confidence: "known",
        },
      },
      segment_key: "S1",
      location: {
        plot_id: plotId,
        section_name: null,
        row_number: 3,
        from_position: 1,
        to_position: 3,
      },
      tree_defaults: {
        species: "Apple",
        variety_id: varietyId,
        variety_name: "Szampion",
        condition_status: "good",
        planted_at: null,
        rootstock: "M9",
        pollinator_info: null,
        location_verified: false,
        notes: null,
      },
      import_only: {
        variety_confidence: "known",
        planted_year: null,
        planted_year_from: 2015,
        planted_year_to: 2017,
        raw_values: plantedYearRangeRawValues,
      },
    },
  ],
  exceptions: [
    {
      source: {
        sheet: "WYJATKI",
        row_number: 4,
        row_key: "E1",
        raw_values: {
          exception_key: "E1",
          segment_key: "S1",
          row_number: 3,
          position_in_row: 2,
          exception_type: "missing_tree",
        },
      },
      exception_key: "E1",
      segment_key: "S1",
      location: {
        plot_id: plotId,
        section_name: null,
        row_number: 3,
        position_in_row: 2,
      },
      exception_type: "missing_tree",
      override: {},
    },
  ],
  expanded_positions: [
    {
      source: {
        sheet: "NASADZENIA",
        row_number: 12,
        row_key: "S1",
      },
      segment_key: "S1",
      exception_key: null,
      location: {
        plot_id: plotId,
        section_name: null,
        row_number: 3,
        position_in_row: 1,
      },
      planned_action: "create_tree",
      tree: {
        species: "Apple",
        variety_id: varietyId,
        variety_name: "Szampion",
        condition_status: "good",
        planted_at: null,
        rootstock: "M9",
        pollinator_info: null,
        location_verified: false,
        notes: null,
      },
      import_only: {
        variety_confidence: "known",
        planted_year: null,
        planted_year_from: 2015,
        planted_year_to: 2017,
        raw_values: plantedYearRangeRawValues,
      },
    },
    {
      source: {
        sheet: "WYJATKI",
        row_number: 4,
        row_key: "E1",
      },
      segment_key: "S1",
      exception_key: "E1",
      location: {
        plot_id: plotId,
        section_name: null,
        row_number: 3,
        position_in_row: 2,
      },
      planned_action: "skip_missing",
      tree: null,
      import_only: {
        variety_confidence: "known",
        planted_year: null,
        planted_year_from: 2015,
        planted_year_to: 2017,
        raw_values: missingTreeRawValues,
      },
    },
  ],
  diagnostics: [
    {
      code: "IMPORT_ONLY_FIELD_TO_NOTES",
      severity: "warning",
      source: {
        sheet: "NASADZENIA",
        row_number: 12,
        column: "planted_year_from",
        raw_value: 2015,
      },
      message:
        "Planting year range is import-only in tree_inventory_v1 and does not create an artificial planted_at date.",
      normalized_value: {
        planted_year_from: 2015,
        planted_year_to: 2017,
      },
      entity_refs: {
        orchard_id: orchardId,
        plot_id: plotId,
        segment_key: "S1",
      },
    },
  ],
} satisfies TreeInventoryCanonicalImport;

export const TREE_INVENTORY_CANONICAL_EXAMPLES = [
  treeInventorySingleRowWithMissingExample,
] as const satisfies readonly TreeInventoryCanonicalImport[];
