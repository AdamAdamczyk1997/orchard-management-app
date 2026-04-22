"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import { readTreeByIdForOrchard } from "@/lib/orchard-data/trees";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import {
  createErrorResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import { createTreeSchema, updateTreeSchema } from "@/lib/validation/trees";
import type { ActionResult, TreeSummary } from "@/types/contracts";

const treeSelect = "id";

function mapTreeMutationError<T>(error: PostgrestError): ActionResult<T> {
  if (
    error.code === "23505" &&
    error.message.includes("uq_trees_active_logical_location")
  ) {
    return createErrorResult(
      "LOCATION_CONFLICT",
      "W tej lokalizacji na wybranej dzialce istnieje juz aktywne drzewo.",
      {
        position_in_row: "Wybierz wolny rzad i pozycje.",
      },
    );
  }

  return createErrorResult("TREE_MUTATION_FAILED", "Nie udalo sie zapisac drzewa.");
}

function buildTreePayload(input: ReturnType<typeof createTreeSchema.parse>) {
  return {
    plot_id: input.plot_id,
    variety_id: input.variety_id ?? null,
    species: input.species,
    tree_code: input.tree_code ?? null,
    display_name: input.display_name ?? null,
    section_name: input.section_name ?? null,
    row_number: input.row_number ?? null,
    position_in_row: input.position_in_row ?? null,
    row_label: input.row_label ?? null,
    position_label: input.position_label ?? null,
    planted_at: input.planted_at ?? null,
    acquired_at: input.acquired_at ?? null,
    rootstock: input.rootstock ?? null,
    pollinator_info: input.pollinator_info ?? null,
    condition_status: input.condition_status,
    health_status: input.health_status ?? null,
    development_stage: input.development_stage ?? null,
    last_harvest_at: input.last_harvest_at ?? null,
    notes: input.notes ?? null,
    location_verified: input.location_verified ?? false,
  };
}

export async function createTree(
  _previousState: ActionResult<TreeSummary>,
  formData: FormData,
): Promise<ActionResult<TreeSummary>> {
  const parsed = createTreeSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/trees");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Wybierz sad, aby dodac drzewo.");
  }

  const plot = await readPlotByIdForOrchard(orchard.id, parsed.data.plot_id);

  if (!plot) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Wybierz dzialke z aktywnego sadu.",
      {
        plot_id: "Wybierz poprawna dzialke.",
      },
    );
  }

  if (plot.status === "archived") {
    return createErrorResult(
      "PLOT_ARCHIVED",
      "Nie mozna zapisac drzewa na zarchiwizowanej dzialce.",
      {
        plot_id: "Wybierz aktywna dzialke.",
      },
    );
  }

  if (parsed.data.variety_id) {
    const variety = await readVarietyByIdForOrchard(orchard.id, parsed.data.variety_id);

    if (!variety) {
      return createErrorResult(
        "VALIDATION_ERROR",
        "Wybierz odmiane z aktywnego sadu.",
        {
          variety_id: "Wybierz poprawna odmiane.",
        },
      );
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("trees")
    .insert({
      orchard_id: orchard.id,
      ...buildTreePayload(parsed.data),
    })
    .select(treeSelect)
    .single();

  if (error) {
    return mapTreeMutationError(error);
  }

  const tree = await readTreeByIdForOrchard(orchard.id, data.id);

  if (!tree) {
    return createErrorResult(
      "TREE_MUTATION_FAILED",
      "Drzewo zostalo zapisane, ale nie udalo sie go ponownie odczytac.",
    );
  }

  revalidatePath("/trees");
  redirect("/trees");
}

export async function updateTree(
  _previousState: ActionResult<TreeSummary>,
  formData: FormData,
): Promise<ActionResult<TreeSummary>> {
  const parsed = updateTreeSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/trees");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Wybierz sad, aby zapisac drzewo.");
  }

  const existingTree = await readTreeByIdForOrchard(orchard.id, parsed.data.tree_id);

  if (!existingTree) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranego drzewa.");
  }

  const plot = await readPlotByIdForOrchard(orchard.id, parsed.data.plot_id);

  if (!plot) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Wybierz dzialke z aktywnego sadu.",
      {
        plot_id: "Wybierz poprawna dzialke.",
      },
    );
  }

  if (plot.status === "archived") {
    return createErrorResult(
      "PLOT_ARCHIVED",
      "Nie mozna zapisac drzewa na zarchiwizowanej dzialce.",
      {
        plot_id: "Wybierz aktywna dzialke.",
      },
    );
  }

  if (parsed.data.variety_id) {
    const variety = await readVarietyByIdForOrchard(orchard.id, parsed.data.variety_id);

    if (!variety) {
      return createErrorResult(
        "VALIDATION_ERROR",
        "Wybierz odmiane z aktywnego sadu.",
        {
          variety_id: "Wybierz poprawna odmiane.",
        },
      );
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("trees")
    .update({
      orchard_id: orchard.id,
      ...buildTreePayload(parsed.data),
    })
    .eq("id", existingTree.id)
    .eq("orchard_id", orchard.id)
    .select(treeSelect)
    .single();

  if (error) {
    return mapTreeMutationError(error);
  }

  revalidatePath("/trees");
  redirect("/trees");
}
