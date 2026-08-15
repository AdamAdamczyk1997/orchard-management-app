import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
import {
  confirmTreeInventoryImportForOrchard,
} from "@/lib/tree-inventory-import/confirm.server";
import {
  stageTreeInventoryPreviewForOrchard,
} from "@/lib/tree-inventory-import/preview.server";
import {
  resolveTreeInventoryVarietyCandidateForOrchard,
} from "@/lib/tree-inventory-import/variety-resolution.server";
import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  type TreeInventoryCanonicalImport,
  type TreeInventorySegment,
  type TreeInventoryTreeDefaults,
  type TreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
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

type PositionFixture = {
  segmentKey: string;
  sourceRow: number;
  rowNumber: number;
  position: number;
  species: string;
  varietyStatus: TreeInventoryVarietyConfidence;
  varietyName: string | null;
  varietyId?: string | null;
  plannedAction?: "create_tree" | "skip_missing";
  plantedYear?: number | null;
};

function hashWith(fill: string) {
  return fill.repeat(64);
}

function treeDefaults(position: PositionFixture): TreeInventoryTreeDefaults {
  const varietyId = position.varietyId ?? null;

  return {
    species: position.species,
    variety_id: position.varietyStatus === "known" ? varietyId : null,
    variety_name: position.varietyName,
    variety: {
      status: position.varietyStatus,
      raw_name: position.varietyName,
      raw_variety_id: varietyId,
      resolved_variety_id: position.varietyStatus === "known" ? varietyId : null,
    },
    condition_status: "good",
    planted_at: null,
    rootstock: null,
    pollinator_info: null,
    location_verified: false,
    notes: null,
  };
}

function buildCanonical(input: {
  orchardId: string;
  plotId: string;
  positions: PositionFixture[];
}): TreeInventoryCanonicalImport {
  const segments: TreeInventorySegment[] = input.positions.map((position) => {
    const defaults = treeDefaults(position);

    return {
      source: {
        sheet: "NASADZENIA",
        row_number: position.sourceRow,
        row_key: position.segmentKey,
        raw_values: {
          segment_key: position.segmentKey,
          row_number: position.rowNumber,
          from_position: position.position,
          to_position: position.position,
          species: position.species,
          variety_confidence: position.varietyStatus,
          variety_name: position.varietyName,
        },
      },
      segment_key: position.segmentKey,
      location: {
        plot_id: input.plotId,
        section_name: null,
        row_number: position.rowNumber,
        from_position: position.position,
        to_position: position.position,
      },
      tree_defaults: defaults,
      import_only: {
        variety_confidence: position.varietyStatus,
        planted_year: position.plantedYear ?? null,
        planted_year_from: null,
        planted_year_to: null,
        raw_values: {},
      },
    };
  });

  return {
    xlsx_contract_version: TREE_INVENTORY_XLSX_CONTRACT_VERSION,
    canonical_contract_version: TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
    import_id: null,
    file_hash: hashWith("c"),
    generated_context: {
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      plot_layout_type: "rows",
      orchard_name: "Confirm Orchard",
      plot_name: "Confirm Plot",
    },
    requested_behavior: {
      import_mode: "incremental_create",
      conflict_strategy: "reject",
      allow_new_varieties: false,
    },
    segments,
    exceptions: [],
    expanded_positions: segments.map((segment, index) => {
      const fixture = input.positions[index]!;
      const plannedAction = fixture.plannedAction ?? "create_tree";

      return {
        source: segment.source,
        segment_key: segment.segment_key,
        exception_key: null,
        location: {
          plot_id: input.plotId,
          section_name: null,
          row_number: segment.location.row_number,
          position_in_row: segment.location.from_position,
        },
        planned_action: plannedAction,
        tree: plannedAction === "skip_missing" ? null : { ...segment.tree_defaults },
        import_only: segment.import_only,
      };
    }),
    diagnostics: [],
  };
}

async function stagePreview(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    plotId: string;
    positions: PositionFixture[];
    hashFill: string;
  },
) {
  return stageTreeInventoryPreviewForOrchard(
    input.orchardId,
    {
      canonical: buildCanonical(input),
      file: { file_hash: hashWith(input.hashFill) },
    },
    client,
  );
}

