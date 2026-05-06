import { afterEach, describe, expect, it } from "vitest";
import {
  getExportAccountDataForProfile,
  readExportAvailabilityForProfile,
} from "@/lib/orchard-data/export";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createActivityAsUser,
  createHarvestRecordAsUser,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
} from "../helpers/test-data";
import { createAdminClient } from "../helpers/supabase";

const SEEDED_SUPER_ADMIN_EMAIL = "admin@orchardlog.local";
const SEEDED_SUPER_ADMIN_PASSWORD =
  process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!";

async function seedExportDatasetForOrchard(input: {
  client: Awaited<ReturnType<typeof signInTestUser>>["client"];
  orchardId: string;
  profileId: string;
  plotName: string;
  plotCode: string;
  varietyName: string;
  treeCode: string;
  activityTitle: string;
  harvestDate: string;
}) {
  const plot = await createPlotAsUser(input.client, {
    orchardId: input.orchardId,
    name: input.plotName,
    code: input.plotCode,
  });
  const variety = await createVarietyAsUser(input.client, {
    orchardId: input.orchardId,
    species: "apple",
    name: input.varietyName,
  });
  const tree = await createTreeAsUser(input.client, {
    orchardId: input.orchardId,
    plotId: plot.id,
    varietyId: variety.id,
    species: "apple",
    treeCode: input.treeCode,
    displayName: `${input.varietyName} drzewo`,
    rowNumber: 1,
    positionInRow: 1,
  });
  const activity = await createActivityAsUser(input.client, {
    parent: {
      orchard_id: input.orchardId,
      plot_id: plot.id,
      activity_type: "spraying",
      activity_date: "2026-05-12",
      title: input.activityTitle,
      status: "done",
      performed_by_profile_id: input.profileId,
      season_phase: "wiosna",
    },
    scopes: [
      {
        scope_level: "tree",
        tree_id: tree.id,
        scope_order: 1,
      },
    ],
    materials: [
      {
        name: "Miedzian",
        category: "fungicide",
        quantity: 1.5,
        unit: "l",
      },
    ],
  });
  const harvest = await createHarvestRecordAsUser(input.client, {
    orchard_id: input.orchardId,
    plot_id: plot.id,
    variety_id: variety.id,
    tree_id: tree.id,
    activity_id: activity.activity_id,
    scope_level: "tree",
    harvest_date: input.harvestDate,
    quantity_value: 32,
    quantity_unit: "kg",
    created_by_profile_id: input.profileId,
  });

  return {
    activityId: activity.activity_id,
    harvestId: harvest.id,
    plotId: plot.id,
    treeId: tree.id,
    varietyId: variety.id,
  };
}

