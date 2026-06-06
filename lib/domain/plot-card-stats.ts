import type {
  PlotDominantVarietySummary,
  PlotTreeStats,
  TreeConditionStatus,
} from "@/types/contracts";

export const PLOT_CARD_DOMINANT_VARIETY_LIMIT = 3;

export type PlotCardStatsTreeSource = {
  plot_id: string;
  is_active: boolean;
  condition_status: TreeConditionStatus;
  variety_id?: string | null;
  variety_name?: string | null;
  variety_species?: string | null;
};

function createEmptyPlotTreeStats(): PlotTreeStats {
  return {
    active_tree_count: 0,
    removed_or_inactive_tree_count: 0,
    dominant_varieties: [],
  };
}

function isActiveTreeForStats(tree: PlotCardStatsTreeSource) {
  return tree.is_active && tree.condition_status !== "removed";
}

function compareDominantVarieties(
  left: PlotDominantVarietySummary,
  right: PlotDominantVarietySummary,
) {
  const countDiff = right.active_tree_count - left.active_tree_count;

  if (countDiff !== 0) {
    return countDiff;
  }

  return left.variety_name.localeCompare(right.variety_name);
}

export function getEmptyPlotTreeStats(): PlotTreeStats {
  return createEmptyPlotTreeStats();
}

export function getPlotTreeStatsForPlot(
  statsByPlot: Map<string, PlotTreeStats>,
  plotId: string,
) {
  return statsByPlot.get(plotId) ?? createEmptyPlotTreeStats();
}

export function buildPlotTreeStatsByPlot(trees: PlotCardStatsTreeSource[]) {
  const statsByPlot = new Map<string, PlotTreeStats>();
  const varietyStatsByPlot = new Map<string, Map<string, PlotDominantVarietySummary>>();

  for (const tree of trees) {
    const stats = statsByPlot.get(tree.plot_id) ?? createEmptyPlotTreeStats();
    statsByPlot.set(tree.plot_id, stats);

    if (!isActiveTreeForStats(tree)) {
      stats.removed_or_inactive_tree_count += 1;
      continue;
    }

    stats.active_tree_count += 1;

    if (!tree.variety_id || !tree.variety_name) {
      continue;
    }

    const varietyStats =
      varietyStatsByPlot.get(tree.plot_id) ?? new Map<string, PlotDominantVarietySummary>();
    varietyStatsByPlot.set(tree.plot_id, varietyStats);

    const variety = varietyStats.get(tree.variety_id) ?? {
      variety_id: tree.variety_id,
      variety_name: tree.variety_name,
      variety_species: tree.variety_species ?? null,
      active_tree_count: 0,
    };

    variety.active_tree_count += 1;
    varietyStats.set(tree.variety_id, variety);
  }

  for (const [plotId, stats] of statsByPlot) {
    stats.dominant_varieties = Array.from(varietyStatsByPlot.get(plotId)?.values() ?? [])
      .sort(compareDominantVarieties)
      .slice(0, PLOT_CARD_DOMINANT_VARIETY_LIMIT);
  }

  return statsByPlot;
}
