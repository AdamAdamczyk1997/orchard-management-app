import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildTreeLocationPreviewLabel,
  buildTreeRangePositions,
  generateTreeCodeFromPattern,
} from "@/lib/domain/tree-batches";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  BulkDeactivateTreesPreviewResult,
  BulkTreeBatchConflict,
  BulkTreeBatchFormInput,
  BulkTreeBatchPreviewResult,
  BulkTreeBatchPreviewTree,
  BulkDeactivateTreesFormInput,
  PlotLayoutType,
  PlotStatus,
  RowNumberingScheme,
  TreeNumberingScheme,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

type PlotRow = {
  id: string;
  orchard_id: string;
  name: string;
  status: PlotStatus;
  layout_type: PlotLayoutType;
  row_numbering_scheme: RowNumberingScheme | null;
  tree_numbering_scheme: TreeNumberingScheme | null;
  entrance_description: string | null;
  layout_notes: string | null;
  default_row_count: number | null;
  default_trees_per_row: number | null;
};

type VarietyRow = {
  id: string;
  orchard_id: string;
  name: string;
};

type TreeRangeRow = {
  id: string;
  orchard_id: string;
  plot_id: string;
  tree_code: string | null;
  display_name: string | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  condition_status: BulkTreeBatchConflict["condition_status"];
  notes: string | null;
  is_active: boolean;
};

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

export async function readPlotPreviewContextForOrchard(
  orchardId: string,
  plotId: string,
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .from("plots")
    .select(
      "id, orchard_id, name, status, layout_type, row_numbering_scheme, tree_numbering_scheme, entrance_description, layout_notes, default_row_count, default_trees_per_row",
    )
    .eq("orchard_id", orchardId)
    .eq("id", plotId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlotRow | null) ?? null;
}

export async function readVarietyPreviewContextForOrchard(
  orchardId: string,
  varietyId: string,
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .from("varieties")
    .select("id, orchard_id, name")
    .eq("orchard_id", orchardId)
    .eq("id", varietyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VarietyRow | null) ?? null;
}

async function listTreesInRangeForOrchard(
  orchardId: string,
  input: {
    plot_id: string;
    row_number: number;
    from_position: number;
    to_position: number;
  },
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .from("trees")
    .select(
      "id, orchard_id, plot_id, tree_code, display_name, section_name, row_number, position_in_row, condition_status, notes, is_active",
    )
    .eq("orchard_id", orchardId)
    .eq("plot_id", input.plot_id)
    .eq("row_number", input.row_number)
    .gte("position_in_row", input.from_position)
    .lte("position_in_row", input.to_position)
    .order("position_in_row", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TreeRangeRow[];
}

export async function previewBulkTreeBatchForOrchard(
  orchardId: string,
  input: BulkTreeBatchFormInput,
  supabaseClient?: QueryClient,
): Promise<BulkTreeBatchPreviewResult> {
  const [plot, variety, treesInRange] = await Promise.all([
    readPlotPreviewContextForOrchard(orchardId, input.plot_id, supabaseClient),
    input.variety_id
      ? readVarietyPreviewContextForOrchard(orchardId, input.variety_id, supabaseClient)
      : Promise.resolve(null),
    listTreesInRangeForOrchard(orchardId, input, supabaseClient),
  ]);

  if (!plot) {
    throw new Error("Tree batch preview requires a plot from the active orchard.");
  }

  const activeConflicts = treesInRange.filter((tree) => tree.is_active);
  const plannedPositions = buildTreeRangePositions(input.from_position, input.to_position);
  const plannedTrees: BulkTreeBatchPreviewTree[] = plannedPositions.map((positionInRow) => {
    const treeCode = generateTreeCodeFromPattern(
      input.generated_tree_code_pattern,
      positionInRow,
    );

    return {
      position_in_row: positionInRow,
      tree_code: treeCode,
      location_label: buildTreeLocationPreviewLabel({
        section_name: input.section_name ?? null,
        row_number: input.row_number,
        position_in_row: positionInRow,
        tree_code: treeCode,
      }),
    };
  });

  return {
    plot_id: plot.id,
    plot_name: plot.name,
    variety_id: variety?.id ?? null,
    variety_name: variety?.name ?? null,
    species: input.species,
    section_name: input.section_name ?? null,
    row_number: input.row_number,
    from_position: input.from_position,
    to_position: input.to_position,
    requested_positions_count: plannedPositions.length,
    generated_tree_code_pattern: input.generated_tree_code_pattern ?? null,
    planned_trees: plannedTrees,
    conflicts: activeConflicts.map((tree) => ({
      tree_id: tree.id,
      position_in_row: tree.position_in_row ?? input.from_position,
      tree_code: tree.tree_code,
      display_name: tree.display_name,
      condition_status: tree.condition_status,
      location_label: buildTreeLocationPreviewLabel({
        section_name: tree.section_name,
        row_number: tree.row_number ?? input.row_number,
        position_in_row: tree.position_in_row ?? input.from_position,
        tree_code: tree.tree_code,
      }),
    })),
  };
}

export async function previewBulkDeactivateTreesForOrchard(
  orchardId: string,
  input: BulkDeactivateTreesFormInput,
  supabaseClient?: QueryClient,
): Promise<BulkDeactivateTreesPreviewResult> {
  const [plot, treesInRange] = await Promise.all([
    readPlotPreviewContextForOrchard(orchardId, input.plot_id, supabaseClient),
    listTreesInRangeForOrchard(orchardId, input, supabaseClient),
  ]);

  if (!plot) {
    throw new Error("Tree deactivation preview requires a plot from the active orchard.");
  }

  const matchedTrees = treesInRange.filter((tree) => tree.is_active);
  const requestedPositions = buildTreeRangePositions(input.from_position, input.to_position);
  const matchedPositions = new Set(
    matchedTrees.map((tree) => tree.position_in_row).filter((value): value is number => {
      return typeof value === "number";
    }),
  );
  const missingPositions = requestedPositions.filter(
    (positionInRow) => !matchedPositions.has(positionInRow),
  );
  const warnings: string[] = [];

  if (missingPositions.length > 0) {
    warnings.push(
      `Zakres zawiera puste pozycje albo drzewa juz nieaktywne: ${missingPositions.join(", ")}.`,
    );
  }

  return {
    plot_id: plot.id,
    plot_name: plot.name,
    row_number: input.row_number,
    from_position: input.from_position,
    to_position: input.to_position,
    requested_positions_count: requestedPositions.length,
    matched_trees: matchedTrees.map((tree) => ({
      tree_id: tree.id,
      position_in_row: tree.position_in_row ?? input.from_position,
      tree_code: tree.tree_code,
      display_name: tree.display_name,
      condition_status: tree.condition_status,
      location_label: buildTreeLocationPreviewLabel({
        section_name: tree.section_name,
        row_number: tree.row_number ?? input.row_number,
        position_in_row: tree.position_in_row ?? input.from_position,
        tree_code: tree.tree_code,
      }),
      notes: tree.notes,
    })),
    missing_positions: missingPositions,
    warnings,
  };
}
