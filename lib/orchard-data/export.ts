import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ExportAccountDataResult,
  ExportAvailabilitySummary,
  OrchardMembershipSummary,
  OrchardStatus,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

type ExportProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  locale: string | null;
  timezone: string | null;
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

export async function readExportAvailabilityForProfile(
  profileId: string,
  supabaseClient?: QueryClient,
): Promise<ExportAvailabilitySummary> {
  const supabase = await getQueryClient(supabaseClient);
  const { count, error } = await supabase
    .from("orchard_memberships")
    .select("orchard_id", { count: "exact", head: true })
    .eq("profile_id", profileId)
    .eq("role", "owner")
    .eq("status", "active");

  if (error) {
    throw error;
  }

  const ownedOrchardsCount = count ?? 0;

  return {
    can_export: ownedOrchardsCount > 0,
    owned_orchards_count: ownedOrchardsCount,
  };
}

export async function getExportAccountDataForProfile(
  profileId: string,
  supabaseClient?: QueryClient,
): Promise<ExportAccountDataResult | null> {
  const supabase = await getQueryClient(supabaseClient);
  const availability = await readExportAvailabilityForProfile(profileId, supabase);

  if (!availability.can_export) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, display_name, locale, timezone")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return null;
  }

  const { data: ownedMemberships, error: membershipError } = await supabase
    .from("orchard_memberships")
    .select("orchard_id")
    .eq("profile_id", profileId)
    .eq("role", "owner")
    .eq("status", "active");

  if (membershipError) {
    throw membershipError;
  }

  const ownedOrchardIds = Array.from(
    new Set(
      ((ownedMemberships ?? []) as OwnedMembershipRow[]).map((row) => row.orchard_id),
    ),
  );

  if (ownedOrchardIds.length === 0) {
    return null;
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
    supabase.from("orchards").select("*").in("id", ownedOrchardIds),
    supabase.from("orchard_memberships").select("*").in("orchard_id", ownedOrchardIds),
    supabase.from("plots").select("*").in("orchard_id", ownedOrchardIds),
    supabase.from("varieties").select("*").in("orchard_id", ownedOrchardIds),
    supabase.from("trees").select("*").in("orchard_id", ownedOrchardIds),
    supabase.from("activities").select("*").in("orchard_id", ownedOrchardIds),
    supabase.from("harvest_records").select("*").in("orchard_id", ownedOrchardIds),
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
    profile: profile as ExportProfileRow,
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
