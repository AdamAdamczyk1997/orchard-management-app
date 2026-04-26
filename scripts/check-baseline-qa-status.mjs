import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  evaluateBaselineQaReadiness,
  formatBaselineQaReport,
} from "./shared/baseline-qa.mjs";
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
      selectRows(adminClient, "plots", "orchard_id"),
      selectRows(adminClient, "varieties", "orchard_id"),
      selectRows(adminClient, "trees", "orchard_id"),
      selectRows(adminClient, "activities", "orchard_id"),
      selectRows(adminClient, "activity_scopes", "id"),
      selectRows(adminClient, "activity_materials", "id"),
      selectRows(adminClient, "harvest_records", "orchard_id, quantity_unit, quantity_kg"),
    ]);

  const orchardCodeById = new Map(
    orchards.map((orchard) => [orchard.id, orchard.code]),
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

  const plotCountsByOrchard = countByOrchard(plots);
  const varietyCountsByOrchard = countByOrchard(varieties);
  const treeCountsByOrchard = countByOrchard(trees);
  const activityCountsByOrchard = countByOrchard(activities);
  const harvestCountsByOrchard = countByOrchard(harvestRecords);
  const tonneRecords = harvestRecords.filter((record) => record.quantity_unit === "t");
  const normalizedTonneRecords = tonneRecords.filter(
    (record) => Number(record.quantity_kg) === 1200,
  );

  return {
    authUsers: authUsers.map((user) => user.email?.toLowerCase()).filter(Boolean),
    profiles,
    orchards,
    memberships: memberships
      .map((membership) => ({
        orchardCode: orchardCodeById.get(membership.orchard_id),
        email: profileEmailById.get(membership.profile_id),
        role: membership.role,
        status: membership.status,
      }))
      .filter((membership) => membership.orchardCode && membership.email),
    totals: {
      orchards: orchards.length,
      memberships: memberships.length,
      plots: plots.length,
      varieties: varieties.length,
      trees: trees.length,
      activities: activities.length,
      activityScopes: activityScopes.length,
      activityMaterials: activityMaterials.length,
      harvestRecords: harvestRecords.length,
    },
    byOrchard: Object.fromEntries(
      orchards.map((orchard) => [
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
