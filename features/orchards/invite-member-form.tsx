"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { inviteOrchardMember } from "@/server/actions/orchards";
import type { ActionResult, OrchardMembershipSummary } from "@/types/contracts";

const initialInviteMemberState: ActionResult<OrchardMembershipSummary> = {
  success: false,
};

export function InviteMemberForm() {
  const [state, action] = useActionState(
    inviteOrchardMember,
    initialInviteMemberState,
  );

  return (
    <form action={action} className="grid gap-4">
      <input name="role" type="hidden" value="worker" />
      <Field
        error={state.field_errors?.email}
        hint="Mozesz dodac tylko osobe, ktora ma juz konto w OrchardLog / Sadownik+."
        htmlFor="email"
        label="Email pracownika"
      >
        <Input
          autoComplete="email"
          id="email"
          name="email"
          placeholder="np. pracownik@sad.local"
          type="email"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Dodawanie czlonka...">
        Dodaj pracownika
      </SubmitButton>
    </form>
  );
}
