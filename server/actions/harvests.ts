"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { buildRedirectTargetWithNotice } from "@/lib/domain/feedback-notices";
import { validateHarvestScopeForPlotLayout } from "@/lib/domain/plots";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readActivityByIdForOrchard } from "@/lib/orchard-data/activities";
import { readHarvestRecordByIdForOrchard } from "@/lib/orchard-data/harvests";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import { readTreeByIdForOrchard } from "@/lib/orchard-data/trees";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import {
  createErrorResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeNextPath } from "@/lib/utils/navigation";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createHarvestRecordSchema,
  deleteHarvestRecordActionSchema,
  normalizeHarvestPayload,
  updateHarvestRecordSchema,
} from "@/lib/validation/harvests";
import type { ActionResult, HarvestRecordDetails } from "@/types/contracts";

function buildHarvestRedirectTarget(path?: string) {
  return normalizeNextPath(path, "/harvests");
}

function mapHarvestMutationError<T>(error: PostgrestError): ActionResult<T> {
  if (error.code === "42501") {
    return createErrorResult(
      "FORBIDDEN",
      "Nie masz uprawnien do zapisu wpisow zbioru w tym sadzie.",
    );
  }

  if (error.code === "P0002" || error.message.includes("NOT_FOUND")) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranego wpisu zbioru.");
  }

  if (error.message.includes("quantity_unit")) {
    return createErrorResult(
      "HARVEST_UNIT_INVALID",
      "Wybrana jednostka zbioru nie jest wspierana.",
      {
        quantity_unit: "Wybierz `kg` albo `t`.",
      },
    );
  }

  if (
    error.message.includes("HARVEST_LOCATION_RANGE_UNSUPPORTED") ||
    error.message.includes("Harvest plot") ||
    error.message.includes("Harvest tree") ||
    error.message.includes("Harvest variety") ||
    error.message.includes("Harvest activity") ||
    error.message.includes("harvest_records_scope_level_check")
  ) {
    return createErrorResult(
      "HARVEST_SCOPE_INVALID",
      "Zakres wpisu zbioru jest niepoprawny.",
      {
        scope_level:
          error.message.includes("HARVEST_LOCATION_RANGE_UNSUPPORTED")
            ? "Dla dzialki nieregularnej wybierz inny poziom szczegolowosci niz zakres po rzedach."
            : "Sprawdz wybrany poziom szczegolowosci i powiazania rekordu.",
        ...(error.message.includes("HARVEST_LOCATION_RANGE_UNSUPPORTED")
          ? {
              plot_id:
                "Dla tej dzialki uzyj calej dzialki, odmiany albo pojedynczych drzew zamiast zakresu po rzedach.",
            }
          : {}),
      },
    );
  }

  return createErrorResult(
    "HARVEST_MUTATION_FAILED",
    "Nie udalo sie zapisac wpisu zbioru.",
  );
}

