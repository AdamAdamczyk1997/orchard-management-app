import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it } from "vitest";
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
  createVarietyAsUser,
  signInTestUser,
} from "../helpers/test-data";

type SegmentFixture = {
  segmentKey: string;
  sourceRow: number;
  rowNumber: number;
  position: number;
  species: string;
  varietyStatus: TreeInventoryVarietyConfidence;
  varietyName: string | null;
};

type CandidateRecord = {
  id: string;
  species: string;
  raw_name: string | null;
  source_status: TreeInventoryVarietyConfidence;
  resolution_status: string;
  resolution_action: string | null;
  suggested_variety_id: string | null;
  resolved_variety_id: string | null;
};

function hashWith(fill: string) {
  return fill.repeat(64);
}

function treeDefaults(segment: SegmentFixture): TreeInventoryTreeDefaults {
  return {
    species: segment.species,
    variety_id: null,
    variety_name: segment.varietyName,
    variety: {
      status: segment.varietyStatus,
      raw_name: segment.varietyName,
      raw_variety_id: null,
      resolved_variety_id: null,
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
  segments: SegmentFixture[];
}): TreeInventoryCanonicalImport {
  const segments: TreeInventorySegment[] = input.segments.map((segment) => {
    const defaults = treeDefaults(segment);

    return {
      source: {
        sheet: "NASADZENIA",
        row_number: segment.sourceRow,
        row_key: segment.segmentKey,
        raw_values: {
          segment_key: segment.segmentKey,
          row_number: segment.rowNumber,
          from_position: segment.position,
          to_position: segment.position,
          species: segment.species,
          variety_confidence: segment.varietyStatus,
          variety_name: segment.varietyName,
        },
      },
      segment_key: segment.segmentKey,
      location: {
        plot_id: input.plotId,
        section_name: null,
        row_number: segment.rowNumber,
        from_position: segment.position,
        to_position: segment.position,
      },
      tree_defaults: defaults,
      import_only: {
        variety_confidence: segment.varietyStatus,
        planted_year: null,
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
    file_hash: hashWith("a"),
    generated_context: {
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      plot_layout_type: "rows",
      orchard_name: "Resolution Orchard",
      plot_name: "Resolution Plot",
    },
    requested_behavior: {
      import_mode: "incremental_create",
      conflict_strategy: "reject",
      allow_new_varieties: false,
    },
    segments,
    exceptions: [],
    expanded_positions: segments.map((segment) => ({
      source: segment.source,
      segment_key: segment.segment_key,
      exception_key: null,
      location: {
        plot_id: input.plotId,
        section_name: null,
        row_number: segment.location.row_number,
        position_in_row: segment.location.from_position,
      },
      planned_action: "create_tree" as const,
      tree: { ...segment.tree_defaults },
      import_only: segment.import_only,
    })),
    diagnostics: [],
  };
}

async function stageResolutionPreview(
  client: SupabaseClient<any>,
  input: {
    orchardId: string;
    plotId: string;
    segments: SegmentFixture[];
    fileHashFill: string;
  },
) {
  return stageTreeInventoryPreviewForOrchard(
    input.orchardId,
    {
      canonical: buildCanonical(input),
      file: { file_hash: hashWith(input.fileHashFill) },
    },
    client,
  );
}

async function listCandidates(client: SupabaseClient<any>, importId: string) {
  const { data, error } = await client
    .from("inventory_import_variety_candidates")
    .select(
      "id, species, raw_name, source_status, resolution_status, resolution_action, suggested_variety_id, resolved_variety_id",
    )
    .eq("import_id", importId)
    .order("species", { ascending: true })
    .order("raw_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CandidateRecord[];
}

async function getImportSummary(client: SupabaseClient<any>, importId: string) {
  const { data, error } = await client
    .from("inventory_imports")
    .select("status, summary_json, confirm_version")
    .eq("id", importId)
    .single();

  if (error) {
    throw error;
  }

  return data as {
    status: string;
    summary_json: {
      unresolved_variety_candidates: number;
      suggested_variety_candidates: number;
    };
    confirm_version: number;
  };
}

async function countVarieties(client: SupabaseClient<any>, orchardId: string) {
  const { count, error } = await client
    .from("varieties")
    .select("id", { count: "exact", head: true })
    .eq("orchard_id", orchardId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

describe("tree inventory variety resolution", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("lets an owner map a suggested candidate to an existing orchard-local variety", async () => {
    const owner = await createTestUser("tree-inventory-resolution-map");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-resolution-map"),
      code: "TVR-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Resolution Map Plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const preview = await stageResolutionPreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHashFill: "1",
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "new_candidate",
          varietyName: "Gala",
        },
      ],
    });
    const [candidate] = await listCandidates(ownerClient, preview.import_id ?? "");

    expect(candidate).toMatchObject({
      resolution_status: "suggested",
      suggested_variety_id: variety.id,
      resolved_variety_id: null,
    });

    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.orchard_id,
      { profile_id: owner.user.id, orchard_role: "owner", system_role: "user" },
      {
        import_id: preview.import_id ?? "",
        candidate_id: candidate.id,
        resolution_action: "use_existing",
        variety_id: variety.id,
        confirm_version: preview.confirm_version,
      },
      ownerClient,
    );
    const [resolvedCandidate] = await listCandidates(
      ownerClient,
      preview.import_id ?? "",
    );
    const positions = await ownerClient
      .from("inventory_import_positions")
      .select("variety_id")
      .eq("import_id", preview.import_id ?? "");

    expect(resolution.success).toBe(true);
    if (!resolution.success) {
      throw new Error(resolution.message);
    }
    expect(resolution.data.status).toBe("ready_for_owner_confirm");
    expect(resolvedCandidate).toMatchObject({
      resolution_status: "resolved",
      resolution_action: "use_existing",
      resolved_variety_id: variety.id,
    });
    expect(positions.error).toBeNull();
    expect(positions.data).toEqual([{ variety_id: variety.id }]);
  });

  it("stores create-new-at-confirm without inserting a variety row before confirm", async () => {
    const owner = await createTestUser("tree-inventory-resolution-create");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-resolution-create"),
      code: "TVR-02",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Resolution Create Plot",
    });
    const beforeCount = await countVarieties(ownerClient, orchard.orchard_id);
    const preview = await stageResolutionPreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHashFill: "2",
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "new_candidate",
          varietyName: "Phase 8A Novel",
        },
      ],
    });
    const [candidate] = await listCandidates(ownerClient, preview.import_id ?? "");

    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.orchard_id,
      { profile_id: owner.user.id, orchard_role: "owner", system_role: "user" },
      {
        import_id: preview.import_id ?? "",
        candidate_id: candidate.id,
        resolution_action: "create_new",
        confirm_version: preview.confirm_version,
      },
      ownerClient,
    );
    const [resolvedCandidate] = await listCandidates(
      ownerClient,
      preview.import_id ?? "",
    );
    const afterCount = await countVarieties(ownerClient, orchard.orchard_id);

    expect(resolution.success).toBe(true);
    if (!resolution.success) {
      throw new Error(resolution.message);
    }
    expect(resolution.data.status).toBe("ready_for_owner_confirm");
    expect(resolvedCandidate).toMatchObject({
      resolution_status: "resolved",
      resolution_action: "create_new",
      resolved_variety_id: null,
    });
    expect(afterCount).toBe(beforeCount);
  });

  it("accepts unknown variety groups and keeps staged positions without variety_id", async () => {
    const owner = await createTestUser("tree-inventory-resolution-unknown");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-resolution-unknown"),
      code: "TVR-03",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Resolution Unknown Plot",
    });
    const preview = await stageResolutionPreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHashFill: "3",
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "uncertain",
          varietyName: "Maybe Unknown",
        },
      ],
    });
    const [candidate] = await listCandidates(ownerClient, preview.import_id ?? "");

    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.orchard_id,
      { profile_id: owner.user.id, orchard_role: "owner", system_role: "user" },
      {
        import_id: preview.import_id ?? "",
        candidate_id: candidate.id,
        resolution_action: "keep_unknown",
        confirm_version: preview.confirm_version,
      },
      ownerClient,
    );
    const [resolvedCandidate] = await listCandidates(
      ownerClient,
      preview.import_id ?? "",
    );
    const positions = await ownerClient
      .from("inventory_import_positions")
      .select("variety_id")
      .eq("import_id", preview.import_id ?? "");

    expect(resolution.success).toBe(true);
    expect(resolvedCandidate).toMatchObject({
      resolution_status: "accepted_unknown",
      resolution_action: "keep_unknown",
      resolved_variety_id: null,
    });
    expect(positions.error).toBeNull();
    expect(positions.data).toEqual([{ variety_id: null }]);
  });

  it("keeps same raw variety names across species as independent candidate groups", async () => {
    const owner = await createTestUser("tree-inventory-resolution-species");
    createdUserIds.push(owner.user.id);
    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-resolution-species"),
      code: "TVR-04",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Resolution Species Plot",
    });
    const preview = await stageResolutionPreview(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      fileHashFill: "4",
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          position: 1,
          species: "apple",
          varietyStatus: "new_candidate",
          varietyName: "Shared Name",
        },
        {
          segmentKey: "S2",
          sourceRow: 3,
          rowNumber: 2,
          position: 1,
          species: "pear",
          varietyStatus: "new_candidate",
          varietyName: "Shared Name",
        },
      ],
    });
    const candidates = await listCandidates(ownerClient, preview.import_id ?? "");
    const appleCandidate = candidates.find((candidate) => candidate.species === "apple");
    const pearCandidate = candidates.find((candidate) => candidate.species === "pear");

    expect(candidates).toHaveLength(2);
    expect(appleCandidate?.raw_name).toBe("Shared Name");
    expect(pearCandidate?.raw_name).toBe("Shared Name");

    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.orchard_id,
      { profile_id: owner.user.id, orchard_role: "owner", system_role: "user" },
      {
        import_id: preview.import_id ?? "",
        candidate_id: appleCandidate?.id ?? "",
        resolution_action: "create_new",
        confirm_version: preview.confirm_version,
      },
      ownerClient,
    );
    const stagedImport = await getImportSummary(ownerClient, preview.import_id ?? "");
    const nextCandidates = await listCandidates(ownerClient, preview.import_id ?? "");

    expect(resolution.success).toBe(true);
    expect(stagedImport.status).toBe("awaiting_variety_resolution");
    expect(stagedImport.summary_json.unresolved_variety_candidates).toBe(1);
    expect(nextCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          species: "apple",
          resolution_status: "resolved",
          resolution_action: "create_new",
        }),
        expect.objectContaining({
          species: "pear",
          resolution_status: "unresolved",
        }),
      ]),
    );
  });
});
