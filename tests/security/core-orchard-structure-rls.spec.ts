import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
} from "../helpers/test-data";

describe("core orchard structure RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("owner and worker can read orchard structure, outsider cannot", async () => {
    const owner = await createTestUser("structure-owner");
    const worker = await createTestUser("structure-worker");
    const outsider = await createTestUser("structure-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("structure"),
      code: "STRUCT",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "North Plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const tree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      rowNumber: 2,
      positionInRow: 10,
    });

    const workerPlots = await workerClient
      .from("plots")
      .select("id, orchard_id, name")
      .eq("id", plot.id);
    const workerVarieties = await workerClient
      .from("varieties")
      .select("id, orchard_id, name")
      .eq("id", variety.id);
    const workerTrees = await workerClient
      .from("trees")
      .select("id, orchard_id, plot_id")
      .eq("id", tree.id);

    expect(workerPlots.error).toBeNull();
    expect(workerPlots.data).toHaveLength(1);
    expect(workerVarieties.error).toBeNull();
    expect(workerVarieties.data).toHaveLength(1);
    expect(workerTrees.error).toBeNull();
    expect(workerTrees.data).toHaveLength(1);

    const outsiderPlots = await outsiderClient
      .from("plots")
      .select("id, orchard_id, name")
      .eq("id", plot.id);
    const outsiderVarieties = await outsiderClient
      .from("varieties")
      .select("id, orchard_id, name")
      .eq("id", variety.id);
    const outsiderTrees = await outsiderClient
      .from("trees")
      .select("id, orchard_id, plot_id")
      .eq("id", tree.id);

    expect(outsiderPlots.error).toBeNull();
    expect(outsiderPlots.data).toEqual([]);
    expect(outsiderVarieties.error).toBeNull();
    expect(outsiderVarieties.data).toEqual([]);
    expect(outsiderTrees.error).toBeNull();
    expect(outsiderTrees.data).toEqual([]);
  });

  it("worker can create and update operational data but cannot delete it", async () => {
    const owner = await createTestUser("structure-owner-write");
    const worker = await createTestUser("structure-worker-write");

    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("structure-write"),
      code: "WRITE",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(workerClient, {
      orchardId: orchard.orchard_id,
      name: "Worker Plot",
      code: "WORK",
    });

    const variety = await createVarietyAsUser(workerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Golden Delicious",
    });

    const tree = await createTreeAsUser(workerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      rowNumber: 4,
      positionInRow: 5,
    });

    expect(plot.name).toBe("Worker Plot");
    expect(variety.name).toBe("Golden Delicious");
    expect(tree.plot_id).toBe(plot.id);

    const updatedPlot = await workerClient
      .from("plots")
      .update({
        description: "Updated by worker",
      })
      .eq("id", plot.id)
      .select("id, description")
      .single();

    expect(updatedPlot.error).toBeNull();
    expect(updatedPlot.data?.description).toBe("Updated by worker");

    const workerDeletePlot = await workerClient
      .from("plots")
      .delete()
      .eq("id", plot.id)
      .select("id");

    expect(workerDeletePlot.error).toBeNull();
    expect(workerDeletePlot.data).toEqual([]);

    const ownerReadPlotAfterDeleteAttempt = await ownerClient
      .from("plots")
      .select("id, name, description")
      .eq("id", plot.id)
      .maybeSingle();

    expect(ownerReadPlotAfterDeleteAttempt.error).toBeNull();
    expect(ownerReadPlotAfterDeleteAttempt.data?.id).toBe(plot.id);
    expect(ownerReadPlotAfterDeleteAttempt.data?.description).toBe(
      "Updated by worker",
    );
  });
});
