"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { buildRedirectTargetWithNotice } from "@/lib/domain/feedback-notices";
import {
  supportsRowRangeWorkflows,
  validateTreeLocationForPlotLayout,
} from "@/lib/domain/plots";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import {
  previewBulkDeactivateTreesForOrchard,
  previewBulkTreeBatchForOrchard,
} from "@/lib/orchard-data/tree-batches";
import { readTreeByIdForOrchard } from "@/lib/orchard-data/trees";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import {
  createErrorResult,
  createSuccessResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  bulkDeactivateTreesFormSchema,
  bulkTreeBatchFormSchema,
  createTreeSchema,
  updateTreeSchema,
} from "@/lib/validation/trees";
import type {
  ActionResult,
  BulkDeactivateTreesPreviewResult,
  BulkDeactivateTreesFormInput,
  BulkTreeBatchFormInput,
  BulkTreeBatchPreviewResult,
  TreeSummary,
} from "@/types/contracts";

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

function mapBulkTreeBatchError<T>(error: PostgrestError): ActionResult<T> {
  if (error.code === "23505" && error.message.includes("LOCATION_CONFLICT")) {
    return createErrorResult(
      "LOCATION_CONFLICT",
      "Wybrany zakres koliduje z aktywnym drzewem w tej samej lokalizacji.",
    );
  }

  if (error.code === "22023" && error.message.includes("TREE_CODE_PATTERN_INVALID")) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Wzorzec kodu musi zawierac placeholder {{n}}.",
      {
        generated_tree_code_pattern: "Dodaj placeholder {{n}} do wzorca kodu.",
      },
    );
  }

  if (error.code === "22023" && error.message.includes("PLOT_ARCHIVED")) {
    return createErrorResult(
      "PLOT_ARCHIVED",
      "Nie mozna wykonac operacji na zarchiwizowanej dzialce.",
      {
        plot_id: "Wybierz aktywna dzialke.",
      },
    );
  }

  if (error.code === "P0002" && error.message.includes("NO_MATCHING_TREES")) {
    return createErrorResult(
      "NO_MATCHING_TREES",
      "W wybranym zakresie nie ma aktywnych drzew do wycofania.",
    );
  }

  return createErrorResult("TREE_BATCH_MUTATION_FAILED", "Nie udalo sie wykonac operacji masowej na drzewach.");
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

