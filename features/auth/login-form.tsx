"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/errors/action-result";
import { signIn } from "@/server/actions/auth";

export function LoginForm() {
  const [state, action] = useActionState(signIn, INITIAL_ACTION_STATE);

  return (
    <form action={action} className="grid gap-5">
      <Field error={state.field_errors?.email} htmlFor="email" label="Email">
        <Input autoComplete="email" id="email" name="email" type="email" />
      </Field>
      <Field
        error={state.field_errors?.password}
        htmlFor="password"
        label="Haslo"
      >
        <Input
          autoComplete="current-password"
          id="password"
          name="password"
          type="password"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Logowanie...">Zaloguj sie</SubmitButton>
      <div className="flex items-center justify-between text-sm text-[#5b6155]">
        <Link className="font-medium text-[#274430]" href="/register">
          Utworz konto
        </Link>
        <Link className="font-medium text-[#274430]" href="/reset-password">
          Nie pamietasz hasla?
        </Link>
      </div>
    </form>
  );
}
