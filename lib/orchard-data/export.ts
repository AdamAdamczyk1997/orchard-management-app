import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ExportAccountDataResult,
  ExportAvailabilitySummary,
  OrchardMembershipSummary,
  OrchardStatus,
  SystemRole,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

type ExportProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  locale: string | null;
  timezone: string | null;
};

type ExportProfileWithRoleRow = ExportProfileRow & {
  system_role: SystemRole;
};

type OwnedMembershipRow = {
  orchard_id: string;
};

type ExportOrchardRow = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  status: OrchardStatus;
  created_by_profile_id: string;
  created_at: string;
  updated_at: string;
};

type ExportMembershipRow = OrchardMembershipSummary & {
  created_at?: string | null;
  updated_at?: string | null;
  invited_by_profile_id?: string | null;
};

type ExportActivityRow = Record<string, unknown> & {
  id: string;
  orchard_id: string;
};

function compareByCreatedAtAndId(
  left: Record<string, unknown>,
  right: Record<string, unknown>,
) {
  const leftCreatedAt = typeof left.created_at === "string" ? left.created_at : "";
  const rightCreatedAt = typeof right.created_at === "string" ? right.created_at : "";

  if (leftCreatedAt !== rightCreatedAt) {
    return leftCreatedAt.localeCompare(rightCreatedAt);
  }

  const leftId = typeof left.id === "string" ? left.id : "";
  const rightId = typeof right.id === "string" ? right.id : "";

  return leftId.localeCompare(rightId);
}

function groupRowsByOrchard<T extends { orchard_id?: string | null }>(rows: T[]) {
  return rows.reduce<Record<string, T[]>>((accumulator, row) => {
    if (!row.orchard_id) {
      return accumulator;
    }

    const orchardRows = accumulator[row.orchard_id] ?? [];
    orchardRows.push(row);
    accumulator[row.orchard_id] = orchardRows;
    return accumulator;
  }, {});
}

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

async function readProfileForExport(
  profileId: string,
  supabase: QueryClient,
): Promise<ExportProfileWithRoleRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, locale, timezone, system_role")
    .eq("id", profileId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as ExportProfileWithRoleRow | null;
}

async function listOwnedOrchardIdsForProfile(
  profileId: string,
  supabase: QueryClient,
) {
  const { data, error } = await supabase
    .from("orchard_memberships")
    .select("orchard_id")
    .eq("profile_id", profileId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  return Array.from(
    new Set(
      ((data ?? []) as OwnedMembershipRow[]).map((row) => row.orchard_id),
    ),
  );
}

async function listAdminVisibleOrchardIds(supabase: QueryClient) {
  const { data, error } = await supabase.from("orchards").select("id");

  if (error) {
    throw error;
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ id: string }>).map((row) => row.id),
    ),
  );
}

async function resolveExportContextForProfile(
  profileId: string,
  supabase: QueryClient,
): Promise<{
  availability: ExportAvailabilitySummary;
  orchardIds: string[];
  profile: ExportProfileWithRoleRow | null;
}> {
  const profile = await readProfileForExport(profileId, supabase);

  if (!profile) {
    return {
      availability: {
        can_export: false,
        scope: "owned_orchards",
        orchards_count: 0,
      },
      orchardIds: [],
      profile: null,
    };
  }

  if (profile.system_role === "super_admin") {
    const orchardIds = await listAdminVisibleOrchardIds(supabase);

    return {
      availability: {
        can_export: true,
        scope: "all_orchards_admin",
        orchards_count: orchardIds.length,
      },
      orchardIds,
      profile,
    };
  }

  const orchardIds = await listOwnedOrchardIdsForProfile(profileId, supabase);

  return {
    availability: {
      can_export: orchardIds.length > 0,
      scope: "owned_orchards",
      orchards_count: orchardIds.length,
    },
    orchardIds,
    profile,
  };
}

export async function readExportAvailabilityForProfile(
  profileId: string,
  supabaseClient?: QueryClient,
): Promise<ExportAvailabilitySummary> {
  const supabase = await getQueryClient(supabaseClient);
  const { availability } = await resolveExportContextForProfile(profileId, supabase);
  return availability;
}