async function validateHarvestRelations(
  input: ReturnType<typeof normalizeHarvestPayload>,
) {
  const context = await requireActiveOrchard("/harvests");
  const orchard = context.orchard;

  if (!orchard) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "NO_ACTIVE_ORCHARD",
        "Wybierz sad, aby zapisac wpis zbioru.",
      ),
    };
  }

  if (!context.profile) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "PROFILE_BOOTSTRAP_REQUIRED",
        "Nie udalo sie zaladowac profilu uzytkownika.",
      ),
    };
  }

  const [plot, variety, tree, activity] = await Promise.all([
    input.plot_id ? readPlotByIdForOrchard(orchard.id, input.plot_id) : Promise.resolve(null),
    input.variety_id
      ? readVarietyByIdForOrchard(orchard.id, input.variety_id)
      : Promise.resolve(null),
    input.tree_id ? readTreeByIdForOrchard(orchard.id, input.tree_id) : Promise.resolve(null),
    input.activity_id
      ? readActivityByIdForOrchard(orchard.id, input.activity_id)
      : Promise.resolve(null),
  ]);

  if (input.plot_id && !plot) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "VALIDATION_ERROR",
        "Wybierz dzialke z aktywnego sadu.",
        {
          plot_id: "Wybierz poprawna dzialke.",
        },
      ),
    };
  }

  if (plot) {
    const plotLayoutValidation = validateHarvestScopeForPlotLayout(
      plot,
      input.scope_level,
    );

    if (plotLayoutValidation) {
      return {
        error: createErrorResult<HarvestRecordDetails>(
          "HARVEST_SCOPE_INVALID",
          plotLayoutValidation.message,
          plotLayoutValidation.field_errors,
        ),
      };
    }
  }

  if (input.variety_id && !variety) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "VALIDATION_ERROR",
        "Wybierz odmiane z aktywnego sadu.",
        {
          variety_id: "Wybierz poprawna odmiane.",
        },
      ),
    };
  }

  if (input.tree_id && !tree) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "VALIDATION_ERROR",
        "Wybierz drzewo z aktywnego sadu.",
        {
          tree_id: "Wybierz poprawne drzewo.",
        },
      ),
    };
  }

  if (input.activity_id && !activity) {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "VALIDATION_ERROR",
        "Wybierz aktywnosc z aktywnego sadu.",
        {
          activity_id: "Wybierz poprawna aktywnosc.",
        },
      ),
    };
  }

  if (activity && activity.activity_type !== "harvest") {
    return {
      error: createErrorResult<HarvestRecordDetails>(
        "HARVEST_SCOPE_INVALID",
        "Powiazany rekord musi wskazywac aktywnosc typu zbior.",
        {
          activity_id: "Wybierz aktywnosc typu `harvest`.",
        },
      ),
    };
  }

  let resolvedPlotId = input.plot_id;
  let resolvedVarietyId = input.variety_id;

  if (tree) {
    if (resolvedPlotId && resolvedPlotId !== tree.plot_id) {
      return {
        error: createErrorResult<HarvestRecordDetails>(
          "HARVEST_SCOPE_INVALID",
          "Wybrane drzewo nie nalezy do tej dzialki.",
          {
            tree_id: "Wybierz drzewo z tej samej dzialki co dzialka wpisu.",
          },
        ),
      };
    }

    resolvedPlotId = tree.plot_id;

    if (tree.variety_id) {
      if (resolvedVarietyId && resolvedVarietyId !== tree.variety_id) {
        return {
          error: createErrorResult<HarvestRecordDetails>(
            "HARVEST_SCOPE_INVALID",
            "Wybrana odmiana nie pasuje do wskazanego drzewa.",
            {
              variety_id: "Drzewo jest przypisane do innej odmiany.",
            },
          ),
        };
      }

      resolvedVarietyId = tree.variety_id;
    }
  }

  if (activity) {
    if (resolvedPlotId && activity.plot_id && resolvedPlotId !== activity.plot_id) {
      return {
        error: createErrorResult<HarvestRecordDetails>(
          "HARVEST_SCOPE_INVALID",
          "Wybrana aktywnosc dotyczy innej dzialki.",
          {
            activity_id: "Aktywnosc musi pasowac do dzialki wpisu zbioru.",
          },
        ),
      };
    }

    if (input.tree_id && activity.tree_id && input.tree_id !== activity.tree_id) {
      return {
        error: createErrorResult<HarvestRecordDetails>(
          "HARVEST_SCOPE_INVALID",
          "Wybrana aktywnosc dotyczy innego drzewa.",
          {
            activity_id: "Aktywnosc musi pasowac do wybranego drzewa.",
          },
        ),
      };
    }
  }

  return {
    error: null,
    orchard,
    profileId: context.profile.id,
    payload: {
      orchard_id: orchard.id,
      plot_id: resolvedPlotId,
      variety_id: resolvedVarietyId,
      tree_id: input.tree_id,
      activity_id: input.activity_id,
      scope_level: input.scope_level,
      harvest_date: input.harvest_date,
      season_year: input.season_year,
      section_name: input.section_name,
      row_number: input.row_number,
      from_position: input.from_position,
      to_position: input.to_position,
      quantity_value: input.quantity_value,
      quantity_unit: input.quantity_unit,
      notes: input.notes,
    },
  };
}

