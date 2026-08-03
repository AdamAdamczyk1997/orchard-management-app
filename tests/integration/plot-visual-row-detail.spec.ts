import { afterEach, describe, expect, it } from "vitest";
import { getPlotVisualRowDetailForOrchard } from "@/lib/orchard-data/trees";
import { PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT } from "@/lib/domain/plot-visual-row-detail";
import type { PlotVisualRowDetailFilters } from "@/types/contracts";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createVarietyAsUser,
  signInTestUser,
} from "../helpers/test-data";

const baseFilters: PlotVisualRowDetailFilters = {
  section_name: "A",
  row_number: 2,
  lifecycle: "all",
  variety_id: "all",
  condition_status: "all",
  location_verified: "all",
};

describe("plot visual row detail", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("returns one orchard-scoped row and keeps mixed sections separate", async () => {
    const owner = await createTestUser("plot-row-detail-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("plot-row-detail"),
      code: "PVO-ROW",
    });
    const otherOrchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("plot-row-detail-other"),
      code: "PVO-ROW-X",
    });
    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "Row Detail Plot",
      code: "ROW-DETAIL",
      layoutType: "mixed",
      rowNumberingScheme: "north_to_south",
      treeNumberingScheme: "from_row_start",
      defaultRowCount: 3,
      defaultTreesPerRow: 5,
    });
    const otherPlot = await createPlotAsUser(client, {
      orchardId: otherOrchard.orchard_id,
      name: "Other Row Detail Plot",
      code: "ROW-DETAIL-X",
      layoutType: "mixed",
      rowNumberingScheme: "north_to_south",
      treeNumberingScheme: "from_row_start",
      defaultRowCount: 3,
      defaultTreesPerRow: 5,
    });
    const variety = await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Focused Variety",
    });

    const { error } = await client.from("trees").insert([
      {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        variety_id: variety.id,
        species: "apple",
        tree_code: "ROW-A-2-1",
        display_name: "Row A 2 1",
        section_name: "A",
        row_number: 2,
        position_in_row: 1,
        condition_status: "good",
        location_verified: true,
        is_active: true,
      },
      {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        variety_id: variety.id,
        species: "apple",
        tree_code: "ROW-A-2-2",
        display_name: "Row A 2 2",
        section_name: "A",
        row_number: 2,
        position_in_row: 2,
        condition_status: "warning",
        location_verified: false,
        is_active: true,
      },
      {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        variety_id: null,
        species: "apple",
        tree_code: "ROW-A-2-3",
        display_name: "Row A 2 3",
        section_name: "A",
        row_number: 2,
        position_in_row: 3,
        condition_status: "removed",
        location_verified: true,
        is_active: false,
      },
      {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        variety_id: null,
        species: "pear",
        tree_code: "ROW-B-2-1",
        display_name: "Row B 2 1",
        section_name: "B",
        row_number: 2,
        position_in_row: 4,
        condition_status: "critical",
        location_verified: true,
        is_active: true,
      },
      {
        orchard_id: otherOrchard.orchard_id,
        plot_id: otherPlot.id,
        variety_id: null,
        species: "apple",
        tree_code: "ROW-OTHER-2-1",
        display_name: "Other row 2 1",
        section_name: "A",
        row_number: 2,
        position_in_row: 1,
        condition_status: "good",
        location_verified: true,
        is_active: true,
      },
    ]);

    if (error) {
      throw error;
    }

    const detail = await getPlotVisualRowDetailForOrchard(
      orchard.orchard_id,
      plot.id,
      baseFilters,
      client,
    );

    expect(detail).toMatchObject({
      plot_id: plot.id,
      section_name: "A",
      row_number: 2,
      row_tree_count: 3,
      filtered_tree_count: 3,
      row_trees_truncated: false,
      filtered_trees_truncated: false,
      can_render_marker_visual: true,
    });
    expect(detail.row_trees.map((tree) => tree.tree_code)).toEqual([
      "ROW-A-2-1",
      "ROW-A-2-2",
      "ROW-A-2-3",
    ]);

    const sectionBDetail = await getPlotVisualRowDetailForOrchard(
      orchard.orchard_id,
      plot.id,
      {
        ...baseFilters,
        section_name: "B",
      },
      client,
    );
    expect(sectionBDetail.row_trees.map((tree) => tree.tree_code)).toEqual([
      "ROW-B-2-1",
    ]);

    const filteredDetail = await getPlotVisualRowDetailForOrchard(
      orchard.orchard_id,
      plot.id,
      {
        ...baseFilters,
        lifecycle: "active",
        variety_id: variety.id,
        condition_status: "warning",
        location_verified: "unverified",
      },
      client,
    );
    expect(filteredDetail.row_tree_count).toBe(3);
    expect(filteredDetail.filtered_tree_count).toBe(1);
    expect(filteredDetail.filtered_trees[0]?.tree_code).toBe("ROW-A-2-2");

    const crossOrchardDetail = await getPlotVisualRowDetailForOrchard(
      orchard.orchard_id,
      otherPlot.id,
      baseFilters,
      client,
    );
    expect(crossOrchardDetail.row_tree_count).toBe(0);
    expect(crossOrchardDetail.row_trees).toEqual([]);
  });

  it("marks long rows as table fallback and caps marker payload", async () => {
    const owner = await createTestUser("plot-row-detail-long-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("plot-row-detail-long"),
      code: "PVO-ROW-LONG",
    });
    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "Long Row Detail Plot",
      code: "ROW-LONG",
      layoutType: "rows",
      defaultRowCount: 1,
      defaultTreesPerRow: PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT + 5,
    });
    const treeRows = Array.from(
      { length: PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT + 5 },
      (_, index) => ({
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        species: "apple",
        tree_code: `ROW-LONG-${String(index + 1).padStart(3, "0")}`,
        row_number: 1,
        position_in_row: index + 1,
        condition_status: "good",
        location_verified: true,
        is_active: true,
      }),
    );
    const { error } = await client.from("trees").insert(treeRows);

    if (error) {
      throw error;
    }

    const detail = await getPlotVisualRowDetailForOrchard(
      orchard.orchard_id,
      plot.id,
      {
        ...baseFilters,
        section_name: null,
        row_number: 1,
      },
      client,
    );

    expect(detail.row_tree_count).toBe(PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT + 5);
    expect(detail.row_trees).toHaveLength(PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT);
    expect(detail.row_trees_truncated).toBe(true);
    expect(detail.filtered_trees_truncated).toBe(true);
    expect(detail.can_render_marker_visual).toBe(false);
  });
});
