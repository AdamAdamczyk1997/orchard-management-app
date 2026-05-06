"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PostgrestError } from "@supabase/supabase-js";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { buildRedirectTargetWithNotice } from "@/lib/domain/feedback-notices";
import { persistActiveOrchardCookie } from "@/lib/orchard-context/active-orchard-cookie";
import { listAccessibleOrchards } from "@/lib/orchard-context/list-accessible-orchards";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";
import {
  listOrchardMembersForOrchard,
  readOrchardDetailsForOrchard,
} from "@/lib/orchard-data/orchards";
import {
  createErrorResult,
  createSuccessResult,
  createValidationErrorResult,
} from "@/lib/errors/action-result";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeNextPath } from "@/lib/utils/navigation";
import { formDataToObject } from "@/lib/validation/form-data";
import {
  createOrchardSchema,
  deactivateOrchardMembershipSchema,
  inviteOrchardMemberSchema,
  setActiveOrchardSchema,
  updateOrchardSchema,
} from "@/lib/validation/orchards";
import type {
  ActionResult,
  ActiveOrchardContext,
  CreateOrchardRpcResult,
  OrchardDetails,
  OrchardMembershipSummary,
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

type InviteOrchardMemberRpcResult = {
  membership_id: string;
  orchard_id: string;
  profile_id: string;
  email: string;
  display_name: string | null;
  role: OrchardMembershipSummary["role"];
  status: OrchardMembershipSummary["status"];
  joined_at: string | null;
};

function requireOwnerRole<T>(
  role: OrchardSummary["my_role"] | OrchardMembershipSummary["role"] | undefined,
) {
  if (role === "owner") {
    return null;
  }

  return createErrorResult<T>(
    "FORBIDDEN",
    "Tylko wlasciciel sadu moze zarzadzac tym obszarem.",
  );
}

function mapInviteMemberError<T>(error: PostgrestError): ActionResult<T> {
  if (error.code === "42501") {
    return createErrorResult(
      "FORBIDDEN",
      "Tylko wlasciciel sadu moze zarzadzac czlonkami.",
    );
  }

  if (error.code === "P0001") {
    return createErrorResult(
      "NOT_FOUND",
      "Nie znaleziono konta o podanym adresie email.",
      {
        email: "To konto nie istnieje jeszcze w aplikacji.",
      },
    );
  }

  if (error.code === "23505") {
    return createErrorResult(
      "VALIDATION_ERROR",
      "To konto ma juz aktywny dostep do tego sadu.",
      {
        email: "To konto ma juz aktywne czlonkostwo w tym sadzie.",
      },
    );
  }

  if (error.code === "22023") {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Sprawdz formularz i popraw zaznaczone pola.",
    );
  }

  return createErrorResult(
    "ORCHARD_MEMBER_INVITE_FAILED",
    "Nie udalo sie dodac czlonka do sadu.",
  );
}

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
    return createErrorResult(
      "ORCHARD_LIST_FAILED",
      "Nie udalo sie pobrac listy sadow.",
    );
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
    return createErrorResult("UNAUTHORIZED", "Musisz sie zalogowac, aby kontynuowac.");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED") {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Nie udalo sie poprawnie przygotowac profilu po logowaniu.",
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
    return createErrorResult("ORCHARD_CREATE_FAILED", "Nie udalo sie utworzyc sadu.");
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

export async function updateOrchard(
  _previousState: ActionResult<OrchardDetails>,
  formData: FormData,
): Promise<ActionResult<OrchardDetails>> {
  const parsed = updateOrchardSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return createErrorResult("UNAUTHORIZED", "Musisz sie zalogowac, aby kontynuowac.");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" || !context.profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Nie udalo sie poprawnie przygotowac profilu po logowaniu.",
    );
  }

  if (!context.orchard || !context.membership) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby zapisac jego ustawienia.",
    );
  }

  const ownerError = requireOwnerRole<OrchardDetails>(context.membership.role);

  if (ownerError) {
    return ownerError;
  }

  const orchard = await readOrchardDetailsForOrchard(context.orchard.id);

  if (!orchard) {
    return createErrorResult("NOT_FOUND", "Nie znaleziono wybranego sadu.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orchards")
    .update({
      name: parsed.data.name,
      code: parsed.data.code ?? null,
      description: parsed.data.description ?? null,
    })
    .eq("id", orchard.id)
    .select(
      "id, name, code, description, status, created_by_profile_id, created_at, updated_at",
    )
    .single();

  if (error) {
    return createErrorResult(
      "ORCHARD_UPDATE_FAILED",
      "Nie udalo sie zapisac ustawien sadu.",
    );
  }

  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/settings/orchard");

  return createSuccessResult(
    data as OrchardDetails,
    "Ustawienia sadu zostaly zapisane.",
  );
}

export async function listOrchardMembers(): Promise<
  ActionResult<OrchardMembershipSummary[]>
