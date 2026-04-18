import { afterEach, describe, expect, it } from "vitest";
import { createAdminClient } from "../helpers/supabase";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
} from "../helpers/test-data";

describe("core orchard structure", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("creates plot, variety, and tree with consistent orchard ownership", async () => {
    const owner = await createTestUser("phase2-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("phase2-structure"),
      code: "P2-STRUCT",
    });

    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "Plot Alpha",
      code: "ALPHA",
      areaM2: 1250,
    });

    const variety = await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Ligol",
    });

    const tree = await createTreeAsUser(client, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      treeCode: "A-01-001",
      sectionName: "A",
      rowNumber: 1,
      positionInRow: 1,
      locationVerified: true,
    });

    expect(plot.orchard_id).toBe(orchard.orchard_id);
    expect(variety.orchard_id).toBe(orchard.orchard_id);
    expect(tree.orchard_id).toBe(orchard.orchard_id);
    expect(tree.plot_id).toBe(plot.id);
    expect(tree.variety_id).toBe(variety.id);
    expect(tree.row_number).toBe(1);
    expect(tree.position_in_row).toBe(1);

    const treesRead = await client
      .from("trees")
      .select("id, orchard_id, plot_id, variety_id, row_number, position_in_row")
      .eq("id", tree.id)
      .maybeSingle();

    expect(treesRead.error).toBeNull();
    expect(treesRead.data?.orchard_id).toBe(orchard.orchard_id);
    expect(treesRead.data?.plot_id).toBe(plot.id);
    expect(treesRead.data?.variety_id).toBe(variety.id);
  });

  it("enforces tree consistency and active location uniqueness", async () => {
    const ownerA = await createTestUser("phase2-owner-a");
    const ownerB = await createTestUser("phase2-owner-b");
    createdUserIds.push(ownerA.user.id, ownerB.user.id);

    const ownerAClient = (await signInTestUser(ownerA.email, ownerA.password)).client;
    const ownerBClient = (await signInTestUser(ownerB.email, ownerB.password)).client;

    const orchardA = await createOrchardAsUser(ownerAClient, {
      name: createTestOrchardName("phase2-a"),
      code: "P2-A",
    });
    const orchardB = await createOrchardAsUser(ownerBClient, {
      name: createTestOrchardName("phase2-b"),
      code: "P2-B",
    });

    const plotA = await createPlotAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      name: "Plot A",
    });
    const varietyA = await createVarietyAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      species: "apple",
      name: "Szampion",
    });
    const varietyB = await createVarietyAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      species: "apple",
      name: "Idared",
    });

    await createTreeAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      plotId: plotA.id,
      varietyId: varietyA.id,
      species: "apple",
      rowNumber: 3,
      positionInRow: 15,
    });

    const conflictingLocationInsert = await ownerAClient
      .from("trees")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotA.id,
        variety_id: varietyA.id,
        species: "apple",
        row_number: 3,
        position_in_row: 15,
      })
      .select("id")
      .single();

    expect(conflictingLocationInsert.error).not.toBeNull();
    expect(conflictingLocationInsert.data).toBeNull();
    expect(conflictingLocationInsert.error?.code).toBe("23505");

    const crossOrchardTreeInsert = await ownerAClient
      .from("trees")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotA.id,
        variety_id: varietyB.id,
        species: "apple",
      })
      .select("id")
      .single();

    expect(crossOrchardTreeInsert.error).not.toBeNull();
    expect(crossOrchardTreeInsert.data).toBeNull();
    expect(crossOrchardTreeInsert.error?.code).toBe("23514");
    expect(crossOrchardTreeInsert.error?.message).toContain(
      "Tree variety does not exist.",
    );
  });

  it("marks removed trees as inactive via trigger", async () => {
    const owner = await createTestUser("phase2-owner-removed");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("phase2-removed"),
    });
    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "Removal Plot",
    });

    const removedTree = await createTreeAsUser(client, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      conditionStatus: "removed",
    });

    expect(removedTree.condition_status).toBe("removed");
    expect(removedTree.is_active).toBe(false);

    const admin = createAdminClient();
    const storedTree = await admin
      .from("trees")
      .select("id, condition_status, is_active")
      .eq("id", removedTree.id)
      .maybeSingle();

    expect(storedTree.error).toBeNull();
    expect(storedTree.data?.condition_status).toBe("removed");
    expect(storedTree.data?.is_active).toBe(false);
  });
});
