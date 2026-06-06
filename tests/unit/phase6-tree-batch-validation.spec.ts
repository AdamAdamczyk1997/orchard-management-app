import { describe, expect, it } from "vitest";
import {
  buildTreeLocationPreviewLabel,
  buildTreeRangePositions,
  generateTreeCodeFromPattern,
} from "@/lib/domain/tree-batches";
import {
  buildBulkTreeBatchPrefillFromEmptyRange,
  buildBulkTreeBatchPrefillSearchParams,
  buildBulkDeactivateTreesPrefillSearchParams,
  resolveBulkDeactivateTreesPrefillFromPlotSelection,
} from "@/lib/domain/tree-batch-prefill";
import {
  resolveBulkTreeBatchPrefillFromSearchParams,
  resolveBulkDeactivatePrefillFromSearchParams,
} from "@/lib/validation/tree-batch-prefill";
import {
  bulkDeactivateTreesFormSchema,
  bulkTreeBatchFormSchema,
} from "@/lib/validation/trees";
import type { PlotOption, TreeSummary } from "@/types/contracts";

const VALID_PLOT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_VARIETY_ID = "22222222-2222-4222-8222-222222222222";
const IRREGULAR_PLOT_ID = "33333333-3333-4333-8333-333333333333";

const plotOptions: PlotOption[] = [
  {
    id: VALID_PLOT_ID,
    name: "Kwatera rzedowa",
    status: "active",
    layout_type: "rows",
    row_numbering_scheme: "left_to_right_from_entrance",
    tree_numbering_scheme: "from_row_start",
    entrance_description: null,
    layout_notes: null,
    default_row_count: 4,
    default_trees_per_row: 20,
  },
  {
    id: IRREGULAR_PLOT_ID,
    name: "Kwatera nieregularna",
    status: "active",
    layout_type: "irregular",
    row_numbering_scheme: null,
    tree_numbering_scheme: null,
    entrance_description: null,
    layout_notes: null,
    default_row_count: null,
    default_trees_per_row: null,
  },
];

let nextTreeIndex = 0;

function buildTree(overrides: Partial<TreeSummary> = {}): TreeSummary {
  nextTreeIndex += 1;

  return {
    id: overrides.id ?? `tree-${nextTreeIndex}`,
    orchard_id: overrides.orchard_id ?? "orchard-1",
    plot_id: overrides.plot_id ?? VALID_PLOT_ID,
    plot_name: overrides.plot_name ?? "Kwatera rzedowa",
    plot_status: overrides.plot_status ?? "active",
    variety_id: overrides.variety_id ?? null,
    variety_name: overrides.variety_name ?? null,
    variety_species: overrides.variety_species ?? null,
    species: overrides.species ?? "apple",
    tree_code: overrides.tree_code ?? null,
    display_name: overrides.display_name ?? null,
    section_name: overrides.section_name ?? null,
    row_number: overrides.row_number ?? null,
    position_in_row: overrides.position_in_row ?? null,
    row_label: overrides.row_label ?? null,
    position_label: overrides.position_label ?? null,
    planted_at: overrides.planted_at ?? null,
    acquired_at: overrides.acquired_at ?? null,
    rootstock: overrides.rootstock ?? null,
    pollinator_info: overrides.pollinator_info ?? null,
    condition_status: overrides.condition_status ?? "good",
    health_status: overrides.health_status ?? null,
    development_stage: overrides.development_stage ?? null,
    last_harvest_at: overrides.last_harvest_at ?? null,
    notes: overrides.notes ?? null,
    location_verified: overrides.location_verified ?? true,
    is_active: overrides.is_active ?? true,
    location_label: overrides.location_label ?? null,
    created_at: overrides.created_at,
    updated_at: overrides.updated_at,
  };
}