export async function createHarvestRecord(
  _previousState: ActionResult<HarvestRecordDetails>,
  formData: FormData,
): Promise<ActionResult<HarvestRecordDetails>> {
  const parsed = createHarvestRecordSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const normalizedInput = normalizeHarvestPayload(parsed.data);
  const validation = await validateHarvestRelations(normalizedInput);

  if (validation.error) {
    return validation.error;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("harvest_records")
    .insert({
      ...validation.payload,
      created_by_profile_id: validation.profileId,
    })
    .select("id")
    .single();

  if (error) {
    return mapHarvestMutationError(error);
  }

  const harvestRecord = await readHarvestRecordByIdForOrchard(
    validation.orchard.id,
    (data as { id: string }).id,
  );

  if (!harvestRecord) {
    return createErrorResult(
      "HARVEST_MUTATION_FAILED",
      "Wpis zbioru zostal zapisany, ale nie udalo sie go ponownie odczytac.",
    );
  }

  revalidatePath("/harvests");
  revalidatePath(`/harvests/${harvestRecord.id}`);
  revalidatePath("/dashboard");
  redirect(buildRedirectTargetWithNotice("/harvests", "harvest_created"));
}

export async function updateHarvestRecord(
  _previousState: ActionResult<HarvestRecordDetails>,
  formData: FormData,
): Promise<ActionResult<HarvestRecordDetails>> {
  const parsed = updateHarvestRecordSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/harvests");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Wybierz sad, aby zapisac wpis zbioru.");
  }

  const existingHarvest = await readHarvestRecordByIdForOrchard(
    orchard.id,
    parsed.data.harvest_record_id,
  );

  if (!existingHarvest) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranego wpisu zbioru.");
  }

  const normalizedInput = normalizeHarvestPayload(parsed.data);
  const validation = await validateHarvestRelations(normalizedInput);

  if (validation.error) {
    return validation.error;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("harvest_records")
    .update(validation.payload)
    .eq("id", existingHarvest.id)
    .eq("orchard_id", orchard.id)
    .select("id")
    .single();

  if (error) {
    return mapHarvestMutationError(error);
  }

  const harvestRecord = await readHarvestRecordByIdForOrchard(
    orchard.id,
    (data as { id: string }).id,
  );

  if (!harvestRecord) {
    return createErrorResult(
      "HARVEST_MUTATION_FAILED",
      "Wpis zbioru zostal zapisany, ale nie udalo sie go ponownie odczytac.",
    );
  }

  revalidatePath("/harvests");
  revalidatePath(`/harvests/${existingHarvest.id}`);
  revalidatePath(`/harvests/${existingHarvest.id}/edit`);
  revalidatePath("/dashboard");
  redirect(buildRedirectTargetWithNotice("/harvests", "harvest_updated"));
}

export async function deleteHarvestRecord(formData: FormData) {
  const parsed = deleteHarvestRecordActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(buildHarvestRedirectTarget());
  }

  const context = await requireActiveOrchard("/harvests");
  const orchard = context.orchard;

  if (!orchard) {
    redirect(buildHarvestRedirectTarget(parsed.data.redirect_to));
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("harvest_records")
    .delete()
    .eq("id", parsed.data.harvest_record_id)
    .eq("orchard_id", orchard.id);

  revalidatePath("/harvests");
  revalidatePath(`/harvests/${parsed.data.harvest_record_id}`);
  revalidatePath(`/harvests/${parsed.data.harvest_record_id}/edit`);
  revalidatePath("/dashboard");
  redirect(
    buildRedirectTargetWithNotice(
      parsed.data.redirect_to,
      "harvest_deleted",
      "/harvests",
    ),
  );
}