function validateTreeLocationForSelectedPlot(
  plot: Awaited<ReturnType<typeof readPlotByIdForOrchard>>,
  input: ReturnType<typeof createTreeSchema.parse>,
) {
  if (!plot) {
    return null;
  }

  return validateTreeLocationForPlotLayout(plot, input);
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

  const locationValidation = validateTreeLocationForSelectedPlot(
    plot,
    parsed.data,
  );

  if (locationValidation) {
    return createErrorResult(
      "VALIDATION_ERROR",
      locationValidation.message,
      locationValidation.field_errors,
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
  redirect(buildRedirectTargetWithNotice("/trees", "tree_created"));
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

  const locationValidation = validateTreeLocationForSelectedPlot(
    plot,
    parsed.data,
  );

  if (locationValidation) {
    return createErrorResult(
      "VALIDATION_ERROR",
      locationValidation.message,
      locationValidation.field_errors,
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
  redirect(buildRedirectTargetWithNotice("/trees", "tree_updated"));
}

export async function submitBulkTreeBatch(
  _previousState: ActionResult<BulkTreeBatchPreviewResult>,
  formData: FormData,
): Promise<ActionResult<BulkTreeBatchPreviewResult>> {
  const intent = String(formData.get("intent") ?? "preview");
  const parsed = bulkTreeBatchFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/trees/batch/new");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby utworzyc zakres drzew.",
    );
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
      "Nie mozna tworzyc drzew na zarchiwizowanej dzialce.",
      {
        plot_id: "Wybierz aktywna dzialke.",
      },
    );
  }

  if (!supportsRowRangeWorkflows(plot.layout_type)) {
    return createErrorResult(
      "PLOT_LAYOUT_UNSUPPORTED",
      "Ten flow dziala tylko dla dzialek, ktore wspieraja prace w rzedach.",
      {
        plot_id: "Wybierz dzialke typu rzedowego albo mieszanego.",
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

  const batchInput: BulkTreeBatchFormInput = {
    ...parsed.data,
    row_number: parsed.data.row_number!,
    from_position: parsed.data.from_position!,
    to_position: parsed.data.to_position!,
  };
  const preview = await previewBulkTreeBatchForOrchard(orchard.id, batchInput);

  if (intent !== "create") {
    if (preview.conflicts.length > 0) {
      return {
        success: false,
        error_code: "LOCATION_CONFLICT",
        message:
          "Zakres zawiera aktywne drzewa w tych samych lokalizacjach. Popraw zakres zanim zapiszesz batch.",
        data: preview,
      };
    }

    return createSuccessResult(
      preview,
      `Podglad gotowy. Do utworzenia: ${preview.requested_positions_count} drzew.`,
    );
  }

  if (formData.get("confirm_preview") !== "true") {
    return createErrorResult(
      "PREVIEW_REQUIRED",
      "Najpierw wygeneruj podglad batcha, a potem potwierdz zapis.",
    );
  }

  if (preview.conflicts.length > 0) {
    return {
      success: false,
      error_code: "LOCATION_CONFLICT",
      message:
        "Podczas zapisu nadal wykryto konflikt lokalizacji. Odswiez podglad i popraw zakres.",
      data: preview,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .rpc("create_bulk_tree_batch", {
      p_plot_id: parsed.data.plot_id,
      p_variety_id: parsed.data.variety_id ?? null,
      p_species: parsed.data.species,
      p_section_name: parsed.data.section_name ?? null,
      p_row_number: parsed.data.row_number,
      p_from_position: parsed.data.from_position,
      p_to_position: parsed.data.to_position,
      p_generated_tree_code_pattern: parsed.data.generated_tree_code_pattern ?? null,
      p_default_condition_status: parsed.data.default_condition_status,
      p_default_planted_at: parsed.data.default_planted_at ?? null,
      p_default_rootstock: parsed.data.default_rootstock ?? null,
      p_default_notes: parsed.data.default_notes ?? null,
    })
    .single();

  if (error) {
    const mappedError = mapBulkTreeBatchError<BulkTreeBatchPreviewResult>(error);

    if (mappedError.error_code === "LOCATION_CONFLICT") {
      return {
        ...mappedError,
        data: preview,
      };
    }

    return mappedError;
  }

  revalidatePath("/trees");
  revalidatePath("/dashboard");
  redirect(buildRedirectTargetWithNotice("/trees", "tree_batch_created"));
}

export async function submitBulkDeactivateTrees(
  _previousState: ActionResult<BulkDeactivateTreesPreviewResult>,
  formData: FormData,
): Promise<ActionResult<BulkDeactivateTreesPreviewResult>> {
  const intent = String(formData.get("intent") ?? "preview");
  const parsed = bulkDeactivateTreesFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/trees/batch/deactivate");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby oznaczyc drzewa jako usuniete.",
    );
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
      "Nie mozna oznaczac drzew na zarchiwizowanej dzialce.",
      {
        plot_id: "Wybierz aktywna dzialke.",
      },
    );
  }

  if (!supportsRowRangeWorkflows(plot.layout_type)) {
    return createErrorResult(
      "PLOT_LAYOUT_UNSUPPORTED",
      "Masowe wycofanie po rzedach nie jest dostepne dla dzialki o ukladzie nieregularnym.",
      {
        plot_id: "Wybierz dzialke typu rzedowego albo mieszanego.",
      },
    );
  }

  const deactivateInput: BulkDeactivateTreesFormInput = {
    ...parsed.data,
    row_number: parsed.data.row_number!,
    from_position: parsed.data.from_position!,
    to_position: parsed.data.to_position!,
  };
  const preview = await previewBulkDeactivateTreesForOrchard(
    orchard.id,
    deactivateInput,
  );

  if (intent !== "create") {
    if (preview.matched_trees.length === 0) {
      return {
        success: false,
        error_code: "NO_MATCHING_TREES",
        message: "W wybranym zakresie nie ma aktywnych drzew do wycofania.",
        data: preview,
      };
    }

    return createSuccessResult(
      preview,
      `Podglad gotowy. Do wycofania: ${preview.matched_trees.length} drzew.`,
    );
  }

  if (formData.get("confirm_preview") !== "true") {
    return createErrorResult(
      "PREVIEW_REQUIRED",
      "Najpierw wygeneruj podglad deaktywacji, a potem potwierdz zapis.",
    );
  }

  if (preview.matched_trees.length === 0) {
    return {
      success: false,
      error_code: "NO_MATCHING_TREES",
      message:
        "Podczas zapisu nie znaleziono aktywnych drzew w tym zakresie. Odswiez podglad i sprawdz filtry.",
      data: preview,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .rpc("bulk_deactivate_trees", {
      p_plot_id: parsed.data.plot_id,
      p_row_number: parsed.data.row_number,
      p_from_position: parsed.data.from_position,
      p_to_position: parsed.data.to_position,
      p_reason: parsed.data.reason ?? null,
    })
    .single();

  if (error) {
    const mappedError = mapBulkTreeBatchError<BulkDeactivateTreesPreviewResult>(error);

    if (mappedError.error_code === "NO_MATCHING_TREES") {
      return {
        ...mappedError,
        data: preview,
      };
    }

    return mappedError;
  }

  revalidatePath("/trees");
  revalidatePath("/dashboard");
  redirect(buildRedirectTargetWithNotice("/trees", "trees_bulk_deactivated"));
}
