import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildPlotTreeScaleProfile,
  type PlotTreeScaleSourceRow,
} from "@/lib/domain/plot-tree-scale";
import {
  PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT,
  PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT,
  hasActivePlotVisualRowDetailFilters,
} from "@/lib/domain/plot-visual-row-detail";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  TREE_LIST_DEFAULT_PAGE,
  TREE_LIST_DEFAULT_PAGE_SIZE,
} from "@/lib/validation/trees";
import type {
  PlotTreeScaleProfile,
  PlotVisualRowDetail,
  PlotVisualRowDetailFilters,
  PlotStatus,
  TreeListFilters,
  TreeListPage,
  TreeSummary,
  VarietySummary,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

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

type PlotTreeScaleQueryRow = PlotTreeScaleSourceRow;

const PLOT_TREE_SCALE_PAGE_SIZE = 1000;

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

function normalizeTreeListPage(filters: TreeListFilters) {
  return Math.max(TREE_LIST_DEFAULT_PAGE, filters.page ?? TREE_LIST_DEFAULT_PAGE);
}

function normalizeTreeListPageSize(filters: TreeListFilters) {
  return filters.page_size ?? TREE_LIST_DEFAULT_PAGE_SIZE;
}

async function resolveSupabaseClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
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

export async function listTreePageForOrchard(
  orchardId: string,
  filters: TreeListFilters = {},
): Promise<TreeListPage> {
  const supabase = await createSupabaseServerClient();
  const page = normalizeTreeListPage(filters);
  const pageSize = normalizeTreeListPageSize(filters);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let query = supabase
    .from("trees")
    .select(treeSelect, { count: "exact" })
    .eq("orchard_id", orchardId);

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

  const { data, error, count } = await query
    .order("plot_id", { ascending: true })
    .order("section_name", { ascending: true, nullsFirst: false })
    .order("row_number", { ascending: true, nullsFirst: false })
    .order("position_in_row", { ascending: true, nullsFirst: false })
    .order("tree_code", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    throw error;
  }

  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    rows: ((data ?? []) as TreeQueryRow[]).map(mapTreeRowToSummary),
    total_count: totalCount,
    page,
    page_size: pageSize,
    total_pages: totalPages,
  };
}

export async function listTreesForPlotInOrchard(
  orchardId: string,
  plotId: string,
) {
  return listTreesForOrchard(orchardId, { plot_id: plotId });
}

export async function getPlotTreeScaleProfileForOrchard(
  orchardId: string,
  plotId: string,
  supabaseClient?: QueryClient,
): Promise<PlotTreeScaleProfile> {
  const supabase = await resolveSupabaseClient(supabaseClient);
  const rows: PlotTreeScaleQueryRow[] = [];

  for (let from = 0; ; from += PLOT_TREE_SCALE_PAGE_SIZE) {
    const to = from + PLOT_TREE_SCALE_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("trees")
      .select(
        "id, plot_id, section_name, row_number, position_in_row, condition_status, location_verified, is_active",
      )
      .eq("orchard_id", orchardId)
      .eq("plot_id", plotId)
      .order("section_name", { ascending: true, nullsFirst: false })
      .order("row_number", { ascending: true, nullsFirst: false })
      .order("position_in_row", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw error;
    }

    const pageRows = (data ?? []) as PlotTreeScaleQueryRow[];
    rows.push(...pageRows);

    if (pageRows.length < PLOT_TREE_SCALE_PAGE_SIZE) {
      break;
    }
  }

  return buildPlotTreeScaleProfile(plotId, rows);
}

export async function getPlotVisualRowDetailForOrchard(
  orchardId: string,
  plotId: string,
  filters: PlotVisualRowDetailFilters,
  supabaseClient?: QueryClient,
): Promise<PlotVisualRowDetail> {
  const supabase = await resolveSupabaseClient(supabaseClient);
  let rowQuery = supabase
    .from("trees")
    .select(treeSelect, { count: "exact" })
    .eq("orchard_id", orchardId)
    .eq("plot_id", plotId)
    .eq("row_number", filters.row_number);

  rowQuery = filters.section_name
    ? rowQuery.eq("section_name", filters.section_name)
    : rowQuery.is("section_name", null);

  const { data: rowData, error: rowError, count: rowCount } = await rowQuery
    .order("position_in_row", { ascending: true, nullsFirst: false })
    .order("tree_code", { ascending: true, nullsFirst: false })
    .order("display_name", { ascending: true, nullsFirst: false })
    .order("id", { ascending: true })
    .range(0, PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT - 1);

  if (rowError) {
    throw rowError;
  }

  const rowTrees = ((rowData ?? []) as TreeQueryRow[]).map(mapTreeRowToSummary);
  const rowTreeCount = rowCount ?? rowTrees.length;
  let filteredTrees = rowTrees.slice(0, PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT);
  let filteredTreeCount = rowTreeCount;

  if (hasActivePlotVisualRowDetailFilters(filters)) {
    let filteredQuery = supabase
      .from("trees")
      .select(treeSelect, { count: "exact" })
      .eq("orchard_id", orchardId)
      .eq("plot_id", plotId)
      .eq("row_number", filters.row_number);

    filteredQuery = filters.section_name
      ? filteredQuery.eq("section_name", filters.section_name)
      : filteredQuery.is("section_name", null);

    if (filters.lifecycle === "active") {
      filteredQuery = filteredQuery
        .eq("is_active", true)
        .neq("condition_status", "removed");
    }

    if (filters.lifecycle === "removed") {
      filteredQuery = filteredQuery.or(
        "is_active.eq.false,condition_status.eq.removed",
      );
    }

    if (filters.variety_id === "unassigned") {
      filteredQuery = filteredQuery.is("variety_id", null);
    } else if (filters.variety_id !== "all") {
      filteredQuery = filteredQuery.eq("variety_id", filters.variety_id);
    }

    if (filters.condition_status !== "all") {
      filteredQuery = filteredQuery.eq(
        "condition_status",
        filters.condition_status,
      );
    }

    if (filters.location_verified === "verified") {
      filteredQuery = filteredQuery.eq("location_verified", true);
    }

    if (filters.location_verified === "unverified") {
      filteredQuery = filteredQuery.eq("location_verified", false);
    }

    const {
      data: filteredData,
      error: filteredError,
      count: filteredCount,
    } = await filteredQuery
      .order("position_in_row", { ascending: true, nullsFirst: false })
      .order("tree_code", { ascending: true, nullsFirst: false })
      .order("display_name", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true })
      .range(0, PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT - 1);

    if (filteredError) {
      throw filteredError;
    }

    filteredTrees = ((filteredData ?? []) as TreeQueryRow[]).map(
      mapTreeRowToSummary,
    );
    filteredTreeCount = filteredCount ?? filteredTrees.length;
  }

  return {
    plot_id: plotId,
    section_name: filters.section_name,
    row_number: filters.row_number,
    filters,
    row_tree_count: rowTreeCount,
    row_trees: rowTrees,
    row_trees_truncated: rowTrees.length < rowTreeCount,
    filtered_tree_count: filteredTreeCount,
    filtered_trees: filteredTrees,
    filtered_trees_truncated: filteredTrees.length < filteredTreeCount,
    can_render_marker_visual:
      rowTreeCount <= PLOT_VISUAL_ROW_DETAIL_MARKER_LIMIT,
  };
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
