import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/get-session-user";
import type { ProfileSummary } from "@/types/contracts";

export const readCurrentProfile = cache(async (): Promise<ProfileSummary | null> => {
  const user = await getSessionUser();

  if (!user) {
    return null;
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, system_role, locale, timezone, orchard_onboarding_dismissed_at, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ProfileSummary | null;
});
