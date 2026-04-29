import type { SupabaseClient } from "@supabase/supabase-js";
import { groupVarietyLocationTrees } from "@/lib/domain/variety-locations";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PlotStatus,
  VarietyListFilters,
  VarietyLocationsReport,
  VarietyOption,
  VarietySummary,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

const varietySelect =
  "id, orchard_id, species, name, description, care_notes, characteristics, ripening_period, resistance_notes, origin_country, is_favorite, created_at, updated_at";

type VarietyLocationsTreeRow = {
  id: string;
  plot_id: string;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  location_verified: boolean;
  plot:
    | { id: string; name: string; status: PlotStatus }
    | Array<{ id: string; name: string; status: PlotStatus }>
    | null;
};

function sanitizeSearchInput(input: string) {
  return input.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", " ");
}

function pickJoinedRecord<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

export async function listVarietiesForOrchard(
  orchardId: string,
  filters: VarietyListFilters = {},
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  let query = supabase
    .from("varieties")
    .select(varietySelect)
    .eq("orchard_id", orchardId)
    .order("species", { ascending: true })
    .order("name", { ascending: true });

  if (filters.q) {
    const safeSearch = sanitizeSearchInput(filters.q);

    query = query.or(`name.ilike.%${safeSearch}%,species.ilike.%${safeSearch}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as VarietySummary[];
}

export async function readVarietyByIdForOrchard(
  orchardId: string,
  varietyId: string,
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .from("varieties")
    .select(varietySelect)
    .eq("orchard_id", orchardId)
    .eq("id", varietyId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as VarietySummary | null) ?? null;
}

export async function listVarietyOptionsForOrchard(
  orchardId: string,
  supabaseClient?: QueryClient,
) {
  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .from("varieties")
    .select("id, species, name")
    .eq("orchard_id", orchardId)
    .order("species", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as VarietyOption[];
}

export async function getVarietyLocationsReportForOrchard(
  orchardId: string,
  varietyId: string,
  supabaseClient?: QueryClient,
): Promise<VarietyLocationsReport | null> {
  const supabase = await getQueryClient(supabaseClient);
  const variety = await readVarietyByIdForOrchard(orchardId, varietyId, supabase);

  if (!variety) {
    return null;
  }

  const { data, error } = await supabase
    .from("trees")
    .select(
      `
        id,
        plot_id,
        section_name,
        row_number,
        position_in_row,
        location_verified,
        plot:plots (
          id,
          name,
          status
        )
      `,
    )
    .eq("orchard_id", orchardId)
    .eq("variety_id", varietyId)
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  const activeTrees = ((data ?? []) as VarietyLocationsTreeRow[]).map((row) => {
    const plot = pickJoinedRecord(row.plot);

    return {
      plot_id: row.plot_id,
      plot_name: plot?.name ?? "Unknown plot",
      plot_status: plot?.status ?? "active",
      section_name: row.section_name,
      row_number: row.row_number,
      position_in_row: row.position_in_row,
      location_verified: row.location_verified,
    };
  });

  const locatedTrees = activeTrees
    .filter(
      (tree): tree is typeof tree & { row_number: number; position_in_row: number } =>
        typeof tree.row_number === "number" && typeof tree.position_in_row === "number",
    )
    .map((tree) => ({
      ...tree,
      row_number: tree.row_number,
      position_in_row: tree.position_in_row,
    }));
  const groups = groupVarietyLocationTrees(locatedTrees);
  const verifiedTreesCount = locatedTrees.filter((tree) => tree.location_verified).length;

  return {
    variety_id: variety.id,
    variety_name: variety.name,
    variety_species: variety.species,
    total_active_trees_count: activeTrees.length,
    located_trees_count: locatedTrees.length,
    unlocated_trees_count: activeTrees.length - locatedTrees.length,
    verified_trees_count: verifiedTreesCount,
    unverified_trees_count: locatedTrees.length - verifiedTreesCount,
    groups,
  };
}
