"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
  readActivityByIdForOrchard,
} from "@/lib/orchard-data/activities";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import {
  createErrorResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeNextPath } from "@/lib/utils/navigation";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  activityStatusActionSchema,
  createActivitySchema,
  deleteActivityActionSchema,
  normalizeActivityPayload,
  updateActivitySchema,
} from "@/lib/validation/activities";
import type {
  ActionResult,
  ActivityDetails,
} from "@/types/contracts";

type ActivityMutationRpcResult = {
  activity_id: string;
};

function buildActivityRedirectTarget(path?: string) {
  return normalizeNextPath(path, "/activities");
}

function mapActivityMutationError<T>(error: PostgrestError): ActionResult<T> {
  if (error.code === "42501") {
    return createErrorResult(
      "FORBIDDEN",
      "Nie masz uprawnien do zapisu aktywnosci w tym sadzie.",
    );
  }

  if (error.code === "P0002" || error.message.includes("NOT_FOUND")) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranej aktywnosci.");
  }

  if (error.message.includes("PRUNING_SUBTYPE_REQUIRED")) {
    return createErrorResult(
      "PRUNING_SUBTYPE_REQUIRED",
      "Dla ciecia musisz wybrac podtyp aktywnosci.",
      {
        activity_subtype: "Wybierz ciecie zimowe albo letnie.",
      },
    );
  }

  if (
    error.message.includes("ACTIVITY_SCOPE_INVALID") ||
    error.message.includes("Activity scope") ||
    error.message.includes("activity_scopes")
  ) {
    return createErrorResult(
      "ACTIVITY_SCOPE_INVALID",
      "Zakres aktywnosci jest niepoprawny.",
      {
        scopes: "Sprawdz zakresy i upewnij sie, ze naleza do tej samej dzialki.",
      },
    );
  }

  if (error.message.includes("Activity tree must belong to the same orchard and plot")) {
    return createErrorResult(
      "TREE_NOT_IN_PLOT",
      "Wybrane drzewo nie nalezy do tej dzialki.",
      {
        tree_id: "Wybierz drzewo z tej samej dzialki.",
      },
    );
  }

  if (error.message.includes("Activity performer must have an active membership")) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Wybrany wykonawca nie ma aktywnego dostepu do tego sadu.",
      {
        performed_by_profile_id: "Wybierz aktywnego czlonka tego sadu.",
      },
    );
  }

  return createErrorResult(
    "ACTIVITY_MUTATION_FAILED",
    "Nie udalo sie zapisac aktywnosci.",
  );
}

async function validateActivityRelations(input: ReturnType<typeof normalizeActivityPayload>) {
  const context = await requireActiveOrchard("/activities");
  const orchard = context.orchard;

  if (!orchard) {
    return {
      context,
      error: createErrorResult<ActivityDetails>(
        "NO_ACTIVE_ORCHARD",
        "Wybierz sad, aby zapisac aktywnosc.",
      ),
    };
  }

  const plot = await readPlotByIdForOrchard(orchard.id, input.plot_id);

  if (!plot) {
    return {
      context,
      error: createErrorResult<ActivityDetails>(
        "VALIDATION_ERROR",
        "Wybierz dzialke z aktywnego sadu.",
        {
          plot_id: "Wybierz poprawna dzialke.",
        },
      ),
    };
  }

  const [treeOptions, memberOptions] = await Promise.all([
    listTreeOptionsForOrchard(orchard.id),
    listActiveMemberOptionsForOrchard(orchard.id),
  ]);
  const treeOptionsById = new Map(treeOptions.map((tree) => [tree.id, tree]));

  if (input.tree_id) {
    const selectedTree = treeOptionsById.get(input.tree_id);

    if (!selectedTree || selectedTree.plot_id !== input.plot_id) {
      return {
        context,
        error: createErrorResult<ActivityDetails>(
          "TREE_NOT_IN_PLOT",
          "Wybrane drzewo nie nalezy do tej dzialki.",
          {
            tree_id: "Wybierz drzewo z tej samej dzialki.",
          },
        ),
      };
    }
  }

  for (const scope of input.scopes) {
    if (!scope.tree_id) {
      continue;
    }

    const scopeTree = treeOptionsById.get(scope.tree_id);

    if (!scopeTree || scopeTree.plot_id !== input.plot_id) {
      return {
        context,
        error: createErrorResult<ActivityDetails>(
          "ACTIVITY_SCOPE_INVALID",
          "Zakres aktywnosci jest niepoprawny.",
          {
            scopes: "Kazde drzewo w zakresie musi nalezec do tej samej dzialki.",
          },
        ),
      };
    }
  }

  if (
    input.performed_by_profile_id &&
    !memberOptions.some((member) => member.profile_id === input.performed_by_profile_id)
  ) {
    return {
      context,
      error: createErrorResult<ActivityDetails>(
        "VALIDATION_ERROR",
        "Wybrany wykonawca nie ma aktywnego dostepu do tego sadu.",
        {
          performed_by_profile_id: "Wybierz aktywnego czlonka tego sadu.",
        },
      ),
    };
  }

  const selectedMember = input.performed_by_profile_id
    ? memberOptions.find((member) => member.profile_id === input.performed_by_profile_id)
    : undefined;
  const fallbackPerformerLabel =
    selectedMember?.display_name ??
    selectedMember?.email ??
    context.profile?.display_name ??
    context.profile?.email ??
    null;

  return {
    context,
    error: null,
    orchard,
    memberOptions,
    payload: {
      orchard_id: orchard.id,
      plot_id: input.plot_id,
      tree_id: input.tree_id,
      activity_type: input.activity_type,
      activity_subtype: input.activity_subtype ?? null,
      activity_date: input.activity_date,
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      work_duration_minutes: input.work_duration_minutes ?? null,
      cost_amount: input.cost_amount ?? null,
      weather_notes: input.weather_notes ?? null,
      result_notes: input.result_notes ?? null,
      performed_by_profile_id: input.performed_by_profile_id ?? null,
      performed_by: input.performed_by ?? fallbackPerformerLabel,
      season_year: input.season_year,
      season_phase: input.season_phase ?? null,
    },
  };
}

