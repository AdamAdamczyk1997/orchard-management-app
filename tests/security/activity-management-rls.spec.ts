import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createActivityAsUser,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  signInTestUser,
} from "../helpers/test-data";

describe("activity management RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("shows orchard activities only to members of the same orchard", async () => {
    const owner = await createTestUser("activity-rls-owner");
    const worker = await createTestUser("activity-rls-worker");
    const outsider = await createTestUser("activity-rls-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("rls"),
      code: "RLS-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera F",
      code: "F-01",
    });

    await createActivityAsUser(ownerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "inspection",
        activity_date: "2026-04-19",
        title: "Kontrola sektorowa",
        status: "done",
        performed_by_profile_id: owner.user.id,
      },
      scopes: [
        {
          scope_level: "plot",
          scope_order: 1,
        },
      ],
      materials: [],
    });

    const ownerActivities = await ownerClient
      .from("activities")
      .select("id, orchard_id, title")
      .eq("orchard_id", orchard.orchard_id);
    const workerActivities = await workerClient
      .from("activities")
      .select("id, orchard_id, title")
      .eq("orchard_id", orchard.orchard_id);
    const outsiderActivities = await outsiderClient
      .from("activities")
      .select("id, orchard_id, title")
      .eq("orchard_id", orchard.orchard_id);

    expect(ownerActivities.error).toBeNull();
    expect(ownerActivities.data).toHaveLength(1);
    expect(workerActivities.error).toBeNull();
    expect(workerActivities.data).toHaveLength(1);
    expect(outsiderActivities.error).toBeNull();
    expect(outsiderActivities.data).toEqual([]);
  });

  it("allows worker writes in the same orchard, blocks outsider writes, and protects child rows via parent access", async () => {
    const owner = await createTestUser("activity-rls-write-owner");
    const worker = await createTestUser("activity-rls-write-worker");
    const outsider = await createTestUser("activity-rls-write-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("rls-write"),
      code: "RLW-01",
    });
    const secondOrchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("rls-other"),
      code: "RLW-02",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera G",
      code: "G-01",
    });
    const isolatedPlot = await createPlotAsUser(ownerClient, {
      orchardId: secondOrchard.orchard_id,
      name: "Kwatera H",
      code: "H-01",
    });

    const workerActivity = await createActivityAsUser(workerClient, {
      parent: {
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        activity_type: "spraying",
        activity_date: "2026-04-22",
        title: "Oprysk pracownika",
        status: "done",
        performed_by_profile_id: worker.user.id,
      },
      scopes: [
        {
          scope_level: "plot",
          scope_order: 1,
        },
      ],
      materials: [
        {
          name: "Preparat A",
        },
      ],
    });

    const workerChildRead = await workerClient
      .from("activity_scopes")
      .select("activity_id, scope_level")
      .eq("activity_id", workerActivity.activity_id);
    const outsiderChildRead = await outsiderClient
      .from("activity_scopes")
      .select("activity_id, scope_level")
      .eq("activity_id", workerActivity.activity_id);
    const outsiderWrite = await outsiderClient
      .rpc("create_activity_with_children", {
        p_parent: {
          orchard_id: orchard.orchard_id,
          plot_id: plot.id,
          activity_type: "inspection",
          activity_date: "2026-04-23",
          title: "Proba outsidera",
          status: "done",
        },
        p_scopes: [],
        p_materials: [],
      })
      .single();
    const workerReadOtherOrchard = await workerClient
      .from("activities")
      .select("id")
      .eq("orchard_id", secondOrchard.orchard_id);
    const ownerCreateOtherOrchardActivity = await ownerClient
      .rpc("create_activity_with_children", {
        p_parent: {
          orchard_id: secondOrchard.orchard_id,
          plot_id: isolatedPlot.id,
          activity_type: "inspection",
          activity_date: "2026-04-24",
          title: "Aktywnosc izolowana",
          status: "done",
        },
        p_scopes: [],
        p_materials: [],
      })
      .single();

    expect(workerChildRead.error).toBeNull();
    expect(workerChildRead.data).toEqual([
      {
        activity_id: workerActivity.activity_id,
        scope_level: "plot",
      },
    ]);
    expect(outsiderChildRead.error).toBeNull();
    expect(outsiderChildRead.data).toEqual([]);
    expect(outsiderWrite.data).toBeNull();
    expect(outsiderWrite.error?.code).toBe("42501");
    expect(workerReadOtherOrchard.error).toBeNull();
    expect(workerReadOtherOrchard.data).toEqual([]);
    expect(ownerCreateOtherOrchardActivity.error).toBeNull();
  });
});
