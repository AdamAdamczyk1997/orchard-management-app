import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateBaselineQaReadiness,
  formatBaselineQaReport,
} from "./shared/baseline-qa.mjs";
import { BASELINE_QA_IGNORED_ORCHARD_CODES } from "./shared/baseline-seed.mjs";
import {
  createLocalAdminClient,
  listAllAuthUsers,
} from "./shared/local-supabase.mjs";

async function selectRows(adminClient, table, columns) {
  const { data, error } = await adminClient.from(table).select(columns);

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function fetchBaselineQaSnapshot(adminClient) {
  const [authUsers, profiles, orchards, memberships, plots, varieties, trees, activities, activityScopes, activityMaterials, harvestRecords] =
    await Promise.all([
      listAllAuthUsers(adminClient),
      selectRows(
        adminClient,
        "profiles",
        "id, email, system_role, orchard_onboarding_dismissed_at",
      ),
      selectRows(adminClient, "orchards", "id, code, name, status"),
      selectRows(adminClient, "orchard_memberships", "orchard_id, profile_id, role, status"),
      selectRows(adminClient, "plots", "id, orchard_id, name, layout_type"),
      selectRows(adminClient, "varieties", "orchard_id"),
      selectRows(
        adminClient,
        "trees",
        "id, orchard_id, plot_id, row_number, position_in_row, is_active",
      ),
      selectRows(adminClient, "activities", "id, orchard_id, status"),
      selectRows(adminClient, "activity_scopes", "id, activity_id"),
      selectRows(adminClient, "activity_materials", "id, activity_id"),
      selectRows(
        adminClient,
        "harvest_records",
        "orchard_id, season_year, quantity_value, quantity_unit, quantity_kg",
      ),
    ]);

  const ignoredOrchardCodes = new Set(BASELINE_QA_IGNORED_ORCHARD_CODES);
  const baselineOrchards = orchards.filter(
    (orchard) => !ignoredOrchardCodes.has(orchard.code),
  );
  const baselineOrchardIds = new Set(
    baselineOrchards.map((orchard) => orchard.id),
  );
  const baselineMemberships = memberships.filter((membership) =>
    baselineOrchardIds.has(membership.orchard_id),
  );
  const baselinePlots = plots.filter((plot) =>
    baselineOrchardIds.has(plot.orchard_id),
  );
  const baselineVarieties = varieties.filter((variety) =>
    baselineOrchardIds.has(variety.orchard_id),
  );
  const baselineTrees = trees.filter((tree) =>
    baselineOrchardIds.has(tree.orchard_id),
  );
  const baselineActivities = activities.filter((activity) =>
    baselineOrchardIds.has(activity.orchard_id),
  );
  const baselineActivityIds = new Set(
    baselineActivities.map((activity) => activity.id),
  );
  const baselineActivityScopes = activityScopes.filter((scope) =>
    baselineActivityIds.has(scope.activity_id),
  );
  const baselineActivityMaterials = activityMaterials.filter((material) =>
    baselineActivityIds.has(material.activity_id),
  );
  const baselineHarvestRecords = harvestRecords.filter((record) =>
    baselineOrchardIds.has(record.orchard_id),
  );
  const orchardCodeById = new Map(
    baselineOrchards.map((orchard) => [orchard.id, orchard.code]),
  );
  const profileEmailById = new Map(
    profiles.map((profile) => [profile.id, String(profile.email).toLowerCase()]),
  );

  function countByOrchard(rows) {
    return rows.reduce((accumulator, row) => {
      const orchardCode = orchardCodeById.get(row.orchard_id);

      if (!orchardCode) {
        return accumulator;
      }

      accumulator[orchardCode] = (accumulator[orchardCode] ?? 0) + 1;
      return accumulator;
    }, {});
  }

  const plotCountsByOrchard = countByOrchard(baselinePlots);
  const varietyCountsByOrchard = countByOrchard(baselineVarieties);
  const treeCountsByOrchard = countByOrchard(baselineTrees);
  const activityCountsByOrchard = countByOrchard(baselineActivities);
  const harvestCountsByOrchard = countByOrchard(baselineHarvestRecords);
  const tonneRecords = baselineHarvestRecords.filter(
    (record) => record.quantity_unit === "t",
  );
  const normalizedTonneRecords = tonneRecords.filter(
    (record) => Number(record.quantity_kg) === Number(record.quantity_value) * 1000,
  );

  return {
    authUsers: authUsers.map((user) => user.email?.toLowerCase()).filter(Boolean),
    profiles,
    orchards: baselineOrchards,
    memberships: baselineMemberships
      .map((membership) => ({
        orchardCode: orchardCodeById.get(membership.orchard_id),
        email: profileEmailById.get(membership.profile_id),
        role: membership.role,
        status: membership.status,
      }))
      .filter((membership) => membership.orchardCode && membership.email),
    plots: baselinePlots
      .map((plot) => ({
        id: plot.id,
        orchardCode: orchardCodeById.get(plot.orchard_id),
        name: plot.name,
        layoutType: plot.layout_type,
      }))
      .filter((plot) => plot.orchardCode),
    trees: baselineTrees
      .map((tree) => ({
        id: tree.id,
        orchardCode: orchardCodeById.get(tree.orchard_id),
        plotId: tree.plot_id,
        rowNumber: tree.row_number,
        positionInRow: tree.position_in_row,
        isActive: tree.is_active,
      }))
      .filter((tree) => tree.orchardCode),
    activities: baselineActivities
      .map((activity) => ({
        orchardCode: orchardCodeById.get(activity.orchard_id),
        status: activity.status,
      }))
      .filter((activity) => activity.orchardCode),
    harvestRecords: baselineHarvestRecords
      .map((record) => ({
        orchardCode: orchardCodeById.get(record.orchard_id),
        seasonYear: record.season_year,
        quantityValue: record.quantity_value,
        quantityUnit: record.quantity_unit,
        quantityKg: record.quantity_kg,
      }))
      .filter((record) => record.orchardCode),
    totals: {
      orchards: baselineOrchards.length,
      memberships: baselineMemberships.length,
      plots: baselinePlots.length,
      varieties: baselineVarieties.length,
      trees: baselineTrees.length,
      activities: baselineActivities.length,
      activityScopes: baselineActivityScopes.length,
      activityMaterials: baselineActivityMaterials.length,
      harvestRecords: baselineHarvestRecords.length,
    },
    byOrchard: Object.fromEntries(
      baselineOrchards.map((orchard) => [
        orchard.code,
        {
          plots: plotCountsByOrchard[orchard.code] ?? 0,
          varieties: varietyCountsByOrchard[orchard.code] ?? 0,
          trees: treeCountsByOrchard[orchard.code] ?? 0,
          activities: activityCountsByOrchard[orchard.code] ?? 0,
          harvestRecords: harvestCountsByOrchard[orchard.code] ?? 0,
        },
      ]),
    ),
    harvestNormalization: {
      tonneRecords: tonneRecords.length,
      normalizedTonneRecords: normalizedTonneRecords.length,
    },
  };
}

async function main() {
  const adminClient = createLocalAdminClient();
  const snapshot = await fetchBaselineQaSnapshot(adminClient);
  const report = evaluateBaselineQaReadiness(snapshot);

  console.log(formatBaselineQaReport(report));

  if (!report.ready) {
    process.exitCode = 1;
  }
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  main().catch((error) => {
    console.error("");
    console.error("Failed to evaluate baseline QA readiness.");
    console.error(
      "Make sure local Supabase is running and the environment contains NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SECRET_KEY.",
    );
    console.error("");
    console.error(error);
    process.exitCode = 1;
  });
}