describe("phase 6 tree batch validation", () => {
  it("parses batch tree input and normalizes shared defaults", () => {
    const parsed = bulkTreeBatchFormSchema.parse({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: " apple ",
      section_name: " North ",
      row_number: "7",
      from_position: "20",
      to_position: "24",
      generated_tree_code_pattern: " MAIN-R7-T{{n}} ",
      default_condition_status: "new",
      default_planted_at: "2026-03-15",
      default_rootstock: " M9 ",
      default_notes: " Wiosenny batch ",
    });

    expect(parsed).toMatchObject({
      plot_id: VALID_PLOT_ID,
      variety_id: VALID_VARIETY_ID,
      species: "apple",
      section_name: "North",
      row_number: 7,
      from_position: 20,
      to_position: 24,
      generated_tree_code_pattern: "MAIN-R7-T{{n}}",
      default_condition_status: "new",
      default_planted_at: "2026-03-15",
      default_rootstock: "M9",
      default_notes: "Wiosenny batch",
    });
  });

  it("rejects invalid batch range and code pattern", () => {
    const parsed = bulkTreeBatchFormSchema.safeParse({
      plot_id: VALID_PLOT_ID,
      species: "apple",
      row_number: "2",
      from_position: "8",
      to_position: "4",
      generated_tree_code_pattern: "MAIN-R2-T",
      default_condition_status: "good",
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.to_position).toContain(
      "Pozycja poczatkowa nie moze byc wieksza od koncowej.",
    );
    expect(parsed.error?.flatten().fieldErrors.generated_tree_code_pattern).toContain(
      "Wzorzec kodu musi zawierac placeholder {{n}}.",
    );
  });

  it("parses bulk deactivate input and rejects reversed ranges", () => {
    const valid = bulkDeactivateTreesFormSchema.parse({
      plot_id: VALID_PLOT_ID,
      row_number: "5",
      from_position: "11",
      to_position: "14",
      reason: " Korekta ewidencji ",
    });

    expect(valid).toMatchObject({
      plot_id: VALID_PLOT_ID,
      row_number: 5,
      from_position: 11,
      to_position: 14,
      reason: "Korekta ewidencji",
    });

    const invalid = bulkDeactivateTreesFormSchema.safeParse({
      plot_id: VALID_PLOT_ID,
      row_number: "5",
      from_position: "14",
      to_position: "11",
    });

    expect(invalid.success).toBe(false);
    expect(invalid.error?.flatten().fieldErrors.to_position).toContain(
      "Pozycja poczatkowa nie moze byc wieksza od koncowej.",
    );
  });

  it("builds bulk deactivate prefill only for one complete location range", () => {
    const ready = resolveBulkDeactivateTreesPrefillFromPlotSelection({
      selectedTrees: [
        buildTree({ row_number: 2, position_in_row: 4 }),
        buildTree({ row_number: 2, position_in_row: 5 }),
      ],
      activityScopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          row_number: 2,
          from_position: 4,
          to_position: 5,
        },
      ],
    });

    expect(ready).toMatchObject({
      status: "ready",
      can_start: true,
      prefill: {
        plot_id: VALID_PLOT_ID,
        row_number: 2,
        from_position: 4,
        to_position: 5,
      },
    });

    const multiRange = resolveBulkDeactivateTreesPrefillFromPlotSelection({
      selectedTrees: [
        buildTree({ row_number: 2, position_in_row: 4 }),
        buildTree({ row_number: 3, position_in_row: 1 }),
      ],
      activityScopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          row_number: 2,
          from_position: 4,
          to_position: 4,
        },
        {
          scope_order: 2,
          scope_level: "location_range",
          row_number: 3,
          from_position: 1,
          to_position: 1,
        },
      ],
    });
    const treeScope = resolveBulkDeactivateTreesPrefillFromPlotSelection({
      selectedTrees: [buildTree({ row_number: null, position_in_row: null })],
      activityScopes: [
        {
          scope_order: 1,
          scope_level: "tree",
          tree_id: "tree-1",
        },
      ],
    });

    expect(multiRange).toMatchObject({ status: "blocked", can_start: false });
    expect(treeScope).toMatchObject({ status: "blocked", can_start: false });
  });

  it("builds batch create prefill only for one continuous inferred empty range", () => {
    const ready = buildBulkTreeBatchPrefillFromEmptyRange({
      start: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        position: 4,
      },
      end: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        position: 6,
      },
      rowPositions: [
        { position: 3, kind: "occupied" },
        { position: 4, kind: "empty_inferred" },
        { position: 5, kind: "empty_inferred" },
        { position: 6, kind: "empty_inferred" },
        { position: 7, kind: "occupied" },
      ],
    });

    expect(ready).toEqual({
      ok: true,
      prefill: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        from_position: 4,
        to_position: 6,
      },
      message: "Plant New: rzad 3, pozycje 4-6.",
    });

    const blockedByOccupiedPosition = buildBulkTreeBatchPrefillFromEmptyRange({
      start: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        position: 4,
      },
      end: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        position: 6,
      },
      rowPositions: [
        { position: 4, kind: "empty_inferred" },
        { position: 5, kind: "occupied" },
        { position: 6, kind: "empty_inferred" },
      ],
    });
    const blockedByDifferentRow = buildBulkTreeBatchPrefillFromEmptyRange({
      start: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        position: 4,
      },
      end: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 4,
        position: 4,
      },
      rowPositions: [{ position: 4, kind: "empty_inferred" }],
    });

    expect(blockedByOccupiedPosition).toMatchObject({
      ok: false,
      prefill: null,
    });
    expect(blockedByDifferentRow).toMatchObject({
      ok: false,
      prefill: null,
    });
  });

  it("parses bulk deactivate query prefill safely", () => {
    const searchParams = buildBulkDeactivateTreesPrefillSearchParams({
      plot_id: VALID_PLOT_ID,
      row_number: 3,
      from_position: 7,
      to_position: 9,
    });
    const valid = resolveBulkDeactivatePrefillFromSearchParams(
      Object.fromEntries(searchParams),
      { plotOptions },
    );
    const irregular = resolveBulkDeactivatePrefillFromSearchParams(
      {
        plot_id: IRREGULAR_PLOT_ID,
        row_number: "1",
        from_position: "1",
        to_position: "2",
      },
      { plotOptions },
    );
    const reversed = resolveBulkDeactivatePrefillFromSearchParams(
      {
        plot_id: VALID_PLOT_ID,
        row_number: "1",
        from_position: "4",
        to_position: "2",
      },
      { plotOptions },
    );

    expect(valid).toEqual({
      status: "applied",
      prefill: {
        plot_id: VALID_PLOT_ID,
        row_number: 3,
        from_position: 7,
        to_position: 9,
      },
      message: "Zastosowano zakres z widoku dzialki.",
    });
    expect(irregular).toMatchObject({ status: "invalid", prefill: null });
    expect(reversed).toMatchObject({ status: "invalid", prefill: null });
  });

  it("parses batch create query prefill safely", () => {
    const searchParams = buildBulkTreeBatchPrefillSearchParams({
      plot_id: VALID_PLOT_ID,
      section_name: "A",
      row_number: 3,
      from_position: 7,
      to_position: 9,
    });
    const valid = resolveBulkTreeBatchPrefillFromSearchParams(
      Object.fromEntries(searchParams),
      { plotOptions },
    );
    const irregular = resolveBulkTreeBatchPrefillFromSearchParams(
      {
        plot_id: IRREGULAR_PLOT_ID,
        row_number: "1",
        from_position: "1",
        to_position: "2",
      },
      { plotOptions },
    );
    const reversed = resolveBulkTreeBatchPrefillFromSearchParams(
      {
        plot_id: VALID_PLOT_ID,
        row_number: "1",
        from_position: "4",
        to_position: "2",
      },
      { plotOptions },
    );

    expect(valid).toEqual({
      status: "applied",
      prefill: {
        plot_id: VALID_PLOT_ID,
        section_name: "A",
        row_number: 3,
        from_position: 7,
        to_position: 9,
      },
      message: "Zastosowano zakres sadzenia z widoku dzialki.",
    });
    expect(irregular).toMatchObject({ status: "invalid", prefill: null });
    expect(reversed).toMatchObject({ status: "invalid", prefill: null });
  });

  it("builds range positions, generated codes, and location preview labels", () => {
    expect(buildTreeRangePositions(3, 6)).toEqual([3, 4, 5, 6]);
    expect(generateTreeCodeFromPattern("MAIN-R4-T{{n}}", 12)).toBe("MAIN-R4-T12");
    expect(generateTreeCodeFromPattern(null, 12)).toBeNull();
    expect(
      buildTreeLocationPreviewLabel({
        section_name: "North",
        row_number: 4,
        position_in_row: 12,
        tree_code: "MAIN-R4-T12",
      }),
    ).toBe("Section North · Row 4, pos 12 · MAIN-R4-T12");
  });
});
