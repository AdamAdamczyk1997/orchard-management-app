import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { OrchardDetails, OrchardMembershipSummary } from "@/types/contracts";

const orchardDetailsSelect =
  "id, name, code, description, status, created_by_profile_id, created_at, updated_at";

type OrchardMembershipWithProfile = {
  id: string;
  orchard_id: string;
  profile_id: string;
  role: OrchardMembershipSummary["role"];
  status: OrchardMembershipSummary["status"];
  joined_at: string | null;
  profile:
    | {
        email: string;
        display_name: string | null;
      }
    | Array<{
        email: string;
        display_name: string | null;
      }>
    | null;
};

const membershipStatusPriority: Record<OrchardMembershipSummary["status"], number> = {
  active: 0,
  invited: 1,
  revoked: 2,
};

const membershipRolePriority: Record<OrchardMembershipSummary["role"], number> = {
  owner: 0,
  worker: 1,
  manager: 2,
  viewer: 3,
};

function sortOrchardMembers(
  left: OrchardMembershipSummary,
  right: OrchardMembershipSummary,
) {
  const statusDiff =
    membershipStatusPriority[left.status] - membershipStatusPriority[right.status];

  if (statusDiff !== 0) {
    return statusDiff;
  }

  const roleDiff =
    membershipRolePriority[left.role] - membershipRolePriority[right.role];

  if (roleDiff !== 0) {
    return roleDiff;
  }

  const leftLabel = left.display_name ?? left.email ?? "";
  const rightLabel = right.display_name ?? right.email ?? "";

  return leftLabel.localeCompare(rightLabel, "pl");
}

export async function readOrchardDetailsForOrchard(orchardId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("orchards")
    .select(orchardDetailsSelect)
    .eq("id", orchardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as OrchardDetails | null) ?? null;
}

export async function listOrchardMembersForOrchard(orchardId: string) {
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
        profile:profiles!orchard_memberships_profile_id_fkey (
          email,
          display_name
        )
      `,
    )
    .eq("orchard_id", orchardId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as OrchardMembershipWithProfile[])
    .map((member): OrchardMembershipSummary => {
      const profile = Array.isArray(member.profile) ? member.profile[0] : member.profile;

      return {
        id: member.id,
        orchard_id: member.orchard_id,
        profile_id: member.profile_id,
        email: profile?.email ?? null,
        display_name: profile?.display_name ?? null,
        role: member.role,
        status: member.status,
        joined_at: member.joined_at,
      };
    })
    .sort(sortOrchardMembers);
}
