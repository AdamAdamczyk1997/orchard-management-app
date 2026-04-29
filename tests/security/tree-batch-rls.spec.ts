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

describe("tree batch RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("allows worker batch writes in the same orchard and blocks outsider access", async () => {
    const owner = await createTestUser("tree-batch-rls-owner");
    const worker = await createTestUser("tree-batch-rls-worker");
    const outsider = await createTestUser("tree-batch-rls-outsider");

    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-batch-rls"),
      code: "TBR-01",
    });

    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });

    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera RLS",
      code: "TBR-A",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "RLS Gala",
    });

    const workerBatch = await workerClient
      .rpc("create_bulk_tree_batch", {
        p_plot_id: plot.id,
        p_variety_id: variety.id,
        p_species: "apple",
        p_section_name: "North",
        p_row_number: 9,
        p_from_position: 1,
        p_to_position: 2,
        p_generated_tree_code_pattern: "RLS-R9-T{{n}}",
        p_default_condition_status: "new",
        p_default_planted_at: "2026-03-21",
        p_default_rootstock: "M9",
        p_default_notes: "Worker batch",
      })
      .single();
    const createdBatch = workerBatch.data as
      | { batch_id: string; created_trees_count: number }
      | null;

    expect(workerBatch.error).toBeNull();
    expect(createdBatch).toMatchObject({
      created_trees_count: 2,
    });

    const workerReadBatch = await workerClient
      .from("bulk_tree_import_batches")
      .select("id, orchard_id, created_trees_count")
      .eq("id", createdBatch?.batch_id ?? "");
    const outsiderReadBatch = await outsiderClient
      .from("bulk_tree_import_batches")
      .select("id, orchard_id, created_trees_count")
      .eq("id", createdBatch?.batch_id ?? "");
    const outsiderCreateBatch = await outsiderClient
      .rpc("create_bulk_tree_batch", {
        p_plot_id: plot.id,
        p_variety_id: variety.id,
        p_species: "apple",
        p_section_name: "North",
        p_row_number: 10,
        p_from_position: 1,
        p_to_position: 2,
        p_generated_tree_code_pattern: "OUT-R10-T{{n}}",
        p_default_condition_status: "new",
        p_default_planted_at: "2026-03-21",
        p_default_rootstock: "M9",
        p_default_notes: "Outsider batch",
      })
      .single();

    expect(workerReadBatch.error).toBeNull();
    expect(workerReadBatch.data).toHaveLength(1);
    expect(outsiderReadBatch.error).toBeNull();
    expect(outsiderReadBatch.data).toEqual([]);
    expect(outsiderCreateBatch.data).toBeNull();
    expect(outsiderCreateBatch.error?.code).toBe("42501");

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "RLS-20",
      rowNumber: 11,
      positionInRow: 20,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "RLS-21",
      rowNumber: 11,
      positionInRow: 21,
    });

    const workerDeactivate = await workerClient
      .rpc("bulk_deactivate_trees", {
        p_plot_id: plot.id,
        p_row_number: 11,
        p_from_position: 20,
        p_to_position: 21,
        p_reason: "Worker cleanup",
      })
      .single();
    const deactivatedBatch = workerDeactivate.data as
      | { updated_trees_count: number }
      | null;
    const outsiderDeactivate = await outsiderClient
      .rpc("bulk_deactivate_trees", {
        p_plot_id: plot.id,
        p_row_number: 11,
        p_from_position: 20,
        p_to_position: 21,
        p_reason: "Outsider cleanup",
      })
      .single();

    expect(workerDeactivate.error).toBeNull();
    expect(deactivatedBatch).toMatchObject({
      updated_trees_count: 2,
    });
    expect(outsiderDeactivate.data).toBeNull();
    expect(outsiderDeactivate.error?.code).toBe("42501");
  });
});
