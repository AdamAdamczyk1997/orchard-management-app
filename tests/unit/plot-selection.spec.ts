import { describe, expect, it } from "vitest";
import {
  buildSameRowPlotSelectionRange,
  compressPlotSelectionToActivityScopes,
  getPlotSelectionActivityActionState,
  isSelectablePlotSelectionTree,
} from "@/lib/domain/plot-selection";
import type { PlotLayoutType, TreeSummary } from "@/types/contracts";

let nextTreeIndex = 0;

function buildTree(overrides: Partial<TreeSummary> = {}): TreeSummary {
  nextTreeIndex += 1;

  return {
    id: overrides.id ?? `tree-${nextTreeIndex}`,
    orchard_id: overrides.orchard_id ?? "orchard-1",
    plot_id: overrides.plot_id ?? "plot-1",
    plot_name: overrides.plot_name ?? "North Plot",
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

function compress(layoutType: PlotLayoutType, trees: TreeSummary[]) {
  return compressPlotSelectionToActivityScopes({
    layout_type: layoutType,
    trees,
  });
}

describe("plot selection compression", () => {
  it("compresses consecutive positions into one location_range", () => {
    const result = compress("rows", [
      buildTree({ id: "tree-1", section_name: "A", row_number: 1, position_in_row: 1 }),
      buildTree({ id: "tree-2", section_name: "A", row_number: 1, position_in_row: 2 }),
      buildTree({ id: "tree-3", section_name: "A", row_number: 1, position_in_row: 3 }),
    ]);

    expect(result.can_prefill_activity).toBe(true);
    expect(result.activity_scopes).toEqual([
      {
        scope_order: 1,
        scope_level: "location_range",
        section_name: "A",
        row_number: 1,
        from_position: 1,
        to_position: 3,
        tree_id: undefined,
        notes: undefined,
      },
    ]);
    expect(result.scopes[0]?.selected_tree_ids).toEqual([
      "tree-1",
      "tree-2",
      "tree-3",
    ]);
  });

  it("splits non-consecutive positions into separate ranges", () => {
    const result = compress("rows", [
      buildTree({ row_number: 1, position_in_row: 1 }),
      buildTree({ row_number: 1, position_in_row: 3 }),
      buildTree({ row_number: 1, position_in_row: 4 }),
    ]);

    expect(
      result.activity_scopes.map((scope) => ({
        scope_level: scope.scope_level,
        row_number: scope.row_number,
        from_position: scope.from_position,
        to_position: scope.to_position,
      })),
    ).toEqual([
      {
        scope_level: "location_range",
        row_number: 1,
        from_position: 1,
        to_position: 1,
      },
      {
        scope_level: "location_range",
        row_number: 1,
        from_position: 3,
        to_position: 4,
      },
    ]);
  });

  it("creates multiple ranges for multi-row selection", () => {
    const result = compress("rows", [
      buildTree({ row_number: 1, position_in_row: 1 }),
      buildTree({ row_number: 2, position_in_row: 1 }),
      buildTree({ row_number: 2, position_in_row: 2 }),
    ]);

    expect(
      result.activity_scopes.map((scope) => [
        scope.row_number,
        scope.from_position,
        scope.to_position,
      ]),
    ).toEqual([
      [1, 1, 1],
      [2, 1, 2],
    ]);
  });

  it("splits ranges across section boundaries", () => {
    const result = compress("mixed", [
      buildTree({ section_name: "A", row_number: 1, position_in_row: 1 }),
      buildTree({ section_name: "B", row_number: 1, position_in_row: 2 }),
    ]);

    expect(
      result.activity_scopes.map((scope) => ({
        section_name: scope.section_name,
        row_number: scope.row_number,
        from_position: scope.from_position,
        to_position: scope.to_position,
      })),
    ).toEqual([
      {
        section_name: "A",
        row_number: 1,
        from_position: 1,
        to_position: 1,
      },
      {
        section_name: "B",
        row_number: 1,
        from_position: 2,
        to_position: 2,
      },
    ]);
  });

  it("uses tree scopes for incomplete locations and irregular plots", () => {
    const incompleteResult = compress("rows", [
      buildTree({ id: "incomplete-tree", row_number: 1, position_in_row: null }),
    ]);
    const irregularResult = compress("irregular", [
      buildTree({ id: "irregular-tree", row_number: 1, position_in_row: 1 }),
    ]);

    expect(incompleteResult.activity_scopes).toEqual([
      {
        scope_order: 1,
        scope_level: "tree",
        section_name: undefined,
        row_number: undefined,
        from_position: undefined,
        to_position: undefined,
        tree_id: "incomplete-tree",
        notes: undefined,
      },
    ]);
    expect(irregularResult.activity_scopes[0]?.scope_level).toBe("tree");
    expect(irregularResult.activity_scopes[0]?.tree_id).toBe("irregular-tree");
  });

  it("excludes removed and inactive trees from activity selection", () => {
    const activeTree = buildTree({ id: "active-tree" });
    const inactiveTree = buildTree({ id: "inactive-tree", is_active: false });
    const removedTree = buildTree({
      id: "removed-tree",
      condition_status: "removed",
      is_active: false,
    });
    const result = compress("rows", [activeTree, inactiveTree, removedTree]);

    expect(isSelectablePlotSelectionTree(activeTree)).toBe(true);
    expect(isSelectablePlotSelectionTree(inactiveTree)).toBe(false);
    expect(isSelectablePlotSelectionTree(removedTree)).toBe(false);
    expect(result.selected_tree_count).toBe(1);
    expect(result.excluded_tree_ids).toEqual(["inactive-tree", "removed-tree"]);
  });

  it("marks cross-plot selections as invalid for activity prefill", () => {
    const result = compress("rows", [
      buildTree({ plot_id: "plot-1", row_number: 1, position_in_row: 1 }),
      buildTree({ plot_id: "plot-2", row_number: 1, position_in_row: 2 }),
    ]);

    expect(result.cross_plot_selection_detected).toBe(true);
    expect(result.can_prefill_activity).toBe(false);
  });

  it("reports scope and query length limits", () => {
    const trees = Array.from({ length: 21 }, (_, index) =>
      buildTree({
        row_number: 1,
        position_in_row: index * 2 + 1,
      }),
    );
    const result = compressPlotSelectionToActivityScopes(
      {
        layout_type: "rows",
        trees,
      },
      { max_scopes: 20, max_query_string_length: 10 },
    );

    expect(result.scopes).toHaveLength(21);
    expect(result.scope_count_limit_exceeded).toBe(true);
    expect(result.query_string_limit_exceeded).toBe(true);
    expect(result.can_prefill_activity).toBe(false);
  });
});

describe("same-row plot selection range", () => {
  it("selects active trees between start and end in the same row", () => {
    const trees = [
      buildTree({ id: "tree-1", section_name: "A", row_number: 1, position_in_row: 1 }),
      buildTree({ id: "tree-2", section_name: "A", row_number: 1, position_in_row: 2 }),
      buildTree({ id: "tree-3", section_name: "A", row_number: 1, position_in_row: 3 }),
    ];
    const result = buildSameRowPlotSelectionRange({
      layout_type: "rows",
      trees,
      start_tree: trees[0],
      end_tree: trees[2],
    });

    expect(result.ok).toBe(true);
    expect(result.trees.map((tree) => tree.id)).toEqual([
      "tree-1",
      "tree-2",
      "tree-3",
    ]);
  });

  it("skips removed and inactive trees inside the selected range", () => {
    const trees = [
      buildTree({ id: "active-1", row_number: 1, position_in_row: 1 }),
      buildTree({
        id: "removed-2",
        row_number: 1,
        position_in_row: 2,
        condition_status: "removed",
        is_active: false,
      }),
      buildTree({ id: "inactive-3", row_number: 1, position_in_row: 3, is_active: false }),
      buildTree({ id: "active-4", row_number: 1, position_in_row: 4 }),
    ];
    const result = buildSameRowPlotSelectionRange({
      layout_type: "rows",
      trees,
      start_tree: trees[0],
      end_tree: trees[3],
    });

    expect(result.ok).toBe(true);
    expect(result.trees.map((tree) => tree.id)).toEqual(["active-1", "active-4"]);
  });

  it("rejects start and end from different rows or sections", () => {
    const trees = [
      buildTree({ id: "section-a", section_name: "A", row_number: 1, position_in_row: 1 }),
      buildTree({ id: "section-b", section_name: "B", row_number: 1, position_in_row: 2 }),
      buildTree({ id: "row-2", section_name: "A", row_number: 2, position_in_row: 1 }),
    ];

    expect(
      buildSameRowPlotSelectionRange({
        layout_type: "mixed",
        trees,
        start_tree: trees[0],
        end_tree: trees[1],
      }),
    ).toMatchObject({ ok: false, error: "different_row" });
    expect(
      buildSameRowPlotSelectionRange({
        layout_type: "rows",
        trees,
        start_tree: trees[0],
        end_tree: trees[2],
      }),
    ).toMatchObject({ ok: false, error: "different_row" });
  });

  it("rejects irregular layouts and incomplete tree locations", () => {
    const completeTree = buildTree({ row_number: 1, position_in_row: 1 });
    const incompleteTree = buildTree({ row_number: 1, position_in_row: null });

    expect(
      buildSameRowPlotSelectionRange({
        layout_type: "irregular",
        trees: [completeTree],
        start_tree: completeTree,
        end_tree: completeTree,
      }),
    ).toMatchObject({ ok: false, error: "unsupported_layout" });
    expect(
      buildSameRowPlotSelectionRange({
        layout_type: "rows",
        trees: [completeTree, incompleteTree],
        start_tree: completeTree,
        end_tree: incompleteTree,
      }),
    ).toMatchObject({ ok: false, error: "missing_location" });
  });
});

describe("plot selection activity action state", () => {
  it("blocks Add Activity for an empty selection", () => {
    const compression = compress("rows", []);

    expect(getPlotSelectionActivityActionState(compression)).toEqual({
      status: "empty",
      can_start_activity: false,
      block_reason: "empty_selection",
    });
  });

  it("allows Add Activity for a valid selection", () => {
    const compression = compress("rows", [
      buildTree({ row_number: 1, position_in_row: 1 }),
    ]);

    expect(getPlotSelectionActivityActionState(compression)).toEqual({
      status: "ready",
      can_start_activity: true,
      block_reason: null,
    });
  });

  it("blocks Add Activity for cross-plot selections", () => {
    const compression = compress("rows", [
      buildTree({ plot_id: "plot-1", row_number: 1, position_in_row: 1 }),
      buildTree({ plot_id: "plot-2", row_number: 1, position_in_row: 2 }),
    ]);

    expect(getPlotSelectionActivityActionState(compression)).toMatchObject({
      status: "blocked",
      can_start_activity: false,
      block_reason: "cross_plot_selection",
    });
  });

  it("blocks Add Activity when scope or query limits are exceeded", () => {
    const trees = Array.from({ length: 21 }, (_, index) =>
      buildTree({
        row_number: 1,
        position_in_row: index * 2 + 1,
      }),
    );
    const scopeLimitCompression = compressPlotSelectionToActivityScopes(
      {
        layout_type: "rows",
        trees,
      },
      { max_scopes: 20 },
    );
    const queryLimitCompression = compressPlotSelectionToActivityScopes(
      {
        layout_type: "rows",
        trees: [buildTree({ row_number: 1, position_in_row: 1 })],
      },
      { max_query_string_length: 10 },
    );

    expect(getPlotSelectionActivityActionState(scopeLimitCompression)).toMatchObject({
      status: "blocked",
      can_start_activity: false,
      block_reason: "scope_count_limit_exceeded",
    });
    expect(getPlotSelectionActivityActionState(queryLimitCompression)).toMatchObject({
      status: "blocked",
      can_start_activity: false,
      block_reason: "query_string_limit_exceeded",
    });
  });
});
