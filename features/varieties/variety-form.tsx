"use client";

import { useActionState } from "react";
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
        label="Species"
      >
        <Input
          defaultValue={variety?.species ?? ""}
          id="species"
          name="species"
          placeholder="e.g. apple"
        />
      </Field>
      <Field error={state.field_errors?.name} htmlFor="name" label="Variety name">
        <Input
          defaultValue={variety?.name ?? ""}
          id="name"
          name="name"
          placeholder="e.g. Ligol"
        />
      </Field>
      <Field
        error={state.field_errors?.ripening_period}
        htmlFor="ripening_period"
        label="Ripening period"
      >
        <Input
          defaultValue={variety?.ripening_period ?? ""}
          id="ripening_period"
          name="ripening_period"
          placeholder="e.g. September-October"
        />
      </Field>
      <Field
        error={state.field_errors?.origin_country}
        htmlFor="origin_country"
        label="Origin country"
      >
        <Input
          defaultValue={variety?.origin_country ?? ""}
          id="origin_country"
          name="origin_country"
          placeholder="Optional"
        />
      </Field>
      <Field
        error={state.field_errors?.description}
        htmlFor="description"
        label="Description"
      >
        <Textarea
          defaultValue={variety?.description ?? ""}
          id="description"
          name="description"
          placeholder="Short general description."
        />
      </Field>
      <Field
        error={state.field_errors?.characteristics}
        htmlFor="characteristics"
        label="Characteristics"
      >
        <Textarea
          defaultValue={variety?.characteristics ?? ""}
          id="characteristics"
          name="characteristics"
          placeholder="Taste, storage, fruit size, and other features."
        />
      </Field>
      <Field
        error={state.field_errors?.care_notes}
        htmlFor="care_notes"
        label="Care notes"
      >
        <Textarea
          defaultValue={variety?.care_notes ?? ""}
          id="care_notes"
          name="care_notes"
          placeholder="Practical orchard care notes."
        />
      </Field>
      <Field
        error={state.field_errors?.resistance_notes}
        htmlFor="resistance_notes"
        label="Resistance notes"
      >
        <Textarea
          defaultValue={variety?.resistance_notes ?? ""}
          id="resistance_notes"
          name="resistance_notes"
          placeholder="Disease resistance or sensitivity."
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
        <span>Mark this variety as favorite.</span>
      </label>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel={mode === "create" ? "Creating variety..." : "Saving variety..."}>
          {mode === "create" ? "Create variety" : "Save variety"}
        </SubmitButton>
        <LinkButton href="/varieties" variant="secondary">
          Back to varieties
        </LinkButton>
      </div>
    </form>
  );
}