export async function getExportAccountDataForProfile(
  profileId: string,
  supabaseClient?: QueryClient,
): Promise<ExportAccountDataResult | null> {
  const supabase = await getQueryClient(supabaseClient);
  const { availability, orchardIds, profile } = await resolveExportContextForProfile(
    profileId,
    supabase,
  );

  if (!availability.can_export) {
    return null;
  }

  if (!profile) {
    return null;
  }

  if (orchardIds.length === 0) {
    return {
      version: "1",
      exported_at: new Date().toISOString(),
      profile: {
        id: profile.id,
        email: profile.email,
        display_name: profile.display_name,
        locale: profile.locale,
        timezone: profile.timezone,
      },
      orchards: [],
    };
  }

  const [
    orchardsResult,
    membershipsResult,
    plotsResult,
    varietiesResult,
    treesResult,
    activitiesResult,
    harvestsResult,
  ] = await Promise.all([
    supabase.from("orchards").select("*").in("id", orchardIds),
    supabase.from("orchard_memberships").select("*").in("orchard_id", orchardIds),
    supabase.from("plots").select("*").in("orchard_id", orchardIds),
    supabase.from("varieties").select("*").in("orchard_id", orchardIds),
    supabase.from("trees").select("*").in("orchard_id", orchardIds),
    supabase.from("activities").select("*").in("orchard_id", orchardIds),
    supabase.from("harvest_records").select("*").in("orchard_id", orchardIds),
  ]);

  if (orchardsResult.error) throw orchardsResult.error;
  if (membershipsResult.error) throw membershipsResult.error;
  if (plotsResult.error) throw plotsResult.error;
  if (varietiesResult.error) throw varietiesResult.error;
  if (treesResult.error) throw treesResult.error;
  if (activitiesResult.error) throw activitiesResult.error;
  if (harvestsResult.error) throw harvestsResult.error;

  const activities = ((activitiesResult.data ?? []) as ExportActivityRow[]).sort(
    compareByCreatedAtAndId,
  );
  const activityIds = activities.map((activity) => activity.id);

  let activityScopes: Array<Record<string, unknown>> = [];
  let activityMaterials: Array<Record<string, unknown>> = [];

  if (activityIds.length > 0) {
    const [scopesResult, materialsResult] = await Promise.all([
      supabase.from("activity_scopes").select("*").in("activity_id", activityIds),
      supabase.from("activity_materials").select("*").in("activity_id", activityIds),
    ]);

    if (scopesResult.error) throw scopesResult.error;
    if (materialsResult.error) throw materialsResult.error;

    activityScopes = [...(scopesResult.data ?? [])].sort(compareByCreatedAtAndId);
    activityMaterials = [...(materialsResult.data ?? [])].sort(compareByCreatedAtAndId);
  }

  const orchards = ((orchardsResult.data ?? []) as ExportOrchardRow[]).sort(
    compareByCreatedAtAndId,
  );
  const orchardMemberships = ((membershipsResult.data ?? []) as ExportMembershipRow[]).sort(
    compareByCreatedAtAndId,
  );
  const plots = [...(plotsResult.data ?? [])].sort(compareByCreatedAtAndId);
  const varieties = [...(varietiesResult.data ?? [])].sort(compareByCreatedAtAndId);
  const trees = [...(treesResult.data ?? [])].sort(compareByCreatedAtAndId);
  const harvestRecords = [...(harvestsResult.data ?? [])].sort(compareByCreatedAtAndId);

  const membershipsByOrchard = groupRowsByOrchard(orchardMemberships);
  const plotsByOrchard = groupRowsByOrchard(plots);
  const varietiesByOrchard = groupRowsByOrchard(varieties);
  const treesByOrchard = groupRowsByOrchard(trees);
  const activitiesByOrchard = groupRowsByOrchard(activities);
  const harvestsByOrchard = groupRowsByOrchard(harvestRecords);
  const scopesByActivityId = activityScopes.reduce<Record<string, Array<Record<string, unknown>>>>(
    (accumulator, scope) => {
      const activityId = typeof scope.activity_id === "string" ? scope.activity_id : null;

      if (!activityId) {
        return accumulator;
      }

      const scopes = accumulator[activityId] ?? [];
      scopes.push(scope);
      accumulator[activityId] = scopes;
      return accumulator;
    },
    {},
  );
  const materialsByActivityId = activityMaterials.reduce<
    Record<string, Array<Record<string, unknown>>>
  >((accumulator, material) => {
    const activityId =
      typeof material.activity_id === "string" ? material.activity_id : null;

    if (!activityId) {
      return accumulator;
    }

    const materials = accumulator[activityId] ?? [];
    materials.push(material);
    accumulator[activityId] = materials;
    return accumulator;
  }, {});

  return {
    version: "1",
    exported_at: new Date().toISOString(),
    profile: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      locale: profile.locale,
      timezone: profile.timezone,
    },
    orchards: orchards.map((orchard) => {
      const orchardActivities = activitiesByOrchard[orchard.id] ?? [];

      return {
        orchard,
        orchard_memberships: membershipsByOrchard[orchard.id] ?? [],
        plots: plotsByOrchard[orchard.id] ?? [],
        varieties: varietiesByOrchard[orchard.id] ?? [],
        trees: treesByOrchard[orchard.id] ?? [],
        activities: orchardActivities,
        activity_scopes: orchardActivities.flatMap(
          (activity) => scopesByActivityId[activity.id] ?? [],
        ),
        activity_materials: orchardActivities.flatMap(
          (activity) => materialsByActivityId[activity.id] ?? [],
        ),
        harvest_records: harvestsByOrchard[orchard.id] ?? [],
      };
    }),
  };
}
