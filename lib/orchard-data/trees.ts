import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PlotStatus,
  TreeListFilters,
  TreeSummary,
  VarietySummary,
} from "@/types/contracts";

type TreeQueryRow = {
  id: string;
  orchard_id: string;
  plot_id: string;
  variety_id: string | null;
  species: string;
  tree_code: string | null;
  display_name: string | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  row_label: string | null;
  position_label: string | null;
  planted_at: string | null;
  acquired_at: string | null;
  rootstock: string | null;
  pollinator_info: string | null;
  condition_status: TreeSummary["condition_status"];
  health_status: string | null;
  development_stage: string | null;
  last_harvest_at: string | null;
  notes: string | null;
  location_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plot:
    | { id: string; name: string; status: PlotStatus }
    | Array<{ id: string; name: string; status: PlotStatus }>
    | null;
  variety:
    | { id: string; name: string; species: VarietySummary["species"] }
    | Array<{ id: string; name: string; species: VarietySummary["species"] }>
    | null;
};

const treeSelect = `
  id,
  orchard_id,
  plot_id,
  variety_id,
  species,
  tree_code,
  display_name,
  section_name,
  row_number,
  position_in_row,
  row_label,
  position_label,
  planted_at,
  acquired_at,
  rootstock,
  pollinator_info,
  condition_status,
  health_status,
  development_stage,
  last_harvest_at,
  notes,
  location_verified,
  is_active,
  created_at,
  updated_at,
  plot:plots (
    id,
    name,
    status
  ),
  variety:varieties (
    id,
    name,
    species
  )
`;

function sanitizeSearchInput(input: string) {
  return input.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", " ");
}

function pickJoinedRecord<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function formatTreeLocationLabel(tree: {
  section_name?: string | null;
  row_number?: number | null;
  position_in_row?: number | null;
  tree_code?: string | null;
}) {
  const parts: string[] = [];

  if (tree.section_name) {
    parts.push(`Section ${tree.section_name}`);
  }

  if (typeof tree.row_number === "number" && typeof tree.position_in_row === "number") {
    parts.push(`Row ${tree.row_number}, pos ${tree.position_in_row}`);
  }

  if (tree.tree_code) {
    parts.push(tree.tree_code);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

function mapTreeRowToSummary(row: TreeQueryRow): TreeSummary {
  const plot = pickJoinedRecord(row.plot);
  const variety = pickJoinedRecord(row.variety);

  return {
    id: row.id,
    orchard_id: row.orchard_id,
    plot_id: row.plot_id,
    plot_name: plot?.name ?? "Unknown plot",
    plot_status: plot?.status ?? "active",
    variety_id: row.variety_id,
    variety_name: variety?.name ?? null,
    variety_species: variety?.species ?? null,
    species: row.species,
    tree_code: row.tree_code,
    display_name: row.display_name,
    section_name: row.section_name,
    row_number: row.row_number,
    position_in_row: row.position_in_row,
    row_label: row.row_label,
    position_label: row.position_label,
    planted_at: row.planted_at,
    acquired_at: row.acquired_at,
    rootstock: row.rootstock,
    pollinator_info: row.pollinator_info,
    condition_status: row.condition_status,
    health_status: row.health_status,
    development_stage: row.development_stage,
    last_harvest_at: row.last_harvest_at,
    notes: row.notes,
    location_verified: row.location_verified,
    is_active: row.is_active,
    location_label: formatTreeLocationLabel(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function sortTrees(left: TreeSummary, right: TreeSummary) {
  const plotDiff = left.plot_name.localeCompare(right.plot_name);

  if (plotDiff !== 0) {
    return plotDiff;
  }

  const leftRow = left.row_number ?? Number.MAX_SAFE_INTEGER;
  const rightRow = right.row_number ?? Number.MAX_SAFE_INTEGER;

  if (leftRow !== rightRow) {
    return leftRow - rightRow;
  }

  const leftPosition = left.position_in_row ?? Number.MAX_SAFE_INTEGER;
  const rightPosition = right.position_in_row ?? Number.MAX_SAFE_INTEGER;

  if (leftPosition !== rightPosition) {
    return leftPosition - rightPosition;
  }

  const leftCode = left.tree_code ?? "";
  const rightCode = right.tree_code ?? "";

  if (leftCode !== rightCode) {
    return leftCode.localeCompare(rightCode);
  }

  return (left.display_name ?? "").localeCompare(right.display_name ?? "");
}

export async function listTreesForOrchard(
  orchardId: string,
  filters: TreeListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("trees").select(treeSelect).eq("orchard_id", orchardId);

  if (filters.plot_id) {
    query = query.eq("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    query = query.eq("variety_id", filters.variety_id);
  }

  if (filters.species) {
    query = query.ilike("species", `%${filters.species}%`);
  }

  if (filters.condition_status && filters.condition_status !== "all") {
    query = query.eq("condition_status", filters.condition_status);
  }

  if (filters.is_active && filters.is_active !== "all") {
    query = query.eq("is_active", filters.is_active === "true");
  }

  if (filters.q) {
    const safeSearch = sanitizeSearchInput(filters.q);

    query = query.or(
      `tree_code.ilike.%${safeSearch}%,display_name.ilike.%${safeSearch}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as TreeQueryRow[]).map(mapTreeRowToSummary).sort(sortTrees);
}

export async function readTreeByIdForOrchard(orchardId: string, treeId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trees")
    .select(treeSelect)
    .eq("orchard_id", orchardId)
    .eq("id", treeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapTreeRowToSummary(data as TreeQueryRow) : null;
}