describe("account export", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("exports only orchards where the user has active owner membership", async () => {
    const owner = await createTestUser("export-owner");
    const worker = await createTestUser("export-worker");
    const secondOwner = await createTestUser("export-second-owner");

    createdUserIds.push(owner.user.id, worker.user.id, secondOwner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const secondOwnerClient = (
      await signInTestUser(secondOwner.email, secondOwner.password)
    ).client;

    const ownedOrchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("export-owned"),
      code: "EXP-OWN",
    });
    const workerOnlyOrchard = await createOrchardAsUser(secondOwnerClient, {
      name: createTestOrchardName("export-worker-only"),
      code: "EXP-WRK",
    });

    await addWorkerMembership({
      orchardId: ownedOrchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });
    await addWorkerMembership({
      orchardId: workerOnlyOrchard.orchard_id,
      workerProfileId: owner.user.id,
      invitedByProfileId: secondOwner.user.id,
    });

    const ownedPlot = await createPlotAsUser(ownerClient, {
      orchardId: ownedOrchard.orchard_id,
      name: "Kwatera eksportowa",
      code: "EXP-01",
    });
    const ownedVariety = await createVarietyAsUser(ownerClient, {
      orchardId: ownedOrchard.orchard_id,
      species: "apple",
      name: "Golden Export",
    });
    const ownedTree = await createTreeAsUser(ownerClient, {
      orchardId: ownedOrchard.orchard_id,
      plotId: ownedPlot.id,
      varietyId: ownedVariety.id,
      species: "apple",
      treeCode: "EXP-01-R1-P1",
      displayName: "Drzewo eksportowe",
      rowNumber: 1,
      positionInRow: 1,
    });

    const activity = await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: ownedOrchard.orchard_id,
        plot_id: ownedPlot.id,
        activity_type: "spraying",
        activity_date: "2026-05-12",
        title: "Zabieg testowy",
        status: "done",
        performed_by_profile_id: owner.user.id,
        performed_by: owner.profile.display_name,
        season_phase: "wiosna",
      },
      scopes: [
        {
          scope_level: "tree",
          tree_id: ownedTree.id,
          scope_order: 1,
          notes: "Zakres pojedynczego drzewa",
        },
      ],
      materials: [
        {
          name: "Miedzian",
          category: "fungicide",
          quantity: 1.5,
          unit: "l",
        },
      ],
    });

    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: ownedOrchard.orchard_id,
      plot_id: ownedPlot.id,
      variety_id: ownedVariety.id,
      tree_id: ownedTree.id,
      activity_id: activity.activity_id,
      scope_level: "tree",
      harvest_date: "2026-09-30",
      quantity_value: 32,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });

    await createPlotAsUser(secondOwnerClient, {
      orchardId: workerOnlyOrchard.orchard_id,
      name: "Kwatera obca",
      code: "WRK-01",
    });

    const availability = await readExportAvailabilityForProfile(owner.user.id, ownerClient);
    const exportPayload = await getExportAccountDataForProfile(owner.user.id, ownerClient);

    expect(availability).toEqual({
      can_export: true,
      scope: "owned_orchards",
      orchards_count: 1,
    });
    expect(exportPayload).not.toBeNull();
    expect(exportPayload?.profile.email).toBe(owner.email);
    expect(exportPayload?.orchards).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.orchard.id).toBe(ownedOrchard.orchard_id);
    expect(exportPayload?.orchards[0]?.orchard_memberships).toHaveLength(2);
    expect(exportPayload?.orchards[0]?.plots).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.varieties).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.trees).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.activities).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.activity_scopes).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.activity_materials).toHaveLength(1);
    expect(exportPayload?.orchards[0]?.harvest_records).toHaveLength(1);
    expect(
      exportPayload?.orchards.some(
        (record) => record.orchard.id === workerOnlyOrchard.orchard_id,
      ),
    ).toBe(false);
  });

  it("blocks export for a user without active owner membership", async () => {
    const owner = await createTestUser("export-owner-only");
    const worker = await createTestUser("export-worker-only");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("export-forbidden"),
      code: "EXP-NO",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const availability = await readExportAvailabilityForProfile(worker.user.id, workerClient);
    const exportPayload = await getExportAccountDataForProfile(worker.user.id, workerClient);

    expect(availability).toEqual({
      can_export: false,
      scope: "owned_orchards",
      orchards_count: 0,
    });
    expect(exportPayload).toBeNull();
  });

  it("allows super admin to export administratively visible orchards with dependent records", async () => {
    const admin = createAdminClient();
    const firstOwner = await createTestUser("export-admin-owner-a");
    const secondOwner = await createTestUser("export-admin-owner-b");

    createdUserIds.push(firstOwner.user.id, secondOwner.user.id);

    const { data: seededSuperAdminProfile, error: seededSuperAdminError } = await admin
      .from("profiles")
      .select("id, email, system_role")
      .eq("email", SEEDED_SUPER_ADMIN_EMAIL)
      .maybeSingle();

    if (seededSuperAdminError) {
      throw seededSuperAdminError;
    }

    if (
      !seededSuperAdminProfile ||
      seededSuperAdminProfile.system_role !== "super_admin"
    ) {
      throw new Error(
        "Baseline super_admin profile is required for the administrative export integration test.",
      );
    }

    const firstOwnerClient = (
      await signInTestUser(firstOwner.email, firstOwner.password)
    ).client;
    const secondOwnerClient = (
      await signInTestUser(secondOwner.email, secondOwner.password)
    ).client;
    const superAdminClient = (
      await signInTestUser(SEEDED_SUPER_ADMIN_EMAIL, SEEDED_SUPER_ADMIN_PASSWORD)
    ).client;

    const firstOrchard = await createOrchardAsUser(firstOwnerClient, {
      name: createTestOrchardName("export-admin-a"),
      code: "EXA-01",
    });
    const secondOrchard = await createOrchardAsUser(secondOwnerClient, {
      name: createTestOrchardName("export-admin-b"),
      code: "EXB-01",
    });

    const firstDataset = await seedExportDatasetForOrchard({
      client: firstOwnerClient,
      orchardId: firstOrchard.orchard_id,
      profileId: firstOwner.user.id,
      plotName: "Admin orchard A",
      plotCode: "ADM-A",
      varietyName: "Admin Variety A",
      treeCode: "ADM-A-1",
      activityTitle: "Admin activity A",
      harvestDate: "2026-09-20",
    });
    const secondDataset = await seedExportDatasetForOrchard({
      client: secondOwnerClient,
      orchardId: secondOrchard.orchard_id,
      profileId: secondOwner.user.id,
      plotName: "Admin orchard B",
      plotCode: "ADM-B",
      varietyName: "Admin Variety B",
      treeCode: "ADM-B-1",
      activityTitle: "Admin activity B",
      harvestDate: "2026-09-21",
    });

    const availability = await readExportAvailabilityForProfile(
      seededSuperAdminProfile.id,
      superAdminClient,
    );
    const exportPayload = await getExportAccountDataForProfile(
      seededSuperAdminProfile.id,
      superAdminClient,
    );

    expect(availability.can_export).toBe(true);
    expect(availability.scope).toBe("all_orchards_admin");
    expect(availability.orchards_count).toBeGreaterThanOrEqual(2);
    expect(exportPayload).not.toBeNull();

    const exportedOrchards = exportPayload?.orchards ?? [];
    const exportedOrchardIds = exportedOrchards.map((record) => record.orchard.id);

    expect(exportedOrchardIds).toEqual(
      expect.arrayContaining([firstOrchard.orchard_id, secondOrchard.orchard_id]),
    );

    const firstExport = exportedOrchards.find(
      (record) => record.orchard.id === firstOrchard.orchard_id,
    );
    const secondExport = exportedOrchards.find(
      (record) => record.orchard.id === secondOrchard.orchard_id,
    );

    expect(firstExport?.plots.some((plot) => plot.id === firstDataset.plotId)).toBe(true);
    expect(firstExport?.varieties.some((variety) => variety.id === firstDataset.varietyId)).toBe(
      true,
    );
    expect(firstExport?.trees.some((tree) => tree.id === firstDataset.treeId)).toBe(true);
    expect(
      firstExport?.activities.some((activity) => activity.id === firstDataset.activityId),
    ).toBe(true);
    expect(
      firstExport?.harvest_records.some((harvest) => harvest.id === firstDataset.harvestId),
    ).toBe(true);
    expect(firstExport?.activity_scopes).toHaveLength(1);
    expect(firstExport?.activity_materials).toHaveLength(1);

    expect(secondExport?.plots.some((plot) => plot.id === secondDataset.plotId)).toBe(true);
    expect(
      secondExport?.varieties.some((variety) => variety.id === secondDataset.varietyId),
    ).toBe(true);
    expect(secondExport?.trees.some((tree) => tree.id === secondDataset.treeId)).toBe(true);
    expect(
      secondExport?.activities.some((activity) => activity.id === secondDataset.activityId),
    ).toBe(true);
    expect(
      secondExport?.harvest_records.some((harvest) => harvest.id === secondDataset.harvestId),
    ).toBe(true);
    expect(secondExport?.activity_scopes).toHaveLength(1);
    expect(secondExport?.activity_materials).toHaveLength(1);
  });
});
