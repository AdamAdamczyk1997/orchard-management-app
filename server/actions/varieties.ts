"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import {
  createErrorResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createVarietySchema,
  updateVarietySchema,
} from "@/lib/validation/varieties";
import type { ActionResult, VarietySummary } from "@/types/contracts";

const varietySelect =
  "id, orchard_id, species, name, description, care_notes, characteristics, ripening_period, resistance_notes, origin_country, is_favorite, created_at, updated_at";

function mapVarietyMutationError<T>(error: PostgrestError): ActionResult<T> {
  if (
    error.code === "23505" &&
    error.message.includes("varieties_orchard_id_species_name_key")
  ) {
    return createErrorResult(
      "DUPLICATE_VARIETY",
      "This variety already exists for the same species in the active orchard.",
      {
        name: "Choose a different variety name.",
      },
    );
  }

  return createErrorResult("VARIETY_MUTATION_FAILED", error.message);
}

export async function createVariety(
  _previousState: ActionResult<VarietySummary>,
  formData: FormData,
): Promise<ActionResult<VarietySummary>> {
  const parsed = createVarietySchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/varieties");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Active orchard is required.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("varieties")
    .insert({
      orchard_id: orchard.id,
      species: parsed.data.species,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      care_notes: parsed.data.care_notes ?? null,
      characteristics: parsed.data.characteristics ?? null,
      ripening_period: parsed.data.ripening_period ?? null,
      resistance_notes: parsed.data.resistance_notes ?? null,
      origin_country: parsed.data.origin_country ?? null,
      is_favorite: parsed.data.is_favorite ?? false,
    })
    .select(varietySelect)
    .single();

  if (error) {
    return mapVarietyMutationError(error);
  }

  revalidatePath("/varieties");
  revalidatePath("/trees");
  redirect("/varieties");
}

export async function updateVariety(
  _previousState: ActionResult<VarietySummary>,
  formData: FormData,
): Promise<ActionResult<VarietySummary>> {
  const parsed = updateVarietySchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/varieties");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Active orchard is required.");
  }

  const existingVariety = await readVarietyByIdForOrchard(
    orchard.id,
    parsed.data.variety_id,
  );

  if (!existingVariety) {
    return createErrorResult("NOT_FOUND", "Variety not found.");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("varieties")
    .update({
      species: parsed.data.species,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      care_notes: parsed.data.care_notes ?? null,
      characteristics: parsed.data.characteristics ?? null,
      ripening_period: parsed.data.ripening_period ?? null,
      resistance_notes: parsed.data.resistance_notes ?? null,
      origin_country: parsed.data.origin_country ?? null,
      is_favorite: parsed.data.is_favorite ?? false,
    })
    .eq("id", existingVariety.id)
    .eq("orchard_id", orchard.id)
    .select(varietySelect)
    .single();

  if (error) {
    return mapVarietyMutationError(error);
  }

  revalidatePath("/varieties");
  revalidatePath("/trees");
  redirect("/varieties");
}