export async function createActivity(
  _previousState: ActionResult<ActivityDetails>,
  formData: FormData,
): Promise<ActionResult<ActivityDetails>> {
  const parsed = createActivitySchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const normalizedInput = normalizeActivityPayload(parsed.data);
  const validation = await validateActivityRelations(normalizedInput);

  if (validation.error) {
    return validation.error;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("create_activity_with_children", {
      p_parent: validation.payload,
      p_scopes: normalizedInput.scopes,
      p_materials: normalizedInput.materials,
    })
    .single();

  if (error) {
    return mapActivityMutationError(error);
  }

  const mutationResult = data as ActivityMutationRpcResult;
  const activity = await readActivityByIdForOrchard(
    validation.orchard.id,
    mutationResult.activity_id,
  );

  if (!activity) {
    return createErrorResult(
      "ACTIVITY_MUTATION_FAILED",
      "Aktywnosc zostala zapisana, ale nie udalo sie jej ponownie odczytac.",
    );
  }

  revalidatePath("/activities");
  revalidatePath(`/activities/${mutationResult.activity_id}`);
  revalidatePath("/dashboard");
  redirect("/activities");
}

export async function updateActivity(
  _previousState: ActionResult<ActivityDetails>,
  formData: FormData,
): Promise<ActionResult<ActivityDetails>> {
  const parsed = updateActivitySchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/activities");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Wybierz sad, aby zapisac aktywnosc.");
  }

  const existingActivity = await readActivityByIdForOrchard(orchard.id, parsed.data.activity_id);

  if (!existingActivity) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranej aktywnosci.");
  }

  const normalizedInput = normalizeActivityPayload(parsed.data);
  const validation = await validateActivityRelations(normalizedInput);

  if (validation.error) {
    return validation.error;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("update_activity_with_children", {
      p_activity_id: existingActivity.id,
      p_parent: validation.payload,
      p_scopes: normalizedInput.scopes,
      p_materials: normalizedInput.materials,
    })
    .single();

  if (error) {
    return mapActivityMutationError(error);
  }

  const mutationResult = data as ActivityMutationRpcResult;
  const activity = await readActivityByIdForOrchard(
    orchard.id,
    mutationResult.activity_id,
  );

  if (!activity) {
    return createErrorResult(
      "ACTIVITY_MUTATION_FAILED",
      "Aktywnosc zostala zapisana, ale nie udalo sie jej ponownie odczytac.",
    );
  }

  revalidatePath("/activities");
  revalidatePath(`/activities/${existingActivity.id}`);
  revalidatePath(`/activities/${existingActivity.id}/edit`);
  revalidatePath("/dashboard");
  redirect("/activities");
}

export async function changeActivityStatus(formData: FormData) {
  const parsed = activityStatusActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(buildActivityRedirectTarget());
  }

  const context = await requireActiveOrchard("/activities");
  const orchard = context.orchard;

  if (!orchard) {
    redirect(buildActivityRedirectTarget(parsed.data.redirect_to));
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("activities")
    .update({
      status: parsed.data.status,
    })
    .eq("id", parsed.data.activity_id)
    .eq("orchard_id", orchard.id);

  revalidatePath("/activities");
  revalidatePath(`/activities/${parsed.data.activity_id}`);
  revalidatePath(`/activities/${parsed.data.activity_id}/edit`);
  revalidatePath("/dashboard");
  redirect(buildActivityRedirectTarget(parsed.data.redirect_to));
}

export async function deleteActivity(formData: FormData) {
  const parsed = deleteActivityActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(buildActivityRedirectTarget());
  }

  const context = await requireActiveOrchard("/activities");
  const orchard = context.orchard;

  if (!orchard) {
    redirect(buildActivityRedirectTarget(parsed.data.redirect_to));
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("activities")
    .delete()
    .eq("id", parsed.data.activity_id)
    .eq("orchard_id", orchard.id);

  revalidatePath("/activities");
  revalidatePath(`/activities/${parsed.data.activity_id}`);
  revalidatePath("/dashboard");
  redirect(buildActivityRedirectTarget(parsed.data.redirect_to));
}
