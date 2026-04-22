"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/errors/action-result";
import { signUp } from "@/server/actions/auth";

export function RegisterForm() {
  const [state, action] = useActionState(signUp, INITIAL_ACTION_STATE);

  return (
    <form action={action} className="grid gap-5">
      <Field
        error={state.field_errors?.display_name}
        htmlFor="display_name"
        hint="Opcjonalnie. Widoczna w aplikacji i w kontekscie sadu."
        label="Nazwa wyswietlana"
      >
        <Input id="display_name" name="display_name" />
      </Field>
      <Field error={state.field_errors?.email} htmlFor="email" label="Email">
        <Input autoComplete="email" id="email" name="email" type="email" />
      </Field>
      <Field
        error={state.field_errors?.password}
        htmlFor="password"
        hint="Co najmniej 8 znakow."
        label="Haslo"
      >
        <Input
          autoComplete="new-password"
          id="password"
          name="password"
          type="password"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Tworzenie konta...">
        Utworz konto
      </SubmitButton>
      <p className="text-sm text-[#5b6155]">
        Masz juz konto?{" "}
        <Link className="font-medium text-[#274430]" href="/login">
          Zaloguj sie
        </Link>
      </p>
    </form>
  );
}
