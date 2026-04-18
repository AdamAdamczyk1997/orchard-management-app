"use client";

import { useActionState } from "react";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateProfile } from "@/server/actions/profile";
import type { ActionResult, ProfileSummary } from "@/types/contracts";

type ProfileFormProps = {
  profile: ProfileSummary;
};

const initialProfileFormState: ActionResult<ProfileSummary> = {
  success: false,
};

export function ProfileForm({ profile }: ProfileFormProps) {
  const [state, action] = useActionState(
    updateProfile,
    initialProfileFormState,
  );

  return (
    <form action={action} className="grid gap-5">
      <Field htmlFor="email" hint="Managed by Supabase Auth." label="Email">
        <Input defaultValue={profile.email} disabled id="email" name="email" />
      </Field>
      <Field
        error={state.field_errors?.display_name}
        htmlFor="display_name"
        label="Display name"
      >
        <Input
          defaultValue={profile.display_name ?? ""}
          id="display_name"
          name="display_name"
        />
      </Field>
      <Field
        error={state.field_errors?.locale}
        htmlFor="locale"
        label="Locale"
      >
        <Input defaultValue={profile.locale ?? "pl"} id="locale" name="locale" />
      </Field>
      <Field
        error={state.field_errors?.timezone}
        htmlFor="timezone"
        label="Timezone"
      >
        <Input
          defaultValue={profile.timezone ?? "Europe/Warsaw"}
          id="timezone"
          name="timezone"
        />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingLabel="Saving profile...">Save profile</SubmitButton>
    </form>
  );
}
