"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import {
  persistActiveOrchardCookie,
} from "@/lib/orchard-context/active-orchard-cookie";
import { listAccessibleOrchards } from "@/lib/orchard-context/list-accessible-orchards";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";
import {
  createErrorResult,
  createSuccessResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createOrchardSchema,
  setActiveOrchardSchema,
} from "@/lib/validation/orchards";
import type {
  ActionResult,
  ActiveOrchardContext,
  CreateOrchardRpcResult,
  OrchardSummary,
} from "@/types/contracts";

type OrchardMembershipWithOrchard = {
  id: string;
  orchard_id: string;
  profile_id: string;
  role: OrchardSummary["my_role"];
  status: OrchardSummary["membership_status"];
  orchard:
    | {
        id: string;
        name: string;
        code: string | null;
        status: OrchardSummary["status"];
      }
    | Array<{
        id: string;
        name: string;
        code: string | null;
        status: OrchardSummary["status"];
      }>
    | null;
};

export async function listMyOrchards(): Promise<ActionResult<OrchardSummary[]>> {
  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orchard_memberships")
    .select(
      `
        id,
        orchard_id,
        profile_id,
        role,
        status,
        orchard:orchards (
          id,
          name,
          code,
          status
        )
      `,
    )
    .eq("profile_id", user.id);

  if (error) {
    return createErrorResult("ORCHARD_LIST_FAILED", error.message);
  }

  const orchards = ((data ?? []) as OrchardMembershipWithOrchard[])
    .map((record): OrchardSummary | null => {
      const orchard = Array.isArray(record.orchard)
        ? record.orchard[0]
        : record.orchard;

      if (!orchard) {
        return null;
      }

      return {
        id: orchard.id,
        name: orchard.name,
        code: orchard.code,
        status: orchard.status,
        my_role: record.role,
        membership_status: record.status,
      };
    })
    .filter((record): record is OrchardSummary => record !== null);

  return createSuccessResult(orchards);
}

export async function getActiveOrchardContext(): Promise<
  ActionResult<ActiveOrchardContext>
> {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return createErrorResult("UNAUTHORIZED", "Authentication is required.");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED") {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Profile bootstrap did not complete correctly.",
    );
  }

  return createSuccessResult({
    orchard: context.orchard,
    available_orchards: context.available_orchards,
    membership: context.membership,
    requires_onboarding: context.requires_onboarding,
  });
}

export async function createOrchard(
  _previousState: ActionResult<null>,
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = createOrchardSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const user = await requireSessionUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("create_orchard_with_owner_membership", {
      p_name: parsed.data.name,
      p_code: parsed.data.code ?? null,
      p_description: parsed.data.description ?? null,
    })
    .single();

  if (error) {
    return createErrorResult("ORCHARD_CREATE_FAILED", error.message);
  }

  const rpcResult = data as CreateOrchardRpcResult;

  if (parsed.data.dismiss_intro) {
    await supabase
      .from("profiles")
      .update({
        orchard_onboarding_dismissed_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  await persistActiveOrchardCookie(rpcResult.orchard_id);

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function setActiveOrchard(formData: FormData) {
  const parsed = setActiveOrchardSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    throw new Error("Invalid orchard selection.");
  }

  const user = await requireSessionUser();
  const accessibleOrchards = await listAccessibleOrchards(user.id);
  const selectedOrchard = accessibleOrchards.find(
    (record) => record.orchard.id === parsed.data.orchard_id,
  );

  if (!selectedOrchard) {
    throw new Error("Selected orchard is not accessible to the current user.");
  }

  await persistActiveOrchardCookie(selectedOrchard.orchard.id);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function markOnboardingDismissed() {
  const user = await requireSessionUser();
  const profile = await readCurrentProfile();

  if (!profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Profile bootstrap did not complete correctly.",
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      orchard_onboarding_dismissed_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return createErrorResult("PROFILE_UPDATE_FAILED", error.message);
  }

  revalidatePath("/orchards/new");

  return createSuccessResult(
    undefined,
    "Onboarding intro preference saved.",
  );
}
