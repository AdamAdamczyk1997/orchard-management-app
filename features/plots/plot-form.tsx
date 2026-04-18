"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, PlotSummary } from "@/types/contracts";

type PlotFormAction = (
  previousState: ActionResult<PlotSummary>,
  formData: FormData,
) => Promise<ActionResult<PlotSummary>>;

type PlotFormProps = {
  action: PlotFormAction;
  mode: "create" | "edit";
  plot?: PlotSummary;
};

const initialPlotFormState: ActionResult<PlotSummary> = {
  success: false,
};

export function PlotForm({ action, mode, plot }: PlotFormProps) {
  const [state, formAction] = useActionState(action, initialPlotFormState);

  return (
    <form action={formAction} className="grid gap-5">
      {mode === "edit" && plot ? (
        <input name="plot_id" type="hidden" value={plot.id} />
      ) : null}
      <Field error={state.field_errors?.name} htmlFor="name" label="Plot name">
        <Input
          defaultValue={plot?.name ?? ""}
          id="name"
          name="name"
          placeholder="e.g. North Block"
        />
      </Field>
      <Field
        error={state.field_errors?.code}
        hint="Optional short code used in lists."
        htmlFor="code"
        label="Code"
      >
        <Input
          defaultValue={plot?.code ?? ""}
          id="code"
          name="code"
          placeholder="e.g. N-01"
        />
      </Field>
      <Field
        error={state.field_errors?.status}
        htmlFor="status"
        label="Status"
      >
        <Select defaultValue={plot?.status ?? "active"} id="status" name="status">
          <option value="active">Active</option>
          <option value="planned">Planned</option>
          <option value="archived">Archived</option>
        </Select>
      </Field>
      <Field
        error={state.field_errors?.location_name}
        htmlFor="location_name"
        label="Location name"
      >
        <Input
          defaultValue={plot?.location_name ?? ""}
          id="location_name"
          name="location_name"
          placeholder="e.g. North side by the road"
        />
      </Field>
      <Field
        error={state.field_errors?.area_m2}
        htmlFor="area_m2"
        hint="Optional size in square meters."
        label="Area (m2)"
      >
        <Input
          defaultValue={plot?.area_m2 ?? ""}
          id="area_m2"
          min="0"
          name="area_m2"
          step="0.01"
          type="number"
        />
      </Field>
      <Field
        error={state.field_errors?.soil_type}
        htmlFor="soil_type"
        label="Soil type"
      >
        <Input
          defaultValue={plot?.soil_type ?? ""}
          id="soil_type"
          name="soil_type"
          placeholder="e.g. clay loam"
        />
      </Field>
      <Field
        error={state.field_errors?.irrigation_type}
        htmlFor="irrigation_type"
        label="Irrigation type"
      >
        <Input
          defaultValue={plot?.irrigation_type ?? ""}
          id="irrigation_type"
          name="irrigation_type"
          placeholder="e.g. drip line"
        />
      </Field>
      <Field
        error={state.field_errors?.description}
        htmlFor="description"
        label="Description"
      >
        <Textarea
          defaultValue={plot?.description ?? ""}
          id="description"
          name="description"
          placeholder="Optional notes about this plot."
        />
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Creating plot..." : "Saving plot..."}>
          {mode === "create" ? "Create plot" : "Save plot"}
        </SubmitButton>
        <LinkButton href="/plots" variant="secondary">
          Back to plots
        </LinkButton>
      </div>
    </form>
  );
}