async function firstCandidateId(client: SupabaseClient<any>, importId: string) {
  const { data, error } = await client
    .from("inventory_import_variety_candidates")
    .select("id")
    .eq("import_id", importId)
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

async function listTrees(client: SupabaseClient<any>, orchardId: string) {
  const { data, error } = await client
    .from("trees")
    .select("id, variety_id, row_number, position_in_row, notes")
    .eq("orchard_id", orchardId)
    .order("row_number", { ascending: true })
    .order("position_in_row", { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

describe("tree inventory confirm", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("confirms a ready preview, creates trees, skips missing positions and is idempotent", async () => {
    const owner = await createTestUser("tree-inventory-confirm-ready");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm-ready"),
      code: "TIC-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Confirm Ready Plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala Confirm",
    });
    const preview = await stagePreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      hashFill: "1",
      positions: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "known",
          varietyName: variety.name,
          varietyId: variety.id,
          plantedYear: 2020,
        },
        {
          segmentKey: "S2",
          sourceRow: 3,
          rowNumber: 1,
          position: 2,
          species: "apple",
          varietyStatus: "unknown",
          varietyName: null,
          plannedAction: "skip_missing",
        },
        {
          segmentKey: "S3",
          sourceRow: 4,
          rowNumber: 1,
          position: 3,
          species: "apple",
          varietyStatus: "unknown",
          varietyName: null,
        },
      ],
    });

    expect(preview.status).toBe("ready_for_owner_confirm");

    const confirm = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      ownerClient,
    );

    if (!confirm.success) {
      throw new Error(confirm.message);
    }
    expect(confirm.success).toBe(true);
    expect(confirm.data.final_report).toMatchObject({
      created_trees_count: 2,
      created_varieties_count: 0,
      missing_positions_count: 1,
      unknown_variety_trees_count: 1,
      mapped_existing_variety_trees_count: 1,
    });

    const retry = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      ownerClient,
    );
    const trees = await listTrees(ownerClient, orchard.orchard_id);
    const audit = await ownerClient
      .from("inventory_import_created_trees")
      .select("id")
      .eq("import_id", preview.import_id ?? "");
    const stagedImport = await ownerClient
      .from("inventory_imports")
      .select("status, created_trees_count, summary_json")
      .eq("id", preview.import_id ?? "")
      .single();

    expect(retry.success).toBe(true);
    expect(trees).toHaveLength(2);
    expect(trees).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variety_id: variety.id,
          row_number: 1,
          position_in_row: 1,
          notes: expect.stringContaining("2020"),
        }),
        expect.objectContaining({
          variety_id: null,
          row_number: 1,
          position_in_row: 3,
        }),
      ]),
    );
    expect(audit.error).toBeNull();
    expect(audit.data).toHaveLength(2);
    expect(stagedImport.error).toBeNull();
    expect(stagedImport.data).toMatchObject({
      status: "confirmed",
      created_trees_count: 2,
    });
    expect(stagedImport.data?.summary_json).toHaveProperty("confirm_report");
  });

  it("creates explicitly approved new varieties atomically with trees", async () => {
    const owner = await createTestUser("tree-inventory-confirm-new-variety");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm-new-variety"),
      code: "TIC-02",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Confirm New Variety Plot",
    });
    const preview = await stagePreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      hashFill: "2",
      positions: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "new_candidate",
          varietyName: "Atomic Novel",
        },
      ],
    });
    const candidateId = await firstCandidateId(ownerClient, preview.import_id ?? "");
    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.orchard_id,
      { profile_id: owner.user.id, orchard_role: "owner", system_role: "user" },
      {
        import_id: preview.import_id ?? "",
        candidate_id: candidateId,
        resolution_action: "create_new",
        confirm_version: preview.confirm_version,
      },
      ownerClient,
    );

    expect(resolution.success).toBe(true);
    if (!resolution.success) {
      throw new Error(resolution.message);
    }

    const confirm = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: resolution.data.confirm_version,
      },
      ownerClient,
    );
    const varieties = await ownerClient
      .from("varieties")
      .select("id, species, name")
      .eq("orchard_id", orchard.orchard_id)
      .eq("name", "Atomic Novel");
    const trees = await listTrees(ownerClient, orchard.orchard_id);
    const candidate = await ownerClient
      .from("inventory_import_variety_candidates")
      .select("resolution_action, resolved_variety_id")
      .eq("id", candidateId)
      .single();

    if (!confirm.success) {
      throw new Error(confirm.message);
    }
    expect(confirm.success).toBe(true);
    expect(confirm.data.final_report).toMatchObject({
      created_trees_count: 1,
      created_varieties_count: 1,
      created_variety_trees_count: 1,
    });
    expect(varieties.error).toBeNull();
    expect(varieties.data).toHaveLength(1);
    expect(trees).toEqual([
      expect.objectContaining({ variety_id: varieties.data?.[0]?.id }),
    ]);
    expect(candidate.error).toBeNull();
    expect(candidate.data).toMatchObject({
      resolution_action: "create_new",
      resolved_variety_id: varieties.data?.[0]?.id,
    });
  });

  it("blocks unresolved candidates and writes nothing", async () => {
    const owner = await createTestUser("tree-inventory-confirm-unresolved");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm-unresolved"),
      code: "TIC-03",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Confirm Unresolved Plot",
    });
    const preview = await stagePreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      hashFill: "3",
      positions: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "new_candidate",
          varietyName: "Still Unresolved",
        },
      ],
    });

    const confirm = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      ownerClient,
    );
    const trees = await listTrees(ownerClient, orchard.orchard_id);

    expect(preview.status).toBe("awaiting_variety_resolution");
    expect(confirm.success).toBe(false);
    if (confirm.success) {
      throw new Error("Expected unresolved candidate confirm to be blocked.");
    }
    expect(confirm.error_code).toBe("PREVIEW_REQUIRED");
    expect(trees).toEqual([]);
  });

  it("blocks confirm when a mapped variety is deleted after preview", async () => {
    const owner = await createTestUser("tree-inventory-confirm-stale-variety");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm-stale-variety"),
      code: "TIC-04",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Confirm Stale Variety Plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Stale Gala",
    });
    const preview = await stagePreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      hashFill: "4",
      positions: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "known",
          varietyName: variety.name,
          varietyId: variety.id,
        },
      ],
    });
    const deleteVariety = await ownerClient
      .from("varieties")
      .delete()
      .eq("id", variety.id);

    expect(deleteVariety.error).toBeNull();

    const confirm = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      ownerClient,
    );
    const trees = await listTrees(ownerClient, orchard.orchard_id);

    expect(confirm.success).toBe(false);
    if (confirm.success) {
      throw new Error("Expected stale variety confirm to be blocked.");
    }
    expect(confirm.error_code).toBe("PREVIEW_REQUIRED");
    expect(trees).toEqual([]);
  });

  it("blocks confirm when an active location conflict appears after preview", async () => {
    const owner = await createTestUser("tree-inventory-confirm-conflict");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-confirm-conflict"),
      code: "TIC-05",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Confirm Conflict Plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Conflict Gala",
    });
    const preview = await stagePreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      hashFill: "5",
      positions: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 7,
          position: 1,
          species: "apple",
          varietyStatus: "known",
          varietyName: variety.name,
          varietyId: variety.id,
        },
      ],
    });

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      species: "apple",
      varietyId: variety.id,
      rowNumber: 7,
      positionInRow: 1,
    });

    const confirm = await confirmTreeInventoryImportForOrchard(
      orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      ownerClient,
    );
    const audit = await ownerClient
      .from("inventory_import_created_trees")
      .select("id")
      .eq("import_id", preview.import_id ?? "");

    expect(confirm.success).toBe(false);
    if (confirm.success) {
      throw new Error("Expected conflict confirm to be blocked.");
    }
    expect(confirm.error_code).toBe("LOCATION_CONFLICT");
    expect(audit.error).toBeNull();
    expect(audit.data).toEqual([]);
  });
});
