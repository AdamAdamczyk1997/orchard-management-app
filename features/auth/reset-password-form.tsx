"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { INITIAL_ACTION_STATE } from "@/lib/errors/action-result";
import { resetPassword } from "@/server/actions/auth";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPassword, INITIAL_ACTION_STATE);

  return (
    <form action={action} className="grid gap-5">
      <Field
        error={state.field_errors?.email}
        hint="Na tym etapie wysylamy tylko prosbe o link do resetu hasla."
        htmlFor="email"
        label="Email"
      >
        <Input autoComplete="email" id="email" name="email" type="email" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Wysylanie linku...">Wyslij link resetujacy</SubmitButton>
      <p className="text-sm text-[#5b6155]">
        <Link className="font-medium text-[#274430]" href="/login">
          Wroc do logowania
        </Link>
      </p>
    </form>
  );
}
