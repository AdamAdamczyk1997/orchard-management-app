import { afterEach, describe, expect, it } from "vitest";
import {
  previewBulkDeactivateTreesForOrchard,
  previewBulkTreeBatchForOrchard,
} from "@/lib/orchard-data/tree-batches";
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

describe("tree batch operations", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("previews conflicts and creates a linked batch when the target range is free", async () => {
    const owner = await createTestUser("tree-batch-owner");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-batch"),
      code: "TB-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera Batch",
      code: "TB-A",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Batch Gala",
    });

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      treeCode: "EXIST-3",
      rowNumber: 5,
      positionInRow: 3,
    });

    const conflictPreview = await previewBulkTreeBatchForOrchard(
      orchard.orchard_id,
      {
        plot_id: plot.id,
        variety_id: variety.id,
        species: "apple",
        section_name: "North",
        row_number: 5,
        from_position: 1,
        to_position: 4,
        generated_tree_code_pattern: "TB-R5-T{{n}}",
        default_condition_status: "new",
        default_planted_at: "2026-03-20",
        default_rootstock: "M9",
        default_notes: "Batch create test",
      },
      ownerClient,
    );

    expect(conflictPreview.conflicts).toHaveLength(1);
    expect(conflictPreview.conflicts[0]).toMatchObject({
      position_in_row: 3,
      tree_code: "EXIST-3",
    });

    const freePreview = await previewBulkTreeBatchForOrchard(
      orchard.orchard_id,
      {
        plot_id: plot.id,
        variety_id: variety.id,
        species: "apple",
        section_name: "North",
        row_number: 5,
        from_position: 4,
        to_position: 6,
        generated_tree_code_pattern: "TB-R5-T{{n}}",
        default_condition_status: "new",
        default_planted_at: "2026-03-20",
        default_rootstock: "M9",
        default_notes: "Batch create test",
      },
      ownerClient,
    );

    expect(freePreview.conflicts).toEqual([]);
    expect(freePreview.planned_trees.map((tree) => tree.tree_code)).toEqual([
      "TB-R5-T4",
      "TB-R5-T5",
      "TB-R5-T6",
    ]);

    const createResult = await ownerClient
      .rpc("create_bulk_tree_batch", {
        p_plot_id: plot.id,
        p_variety_id: variety.id,
        p_species: "apple",
        p_section_name: "North",
        p_row_number: 5,
        p_from_position: 4,
        p_to_position: 6,
        p_generated_tree_code_pattern: "TB-R5-T{{n}}",
        p_default_condition_status: "new",
        p_default_planted_at: "2026-03-20",
        p_default_rootstock: "M9",
        p_default_notes: "Batch create test",
      })
      .single();
    const createdBatch = createResult.data as
      | { batch_id: string; created_trees_count: number }
      | null;

    expect(createResult.error).toBeNull();
    expect(createdBatch).toMatchObject({
      created_trees_count: 3,
    });

    const createdTrees = await ownerClient
      .from("trees")
      .select(
        "tree_code, section_name, row_number, position_in_row, rootstock, planted_at, notes, planted_batch_id",
      )
      .eq("orchard_id", orchard.orchard_id)
      .eq("plot_id", plot.id)
      .eq("row_number", 5)
      .gte("position_in_row", 4)
      .lte("position_in_row", 6)
      .order("position_in_row", { ascending: true });

    expect(createdTrees.error).toBeNull();
    expect(createdTrees.data).toHaveLength(3);
    expect(createdTrees.data?.map((tree) => tree.tree_code)).toEqual([
      "TB-R5-T4",
      "TB-R5-T5",
      "TB-R5-T6",
    ]);
    expect(
      createdTrees.data?.every((tree) => tree.planted_batch_id === createdBatch?.batch_id),
    ).toBe(true);

    const batchRow = await ownerClient
      .from("bulk_tree_import_batches")
      .select("id, status, created_trees_count, row_number, from_position, to_position")
      .eq("id", createdBatch?.batch_id ?? "")
      .maybeSingle();

    expect(batchRow.error).toBeNull();
    expect(batchRow.data).toMatchObject({
      id: createdBatch?.batch_id,
      status: "done",
      created_trees_count: 3,
      row_number: 5,
      from_position: 4,
      to_position: 6,
    });
  });

  it("previews and bulk deactivates only active trees in the selected range", async () => {
    const owner = await createTestUser("tree-batch-deactivate-owner");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-deactivate"),
      code: "TD-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera Deactivate",
      code: "TD-A",
    });

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "TD-10",
      rowNumber: 8,
      positionInRow: 10,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "TD-11",
      rowNumber: 8,
      positionInRow: 11,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "TD-12",
      rowNumber: 8,
      positionInRow: 12,
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      treeCode: "TD-13",
      rowNumber: 8,
      positionInRow: 13,
      conditionStatus: "removed",
    });

    const preview = await previewBulkDeactivateTreesForOrchard(
      orchard.orchard_id,
      {
        plot_id: plot.id,
        row_number: 8,
        from_position: 10,
        to_position: 13,
        reason: "Korekta nasadzen",
      },
      ownerClient,
    );

    expect(preview.matched_trees).toHaveLength(3);
    expect(preview.missing_positions).toEqual([13]);
    expect(preview.warnings).toHaveLength(1);

    const deactivateResult = await ownerClient
      .rpc("bulk_deactivate_trees", {
        p_plot_id: plot.id,
        p_row_number: 8,
        p_from_position: 10,
        p_to_position: 13,
        p_reason: "Korekta nasadzen",
      })
      .single();
    const deactivatedBatch = deactivateResult.data as
      | { updated_trees_count: number }
      | null;

    expect(deactivateResult.error).toBeNull();
    expect(deactivatedBatch).toMatchObject({
      updated_trees_count: 3,
    });

    const treesAfterDeactivation = await ownerClient
      .from("trees")
      .select("tree_code, position_in_row, condition_status, is_active, notes")
      .eq("orchard_id", orchard.orchard_id)
      .eq("plot_id", plot.id)
      .eq("row_number", 8)
      .order("position_in_row", { ascending: true });

    expect(treesAfterDeactivation.error).toBeNull();
    expect(
      treesAfterDeactivation.data?.filter((tree) => tree.position_in_row !== 13).every((tree) => {
        return (
          tree.condition_status === "removed" &&
          tree.is_active === false &&
          (tree.notes ?? "").includes("Korekta nasadzen")
        );
      }),
    ).toBe(true);
    expect(
      treesAfterDeactivation.data?.find((tree) => tree.position_in_row === 13),
    ).toMatchObject({
      condition_status: "removed",
      is_active: false,
    });
  });
});
