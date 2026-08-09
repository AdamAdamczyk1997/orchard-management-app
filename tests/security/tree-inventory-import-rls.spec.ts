import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import {
  addWorkerMembership,
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestOrchardName,
  createTestUser,
  createTreeAsUser,
  signInTestUser,
  updateMembershipAsAdmin,
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
    fileHash: string;
    status?: string;
  },
) {
  const { data, error } = await client
    .from("inventory_imports")
    .insert({
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      xlsx_contract_version: CONTRACT_VERSION,
      canonical_contract_version: CONTRACT_VERSION,
      file_hash: input.fileHash,
      status: input.status ?? "draft",
      summary_json: {
        positions: 0,
      },
      diagnostics_json: [],
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

describe("tree inventory import RLS", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("allows owner and worker staging access while blocking outsiders and revoked members", async () => {
    const owner = await createTestUser("tree-inventory-rls-owner");
    const worker = await createTestUser("tree-inventory-rls-worker");
    const outsider = await createTestUser("tree-inventory-rls-outsider");
    createdUserIds.push(owner.user.id, worker.user.id, outsider.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;
    const outsiderClient = (await signInTestUser(outsider.email, outsider.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-rls"),
      code: "TIR-01",
    });
    const membership = await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera RLS Import",
    });

    const workerImport = await createInventoryImport(workerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHash: hashWith("1"),
    });

    const workerSourceRow = await workerClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: workerImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 2,
      })
      .select("id")
      .single();
    const workerPosition = await workerClient
      .from("inventory_import_positions")
      .insert({
        import_id: workerImport.id,
        source_row_id: workerSourceRow.data?.id,
        plot_id: plot.id,
        row_number: 1,
        position_in_row: 1,
        species: "apple",
      })
      .select("id")
      .single();
    const ownerRead = await ownerClient
      .from("inventory_imports")
      .select("id, orchard_id")
      .eq("id", workerImport.id);
    const workerRead = await workerClient
      .from("inventory_imports")
      .select("id, orchard_id")
      .eq("id", workerImport.id);
    const outsiderRead = await outsiderClient
      .from("inventory_imports")
      .select("id, orchard_id")
      .eq("id", workerImport.id);
    const outsiderInsert = await outsiderClient
      .from("inventory_imports")
      .insert({
        orchard_id: orchard.orchard_id,
        plot_id: plot.id,
        xlsx_contract_version: CONTRACT_VERSION,
        canonical_contract_version: CONTRACT_VERSION,
        file_hash: hashWith("2"),
      })
      .select("id")
      .single();
    const outsiderChildInsert = await outsiderClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: workerImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 3,
      })
      .select("id")
      .single();

    expect(workerSourceRow.error).toBeNull();
    expect(workerPosition.error).toBeNull();
    expect(ownerRead.error).toBeNull();
    expect(ownerRead.data).toHaveLength(1);
    expect(workerRead.error).toBeNull();
    expect(workerRead.data).toHaveLength(1);
    expect(outsiderRead.error).toBeNull();
    expect(outsiderRead.data).toEqual([]);
    expect(outsiderInsert.data).toBeNull();
    expect(outsiderInsert.error?.code).toBe("42501");
    expect(outsiderChildInsert.data).toBeNull();
    expect(outsiderChildInsert.error?.code).toBe("42501");

    await updateMembershipAsAdmin({
      membershipId: membership.id,
      patch: { status: "revoked" },
    });

    const revokedRead = await workerClient
      .from("inventory_imports")
      .select("id")
      .eq("id", workerImport.id);
    const revokedChildInsert = await workerClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: workerImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 4,
      })
      .select("id")
      .single();

    expect(revokedRead.error).toBeNull();
    expect(revokedRead.data).toEqual([]);
    expect(revokedChildInsert.data).toBeNull();
    expect(revokedChildInsert.error?.code).toBe("42501");
  });

  it("lets workers stage imports but reserves confirmed status and created-tree audit writes for owners", async () => {
    const owner = await createTestUser("tree-inventory-confirm-owner");
    const worker = await createTestUser("tree-inventory-confirm-worker");
    createdUserIds.push(owner.user.id, worker.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const workerClient = (await signInTestUser(worker.email, worker.password)).client;

    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm"),
      code: "TIR-02",
    });
    await addWorkerMembership({
      orchardId: orchard.orchard_id,
      workerProfileId: worker.user.id,
      invitedByProfileId: owner.user.id,
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Kwatera Confirm",
    });

    const workerImport = await createInventoryImport(workerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHash: hashWith("3"),
      status: "ready_for_owner_confirm",
    });
    const createdTree = await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      rowNumber: 9,
      positionInRow: 1,
    });

    const workerConfirm = await workerClient
      .from("inventory_imports")
      .update({
        status: "confirmed",
        confirmed_by_profile_id: worker.user.id,
      })
      .eq("id", workerImport.id)
      .select("id, status")
      .single();
    const workerAuditInsert = await workerClient
      .from("inventory_import_created_trees")
      .insert({
        import_id: workerImport.id,
        tree_id: createdTree.id,
      })
      .select("id")
      .single();
    const ownerConfirm = await ownerClient
      .from("inventory_imports")
      .update({
        status: "confirmed",
        confirmed_by_profile_id: owner.user.id,
      })
      .eq("id", workerImport.id)
      .select("id, status, confirmed_at")
      .single();
    const ownerAuditInsert = await ownerClient
      .from("inventory_import_created_trees")
      .insert({
        import_id: workerImport.id,
        tree_id: createdTree.id,
      })
      .select("id, import_id, tree_id")
      .single();
    const workerWriteAfterConfirmed = await workerClient
      .from("inventory_import_source_rows")
      .insert({
        import_id: workerImport.id,
        row_kind: "segment",
        sheet_name: "segments",
        source_row_number: 2,
      })
      .select("id")
      .single();

    expect(workerConfirm.data).toBeNull();
    expect(workerConfirm.error?.code).toBe("42501");
    expect(workerAuditInsert.data).toBeNull();
    expect(workerAuditInsert.error?.code).toBe("42501");
    expect(ownerConfirm.error).toBeNull();
    expect(ownerConfirm.data).toMatchObject({
      id: workerImport.id,
      status: "confirmed",
    });
    expect(ownerConfirm.data?.confirmed_at).toBeTruthy();
    expect(ownerAuditInsert.error).toBeNull();
    expect(ownerAuditInsert.data).toMatchObject({
      import_id: workerImport.id,
      tree_id: createdTree.id,
    });
    expect(workerWriteAfterConfirmed.data).toBeNull();
    expect(workerWriteAfterConfirmed.error?.code).toBe("42501");
  });

  it("rejects cross-orchard plot references before staging rows are created", async () => {
    const ownerA = await createTestUser("tree-inventory-cross-owner-a");
    const ownerB = await createTestUser("tree-inventory-cross-owner-b");
    createdUserIds.push(ownerA.user.id, ownerB.user.id);

    const ownerAClient = (await signInTestUser(ownerA.email, ownerA.password)).client;
    const ownerBClient = (await signInTestUser(ownerB.email, ownerB.password)).client;

    const orchardA = await createOrchardAsUser(ownerAClient, {
      name: createTestOrchardName("tree-inventory-cross-a"),
      code: "TIR-A",
    });
    const orchardB = await createOrchardAsUser(ownerBClient, {
      name: createTestOrchardName("tree-inventory-cross-b"),
      code: "TIR-B",
    });
    await createPlotAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      name: "Kwatera A",
    });
    const plotB = await createPlotAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      name: "Kwatera B",
    });

    const crossOrchardImport = await ownerAClient
      .from("inventory_imports")
      .insert({
        orchard_id: orchardA.orchard_id,
        plot_id: plotB.id,
        xlsx_contract_version: CONTRACT_VERSION,
        canonical_contract_version: CONTRACT_VERSION,
        file_hash: hashWith("4"),
      })
      .select("id")
      .single();

    expect(crossOrchardImport.data).toBeNull();
    expect(crossOrchardImport.error?.code).toBe("23514");
  });
});
