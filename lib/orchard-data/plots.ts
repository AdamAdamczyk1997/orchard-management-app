import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlotListFilters, PlotOption, PlotSummary } from "@/types/contracts";

const plotSelect =
  "id, orchard_id, name, code, description, location_name, area_m2, soil_type, irrigation_type, layout_type, row_numbering_scheme, tree_numbering_scheme, entrance_description, layout_notes, default_row_count, default_trees_per_row, status, is_active, created_at, updated_at";

const plotStatusPriority: Record<PlotSummary["status"], number> = {
  active: 0,
  planned: 1,
  archived: 2,
};

function sortPlots(left: PlotSummary, right: PlotSummary) {
  const statusDiff =
    plotStatusPriority[left.status] - plotStatusPriority[right.status];

  if (statusDiff !== 0) {
    return statusDiff;
  }

  return left.name.localeCompare(right.name);
}

export async function listPlotsForOrchard(
  orchardId: string,
  filters: PlotListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
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

  return ((data ?? []) as PlotSummary[]).sort(sortPlots);
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