> {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return createErrorResult("UNAUTHORIZED", "Musisz sie zalogowac, aby kontynuowac.");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" || !context.profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Nie udalo sie poprawnie przygotowac profilu po logowaniu.",
    );
  }

  if (!context.orchard || !context.membership) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby zobaczyc liste czlonkow.",
    );
  }

  const ownerError = requireOwnerRole<OrchardMembershipSummary[]>(
    context.membership.role,
  );

  if (ownerError) {
    return ownerError;
  }

  const members = await listOrchardMembersForOrchard(context.orchard.id);

  return createSuccessResult(members);
}

export async function inviteOrchardMember(
  _previousState: ActionResult<OrchardMembershipSummary>,
  formData: FormData,
): Promise<ActionResult<OrchardMembershipSummary>> {
  const parsed = inviteOrchardMemberSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return createValidationErrorResult(parsed.error);
  }

  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return createErrorResult("UNAUTHORIZED", "Musisz sie zalogowac, aby kontynuowac.");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" || !context.profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Nie udalo sie poprawnie przygotowac profilu po logowaniu.",
    );
  }

  if (!context.orchard || !context.membership) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby dodac czlonka.",
    );
  }

  const ownerError = requireOwnerRole<OrchardMembershipSummary>(
    context.membership.role,
  );

  if (ownerError) {
    return ownerError;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("invite_orchard_member_by_email", {
      p_orchard_id: context.orchard.id,
      p_email: parsed.data.email,
      p_role: parsed.data.role,
    })
    .single();

  if (error) {
    return mapInviteMemberError(error);
  }

  revalidatePath("/settings/members");

  const membership = data as InviteOrchardMemberRpcResult;

  return createSuccessResult(
    {
      id: membership.membership_id,
      orchard_id: membership.orchard_id,
      profile_id: membership.profile_id,
      email: membership.email,
      display_name: membership.display_name,
      role: membership.role,
      status: membership.status,
      joined_at: membership.joined_at,
    },
    "Czlonek zostal dodany do sadu.",
  );
}

export async function setActiveOrchard(formData: FormData) {
  const nextPath = normalizeNextPath(
    String(formData.get("next_path") ?? ""),
    "/dashboard",
  );
  const failureRedirectTarget = buildRedirectTargetWithNotice(
    "/dashboard",
    "orchard_switch_unavailable",
  );
  const parsed = setActiveOrchardSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    redirect(failureRedirectTarget);
  }

  const user = await requireSessionUser();
  const accessibleOrchards = await listAccessibleOrchards(user.id);
  const selectedOrchard = accessibleOrchards.find(
    (record) => record.orchard.id === parsed.data.orchard_id,
  );

  if (!selectedOrchard) {
    redirect(failureRedirectTarget);
  }

  await persistActiveOrchardCookie(selectedOrchard.orchard.id);
  revalidatePath("/", "layout");
  redirect(nextPath);
}

export async function deactivateOrchardMembership(formData: FormData) {
  const parsed = deactivateOrchardMembershipSchema.safeParse(formDataToObject(formData));
  const redirectTarget = "/settings/members";
  const blockedRedirectTarget = buildRedirectTargetWithNotice(
    redirectTarget,
    "member_revoke_blocked",
  );
  const successRedirectTarget = buildRedirectTargetWithNotice(
    redirectTarget,
    "member_revoked",
  );

  if (!parsed.success) {
    redirect(blockedRedirectTarget);
  }

  const context = await resolveActiveOrchardContext();

  if (
    !context.authenticated ||
    context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" ||
    !context.profile ||
    !context.orchard ||
    !context.membership
  ) {
    redirect(blockedRedirectTarget);
  }

  if (context.membership.role !== "owner") {
    redirect(blockedRedirectTarget);
  }

  const members = await listOrchardMembersForOrchard(context.orchard.id);
  const membership = members.find((member) => member.id === parsed.data.membership_id);

  if (!membership || membership.status !== "active" || membership.role === "owner") {
    redirect(blockedRedirectTarget);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("orchard_memberships")
    .update({
      status: "revoked",
    })
    .eq("id", membership.id)
    .eq("orchard_id", context.orchard.id);

  if (error) {
    redirect(blockedRedirectTarget);
  }

  revalidatePath("/settings/members");
  revalidatePath("/", "layout");
  redirect(successRedirectTarget);
}

export async function markOnboardingDismissed() {
  const user = await requireSessionUser();
  const profile = await readCurrentProfile();

  if (!profile) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Nie udalo sie poprawnie przygotowac profilu po logowaniu.",
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
    return createErrorResult(
      "PROFILE_UPDATE_FAILED",
      "Nie udalo sie zapisac preferencji onboardingu.",
    );
  }

  revalidatePath("/orchards/new");

  return createSuccessResult(
    undefined,
    "Ustawienie onboardingu zostalo zapisane.",
  );
}
