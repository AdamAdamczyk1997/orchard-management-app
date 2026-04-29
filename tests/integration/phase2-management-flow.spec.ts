import { afterEach, describe, expect, it } from "vitest";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  createVarietyAsUser,
  signInTestUser,
  updatePlotAsUser,
  updateTreeAsUser,
  updateVarietyAsUser,
} from "../helpers/test-data";

describe("phase 2 management flow", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("supports plot create, edit, archive, restore, and duplicate protection", async () => {
    const owner = await createTestUser("phase2-plot-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("phase2-plot"),
      code: "P2-PLOT",
    });

    const plot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "North Block",
      code: "NB-01",
      areaM2: 1400,
      layoutType: "rows",
      rowNumberingScheme: "left_to_right_from_entrance",
      treeNumberingScheme: "from_row_start",
      entranceDescription: "Gate from the west side",
      defaultRowCount: 8,
      defaultTreesPerRow: 180,
    });

    expect(plot.layout_type).toBe("rows");
    expect(plot.row_numbering_scheme).toBe("left_to_right_from_entrance");
    expect(plot.tree_numbering_scheme).toBe("from_row_start");
    expect(plot.default_row_count).toBe(8);
    expect(plot.default_trees_per_row).toBe(180);

    const updatedPlot = await updatePlotAsUser(client, {
      plotId: plot.id,
      orchardId: orchard.orchard_id,
      patch: {
        description: "Main production block",
        layout_type: "mixed",
        row_numbering_scheme: "custom",
        tree_numbering_scheme: "from_row_end",
        entrance_description: "Service road from the south",
        layout_notes: "Eastern half has irregular spacing",
        default_row_count: 6,
        default_trees_per_row: 150,
        status: "archived",
        is_active: false,
      },
    });

    expect(updatedPlot.description).toBe("Main production block");
    expect(updatedPlot.layout_type).toBe("mixed");
    expect(updatedPlot.row_numbering_scheme).toBe("custom");
    expect(updatedPlot.tree_numbering_scheme).toBe("from_row_end");
    expect(updatedPlot.entrance_description).toBe("Service road from the south");
    expect(updatedPlot.layout_notes).toBe("Eastern half has irregular spacing");
    expect(updatedPlot.default_row_count).toBe(6);
    expect(updatedPlot.default_trees_per_row).toBe(150);
    expect(updatedPlot.status).toBe("archived");
    expect(updatedPlot.is_active).toBe(false);

    const restoredPlot = await updatePlotAsUser(client, {
      plotId: plot.id,
      orchardId: orchard.orchard_id,
      patch: {
        status: "active",
        is_active: true,
      },
    });

    expect(restoredPlot.status).toBe("active");
    expect(restoredPlot.is_active).toBe(true);
    expect(restoredPlot.layout_type).toBe("mixed");
    expect(restoredPlot.row_numbering_scheme).toBe("custom");
    expect(restoredPlot.tree_numbering_scheme).toBe("from_row_end");

    const duplicatePlot = await client
      .from("plots")
      .insert({
        orchard_id: orchard.orchard_id,
        name: "North Block",
      })
      .select("id")
      .single();

    expect(duplicatePlot.error).not.toBeNull();
    expect(duplicatePlot.data).toBeNull();
    expect(duplicatePlot.error?.code).toBe("23505");
  });

  it("supports variety create, edit, search, and duplicate protection", async () => {
    const owner = await createTestUser("phase2-variety-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("phase2-variety"),
      code: "P2-VAR",
    });

    const ligol = await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Ligol",
    });

    await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "pear",
      name: "Conference",
    });

    const updatedLigol = await updateVarietyAsUser(client, {
      varietyId: ligol.id,
      orchardId: orchard.orchard_id,
      patch: {
        characteristics: "Large fruit, good storage life",
        is_favorite: true,
      },
    });

    expect(updatedLigol.is_favorite).toBe(true);

    const searchResults = await client
      .from("varieties")
      .select("id, species, name, is_favorite")
      .eq("orchard_id", orchard.orchard_id)
      .or("name.ilike.%lig%,species.ilike.%lig%")
      .order("species", { ascending: true })
      .order("name", { ascending: true });

    expect(searchResults.error).toBeNull();
    expect(searchResults.data).toHaveLength(1);
    expect(searchResults.data?.[0]).toMatchObject({
      id: ligol.id,
      name: "Ligol",
      is_favorite: true,
    });

    const duplicateVariety = await client
      .from("varieties")
      .insert({
        orchard_id: orchard.orchard_id,
        species: "apple",
        name: "Ligol",
      })
      .select("id")
      .single();

    expect(duplicateVariety.error).not.toBeNull();
    expect(duplicateVariety.data).toBeNull();
    expect(duplicateVariety.error?.code).toBe("23505");
  });

  it("supports tree create, edit, and orchard-scoped filtering", async () => {
    const owner = await createTestUser("phase2-tree-owner");
    createdUserIds.push(owner.user.id);

    const { client } = await signInTestUser(owner.email, owner.password);
    const orchard = await createOrchardAsUser(client, {
      name: createTestOrchardName("phase2-tree"),
      code: "P2-TREE",
    });

    const northPlot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "North Plot",
    });
    const southPlot = await createPlotAsUser(client, {
      orchardId: orchard.orchard_id,
      name: "South Plot",
    });

    const gala = await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const jonagold = await createVarietyAsUser(client, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Jonagold",
    });

    const firstTree = await createTreeAsUser(client, {
      orchardId: orchard.orchard_id,
      plotId: northPlot.id,
      varietyId: gala.id,
      species: "apple",
      treeCode: "N-01-001",
      displayName: "North starter",
      rowNumber: 1,
      positionInRow: 1,
    });

    await createTreeAsUser(client, {
      orchardId: orchard.orchard_id,
      plotId: northPlot.id,
      varietyId: gala.id,
      species: "apple",
      treeCode: "N-01-002",
      conditionStatus: "warning",
      rowNumber: 1,
      positionInRow: 2,
    });

    await createTreeAsUser(client, {
      orchardId: orchard.orchard_id,
      plotId: southPlot.id,
      varietyId: jonagold.id,
      species: "apple",
      treeCode: "S-03-005",
      conditionStatus: "removed",
      rowNumber: 3,
      positionInRow: 5,
    });

    const updatedTree = await updateTreeAsUser(client, {
      treeId: firstTree.id,
      orchardId: orchard.orchard_id,
      patch: {
        plot_id: southPlot.id,
        variety_id: jonagold.id,
        display_name: "South transfer",
        section_name: "B",
        row_number: 2,
        position_in_row: 8,
      },
    });

    expect(updatedTree.plot_id).toBe(southPlot.id);
    expect(updatedTree.variety_id).toBe(jonagold.id);
    expect(updatedTree.display_name).toBe("South transfer");
    expect(updatedTree.row_number).toBe(2);
    expect(updatedTree.position_in_row).toBe(8);

    const southPlotTrees = await client
      .from("trees")
      .select("id, plot_id, variety_id, tree_code, display_name")
      .eq("orchard_id", orchard.orchard_id)
      .eq("plot_id", southPlot.id)
      .eq("is_active", true);

    expect(southPlotTrees.error).toBeNull();
    expect(southPlotTrees.data?.map((tree) => tree.id).sort()).toEqual([firstTree.id]);

    const jonagoldTrees = await client
      .from("trees")
      .select("id, variety_id")
      .eq("orchard_id", orchard.orchard_id)
      .eq("variety_id", jonagold.id)
      .eq("is_active", true);

    expect(jonagoldTrees.error).toBeNull();
    expect(jonagoldTrees.data?.map((tree) => tree.id)).toEqual([firstTree.id]);

    const warningTrees = await client
      .from("trees")
      .select("id, condition_status")
      .eq("orchard_id", orchard.orchard_id)
      .eq("condition_status", "warning");

    expect(warningTrees.error).toBeNull();
    expect(warningTrees.data).toHaveLength(1);
    expect(warningTrees.data?.[0]?.condition_status).toBe("warning");

    const searchByCode = await client
      .from("trees")
      .select("id, tree_code, display_name")
      .eq("orchard_id", orchard.orchard_id)
      .or("tree_code.ilike.%S-03%,display_name.ilike.%S-03%");

    expect(searchByCode.error).toBeNull();
    expect(searchByCode.data).toHaveLength(1);
    expect(searchByCode.data?.[0]?.tree_code).toBe("S-03-005");
  });
});
