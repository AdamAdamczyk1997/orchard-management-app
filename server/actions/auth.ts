"use server";

import { redirect } from "next/navigation";
import { clearActiveOrchardCookie } from "@/lib/orchard-context/active-orchard-cookie";
import {
  createErrorResult,
  createSuccessResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { getAppUrl } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import type { ActionResult } from "@/types/contracts";

export async function signUp(
  _previousState: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signUpSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        display_name: parsed.data.display_name ?? null,
        locale: "pl",
        timezone: "Europe/Warsaw",
      },
      emailRedirectTo: `${getAppUrl()}/`,
    },
  });

  if (error) {
    return createErrorResult("AUTH_SIGN_UP_FAILED", error.message);
  }

  if (!data.session) {
    return createSuccessResult(
      null,
      "Account created. Confirm your email to continue.",
    );
  }

  redirect("/");
}

export async function signIn(
  _previousState: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return createErrorResult(
      "UNAUTHORIZED",
      "Invalid email or password.",
    );
  }

  redirect("/");
}

export async function resetPassword(
  _previousState: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = resetPasswordSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${getAppUrl()}/reset-password`,
    },
  );

  if (error) {
    return createErrorResult("AUTH_RESET_PASSWORD_FAILED", error.message);
  }

  return createSuccessResult(
    null,
    "Password reset link sent. Check your inbox.",
  );
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();

  await clearActiveOrchardCookie();

  if (error) {
    throw new Error(error.message);
  }

  redirect("/login");
}
