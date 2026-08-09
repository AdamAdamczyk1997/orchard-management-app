import type { SupabaseClient } from "@supabase/supabase-js";
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
} from "../helpers/test-data";

const CONTRACT_VERSION = "tree_inventory_v1";

function hashWith(fill: string) {
  return fill.repeat(64);
}

async function createInventoryImport(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    plotId: string;
    fileHash?: string;
    idempotencyKey?: string;
  },
) {
  const { data, error } = await client
    .from("inventory_imports")
    .insert({
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      xlsx_contract_version: CONTRACT_VERSION,
      canonical_contract_version: CONTRACT_VERSION,
      file_name: "tree-inventory.xlsx",
      file_size_bytes: 4096,
      file_hash: input.fileHash ?? hashWith("a"),
      normalized_hash: hashWith("b"),
      idempotency_key: input.idempotencyKey ?? null,
      status: "validated",
      summary_json: {
        rows: 1,
        positions: 1,
        unresolved_variety_candidates: 0,
      },
      diagnostics_json: [
        {
          severity: "info",
          code: "NORMALIZATION_COMPLETE",
          message: "Canonical payload stored for staging.",
        },
      ],
      canonical_payload_json: {
        contract_version: CONTRACT_VERSION,
        orchard: { plot_id: input.plotId },
        rows: [],
      },
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

describe("tree inventory staging", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("stores import provenance, source rows, positions, variety candidates and audit mappings", async () => {
    const owner = await createTestUser("tree-inventory-staging-owner");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-staging"),
      code: "TIS-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera Import",
      code: "IMP-A",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Import Gala",
    });

    const inventoryImport = await createInventoryImport(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      idempotencyKey: "staging-main",
    });

    expect(inventoryImport).toMatchObject({
      orchard_id: orchard.orchard_id,
      plot_id: plot.id,
      status: "validated",
      created_trees_count: 0,
    });
    expect(inventoryImport.summary_json).toMatchObject({
      positions: 1,
    });

    const sourceRowResult = await ownerClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: inventoryImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 2,
        source_row_key: "segments:2",
        raw_values_json: {
          row_number: "1",
          variety_name: "Import Gala",
        },
        normalized_values_json: {
          row_number: 1,
          variety: { status: "known", resolved_variety_id: variety.id },
        },
      })
      .select("*")
      .single();

    expect(sourceRowResult.error).toBeNull();
    expect(sourceRowResult.data).toMatchObject({
      import_id: inventoryImport.id,
      row_kind: "segment",
      source_row_number: 2,
    });

    const candidateResult = await ownerClient
      .from("inventory_import_variety_candidates")
      .insert({
        import_id: inventoryImport.id,
        candidate_key: "apple:import-gala",
        species: "apple",
        raw_name: "Import Gala",
        normalized_name: "import gala",
        source_status: "known",
        resolution_status: "resolved",
        resolution_action: "use_existing",
        resolved_variety_id: variety.id,
        positions_count: 1,
        source_row_ids: [sourceRowResult.data?.id],
      })
      .select("*")
      .single();

    expect(candidateResult.error).toBeNull();
    expect(candidateResult.data).toMatchObject({
      import_id: inventoryImport.id,
      candidate_key: "apple:import-gala",
      resolution_status: "resolved",
      resolved_variety_id: variety.id,
    });

    const positionResult = await ownerClient
      .from("inventory_import_positions")
      .insert({
        import_id: inventoryImport.id,
        source_row_id: sourceRowResult.data?.id,
        variety_candidate_id: candidateResult.data?.id,
        plot_id: plot.id,
        variety_id: variety.id,
        row_number: 1,
        position_in_row: 1,
        tree_code: "IMP-R1-T1",
        species: "apple",
        planned_action: "create_tree",
        condition_status: "new",
        rootstock: "M9",
        planted_at: "2026-03-20",
        defaults_json: {
          variety: { status: "known", resolved_variety_id: variety.id },
        },
      })
      .select("*")
      .single();

    expect(positionResult.error).toBeNull();
    expect(positionResult.data).toMatchObject({
      import_id: inventoryImport.id,
      plot_id: plot.id,
      row_number: 1,
      position_in_row: 1,
      variety_id: variety.id,
    });

    const createdTree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      treeCode: "IMP-R1-T1",
      rowNumber: 1,
      positionInRow: 1,
      conditionStatus: "new",
    });

    const auditResult = await ownerClient
      .from("inventory_import_created_trees")
      .insert({
        import_id: inventoryImport.id,
        position_id: positionResult.data?.id,
        tree_id: createdTree.id,
        created_tree_snapshot_json: {
          tree_code: createdTree.tree_code,
          row_number: createdTree.row_number,
          position_in_row: createdTree.position_in_row,
        },
      })
      .select("*")
      .single();

    expect(auditResult.error).toBeNull();
    expect(auditResult.data).toMatchObject({
      import_id: inventoryImport.id,
      position_id: positionResult.data?.id,
      tree_id: createdTree.id,
    });
  });

  it("enforces staging constraints and cross-orchard guards", async () => {
    const ownerA = await createTestUser("tree-inventory-staging-owner-a");
    const ownerB = await createTestUser("tree-inventory-staging-owner-b");
    createdUserIds.push(ownerA.user.id, ownerB.user.id);

    const ownerAClient = (await signInTestUser(ownerA.email, ownerA.password)).client;
    const ownerBClient = (await signInTestUser(ownerB.email, ownerB.password)).client;

    const orchardA = await createOrchardAsUser(ownerAClient, {
      name: createTestOrchardName("tree-inventory-staging-a"),
      code: "TIS-A",
    });
    const orchardB = await createOrchardAsUser(ownerBClient, {
      name: createTestOrchardName("tree-inventory-staging-b"),
      code: "TIS-B",
    });
    const plotA = await createPlotAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      name: "Kwatera A",
    });
    const plotB = await createPlotAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      name: "Kwatera B",
    });
    const varietyA = await createVarietyAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      species: "apple",
      name: "Local Gala",
    });
    const varietyB = await createVarietyAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      species: "apple",
      name: "Foreign Gala",
    });
    const treeB = await createTreeAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      plotId: plotB.id,
      varietyId: varietyB.id,
      species: "apple",
      rowNumber: 1,
      positionInRow: 1,
    });

    const inventoryImport = await createInventoryImport(ownerAClient, {
      orchardId: orchardA.orchard_id,
      plotId: plotA.id,
      fileHash: hashWith("c"),
      idempotencyKey: "staging-constraints",
    });

    const sourceRow = await ownerAClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: inventoryImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 2,
      })
      .select("*")
      .single();
    expect(sourceRow.error).toBeNull();

    const candidate = await ownerAClient
      .from("inventory_import_variety_candidates")
      .insert({
        import_id: inventoryImport.id,
        candidate_key: "apple:local-gala",
        species: "apple",
        raw_name: "Local Gala",
        normalized_name: "local gala",
        source_status: "known",
        resolved_variety_id: varietyA.id,
        source_row_ids: [sourceRow.data?.id],
      })
      .select("*")
      .single();
    expect(candidate.error).toBeNull();

    const duplicateIdempotency = await ownerAClient
      .from("inventory_imports")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotA.id,
        xlsx_contract_version: CONTRACT_VERSION,
        canonical_contract_version: CONTRACT_VERSION,
        file_hash: hashWith("d"),
        idempotency_key: "staging-constraints",
      })
      .select("id")
      .single();
    const invalidStatus = await ownerAClient
      .from("inventory_imports")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotA.id,
        xlsx_contract_version: CONTRACT_VERSION,
        canonical_contract_version: CONTRACT_VERSION,
        file_hash: hashWith("e"),
        status: "uploaded",
      })
      .select("id")
      .single();
    const crossOrchardPlot = await ownerAClient
      .from("inventory_imports")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotB.id,
        xlsx_contract_version: CONTRACT_VERSION,
        canonical_contract_version: CONTRACT_VERSION,
        file_hash: hashWith("f"),
      })
      .select("id")
      .single();
    const crossOrchardCandidate = await ownerAClient
      .from("inventory_import_variety_candidates")
      .insert({
        import_id: inventoryImport.id,
        candidate_key: "apple:foreign-gala",
        species: "apple",
        raw_name: "Foreign Gala",
        normalized_name: "foreign gala",
        source_status: "known",
        resolved_variety_id: varietyB.id,
      })
      .select("id")
      .single();
    const crossOrchardPosition = await ownerAClient
      .from("inventory_import_positions")
      .insert({
        import_id: inventoryImport.id,
        source_row_id: sourceRow.data?.id,
        variety_candidate_id: candidate.data?.id,
        plot_id: plotA.id,
        variety_id: varietyB.id,
        row_number: 1,
        position_in_row: 2,
        species: "apple",
      })
      .select("id")
      .single();
    const duplicatePosition = await ownerAClient
      .from("inventory_import_positions")
      .insert([
        {
          import_id: inventoryImport.id,
          plot_id: plotA.id,
          variety_id: varietyA.id,
          row_number: 2,
          position_in_row: 1,
          species: "apple",
        },
        {
          import_id: inventoryImport.id,
          plot_id: plotA.id,
          variety_id: varietyA.id,
          row_number: 2,
          position_in_row: 1,
          species: "apple",
        },
      ])
      .select("id");
    const crossOrchardCreatedTree = await ownerAClient
      .from("inventory_import_created_trees")
      .insert({
        import_id: inventoryImport.id,
        tree_id: treeB.id,
      })
      .select("id")
      .single();

    expect(duplicateIdempotency.data).toBeNull();
    expect(duplicateIdempotency.error?.code).toBe("23505");
    expect(invalidStatus.data).toBeNull();
    expect(invalidStatus.error?.code).toBe("23514");
    expect(crossOrchardPlot.data).toBeNull();
    expect(crossOrchardPlot.error?.code).toBe("23514");
    expect(crossOrchardCandidate.data).toBeNull();
    expect(crossOrchardCandidate.error?.code).toBe("23514");
    expect(crossOrchardPosition.data).toBeNull();
    expect(crossOrchardPosition.error?.code).toBe("23514");
    expect(duplicatePosition.error?.code).toBe("23505");
    expect(crossOrchardCreatedTree.data).toBeNull();
    expect(crossOrchardCreatedTree.error?.code).toBe("23514");
  });
});
