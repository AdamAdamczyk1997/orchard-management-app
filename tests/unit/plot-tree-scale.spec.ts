import { describe, expect, it } from "vitest";
import {
  PLOT_TREE_SCALE_MEDIUM_MAX,
  PLOT_TREE_SCALE_SMALL_MAX,
  buildPlotTreeScaleProfile,
  classifyPlotTreeScale,
  shouldRenderFullPlotVisual,
  type PlotTreeScaleSourceRow,
} from "@/lib/domain/plot-tree-scale";

function tree(
  input: Partial<PlotTreeScaleSourceRow> & {
    id: string;
  },
): PlotTreeScaleSourceRow {
  return {
    id: input.id,
    plot_id: input.plot_id ?? "plot-1",
    section_name: input.section_name ?? null,
    row_number: input.row_number ?? null,
    position_in_row: input.position_in_row ?? null,
    condition_status: input.condition_status ?? "good",
    location_verified: input.location_verified ?? true,
    is_active: input.is_active ?? true,
  };
}

describe("plot tree scale helpers", () => {
  it("classifies plot scale by total tree count", () => {
    expect(classifyPlotTreeScale(0)).toBe("small");
    expect(classifyPlotTreeScale(PLOT_TREE_SCALE_SMALL_MAX)).toBe("small");
    expect(classifyPlotTreeScale(PLOT_TREE_SCALE_SMALL_MAX + 1)).toBe("medium");
    expect(classifyPlotTreeScale(PLOT_TREE_SCALE_MEDIUM_MAX)).toBe("medium");
    expect(classifyPlotTreeScale(PLOT_TREE_SCALE_MEDIUM_MAX + 1)).toBe("large");

    expect(shouldRenderFullPlotVisual(PLOT_TREE_SCALE_SMALL_MAX)).toBe(true);
    expect(shouldRenderFullPlotVisual(PLOT_TREE_SCALE_SMALL_MAX + 1)).toBe(false);
  });

  it("builds row and section summaries using the database logical location key", () => {
    const profile = buildPlotTreeScaleProfile("plot-1", [
      tree({ id: "a-1", section_name: "A", row_number: 1, position_in_row: 1 }),
      tree({
        id: "a-2",
        section_name: "A",
        row_number: 1,
        position_in_row: 2,
        condition_status: "warning",
        location_verified: false,
      }),
      tree({
        id: "a-3",
        section_name: "A",
        row_number: 1,
        position_in_row: 2,
        condition_status: "critical",
      }),
      tree({
        id: "a-4",
        section_name: "A",
        row_number: 1,
        position_in_row: 4,
        condition_status: "removed",
        is_active: false,
        location_verified: false,
      }),
      tree({
        id: "unlocated",
        section_name: "A",
        condition_status: "warning",
        location_verified: false,
      }),
      tree({
        id: "b-1",
        section_name: "B",
        row_number: 1,
        position_in_row: 4,
      }),
    ]);

    expect(profile).toMatchObject({
      plot_id: "plot-1",
      scale_class: "small",
      should_render_full_visual: true,
      total_trees: 6,
      active_trees: 5,
      removed_or_inactive_trees: 1,
      located_trees: 5,
      unlocated_trees: 1,
      unverified_trees: 3,
      warning_trees: 2,
      critical_trees: 1,
      row_count: 2,
      max_row_length: 4,
      duplicate_active_location_count: 1,
    });

    expect(profile.sections).toEqual([
      expect.objectContaining({
        section_name: "A",
        row_count: 1,
        active_trees: 3,
        removed_or_inactive_trees: 1,
        duplicate_active_locations: 1,
      }),
      expect.objectContaining({
        section_name: "B",
        row_count: 1,
        active_trees: 1,
        duplicate_active_locations: 0,
      }),
    ]);

    expect(profile.rows[0]).toMatchObject({
      section_name: "A",
      row_number: 1,
      total_trees: 4,
      active_trees: 3,
      removed_or_inactive_trees: 1,
      occupied_positions: 3,
      from_position: 1,
      to_position: 4,
      missing_positions_in_span: 1,
      duplicate_active_locations: 1,
    });
  });
});
