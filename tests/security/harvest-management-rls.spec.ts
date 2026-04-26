import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createHarvestRecordAsUser,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  signInTestUser,
} from "../helpers/test-data";

describe("harvest management RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("shows orchard harvest records only to members of the same orchard", async () => {
    const owner = await createTestUser("harvest-rls-owner");
    const worker = await createTestUser("harvest-rls-worker");
    const outsider = await createTestUser("harvest-rls-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvest-rls"),
      code: "HRL-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera M",
      code: "M-01",
    });

    await createHarvestRecordAsUser(ownerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plot.id,
      scope_level: "plot",
      harvest_date: "2026-09-12",
      quantity_value: 120,
      quantity_unit: "kg",
      created_by_profile_id: owner.user.id,
    });

    const ownerRecords = await ownerClient
      .from("harvest_records")
      .select("id, orchard_id, scope_level")
      .eq("orchard_id", orchard.orchard_id);
    const workerRecords = await workerClient
      .from("harvest_records")
      .select("id, orchard_id, scope_level")
      .eq("orchard_id", orchard.orchard_id);
    const outsiderRecords = await outsiderClient
      .from("harvest_records")
      .select("id, orchard_id, scope_level")
      .eq("orchard_id", orchard.orchard_id);

    expect(ownerRecords.error).toBeNull();
    expect(ownerRecords.data).toHaveLength(1);
    expect(workerRecords.error).toBeNull();
    expect(workerRecords.data).toHaveLength(1);
    expect(outsiderRecords.error).toBeNull();
    expect(outsiderRecords.data).toEqual([]);
  });

  it("allows worker writes and deletes in the same orchard, and blocks outsider writes", async () => {
    const owner = await createTestUser("harvest-rls-write-owner");
    const worker = await createTestUser("harvest-rls-write-worker");
    const outsider = await createTestUser("harvest-rls-write-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvest-rls-write"),
      code: "HRL-02",
    });
    const secondOrchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("harvest-rls-other"),
      code: "HRL-03",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera N",
      code: "N-01",
    });
    const isolatedPlot = await createPlotAsUser(ownerClient, {
      orchardId: secondOrchard.orchard_id,
      name: "Kwatera O",
      code: "O-01",
    });

    const workerRecord = await createHarvestRecordAsUser(workerClient, {
      orchard_id: orchard.orchard_id,
      plot_id: plot.id,
      scope_level: "plot",
      harvest_date: "2026-09-14",
      quantity_value: 80,
      quantity_unit: "kg",
      created_by_profile_id: worker.user.id,
    });

    const outsiderWrite = await outsiderClient
      .from("harvest_records")
      .insert({
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        scope_level: "plot",
        harvest_date: "2026-09-15",
        quantity_value: 30,
        quantity_unit: "kg",
        created_by_profile_id: outsider.user.id,
      })
      .select("*")
      .single();
    const workerReadOtherOrchard = await workerClient
      .from("harvest_records")
      .select("id")
      .eq("orchard_id", secondOrchard.orchard_id);
    const ownerWriteOtherOrchard = await ownerClient
      .from("harvest_records")
      .insert({
        orchard_id: secondOrchard.orchard_id,
        plot_id: isolatedPlot.id,
        scope_level: "plot",
        harvest_date: "2026-09-16",
        quantity_value: 55,
        quantity_unit: "kg",
        created_by_profile_id: owner.user.id,
      })
      .select("id")
      .single();
    const ownerRecordsAfterOutsiderAttempt = await ownerClient
      .from("harvest_records")
      .select("id")
      .eq("orchard_id", orchard.orchard_id);
    const workerDelete = await workerClient
      .from("harvest_records")
      .delete()
      .eq("id", workerRecord.id)
      .eq("orchard_id", orchard.orchard_id)
      .select("id");

    expect(outsiderWrite.data).toBeNull();
    expect(outsiderWrite.error?.code).toBeTruthy();
    expect(workerReadOtherOrchard.error).toBeNull();
    expect(workerReadOtherOrchard.data).toEqual([]);
    expect(ownerWriteOtherOrchard.error).toBeNull();
    expect(ownerRecordsAfterOutsiderAttempt.error).toBeNull();
    expect(ownerRecordsAfterOutsiderAttempt.data).toEqual([{ id: workerRecord.id }]);
    expect(workerDelete.error).toBeNull();
    expect(workerDelete.data).toEqual([{ id: workerRecord.id }]);
  });
});
