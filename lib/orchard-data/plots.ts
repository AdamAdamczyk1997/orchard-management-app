import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPlotTreeStatsByPlot,
  getPlotTreeStatsForPlot,
  type PlotCardStatsTreeSource,
} from "@/lib/domain/plot-card-stats";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PlotListFilters,
  PlotOption,
  PlotSummary,
  TreeConditionStatus,
} from "@/types/contracts";

const plotSelect =
  "id, orchard_id, name, code, description, location_name, area_m2, soil_type, irrigation_type, layout_type, row_numbering_scheme, tree_numbering_scheme, entrance_description, layout_notes, default_row_count, default_trees_per_row, status, is_active, created_at, updated_at";

const plotStatusPriority: Record<PlotSummary["status"], number> = {
  active: 0,
  planned: 1,
  archived: 2,
};

type PlotStatsVarietyRow =
  | {
      id: string;
      name: string;
      species: string | null;
    }
  | Array<{
      id: string;
      name: string;
      species: string | null;
    }>
  | null;

type PlotStatsTreeRow = {
  plot_id: string;
  variety_id: string | null;
  condition_status: TreeConditionStatus;
  is_active: boolean;
  variety: PlotStatsVarietyRow;
};

function pickJoinedRecord<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function resolveSupabaseClient(supabaseClient?: SupabaseClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

function sortPlots(left: PlotSummary, right: PlotSummary) {
  const statusDiff =
    plotStatusPriority[left.status] - plotStatusPriority[right.status];

  if (statusDiff !== 0) {
    return statusDiff;
  }

  return left.name.localeCompare(right.name);
}

function mapPlotStatsTreeRow(row: PlotStatsTreeRow): PlotCardStatsTreeSource {
  const variety = pickJoinedRecord(row.variety);

  return {
    plot_id: row.plot_id,
    is_active: row.is_active,
    condition_status: row.condition_status,
    variety_id: row.variety_id,
    variety_name: variety?.name ?? null,
    variety_species: variety?.species ?? null,
  };
}

async function listPlotTreeStatsForOrchard(
  orchardId: string,
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  const { data, error } = await supabase
    .from("trees")
    .select(
      `
        plot_id,
        variety_id,
        condition_status,
        is_active,
        variety:varieties (
          id,
          name,
          species
        )
      `,
    )
    .eq("orchard_id", orchardId);

  if (error) {
    throw error;
  }

  return buildPlotTreeStatsByPlot(
    ((data ?? []) as PlotStatsTreeRow[]).map(mapPlotStatsTreeRow),
  );
}

export async function listPlotsForOrchard(
  orchardId: string,
  filters: PlotListFilters = {},
  supabaseClient?: SupabaseClient,
) {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let query = supabase.from("plots").select(plotSelect).eq("orchard_id", orchardId);

  if (filters.status === "all") {
    query = query;
  } else if (filters.status === "archived") {
    query = query.eq("status", "archived");
  } else if (filters.status === "planned") {
    query = query.eq("status", "planned");
  } else if (filters.status === "active") {
    query = query.eq("status", "active");
  } else {
    query = query.in("status", ["active", "planned"]);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const treeStatsByPlot = await listPlotTreeStatsForOrchard(orchardId, supabase);

  return ((data ?? []) as PlotSummary[]).sort(sortPlots).map((plot) => {
    const treeStats = getPlotTreeStatsForPlot(treeStatsByPlot, plot.id);

    return {
      ...plot,
      tree_count: treeStats.active_tree_count,
      tree_stats: treeStats,
    };
  });
}

export async function readPlotByIdForOrchard(orchardId: string, plotId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plots")
    .select(plotSelect)
    .eq("orchard_id", orchardId)
    .eq("id", plotId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlotSummary | null) ?? null;
}

export async function listPlotOptionsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plots")
    .select(
      "id, name, status, layout_type, row_numbering_scheme, tree_numbering_scheme, entrance_description, layout_notes, default_row_count, default_trees_per_row",
    )
    .eq("orchard_id", orchardId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as PlotOption[]).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
}

export async function listPlotCodesForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("plots")
    .select("code")
    .eq("orchard_id", orchardId)
    .not("code", "is", null);

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{ code: string | null }>)
    .map((row) => row.code)
    .filter((code): code is string => typeof code === "string" && code.length > 0);
}
