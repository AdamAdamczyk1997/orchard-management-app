"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult, OrchardDetails } from "@/types/contracts";

type OrchardFormAction = (
  previousState: ActionResult<unknown>,
  formData: FormData,
) => Promise<ActionResult<unknown>>;

type OrchardFormProps = {
  action: OrchardFormAction;
  mode: "onboarding" | "secondary" | "settings";
  defaultDismissIntro?: boolean;
  orchard?: OrchardDetails;
};

export function OrchardForm({
  action,
  mode,
  defaultDismissIntro = false,
  orchard,
}: OrchardFormProps) {
  const [state, formAction] = useActionState<ActionResult<unknown>, FormData>(
    action,
    {
      success: false,
    },
  );
  const isSettingsMode = mode === "settings";

  return (
    <form action={formAction} className="grid gap-5">
      <Field error={state.field_errors?.name} htmlFor="name" label="Nazwa sadu">
        <Input
          defaultValue={orchard?.name ?? ""}
          id="name"
          name="name"
          placeholder="np. Sad Polnocny"
        />
      </Field>
      <Field
        error={state.field_errors?.code}
        hint="Opcjonalny skrot widoczny na listach i w eksporcie."
        htmlFor="code"
        label="Kod"
      >
        <Input
          defaultValue={orchard?.code ?? ""}
          id="code"
          name="code"
          placeholder="np. SP-01"
        />
      </Field>
      <Field
        error={state.field_errors?.description}
        hint={
          isSettingsMode
            ? "Krotki opis organizacyjny tego sadu."
            : "Opcjonalna notatka widoczna w ustawieniach sadu."
        }
        htmlFor="description"
        label="Opis"
      >
        <Textarea
          defaultValue={orchard?.description ?? ""}
          id="description"
          name="description"
          placeholder="Krotka notatka o sadzie lub gospodarstwie."
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
            Nie pokazuj ponownie wprowadzenia do onboardingu. To ustawienie ukrywa
            tylko tekst pomocniczy po utworzeniu pierwszego sadu.
          </span>
        </label>
      ) : null}
      <FormMessage state={state} />
      <SubmitButton
        pendingLabel={
          isSettingsMode ? "Zapisywanie ustawien..." : "Tworzenie sadu..."
        }
      >
        {isSettingsMode
          ? "Zapisz ustawienia sadu"
          : mode === "onboarding"
            ? "Utworz sad"
            : "Utworz kolejny sad"}
      </SubmitButton>
    </form>
  );
}
