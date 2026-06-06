import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLOT_VISUAL_TREE_FILTERS,
  buildPlotVisualGrid,
  filterPlotVisualTrees,
} from "@/lib/domain/plot-visual-grid";
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

function buildGrid(layoutType: PlotLayoutType, trees: TreeSummary[]) {
  return buildPlotVisualGrid({ layout_type: layoutType }, trees);
}

describe("plot visual grid", () => {
  it("groups trees by section and row", () => {
    const grid = buildGrid("rows", [
      buildTree({ section_name: "B", row_number: 2, position_in_row: 1 }),
      buildTree({ section_name: "A", row_number: 1, position_in_row: 1 }),
      buildTree({ section_name: "A", row_number: 2, position_in_row: 1 }),
    ]);

    expect(grid.mode).toBe("grid");
    expect(grid.sections.map((section) => section.section_name)).toEqual([
      "A",
      "B",
    ]);
    expect(grid.sections[0]?.rows.map((row) => row.row_number)).toEqual([1, 2]);
  });

  it("supports different row lengths and infers empty positions only inside min/max", () => {
    const grid = buildGrid("rows", [
      buildTree({ row_number: 1, position_in_row: 1 }),
      buildTree({ row_number: 1, position_in_row: 4 }),
      buildTree({ row_number: 2, position_in_row: 10 }),
      buildTree({ row_number: 2, position_in_row: 12 }),
    ]);

    const firstRow = grid.sections[0]?.rows.find((row) => row.row_number === 1);
    const secondRow = grid.sections[0]?.rows.find((row) => row.row_number === 2);

    expect(firstRow?.positions.map((position) => position.position)).toEqual([
      1,
      2,
      3,
      4,
    ]);
    expect(firstRow?.positions.map((position) => position.kind)).toEqual([
      "active_tree",
      "empty_inferred",
      "empty_inferred",
      "active_tree",
    ]);
    expect(secondRow?.positions.map((position) => position.position)).toEqual([
      10,
      11,
      12,
    ]);
  });

  it("shows an active tree before removed historical trees at the same location", () => {
    const activeTree = buildTree({
      id: "active-tree",
      row_number: 3,
      position_in_row: 7,
      condition_status: "good",
      is_active: true,
    });
    const removedTree = buildTree({
      id: "removed-tree",
      row_number: 3,
      position_in_row: 7,
      condition_status: "removed",
      is_active: false,
    });
    const grid = buildGrid("rows", [removedTree, activeTree]);
    const position = grid.sections[0]?.rows[0]?.positions[0];

    expect(position?.kind).toBe("active_tree");
    expect(position?.kind === "active_tree" ? position.tree.id : null).toBe(
      "active-tree",
    );
    expect(
      position?.kind === "active_tree"
        ? position.historical_trees.map((tree) => tree.id)
        : [],
    ).toEqual(["removed-tree"]);
  });

  it("moves incomplete row locations to fallback for row plots", () => {
    const grid = buildGrid("rows", [
      buildTree({ row_number: 1, position_in_row: 1 }),
      buildTree({ row_number: 2 }),
      buildTree({ position_in_row: 3 }),
    ]);

    expect(grid.renderable_tree_count).toBe(1);
    expect(grid.unlocated_trees).toHaveLength(2);
    expect(grid.warnings.map((warning) => warning.code)).toContain(
      "ROWS_MISSING_COORDINATES",
    );
  });

  it("renders mixed plots as partial grid with coverage warning", () => {
    const grid = buildGrid("mixed", [
      buildTree({ section_name: "North", row_number: 1, position_in_row: 1 }),
      buildTree({ section_name: "South" }),
    ]);

    expect(grid.mode).toBe("grid");
    expect(grid.sections).toHaveLength(1);
    expect(grid.unlocated_trees).toHaveLength(1);
    expect(grid.warnings.map((warning) => warning.code)).toContain(
      "MIXED_PARTIAL_COVERAGE",
    );
  });

  it("warns about duplicated active logical locations across sections", () => {
    const grid = buildGrid("mixed", [
      buildTree({ section_name: "North", row_number: 1, position_in_row: 5 }),
      buildTree({ section_name: "South", row_number: 1, position_in_row: 5 }),
    ]);

    expect(grid.warnings.map((warning) => warning.code)).toContain(
      "DUPLICATE_ACTIVE_LOCATION",
    );
  });

  it("does not fake a row grid for irregular plots", () => {
    const trees = [
      buildTree({ section_name: "Old Quarter", row_number: 1, position_in_row: 1 }),
      buildTree({ tree_code: "IRR-2" }),
    ];
    const grid = buildGrid("irregular", trees);

    expect(grid.mode).toBe("fallback");
    expect(grid.sections).toEqual([]);
    expect(grid.unlocated_trees.map((tree) => tree.id).sort()).toEqual(
      trees.map((tree) => tree.id).sort(),
    );
    expect(grid.warnings.map((warning) => warning.code)).toContain(
      "IRREGULAR_LAYOUT",
    );
  });
});

