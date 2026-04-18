"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { INITIAL_ACTION_STATE } from "@/lib/errors/action-result";
import { createOrchard } from "@/server/actions/orchards";

type CreateOrchardFormProps = {
  mode: "onboarding" | "secondary";
  defaultDismissIntro?: boolean;
};

export function CreateOrchardForm({
  mode,
  defaultDismissIntro = false,
}: CreateOrchardFormProps) {
  const [state, action] = useActionState(createOrchard, INITIAL_ACTION_STATE);

  return (
    <form action={action} className="grid gap-5">
      <Field error={state.field_errors?.name} htmlFor="name" label="Orchard name">
        <Input id="name" name="name" placeholder="e.g. North Orchard" />
      </Field>
      <Field
        error={state.field_errors?.code}
        hint="Optional short identifier used in lists and exports."
        htmlFor="code"
        label="Code"
      >
        <Input id="code" name="code" placeholder="e.g. NO-01" />
      </Field>
      <Field
        error={state.field_errors?.description}
        hint="Optional note visible in orchard settings."
        htmlFor="description"
        label="Description"
      >
        <Textarea
          id="description"
          name="description"
          placeholder="Short note about this orchard or farm area."
        />
      </Field>
      {mode === "onboarding" ? (
        <label className="flex items-start gap-3 rounded-2xl border border-[#dfd3bb] bg-[#fbfaf7] px-4 py-3 text-sm text-[#4f584e]">
          <input
            className="mt-1 h-4 w-4 rounded border-[#c7b997]"
            defaultChecked={defaultDismissIntro}
            name="dismiss_intro"
            type="checkbox"
          />
          <span>
            Never show the onboarding intro again. This only hides the explanatory copy after the first orchard exists.
          </span>
        </label>
      ) : null}
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Creating orchard...">
        {mode === "onboarding" ? "Create orchard" : "Create another orchard"}
      </SubmitButton>
    </form>
  );
}
