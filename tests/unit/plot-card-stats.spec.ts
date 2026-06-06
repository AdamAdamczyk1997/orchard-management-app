import { describe, expect, it } from "vitest";
import {
  buildPlotTreeStatsByPlot,
  getPlotTreeStatsForPlot,
  PLOT_CARD_DOMINANT_VARIETY_LIMIT,
  type PlotCardStatsTreeSource,
} from "@/lib/domain/plot-card-stats";

function buildTree(
  overrides: Partial<PlotCardStatsTreeSource> = {},
): PlotCardStatsTreeSource {
  return {
    plot_id: overrides.plot_id ?? "plot-1",
    is_active: overrides.is_active ?? true,
    condition_status: overrides.condition_status ?? "good",
    variety_id: "variety_id" in overrides ? overrides.variety_id : "variety-gala",
    variety_name: "variety_name" in overrides ? overrides.variety_name : "Gala",
    variety_species:
      "variety_species" in overrides ? overrides.variety_species : "apple",
  };
}

describe("plot card tree stats", () => {
  it("counts active trees separately from removed and inactive trees", () => {
    const statsByPlot = buildPlotTreeStatsByPlot([
      buildTree(),
      buildTree({ condition_status: "warning" }),
      buildTree({ is_active: false }),
      buildTree({ condition_status: "removed", is_active: false }),
    ]);

    const stats = getPlotTreeStatsForPlot(statsByPlot, "plot-1");

    expect(stats.active_tree_count).toBe(2);
    expect(stats.removed_or_inactive_tree_count).toBe(2);
  });

  it("uses only active assigned-variety trees for dominant varieties", () => {
    const statsByPlot = buildPlotTreeStatsByPlot([
      buildTree({ variety_id: "variety-gala", variety_name: "Gala" }),
      buildTree({ variety_id: "variety-gala", variety_name: "Gala" }),
      buildTree({ variety_id: "variety-ligol", variety_name: "Ligol" }),
      buildTree({ variety_id: null, variety_name: null }),
      buildTree({
        variety_id: "variety-gala",
        variety_name: "Gala",
        condition_status: "removed",
        is_active: false,
      }),
    ]);

    const stats = getPlotTreeStatsForPlot(statsByPlot, "plot-1");

    expect(stats.active_tree_count).toBe(4);
    expect(stats.dominant_varieties).toEqual([
      {
        variety_id: "variety-gala",
        variety_name: "Gala",
        variety_species: "apple",
        active_tree_count: 2,
      },
      {
        variety_id: "variety-ligol",
        variety_name: "Ligol",
        variety_species: "apple",
        active_tree_count: 1,
      },
    ]);
  });

  it("sorts dominant varieties by count then name and limits the card payload", () => {
    const statsByPlot = buildPlotTreeStatsByPlot([
      buildTree({ variety_id: "variety-gala", variety_name: "Gala" }),
      buildTree({ variety_id: "variety-gala", variety_name: "Gala" }),
      buildTree({ variety_id: "variety-ligol", variety_name: "Ligol" }),
      buildTree({ variety_id: "variety-ligol", variety_name: "Ligol" }),
      buildTree({ variety_id: "variety-idared", variety_name: "Idared" }),
      buildTree({ variety_id: "variety-idared", variety_name: "Idared" }),
      buildTree({ variety_id: "variety-idared", variety_name: "Idared" }),
      buildTree({ variety_id: "variety-ampion", variety_name: "Ampion" }),
    ]);

    const stats = getPlotTreeStatsForPlot(statsByPlot, "plot-1");

    expect(stats.dominant_varieties).toHaveLength(PLOT_CARD_DOMINANT_VARIETY_LIMIT);
    expect(stats.dominant_varieties.map((variety) => variety.variety_name)).toEqual([
      "Idared",
      "Gala",
      "Ligol",
    ]);
  });

  it("keeps stats isolated per plot and returns empty stats for missing plots", () => {
    const statsByPlot = buildPlotTreeStatsByPlot([
      buildTree({ plot_id: "plot-1" }),
      buildTree({ plot_id: "plot-2", variety_id: "variety-ligol", variety_name: "Ligol" }),
      buildTree({ plot_id: "plot-2", is_active: false }),
    ]);

    expect(getPlotTreeStatsForPlot(statsByPlot, "plot-1")).toMatchObject({
      active_tree_count: 1,
      removed_or_inactive_tree_count: 0,
    });
    expect(getPlotTreeStatsForPlot(statsByPlot, "plot-2")).toMatchObject({
      active_tree_count: 1,
      removed_or_inactive_tree_count: 1,
    });
    expect(getPlotTreeStatsForPlot(statsByPlot, "missing-plot")).toEqual({
      active_tree_count: 0,
      removed_or_inactive_tree_count: 0,
      dominant_varieties: [],
    });
  });
});
