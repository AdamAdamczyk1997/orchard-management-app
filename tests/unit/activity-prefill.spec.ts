import { describe, expect, it } from "vitest";
import {
  buildActivityPrefillFromPlotSelection,
  buildActivityPrefillHref,
  buildActivityPrefillSearchParams,
} from "@/lib/domain/activity-prefill";
import { resolveActivityPrefillFromSearchParams } from "@/lib/validation/activity-prefill";
import type { PlotOption, TreeOption, TreeSummary } from "@/types/contracts";

const PLOT_ID = "11111111-1111-4111-8111-111111111111";
const SECOND_PLOT_ID = "22222222-2222-4222-8222-222222222222";
const TREE_ID = "33333333-3333-4333-8333-333333333333";
const SECOND_TREE_ID = "44444444-4444-4444-8444-444444444444";
const OUTSIDER_TREE_ID = "55555555-5555-4555-8555-555555555555";

const plotOptions: PlotOption[] = [
  {
    id: PLOT_ID,
    name: "Kwatera Polnocna",
    status: "active",
    layout_type: "rows",
    row_numbering_scheme: "left_to_right_from_entrance",
    tree_numbering_scheme: "from_row_start",
    entrance_description: null,
    layout_notes: null,
    default_row_count: 2,
    default_trees_per_row: 3,
  },
  {
    id: SECOND_PLOT_ID,
    name: "Dolny Taras",
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

const treeOptions: TreeOption[] = [
  {
    id: TREE_ID,
    plot_id: PLOT_ID,
    plot_name: "Kwatera Polnocna",
    label: "Ligol R1/P1",
    is_active: true,
  },
  {
    id: SECOND_TREE_ID,
    plot_id: PLOT_ID,
    plot_name: "Kwatera Polnocna",
    label: "Ligol R1/P2",
    is_active: true,
  },
  {
    id: OUTSIDER_TREE_ID,
    plot_id: SECOND_PLOT_ID,
    plot_name: "Dolny Taras",
    label: "President Block B",
    is_active: true,
  },
];

function resolve(searchParams: Record<string, string | undefined>) {
  return resolveActivityPrefillFromSearchParams(searchParams, {
    plotOptions,
    treeOptions,
  });
}

let nextTreeIndex = 0;

function buildTree(overrides: Partial<TreeSummary> = {}): TreeSummary {
  nextTreeIndex += 1;

  return {
    id: overrides.id ?? `tree-${nextTreeIndex}`,
    orchard_id: overrides.orchard_id ?? "orchard-1",
    plot_id: overrides.plot_id ?? PLOT_ID,
    plot_name: overrides.plot_name ?? "Kwatera Polnocna",
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

describe("activity prefill query format", () => {
  it("builds single-tree prefill from one selected plot tree", () => {
    const result = buildActivityPrefillFromPlotSelection({
      selectedTrees: [buildTree({ id: TREE_ID, row_number: 1, position_in_row: 1 })],
      activityScopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          row_number: 1,
          from_position: 1,
          to_position: 1,
        },
      ],
    });

    expect(result).toEqual({
      plot_id: PLOT_ID,
      tree_id: TREE_ID,
      scopes: [
        {
          scope_order: 1,
          scope_level: "tree",
          tree_id: TREE_ID,
        },
      ],
    });
  });

  it("builds multi-range prefill from multiple selected plot trees", () => {
    const activityScopes = [
      {
        scope_order: 1,
        scope_level: "location_range" as const,
        section_name: "A",
        row_number: 1,
        from_position: 1,
        to_position: 3,
      },
    ];
    const result = buildActivityPrefillFromPlotSelection({
      selectedTrees: [
        buildTree({ id: TREE_ID, row_number: 1, position_in_row: 1 }),
        buildTree({ id: SECOND_TREE_ID, row_number: 1, position_in_row: 2 }),
      ],
      activityScopes,
    });

    expect(result).toEqual({
      plot_id: PLOT_ID,
      scopes: activityScopes,
    });
  });

  it("does not build plot selection prefill for empty or cross-plot selections", () => {
    expect(
      buildActivityPrefillFromPlotSelection({
        selectedTrees: [],
        activityScopes: [],
      }),
    ).toBeNull();

    expect(
      buildActivityPrefillFromPlotSelection({
        selectedTrees: [
          buildTree({ plot_id: PLOT_ID }),
          buildTree({ plot_id: SECOND_PLOT_ID }),
        ],
        activityScopes: [
          {
            scope_order: 1,
            scope_level: "location_range",
            row_number: 1,
            from_position: 1,
            to_position: 2,
          },
        ],
      }),
    ).toBeNull();
  });

  it("builds a stable /activities/new href with encoded scopes", () => {
    const href = buildActivityPrefillHref({
      plot_id: PLOT_ID,
      scopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          section_name: "A",
          row_number: 1,
          from_position: 1,
          to_position: 3,
        },
      ],
    });

    expect(href).toContain("/activities/new?plot_id=");
    expect(href).toContain(PLOT_ID);
    expect(href).toContain("scopes=");
  });

  it("parses plot-only prefill safely", () => {
    const result = resolve({ plot_id: PLOT_ID });

    expect(result.status).toBe("applied");
    expect(result.prefill).toEqual({
      plot_id: PLOT_ID,
      tree_id: undefined,
      scopes: [],
    });
  });

  it("synthesizes a tree scope for single tree prefill", () => {
    const result = resolve({ plot_id: PLOT_ID, tree_id: TREE_ID });

    expect(result.status).toBe("applied");
    expect(result.prefill).toEqual({
      plot_id: PLOT_ID,
      tree_id: TREE_ID,
      scopes: [
        {
          scope_order: 1,
          scope_level: "tree",
          tree_id: TREE_ID,
        },
      ],
    });
  });

  it("parses multi-range selection scopes without a parent tree", () => {
    const searchParams = buildActivityPrefillSearchParams({
      plot_id: PLOT_ID,
      scopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          section_name: "A",
          row_number: 1,
          from_position: 1,
          to_position: 3,
        },
        {
          scope_order: 2,
          scope_level: "location_range",
          section_name: "A",
          row_number: 2,
          from_position: 1,
          to_position: 2,
        },
      ],
    });
    const result = resolve(Object.fromEntries(searchParams));

    expect(result.status).toBe("applied");
    expect(result.prefill?.tree_id).toBeUndefined();
    expect(result.prefill?.scopes).toHaveLength(2);
    expect(result.prefill?.scopes[0]).toMatchObject({
      scope_level: "location_range",
      row_number: 1,
      from_position: 1,
      to_position: 3,
    });
  });

  it("rejects invalid JSON and falls back without prefill", () => {
    const result = resolve({ plot_id: PLOT_ID, scopes: "[not-json]" });

    expect(result.status).toBe("invalid");
    expect(result.prefill).toBeNull();
  });

  it("rejects trees outside the requested active orchard plot", () => {
    const result = resolve({
      plot_id: PLOT_ID,
      tree_id: OUTSIDER_TREE_ID,
    });

    expect(result.status).toBe("invalid");
    expect(result.prefill).toBeNull();
  });

  it("rejects row ranges for irregular plots", () => {
    const searchParams = buildActivityPrefillSearchParams({
      plot_id: SECOND_PLOT_ID,
      scopes: [
        {
          scope_order: 1,
          scope_level: "location_range",
          row_number: 1,
          from_position: 1,
          to_position: 2,
        },
      ],
    });
    const result = resolve(Object.fromEntries(searchParams));

    expect(result.status).toBe("invalid");
    expect(result.prefill).toBeNull();
  });
});
