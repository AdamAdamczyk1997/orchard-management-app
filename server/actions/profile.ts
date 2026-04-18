"use server";

import { revalidatePath } from "next/cache";
import {
  createErrorResult,
  createSuccessResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import { updateProfileSchema } from "@/lib/validation/profile";
import type { ActionResult, ProfileSummary } from "@/types/contracts";

const profileSelect =
  "id, email, display_name, system_role, locale, timezone, orchard_onboarding_dismissed_at, created_at, updated_at";

export async function getCurrentProfile(): Promise<ActionResult<ProfileSummary>> {
  const profile = await readCurrentProfile();

  if (!profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Profile bootstrap did not complete correctly.",
    );
  }

  return createSuccessResult(profile);
}

export async function updateProfile(
  _previousState: ActionResult<ProfileSummary>,
  formData: FormData,
): Promise<ActionResult<ProfileSummary>> {
  const parsed = updateProfileSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name ?? null,
      locale: parsed.data.locale ?? "pl",
      timezone: parsed.data.timezone ?? "Europe/Warsaw",
    })
    .eq("id", user.id)
    .select(profileSelect)
    .single();

  if (error) {
    return createErrorResult("PROFILE_UPDATE_FAILED", error.message);
  }

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");

  return createSuccessResult(
    data as ProfileSummary,
    "Profile updated successfully.",
  );
}
