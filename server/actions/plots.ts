"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import {
  createErrorResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeNextPath } from "@/lib/utils/navigation";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createPlotSchema,
  plotStatusActionSchema,
  updatePlotSchema,
} from "@/lib/validation/plots";
import type { ActionResult, PlotSummary } from "@/types/contracts";

const plotSelect =
  "id, orchard_id, name, code, description, location_name, area_m2, soil_type, irrigation_type, status, is_active, created_at, updated_at";

function mapPlotMutationError<T>(error: PostgrestError): ActionResult<T> {
  if (error.code === "23505") {
    if (error.message.includes("plots_orchard_id_name_key")) {
      return createErrorResult(
        "DUPLICATE_PLOT_NAME",
        "A plot with this name already exists in the active orchard.",
        {
          name: "Choose a different plot name.",
        },
      );
    }

    if (error.message.includes("uq_plots_orchard_code")) {
      return createErrorResult(
        "VALIDATION_ERROR",
        "A plot with this code already exists in the active orchard.",
        {
          code: "Choose a different plot code.",
        },
      );
    }
  }

  return createErrorResult("PLOT_MUTATION_FAILED", error.message);
}

function buildPlotRedirectTarget(path?: string) {
  return normalizeNextPath(path, "/plots");
}

export async function createPlot(
  _previousState: ActionResult<PlotSummary>,
  formData: FormData,
): Promise<ActionResult<PlotSummary>> {
  const parsed = createPlotSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/plots");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Active orchard is required.");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    orchard_id: orchard.id,
    name: parsed.data.name,
    code: parsed.data.code ?? null,
    description: parsed.data.description ?? null,
    location_name: parsed.data.location_name ?? null,
    area_m2: parsed.data.area_m2 ?? null,
    soil_type: parsed.data.soil_type ?? null,
    irrigation_type: parsed.data.irrigation_type ?? null,
    status: parsed.data.status,
    is_active: parsed.data.status !== "archived",
  };

  const { error } = await supabase.from("plots").insert(payload).select(plotSelect).single();

  if (error) {
    return mapPlotMutationError(error);
  }

  revalidatePath("/plots");
  revalidatePath("/trees");
  redirect("/plots");
}

export async function updatePlot(
  _previousState: ActionResult<PlotSummary>,
  formData: FormData,
): Promise<ActionResult<PlotSummary>> {
  const parsed = updatePlotSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await requireActiveOrchard("/plots");
  const orchard = context.orchard;

  if (!orchard) {
    return createErrorResult("NO_ACTIVE_ORCHARD", "Active orchard is required.");
  }

  const existingPlot = await readPlotByIdForOrchard(orchard.id, parsed.data.plot_id);

  if (!existingPlot) {
    return createErrorResult("NOT_FOUND", "Plot not found.");
  }

  const supabase = await createSupabaseServerClient();
  const payload = {
    name: parsed.data.name,
    code: parsed.data.code ?? null,
    description: parsed.data.description ?? null,
    location_name: parsed.data.location_name ?? null,
    area_m2: parsed.data.area_m2 ?? null,
    soil_type: parsed.data.soil_type ?? null,
    irrigation_type: parsed.data.irrigation_type ?? null,
    status: parsed.data.status,
    is_active: parsed.data.status !== "archived",
  };

  const { error } = await supabase
    .from("plots")
    .update(payload)
    .eq("id", existingPlot.id)
    .eq("orchard_id", orchard.id)
    .select(plotSelect)
    .single();

  if (error) {
    return mapPlotMutationError(error);
  }

  revalidatePath("/plots");
  revalidatePath("/trees");
  redirect("/plots");
}

export async function archivePlot(formData: FormData) {
  const parsed = plotStatusActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(buildPlotRedirectTarget());
  }

  const context = await requireActiveOrchard("/plots");
  const orchard = context.orchard;

  if (!orchard) {
    redirect(buildPlotRedirectTarget(parsed.data.redirect_to));
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("plots")
    .update({
      status: "archived",
      is_active: false,
    })
    .eq("id", parsed.data.plot_id)
    .eq("orchard_id", orchard.id);

  revalidatePath("/plots");
  revalidatePath("/trees");
  redirect(buildPlotRedirectTarget(parsed.data.redirect_to));
}

export async function restorePlot(formData: FormData) {
  const parsed = plotStatusActionSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(buildPlotRedirectTarget());
  }

  const context = await requireActiveOrchard("/plots");
  const orchard = context.orchard;

  if (!orchard) {
    redirect(buildPlotRedirectTarget(parsed.data.redirect_to));
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("plots")
    .update({
      status: "active",
      is_active: true,
    })
    .eq("id", parsed.data.plot_id)
    .eq("orchard_id", orchard.id);

  revalidatePath("/plots");
  revalidatePath("/trees");
  redirect(buildPlotRedirectTarget(parsed.data.redirect_to));
}
