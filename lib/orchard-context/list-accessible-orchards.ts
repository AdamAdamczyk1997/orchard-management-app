import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  OrchardMembershipSummary,
  OrchardSummary,
} from "@/types/contracts";

type OrchardMembershipWithOrchard = {
  id: string;
  orchard_id: string;
  profile_id: string;
  role: OrchardSummary["my_role"];
  status: OrchardSummary["membership_status"];
  joined_at: string | null;
  orchard:
    | {
        id: string;
        name: string;
        code: string | null;
        status: OrchardSummary["status"];
        created_at: string;
      }
    | Array<{
        id: string;
        name: string;
        code: string | null;
        status: OrchardSummary["status"];
        created_at: string;
      }>
    | null;
};

export type AccessibleOrchardRecord = {
  orchard: OrchardSummary;
  membership: OrchardMembershipSummary;
  orchard_created_at: string;
};

export async function listAccessibleOrchards(profileId: string) {
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
        joined_at,
        orchard:orchards!inner (
          id,
          name,
          code,
          status,
          created_at
        )
      `,
    )
    .eq("profile_id", profileId)
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrchardMembershipWithOrchard[])
    .map((record): AccessibleOrchardRecord | null => {
      const orchard = Array.isArray(record.orchard)
        ? record.orchard[0]
        : record.orchard;

      if (!orchard || orchard.status !== "active") {
        return null;
      }

      return {
        orchard: {
          id: orchard.id,
          name: orchard.name,
          code: orchard.code,
          status: orchard.status,
          my_role: record.role,
          membership_status: record.status,
        },
        membership: {
          id: record.id,
          orchard_id: record.orchard_id,
          profile_id: record.profile_id,
          role: record.role,
          status: record.status,
          joined_at: record.joined_at,
        },
        orchard_created_at: orchard.created_at,
      };
    })
    .filter((record): record is AccessibleOrchardRecord => record !== null);
}
