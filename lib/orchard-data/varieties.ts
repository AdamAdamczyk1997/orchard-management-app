import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  VarietyListFilters,
  VarietyOption,
  VarietySummary,
} from "@/types/contracts";

const varietySelect =
  "id, orchard_id, species, name, description, care_notes, characteristics, ripening_period, resistance_notes, origin_country, is_favorite, created_at, updated_at";

function sanitizeSearchInput(input: string) {
  return input.replaceAll(",", " ").replaceAll("(", " ").replaceAll(")", " ");
}

export async function listVarietiesForOrchard(
  orchardId: string,
  filters: VarietyListFilters = {},
) {
  const supabase = await createSupabaseServerClient();
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
) {
  const supabase = await createSupabaseServerClient();
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

export async function listVarietyOptionsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
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
