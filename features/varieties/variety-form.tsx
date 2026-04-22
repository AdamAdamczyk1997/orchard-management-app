"use client";

import { useActionState } from "react";
import { SPECIES_PRESETS } from "@/lib/domain/species";
import { DatalistInput } from "@/components/ui/datalist-input";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, VarietySummary } from "@/types/contracts";

type VarietyFormAction = (
  previousState: ActionResult<VarietySummary>,
  formData: FormData,
) => Promise<ActionResult<VarietySummary>>;

type VarietyFormProps = {
  action: VarietyFormAction;
  mode: "create" | "edit";
  variety?: VarietySummary;
};

const initialVarietyFormState: ActionResult<VarietySummary> = {
  success: false,
};

export function VarietyForm({
  action,
  mode,
  variety,
}: VarietyFormProps) {
  const [state, formAction] = useActionState(action, initialVarietyFormState);

  return (
    <form action={formAction} className="grid gap-5">
      {mode === "edit" && variety ? (
        <input name="variety_id" type="hidden" value={variety.id} />
      ) : null}
      <Field
        error={state.field_errors?.species}
        htmlFor="species"
        hint="Wybierz z listy albo wpisz wlasny gatunek."
        label="Gatunek"
      >
        <DatalistInput
          defaultValue={variety?.species ?? ""}
          id="species"
          listId="variety-species-presets"
          name="species"
          options={SPECIES_PRESETS}
          placeholder="np. apple"
        />
      </Field>
      <Field error={state.field_errors?.name} htmlFor="name" label="Nazwa odmiany">
        <Input
          defaultValue={variety?.name ?? ""}
          id="name"
          name="name"
          placeholder="np. Ligol"
        />
      </Field>
      <Field
        error={state.field_errors?.ripening_period}
        htmlFor="ripening_period"
        label="Okres dojrzewania"
      >
        <Input
          defaultValue={variety?.ripening_period ?? ""}
          id="ripening_period"
          name="ripening_period"
          placeholder="np. wrzesien-pazdziernik"
        />
      </Field>
      <Field
        error={state.field_errors?.origin_country}
        htmlFor="origin_country"
        label="Kraj pochodzenia"
      >
        <Input
          defaultValue={variety?.origin_country ?? ""}
          id="origin_country"
          name="origin_country"
          placeholder="Opcjonalnie"
        />
      </Field>
      <Field
        error={state.field_errors?.description}
        htmlFor="description"
        label="Opis"
      >
        <Textarea
          defaultValue={variety?.description ?? ""}
          id="description"
          name="description"
          placeholder="Krotki opis odmiany."
        />
      </Field>
      <Field
        error={state.field_errors?.characteristics}
        htmlFor="characteristics"
        label="Charakterystyka"
      >
        <Textarea
          defaultValue={variety?.characteristics ?? ""}
          id="characteristics"
          name="characteristics"
          placeholder="Smak, przechowywanie, wielkosc owocu i inne cechy."
        />
      </Field>
      <Field
        error={state.field_errors?.care_notes}
        htmlFor="care_notes"
        label="Notatki pielegnacyjne"
      >
        <Textarea
          defaultValue={variety?.care_notes ?? ""}
          id="care_notes"
          name="care_notes"
          placeholder="Praktyczne notatki pielegnacyjne dla sadu."
        />
      </Field>
      <Field
        error={state.field_errors?.resistance_notes}
        htmlFor="resistance_notes"
        label="Odpornosc i podatnosc"
      >
        <Textarea
          defaultValue={variety?.resistance_notes ?? ""}
          id="resistance_notes"
          name="resistance_notes"
          placeholder="Notatki o odpornosci na choroby lub wrazliwosci."
        />
      </Field>
      <label className="flex items-start gap-3 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#4f584e]">
        <input
          className="mt-1 h-4 w-4 rounded border-[#c7b997]"
          defaultChecked={variety?.is_favorite ?? false}
          id="is_favorite"
          name="is_favorite"
          type="checkbox"
        />
        <span>Oznacz te odmiane jako ulubiona.</span>
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Tworzenie odmiany..." : "Zapisywanie odmiany..."}>
          {mode === "create" ? "Utworz odmiane" : "Zapisz odmiane"}
        </SubmitButton>
        <LinkButton href="/varieties" variant="secondary">
          Wroc do odmian
        </LinkButton>
      </div>
    </form>
  );
}
