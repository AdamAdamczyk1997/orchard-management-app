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
  suggestedCode?: string;
};

const initialPlotFormState: ActionResult<PlotSummary> = {
  success: false,
};

export function PlotForm({ action, mode, plot, suggestedCode }: PlotFormProps) {
  const [state, formAction] = useActionState(action, initialPlotFormState);

  return (
    <form action={formAction} className="grid gap-5">
      {mode === "edit" && plot ? (
        <input name="plot_id" type="hidden" value={plot.id} />
      ) : null}
      <Field error={state.field_errors?.name} htmlFor="name" label="Nazwa dzialki">
        <Input
          defaultValue={plot?.name ?? ""}
          id="name"
          name="name"
          placeholder="np. Kwatera Polnocna"
        />
      </Field>
      <Field
        error={state.field_errors?.code}
        hint={
          suggestedCode && mode === "create"
            ? `Proponowany kolejny kod: ${suggestedCode}`
            : "Opcjonalny skrot widoczny na listach."
        }
        htmlFor="code"
        label="Kod"
      >
        <Input
          defaultValue={plot?.code ?? suggestedCode ?? ""}
          id="code"
          name="code"
          placeholder="np. DZ-01"
        />
      </Field>
      <Field
        error={state.field_errors?.status}
        htmlFor="status"
        label="Status"
      >
        <Select defaultValue={plot?.status ?? "active"} id="status" name="status">
          <option value="active">Aktywna</option>
          <option value="planned">Planowana</option>
          <option value="archived">Zarchiwizowana</option>
        </Select>
      </Field>
      <Field
        error={state.field_errors?.location_name}
        htmlFor="location_name"
        label="Opis lokalizacji"
      >
        <Input
          defaultValue={plot?.location_name ?? ""}
          id="location_name"
          name="location_name"
          placeholder="np. Po polnocnej stronie przy drodze"
        />
      </Field>
      <Field
        error={state.field_errors?.area_m2}
        htmlFor="area_m2"
        hint="Opcjonalna powierzchnia w metrach kwadratowych."
        label="Powierzchnia (m2)"
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
        label="Typ gleby"
      >
        <Input
          defaultValue={plot?.soil_type ?? ""}
          id="soil_type"
          name="soil_type"
          placeholder="np. glina pylasta"
        />
      </Field>
      <Field
        error={state.field_errors?.irrigation_type}
        htmlFor="irrigation_type"
        label="Typ nawadniania"
      >
        <Input
          defaultValue={plot?.irrigation_type ?? ""}
          id="irrigation_type"
          name="irrigation_type"
          placeholder="np. linia kroplujaca"
        />
      </Field>
      <Field
        error={state.field_errors?.description}
        htmlFor="description"
        label="Opis"
      >
        <Textarea
          defaultValue={plot?.description ?? ""}
          id="description"
          name="description"
          placeholder="Opcjonalne notatki o tej dzialce."
        />
      </Field>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Tworzenie dzialki..." : "Zapisywanie dzialki..."}>
          {mode === "create" ? "Utworz dzialke" : "Zapisz dzialke"}
        </SubmitButton>
        <LinkButton href="/plots" variant="secondary">
          Wroc do dzialek
        </LinkButton>
      </div>
    </form>
  );
}