describe("plot visual tree filters", () => {
  it("filters active and removed lifecycle trees", () => {
    const activeTree = buildTree({ id: "active-tree" });
    const inactiveTree = buildTree({ id: "inactive-tree", is_active: false });
    const removedTree = buildTree({
      id: "removed-tree",
      condition_status: "removed",
      is_active: false,
    });

    expect(
      filterPlotVisualTrees([activeTree, inactiveTree, removedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        lifecycle: "active",
      }).map((tree) => tree.id),
    ).toEqual(["active-tree"]);

    expect(
      filterPlotVisualTrees([activeTree, inactiveTree, removedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        lifecycle: "removed",
      }).map((tree) => tree.id),
    ).toEqual(["inactive-tree", "removed-tree"]);
  });

  it("filters by assigned variety and unassigned trees", () => {
    const ligolTree = buildTree({
      id: "ligol-tree",
      variety_id: "variety-ligol",
      variety_name: "Ligol",
    });
    const szampionTree = buildTree({
      id: "szampion-tree",
      variety_id: "variety-szampion",
      variety_name: "Szampion",
    });
    const unassignedTree = buildTree({ id: "unassigned-tree", variety_id: null });

    expect(
      filterPlotVisualTrees([ligolTree, szampionTree, unassignedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        variety_id: "variety-ligol",
      }).map((tree) => tree.id),
    ).toEqual(["ligol-tree"]);

    expect(
      filterPlotVisualTrees([ligolTree, szampionTree, unassignedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        variety_id: "unassigned",
      }).map((tree) => tree.id),
    ).toEqual(["unassigned-tree"]);
  });

  it("filters by condition status", () => {
    const goodTree = buildTree({ id: "good-tree", condition_status: "good" });
    const warningTree = buildTree({
      id: "warning-tree",
      condition_status: "warning",
    });

    expect(
      filterPlotVisualTrees([goodTree, warningTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        condition_status: "warning",
      }).map((tree) => tree.id),
    ).toEqual(["warning-tree"]);
  });

  it("filters verified and unverified locations", () => {
    const verifiedTree = buildTree({ id: "verified-tree", location_verified: true });
    const unverifiedTree = buildTree({
      id: "unverified-tree",
      location_verified: false,
    });

    expect(
      filterPlotVisualTrees([verifiedTree, unverifiedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        location_verified: "verified",
      }).map((tree) => tree.id),
    ).toEqual(["verified-tree"]);

    expect(
      filterPlotVisualTrees([verifiedTree, unverifiedTree], {
        ...DEFAULT_PLOT_VISUAL_TREE_FILTERS,
        location_verified: "unverified",
      }).map((tree) => tree.id),
    ).toEqual(["unverified-tree"]);
  });

  it("combines lifecycle, variety, condition, and location filters", () => {
    const matchingTree = buildTree({
      id: "matching-tree",
      variety_id: "variety-ligol",
      condition_status: "warning",
      location_verified: false,
    });
    const wrongLifecycleTree = buildTree({
      id: "wrong-lifecycle-tree",
      variety_id: "variety-ligol",
      condition_status: "warning",
      location_verified: false,
      is_active: false,
    });
    const wrongVarietyTree = buildTree({
      id: "wrong-variety-tree",
      variety_id: "variety-szampion",
      condition_status: "warning",
      location_verified: false,
    });
    const wrongConditionTree = buildTree({
      id: "wrong-condition-tree",
      variety_id: "variety-ligol",
      condition_status: "good",
      location_verified: false,
    });
    const wrongLocationTree = buildTree({
      id: "wrong-location-tree",
      variety_id: "variety-ligol",
      condition_status: "warning",
      location_verified: true,
    });

    expect(
      filterPlotVisualTrees(
        [
          matchingTree,
          wrongLifecycleTree,
          wrongVarietyTree,
          wrongConditionTree,
          wrongLocationTree,
        ],
        {
          lifecycle: "active",
          variety_id: "variety-ligol",
          condition_status: "warning",
          location_verified: "unverified",
        },
      ).map((tree) => tree.id),
    ).toEqual(["matching-tree"]);
  });
});
