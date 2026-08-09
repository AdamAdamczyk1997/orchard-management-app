import { afterEach, describe, expect, it } from "vitest";
import {
  stageTreeInventoryPreviewForOrchard,
} from "@/lib/tree-inventory-import/preview.server";
import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  type TreeInventoryCanonicalImport,
  type TreeInventoryDiagnostic,
  type TreeInventorySegment,
  type TreeInventoryTreeDefaults,
  type TreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
import type { PlotLayoutType, TreeConditionStatus } from "@/types/contracts";
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

type SegmentFixture = {
  segmentKey: string;
  sourceRow: number;
  rowNumber: number;
  fromPosition: number;
  toPosition: number;
  species?: string;
  varietyStatus?: TreeInventoryVarietyConfidence;
  varietyName?: string | null;
  varietyId?: string | null;
  conditionStatus?: TreeConditionStatus;
};

function hashWith(fill: string) {
  return fill.repeat(64);
}

function normalizeTreeDefaults(segment: SegmentFixture): TreeInventoryTreeDefaults {
  const status = segment.varietyStatus ?? "unknown";
  const rawName = segment.varietyName ?? null;
  const rawVarietyId = segment.varietyId ?? null;

  return {
    species: segment.species ?? "apple",
    variety_id: status === "known" ? rawVarietyId : null,
    variety_name: rawName,
    variety: {
      status,
      raw_name: rawName,
      raw_variety_id: rawVarietyId,
      resolved_variety_id: status === "known" ? rawVarietyId : null,
    },
    condition_status: segment.conditionStatus ?? "good",
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
  plotLayoutType?: PlotLayoutType;
  segments: SegmentFixture[];
  diagnostics?: TreeInventoryDiagnostic[];
}): TreeInventoryCanonicalImport {
  const segments: TreeInventorySegment[] = input.segments.map((segment) => {
    const treeDefaults = normalizeTreeDefaults(segment);

    return {
      source: {
        sheet: "NASADZENIA",
        row_number: segment.sourceRow,
        row_key: segment.segmentKey,
        raw_values: {
          segment_key: segment.segmentKey,
          row_number: segment.rowNumber,
          from_position: segment.fromPosition,
          to_position: segment.toPosition,
          species: treeDefaults.species,
          variety_confidence: treeDefaults.variety.status,
          variety_name: treeDefaults.variety.raw_name,
          variety_id: treeDefaults.variety.raw_variety_id,
        },
      },
      segment_key: segment.segmentKey,
      location: {
        plot_id: input.plotId,
        section_name: null,
        row_number: segment.rowNumber,
        from_position: segment.fromPosition,
        to_position: segment.toPosition,
      },
      tree_defaults: treeDefaults,
      import_only: {
        variety_confidence: treeDefaults.variety.status,
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
      plot_layout_type: input.plotLayoutType ?? "rows",
      orchard_name: "Preview Orchard",
      plot_name: "Preview Plot",
      plot_code: "PREVIEW",
    },
    requested_behavior: {
      import_mode: "incremental_create",
      conflict_strategy: "reject",
      allow_new_varieties: false,
    },
    segments,
    exceptions: [],
    expanded_positions: segments.flatMap((segment) => {
      const positions = [];

      for (
        let position = segment.location.from_position;
        position <= segment.location.to_position;
        position += 1
      ) {
        positions.push({
          source: segment.source,
          segment_key: segment.segment_key,
          exception_key: null,
          location: {
            plot_id: input.plotId,
            section_name: null,
            row_number: segment.location.row_number,
            position_in_row: position,
          },
          planned_action: "create_tree" as const,
          tree: { ...segment.tree_defaults },
          import_only: segment.import_only,
        });
      }

      return positions;
    }),
    diagnostics: input.diagnostics ?? [],
  };
}

describe("tree inventory preview staging", () => {
  const createdUserIds: string[] = [];

  afterEach(async () => {
    await cleanupTestUsers(createdUserIds);
    createdUserIds.length = 0;
  });

  it("stages a first-import preview for an empty orchard and keeps new candidates unresolved", async () => {
    const owner = await createTestUser("tree-inventory-preview-empty");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-preview-empty"),
      code: "TIP-01",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Empty import plot",
    });
    const canonical = buildCanonical({
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          fromPosition: 1,
          toPosition: 2,
          varietyStatus: "new_candidate",
          varietyName: "Novel Gala",
        },
        {
          segmentKey: "S2",
          sourceRow: 3,
          rowNumber: 1,
          fromPosition: 3,
          toPosition: 3,
          varietyStatus: "new_candidate",
          varietyName: " novel  gala ",
        },
        {
          segmentKey: "S3",
          sourceRow: 4,
          rowNumber: 2,
          fromPosition: 1,
          toPosition: 1,
          species: "pear",
          varietyStatus: "new_candidate",
          varietyName: "Novel Gala",
        },
      ],
    });

    const result = await stageTreeInventoryPreviewForOrchard(
      orchard.orchard_id,
      {
        canonical,
        file: {
          file_name: "empty-preview.xlsx",
          file_size_bytes: 2048,
          file_hash: hashWith("b"),
          normalized_hash: hashWith("c"),
        },
      },
      ownerClient,
    );

    expect(result.status).toBe("awaiting_variety_resolution");
    expect(result.import_id).toBeTruthy();
    expect(result.summary).toMatchObject({
      total_positions: 4,
      planned_tree_records: 4,
      active_conflicts: 0,
      grouped_variety_candidates: 2,
      unresolved_variety_candidates: 2,
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNTRUSTED_CONTEXT",
          severity: "warning",
        }),
      ]),
    );

    const stagedImport = await ownerClient
      .from("inventory_imports")
      .select("id, status, summary_json, diagnostics_json")
      .eq("id", result.import_id ?? "")
      .single();
    const candidates = await ownerClient
      .from("inventory_import_variety_candidates")
      .select("candidate_key, species, raw_name, source_status, resolution_status, positions_count")
      .eq("import_id", result.import_id ?? "")
      .order("candidate_key", { ascending: true });
    const positions = await ownerClient
      .from("inventory_import_positions")
      .select("id, planned_action")
      .eq("import_id", result.import_id ?? "");
    const existingTrees = await ownerClient
      .from("trees")
      .select("id")
      .eq("orchard_id", orchard.orchard_id);

    expect(stagedImport.error).toBeNull();
    expect(stagedImport.data?.status).toBe("awaiting_variety_resolution");
    expect(candidates.error).toBeNull();
    expect(candidates.data).toHaveLength(2);
    expect(candidates.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          species: "apple",
          source_status: "new_candidate",
          resolution_status: "unresolved",
          positions_count: 3,
        }),
        expect.objectContaining({
          species: "pear",
          source_status: "new_candidate",
          resolution_status: "unresolved",
          positions_count: 1,
        }),
      ]),
    );
    expect(positions.error).toBeNull();
    expect(positions.data).toHaveLength(4);
    expect(existingTrees.error).toBeNull();
    expect(existingTrees.data).toEqual([]);
  });

  it("uses current orchard varieties as authority and suggests mapping for matching new candidates", async () => {
    const owner = await createTestUser("tree-inventory-preview-variety");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-preview-variety"),
      code: "TIP-02",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Variety preview plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Gala",
    });
    const canonical = buildCanonical({
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          fromPosition: 1,
          toPosition: 1,
          varietyStatus: "known",
          varietyName: "Gala",
          varietyId: variety.id,
        },
        {
          segmentKey: "S2",
          sourceRow: 3,
          rowNumber: 1,
          fromPosition: 2,
          toPosition: 2,
          varietyStatus: "new_candidate",
          varietyName: "Gala",
        },
      ],
    });

    const result = await stageTreeInventoryPreviewForOrchard(
      orchard.orchard_id,
      { canonical, file: { file_hash: hashWith("d") } },
      ownerClient,
    );
    const candidates = await ownerClient
      .from("inventory_import_variety_candidates")
      .select("source_status, resolution_status, resolution_action, suggested_variety_id, resolved_variety_id")
      .eq("import_id", result.import_id ?? "")
      .order("source_status", { ascending: true });

    expect(result.status).toBe("awaiting_variety_resolution");
    expect(result.summary).toMatchObject({
      known_variety_positions: 1,
      new_candidate_positions: 1,
      suggested_variety_candidates: 1,
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "UNTRUSTED_CONTEXT",
          severity: "warning",
        }),
      ]),
    );
    expect(candidates.error).toBeNull();
    expect(candidates.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_status: "known",
          resolution_status: "resolved",
          resolution_action: "use_existing",
          resolved_variety_id: variety.id,
        }),
        expect.objectContaining({
          source_status: "new_candidate",
          resolution_status: "suggested",
          resolution_action: "use_existing",
          suggested_variety_id: variety.id,
        }),
      ]),
    );
  });

  it("blocks ready status on active tree conflicts and keeps inactive tree context non-blocking", async () => {
    const owner = await createTestUser("tree-inventory-preview-conflict");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-preview-conflict"),
      code: "TIP-03",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Conflict preview plot",
    });
    const variety = await createVarietyAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      species: "apple",
      name: "Ligol",
    });

    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      rowNumber: 1,
      positionInRow: 1,
      treeCode: "ACTIVE-1",
    });
    await createTreeAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      varietyId: variety.id,
      species: "apple",
      rowNumber: 1,
      positionInRow: 2,
      treeCode: "REMOVED-2",
      conditionStatus: "removed",
    });

    const canonical = buildCanonical({
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          fromPosition: 1,
          toPosition: 3,
          varietyStatus: "known",
          varietyName: "Ligol",
          varietyId: variety.id,
        },
      ],
    });
    const result = await stageTreeInventoryPreviewForOrchard(
      orchard.orchard_id,
      { canonical, file: { file_hash: hashWith("e") } },
      ownerClient,
    );
    const positions = await ownerClient
      .from("inventory_import_positions")
      .select("row_number, position_in_row, planned_action, existing_tree_id")
      .eq("import_id", result.import_id ?? "")
      .order("position_in_row", { ascending: true });
    const treesAfterPreview = await ownerClient
      .from("trees")
      .select("id")
      .eq("orchard_id", orchard.orchard_id);

    expect(result.status).toBe("validated");
    expect(result.summary).toMatchObject({
      active_conflicts: 1,
      inactive_contexts: 1,
    });
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "TREE_LOCATION_CONFLICT",
          severity: "error",
        }),
        expect.objectContaining({
          code: "TREE_LOCATION_CONFLICT",
          severity: "info",
        }),
      ]),
    );
    expect(positions.error).toBeNull();
    expect(positions.data).toEqual([
      expect.objectContaining({ position_in_row: 1, planned_action: "blocked_conflict" }),
      expect.objectContaining({ position_in_row: 2, planned_action: "create_tree" }),
      expect.objectContaining({ position_in_row: 3, planned_action: "create_tree" }),
    ]);
    expect(treesAfterPreview.error).toBeNull();
    expect(treesAfterPreview.data).toHaveLength(2);
  });

  it("rejects unsupported layouts, foreign plots and active orchard changes", async () => {
    const ownerA = await createTestUser("tree-inventory-preview-owner-a");
    const ownerB = await createTestUser("tree-inventory-preview-owner-b");
    createdUserIds.push(ownerA.user.id, ownerB.user.id);

    const ownerAClient = (await signInTestUser(ownerA.email, ownerA.password)).client;
    const ownerBClient = (await signInTestUser(ownerB.email, ownerB.password)).client;
    const orchardA = await createOrchardAsUser(ownerAClient, {
      name: createTestOrchardName("tree-inventory-preview-a"),
      code: "TIP-A",
    });
    const orchardB = await createOrchardAsUser(ownerBClient, {
      name: createTestOrchardName("tree-inventory-preview-b"),
      code: "TIP-B",
    });
    const irregularPlot = await createPlotAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      name: "Irregular preview plot",
      layoutType: "irregular",
    });
    const foreignPlot = await createPlotAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      name: "Foreign preview plot",
    });

    const irregularResult = await stageTreeInventoryPreviewForOrchard(
      orchardA.orchard_id,
      {
        canonical: buildCanonical({
          orchardId: orchardA.orchard_id,
          plotId: irregularPlot.id,
          plotLayoutType: "irregular",
          segments: [
            {
              segmentKey: "S1",
              sourceRow: 2,
              rowNumber: 1,
              fromPosition: 1,
              toPosition: 1,
            },
          ],
        }),
        file: { file_hash: hashWith("f") },
      },
      ownerAClient,
    );
    const foreignPlotResult = await stageTreeInventoryPreviewForOrchard(
      orchardA.orchard_id,
      {
        canonical: buildCanonical({
          orchardId: orchardA.orchard_id,
          plotId: foreignPlot.id,
          segments: [
            {
              segmentKey: "S1",
              sourceRow: 2,
              rowNumber: 1,
              fromPosition: 1,
              toPosition: 1,
            },
          ],
        }),
        file: { file_hash: hashWith("1") },
      },
      ownerAClient,
    );
    const activeOrchardChangedResult = await stageTreeInventoryPreviewForOrchard(
      orchardA.orchard_id,
      {
        canonical: buildCanonical({
          orchardId: orchardB.orchard_id,
          plotId: foreignPlot.id,
          segments: [
            {
              segmentKey: "S1",
              sourceRow: 2,
              rowNumber: 1,
              fromPosition: 1,
              toPosition: 1,
            },
          ],
        }),
        file: { file_hash: hashWith("2") },
      },
      ownerAClient,
    );

    expect(irregularResult.import_id).toBeTruthy();
    expect(irregularResult.status).toBe("validated");
    expect(irregularResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "PLOT_LAYOUT_UNSUPPORTED", severity: "error" }),
      ]),
    );
    expect(foreignPlotResult.import_id).toBeNull();
    expect(foreignPlotResult.status).toBe("failed");
    expect(foreignPlotResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNTRUSTED_CONTEXT", severity: "error" }),
      ]),
    );
    expect(activeOrchardChangedResult.import_id).toBeNull();
    expect(activeOrchardChangedResult.status).toBe("failed");
    expect(activeOrchardChangedResult.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "UNTRUSTED_CONTEXT", severity: "error" }),
      ]),
    );
  });

  it("rejects stale hidden variety IDs and species mismatches without trusting workbook IDs", async () => {
    const ownerA = await createTestUser("tree-inventory-preview-stale-a");
    const ownerB = await createTestUser("tree-inventory-preview-stale-b");
    createdUserIds.push(ownerA.user.id, ownerB.user.id);

    const ownerAClient = (await signInTestUser(ownerA.email, ownerA.password)).client;
    const ownerBClient = (await signInTestUser(ownerB.email, ownerB.password)).client;
    const orchardA = await createOrchardAsUser(ownerAClient, {
      name: createTestOrchardName("tree-inventory-preview-stale-a"),
      code: "TIP-SA",
    });
    const orchardB = await createOrchardAsUser(ownerBClient, {
      name: createTestOrchardName("tree-inventory-preview-stale-b"),
      code: "TIP-SB",
    });
    const plotA = await createPlotAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      name: "Stale variety plot",
    });
    const foreignVariety = await createVarietyAsUser(ownerBClient, {
      orchardId: orchardB.orchard_id,
      species: "apple",
      name: "Foreign Gala",
    });
    const pearVariety = await createVarietyAsUser(ownerAClient, {
      orchardId: orchardA.orchard_id,
      species: "pear",
      name: "Conference",
    });
    const canonical = buildCanonical({
      orchardId: orchardA.orchard_id,
      plotId: plotA.id,
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          fromPosition: 1,
          toPosition: 1,
          varietyStatus: "known",
          varietyName: "Foreign Gala",
          varietyId: foreignVariety.id,
        },
        {
          segmentKey: "S2",
          sourceRow: 3,
          rowNumber: 1,
          fromPosition: 2,
          toPosition: 2,
          species: "apple",
          varietyStatus: "known",
          varietyName: "Conference",
          varietyId: pearVariety.id,
        },
      ],
    });

    const result = await stageTreeInventoryPreviewForOrchard(
      orchardA.orchard_id,
      { canonical, file: { file_hash: hashWith("3") } },
      ownerAClient,
    );
    const positions = await ownerAClient
      .from("inventory_import_positions")
      .select("position_in_row, variety_id")
      .eq("import_id", result.import_id ?? "")
      .order("position_in_row", { ascending: true });

    expect(result.status).toBe("validated");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VARIETY_NOT_FOUND",
          severity: "error",
        }),
        expect.objectContaining({
          code: "VARIETY_SPECIES_MISMATCH",
          severity: "error",
        }),
      ]),
    );
    expect(positions.error).toBeNull();
    expect(positions.data).toEqual([
      expect.objectContaining({ position_in_row: 1, variety_id: null }),
      expect.objectContaining({ position_in_row: 2, variety_id: null }),
    ]);
  });

  it("stages a 1k-position preview without conflicts", async () => {
    const owner = await createTestUser("tree-inventory-preview-1k");
    createdUserIds.push(owner.user.id);

    const ownerClient = (await signInTestUser(owner.email, owner.password)).client;
    const orchard = await createOrchardAsUser(ownerClient, {
      name: createTestOrchardName("tree-inventory-preview-1k"),
      code: "TIP-1K",
    });
    const plot = await createPlotAsUser(ownerClient, {
      orchardId: orchard.orchard_id,
      name: "Large preview plot",
    });
    const canonical = buildCanonical({
      orchardId: orchard.orchard_id,
      plotId: plot.id,
      segments: [
        {
          segmentKey: "S1",
          sourceRow: 2,
          rowNumber: 1,
          fromPosition: 1,
          toPosition: 1000,
          varietyStatus: "unknown",
        },
      ],
    });
    const startedAt = Date.now();

    const result = await stageTreeInventoryPreviewForOrchard(
      orchard.orchard_id,
      { canonical, file: { file_hash: hashWith("4") } },
      ownerClient,
    );
    const elapsedMs = Date.now() - startedAt;
    const positions = await ownerClient
      .from("inventory_import_positions")
      .select("id")
      .eq("import_id", result.import_id ?? "");

    expect(result.status).toBe("ready_for_owner_confirm");
    expect(result.summary).toMatchObject({
      total_positions: 1000,
      planned_tree_records: 1000,
      active_conflicts: 0,
      unknown_variety_positions: 1000,
    });
    expect(elapsedMs).toBeLessThan(15_000);
    expect(positions.error).toBeNull();
    expect(positions.data).toHaveLength(1000);
  });
});
