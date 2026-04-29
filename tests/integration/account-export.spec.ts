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
      owned_orchards_count: 1,
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
      owned_orchards_count: 0,
    });
    expect(exportPayload).toBeNull();
  });
});
