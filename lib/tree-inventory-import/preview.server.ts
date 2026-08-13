import { createHash, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_CONTRACT_VERSION,
  TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  createTreeInventoryDiagnostic,
  type TreeInventoryCanonicalImport,
  type TreeInventoryDiagnostic,
  type TreeInventoryExpandedPosition,
  type TreeInventoryJsonValue,
  type TreeInventoryRowSource,
  type TreeInventorySegment,
  type TreeInventoryTreeDefaults,
  type TreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import type {
  TreeInventoryPreviewResult,
  TreeInventoryPreviewStatus,
  TreeInventoryPreviewSummary,
} from "@/lib/tree-inventory-import/upload-preview-contract";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PlotLayoutType, PlotStatus, TreeConditionStatus } from "@/types/contracts";

type QueryClient = SupabaseClient;

export type TreeInventoryPreviewFileMetadata = {
  file_name?: string | null;
  file_size_bytes?: number | null;
  file_hash?: string | null;
  normalized_hash?: string | null;
  idempotency_key?: string | null;
};

export type TreeInventoryPreviewInput = {
  canonical: TreeInventoryCanonicalImport;
  file?: TreeInventoryPreviewFileMetadata;
};

type PlotRow = {
  id: string;
  orchard_id: string;
  name: string;
  code: string | null;
  status: PlotStatus;
  layout_type: PlotLayoutType;
};

type VarietyRow = {
  id: string;
  orchard_id: string;
  species: string;
  name: string;
};

type TreeLocationRow = {
  id: string;
  orchard_id: string;
  plot_id: string;
  variety_id: string | null;
  species: string;
  tree_code: string | null;
  display_name: string | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  condition_status: TreeConditionStatus;
  is_active: boolean;
};

type SourceRowInsert = {
  import_id: string;
  row_kind: "segment" | "exception";
  sheet_name: string;
  source_row_number: number;
  source_row_key: string | null;
  raw_values_json: Record<string, TreeInventoryJsonValue>;
  normalized_values_json: Record<string, TreeInventoryJsonValue>;
  diagnostics_json: TreeInventoryDiagnostic[];
};

type SourceRowReference = {
  id: string;
  source_key: string;
};

type CandidateWorkItem = {
  key: string;
  species: string;
  raw_name: string | null;
  normalized_name: string | null;
  source_status: TreeInventoryVarietyConfidence;
  resolution_status:
    | "unresolved"
    | "suggested"
    | "resolved"
    | "accepted_unknown"
    | "rejected";
  resolution_action: "use_existing" | "create_new" | "keep_unknown" | "reject" | null;
  suggested_variety_id: string | null;
  resolved_variety_id: string | null;
  positions_count: number;
  source_row_keys: Set<string>;
  diagnostics: TreeInventoryDiagnostic[];
};

type PositionWorkItem = {
  position: TreeInventoryExpandedPosition;
  planned_action: "create_tree" | "missing_tree" | "blocked_conflict" | "notes_only";
  species: string;
  variety_id: string | null;
  variety_candidate_key: string | null;
  existing_tree_id: string | null;
  diagnostics: TreeInventoryDiagnostic[];
};

type VarietyResolution = {
  variety_id: string | null;
  candidate_key: string | null;
  diagnostics: TreeInventoryDiagnostic[];
  blocks_ready: boolean;
};

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

export async function stageTreeInventoryPreviewForOrchard(
  orchardId: string,
  input: TreeInventoryPreviewInput,
  supabaseClient?: QueryClient,
): Promise<TreeInventoryPreviewResult> {
  const supabase = await getQueryClient(supabaseClient);
  const diagnostics = limitDiagnostics([...input.canonical.diagnostics]);
  const summarySeed = buildEmptySummary(input.canonical, diagnostics);

  validateCanonicalEnvelope(orchardId, input.canonical, diagnostics);

  if (hasErrorDiagnostic(diagnostics)) {
    return {
      import_id: null,
      status: "failed",
      summary: buildSummary(summarySeed, diagnostics),
      diagnostics,
      confirm_version: null,
      confirm_token: null,
    };
  }

  const plot = await readPlotForPreview(supabase, orchardId, input.canonical);

  if (!plot) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNTRUSTED_CONTEXT",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "plot_id",
          raw_value: input.canonical.generated_context.plot_id,
        },
        message: "Tree inventory preview requires a plot from the active orchard.",
        entity_refs: {
          orchard_id: orchardId,
          plot_id: input.canonical.generated_context.plot_id,
        },
      }),
    );

    return {
      import_id: null,
      status: "failed",
      summary: buildSummary(summarySeed, diagnostics),
      diagnostics: limitDiagnostics(diagnostics),
      confirm_version: null,
      confirm_token: null,
    };
  }

  if (
    !(TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES as readonly PlotLayoutType[])
      .includes(plot.layout_type)
  ) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "PLOT_LAYOUT_UNSUPPORTED",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "plot_layout_type",
          raw_value: plot.layout_type,
        },
        message: "Tree inventory preview supports row-based plots only.",
        normalized_value: TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES[0],
        entity_refs: { orchard_id: orchardId, plot_id: plot.id },
      }),
    );
  }

  const [varieties, existingTrees] = await Promise.all([
    listVarietiesForPreview(supabase, orchardId),
    listExistingTreesForPreview(supabase, orchardId, plot.id, input.canonical),
  ]);
  const varietiesById = new Map(varieties.map((variety) => [variety.id, variety]));
  const varietiesByName = buildVarietyNameIndex(varieties);
  const treesByLocation = buildTreeLocationIndex(existingTrees);
  const segmentByKey = new Map(
    input.canonical.segments.map((segment) => [segment.segment_key, segment]),
  );
  const candidates = new Map<string, CandidateWorkItem>();
  const positions = buildPositionWorkItems({
    orchardId,
    plotId: plot.id,
    canonical: input.canonical,
    segmentByKey,
    varietiesById,
    varietiesByName,
    treesByLocation,
    diagnostics,
    candidates,
  });
  const cappedDiagnostics = limitDiagnostics(diagnostics);
  const summary = buildSummary(
    summarizePositions(input.canonical, positions, candidates),
    cappedDiagnostics,
  );
  const status = determinePreviewStatus(cappedDiagnostics, candidates);
  const confirmToken = randomUUID();
  const confirmTokenHash = sha256Hex(confirmToken);
  const fileHash = normalizeHashInput(
    input.file?.file_hash ??
      input.canonical.file_hash ??
      sha256Hex(stableStringify(input.canonical)),
  );
  const normalizedHash = normalizeHashInput(
    input.file?.normalized_hash ?? sha256Hex(stableStringify(input.canonical)),
  );
  const importId = await insertPreviewStaging({
    supabase,
    canonical: input.canonical,
    file: input.file ?? {},
    orchardId,
    plotId: plot.id,
    fileHash,
    normalizedHash,
    confirmTokenHash,
    status,
    diagnostics: cappedDiagnostics,
    summary,
    candidates,
    positions,
  });

  return {
    import_id: importId,
    status,
    summary,
    diagnostics: cappedDiagnostics,
    confirm_version: 1,
    confirm_token: confirmToken,
  };
}

function validateCanonicalEnvelope(
  activeOrchardId: string,
  canonical: TreeInventoryCanonicalImport,
  diagnostics: TreeInventoryDiagnostic[],
) {
  if (canonical.xlsx_contract_version !== TREE_INVENTORY_XLSX_CONTRACT_VERSION) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNSUPPORTED_CONTRACT_VERSION",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "xlsx_contract_version",
          raw_value: canonical.xlsx_contract_version,
        },
        message: "Tree inventory preview cannot stage an unsupported XLSX contract.",
        normalized_value: TREE_INVENTORY_CONTRACT_VERSION,
      }),
    );
  }

  if (
    canonical.canonical_contract_version !==
    TREE_INVENTORY_CANONICAL_CONTRACT_VERSION
  ) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNSUPPORTED_CONTRACT_VERSION",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "canonical_contract_version",
          raw_value: canonical.canonical_contract_version,
        },
        message: "Tree inventory preview cannot stage an unsupported canonical contract.",
        normalized_value: TREE_INVENTORY_CONTRACT_VERSION,
      }),
    );
  }

  if (canonical.generated_context.orchard_id !== activeOrchardId) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNTRUSTED_CONTEXT",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "orchard_id",
          raw_value: canonical.generated_context.orchard_id,
        },
        message: "Tree inventory preview active orchard differs from the generated workbook context.",
        normalized_value: activeOrchardId,
        entity_refs: {
          orchard_id: activeOrchardId,
          plot_id: canonical.generated_context.plot_id,
        },
      }),
    );
  }

  if (canonical.requested_behavior.import_mode !== "incremental_create") {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_ENUM_VALUE",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "import_mode",
          raw_value: canonical.requested_behavior.import_mode,
        },
        message: "Tree inventory preview supports incremental_create only.",
        normalized_value: "incremental_create",
      }),
    );
  }

  if (canonical.requested_behavior.conflict_strategy !== "reject") {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_ENUM_VALUE",
        severity: "error",
        source: {
          sheet: "METADANE",
          column: "conflict_strategy",
          raw_value: canonical.requested_behavior.conflict_strategy,
        },
        message: "Tree inventory preview supports reject conflict strategy only.",
        normalized_value: "reject",
      }),
    );
  }
}

async function readPlotForPreview(
  supabase: QueryClient,
  orchardId: string,
  canonical: TreeInventoryCanonicalImport,
) {
  const { data, error } = await supabase
    .from("plots")
    .select("id, orchard_id, name, code, status, layout_type")
    .eq("orchard_id", orchardId)
    .eq("id", canonical.generated_context.plot_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as PlotRow | null) ?? null;
}

async function listVarietiesForPreview(
  supabase: QueryClient,
  orchardId: string,
) {
  const { data, error } = await supabase
    .from("varieties")
    .select("id, orchard_id, species, name")
    .eq("orchard_id", orchardId)
    .order("species", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as VarietyRow[];
}

async function listExistingTreesForPreview(
  supabase: QueryClient,
  orchardId: string,
  plotId: string,
  canonical: TreeInventoryCanonicalImport,
) {
  const rowNumbers = [
    ...new Set(
      canonical.expanded_positions.map((position) => position.location.row_number),
    ),
  ];

  if (rowNumbers.length === 0) {
    return [];
  }

  const rows: TreeLocationRow[] = [];

  for (const chunk of chunkArray(rowNumbers, 100)) {
    const { data, error } = await supabase
      .from("trees")
      .select(
        "id, orchard_id, plot_id, variety_id, species, tree_code, display_name, section_name, row_number, position_in_row, condition_status, is_active",
      )
      .eq("orchard_id", orchardId)
      .eq("plot_id", plotId)
      .in("row_number", chunk);

    if (error) {
      throw error;
    }

    rows.push(...((data ?? []) as TreeLocationRow[]));
  }

  return rows;
}

function buildPositionWorkItems(input: {
  orchardId: string;
  plotId: string;
  canonical: TreeInventoryCanonicalImport;
  segmentByKey: Map<string, TreeInventorySegment>;
  varietiesById: Map<string, VarietyRow>;
  varietiesByName: Map<string, VarietyRow>;
  treesByLocation: Map<string, TreeLocationRow[]>;
  diagnostics: TreeInventoryDiagnostic[];
  candidates: Map<string, CandidateWorkItem>;
}) {
  const positions: PositionWorkItem[] = [];

  for (const position of input.canonical.expanded_positions) {
    const segment = input.segmentByKey.get(position.segment_key);
    const fallbackTree = position.tree ?? segment?.tree_defaults ?? null;
    const tree = position.tree;
    const positionDiagnostics: TreeInventoryDiagnostic[] = [];
    const existingTrees = input.treesByLocation.get(
      locationKey(position.location.row_number, position.location.position_in_row),
    ) ?? [];
    const activeConflict = existingTrees.find((existingTree) => existingTree.is_active);
    const inactiveContext = existingTrees.find((existingTree) => !existingTree.is_active);
    let plannedAction: PositionWorkItem["planned_action"] =
      position.planned_action === "skip_missing" ? "missing_tree" : "create_tree";
    let varietyId: string | null = null;
    let candidateKey: string | null = null;

    if (position.location.plot_id !== input.plotId) {
      positionDiagnostics.push(
        createTreeInventoryDiagnostic({
          code: "UNTRUSTED_CONTEXT",
          severity: "error",
          source: position.source,
          message: "Staged position plot_id must match the active preview plot.",
          entity_refs: {
            orchard_id: input.orchardId,
            plot_id: position.location.plot_id,
            row_number: position.location.row_number,
            position_in_row: position.location.position_in_row,
          },
        }),
      );
    }

    if (tree && activeConflict) {
      plannedAction = "blocked_conflict";
      positionDiagnostics.push(
        createTreeInventoryDiagnostic({
          code: "TREE_LOCATION_CONFLICT",
          severity: "error",
          source: position.source,
          message: "Active tree already exists at the imported row/position.",
          entity_refs: {
            orchard_id: input.orchardId,
            plot_id: input.plotId,
            tree_id: activeConflict.id,
            row_number: position.location.row_number,
            position_in_row: position.location.position_in_row,
          },
        }),
      );
    }

    if (tree && inactiveContext && !activeConflict) {
      positionDiagnostics.push(
        createTreeInventoryDiagnostic({
          code: "TREE_LOCATION_CONFLICT",
          severity: "info",
          source: position.source,
          message: "Inactive historical tree exists at the imported row/position.",
          entity_refs: {
            orchard_id: input.orchardId,
            plot_id: input.plotId,
            tree_id: inactiveContext.id,
            row_number: position.location.row_number,
            position_in_row: position.location.position_in_row,
          },
        }),
      );
    }

    if (tree) {
      const resolution = resolveTreeVariety({
        orchardId: input.orchardId,
        tree,
        source: position.source,
        varietiesById: input.varietiesById,
        varietiesByName: input.varietiesByName,
        candidates: input.candidates,
      });

      varietyId = resolution.variety_id;
      candidateKey = resolution.candidate_key;
      positionDiagnostics.push(...resolution.diagnostics);
    }

    input.diagnostics.push(...positionDiagnostics);
    positions.push({
      position,
      planned_action: plannedAction,
      species: fallbackTree?.species ?? "",
      variety_id: varietyId,
      variety_candidate_key: candidateKey,
      existing_tree_id: activeConflict?.id ?? inactiveContext?.id ?? null,
      diagnostics: positionDiagnostics,
    });
  }

  return positions;
}

function resolveTreeVariety(input: {
  orchardId: string;
  tree: TreeInventoryTreeDefaults;
  source: TreeInventoryRowSource;
  varietiesById: Map<string, VarietyRow>;
  varietiesByName: Map<string, VarietyRow>;
  candidates: Map<string, CandidateWorkItem>;
}): VarietyResolution {
  const variety = input.tree.variety;
  const sourceKey = sourceRowKey(input.source);
  const diagnostics: TreeInventoryDiagnostic[] = [];
  const speciesKey = normalizeLookup(input.tree.species);
  const rawNameKey = normalizeLookup(variety.raw_name);
  const nameMatch = rawNameKey
    ? input.varietiesByName.get(varietyLookupKey(input.tree.species, variety.raw_name))
    : null;

  if (variety.status === "known") {
    const resolvedById = variety.resolved_variety_id
      ? input.varietiesById.get(variety.resolved_variety_id)
      : null;
    const resolved = resolvedById ?? nameMatch ?? null;

    if (!resolved) {
      diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "VARIETY_NOT_FOUND",
          severity: "error",
          source: input.source,
          message: "Known variety was not found in the active orchard.",
          entity_refs: {
            orchard_id: input.orchardId,
            variety_id: variety.resolved_variety_id ?? variety.raw_variety_id,
          },
        }),
      );

      return {
        variety_id: null,
        candidate_key: null,
        diagnostics,
        blocks_ready: true,
      };
    }

    if (normalizeLookup(resolved.species) !== speciesKey) {
      diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "VARIETY_SPECIES_MISMATCH",
          severity: "error",
          source: input.source,
          message: "Known variety species does not match the imported tree species.",
          normalized_value: {
            imported_species: input.tree.species,
            variety_species: resolved.species,
          },
          entity_refs: {
            orchard_id: input.orchardId,
            variety_id: resolved.id,
          },
        }),
      );

      return {
        variety_id: null,
        candidate_key: null,
        diagnostics,
        blocks_ready: true,
      };
    }

    const candidate = upsertCandidate(input.candidates, {
      key: candidateKeyFor("known", input.tree.species, resolved.name),
      species: input.tree.species,
      raw_name: variety.raw_name ?? resolved.name,
      source_status: "known",
      resolution_status: "resolved",
      resolution_action: "use_existing",
      suggested_variety_id: null,
      resolved_variety_id: resolved.id,
      source_row_key: sourceKey,
    });

    return {
      variety_id: resolved.id,
      candidate_key: candidate.key,
      diagnostics,
      blocks_ready: false,
    };
  }

  if (variety.status === "unknown") {
    const candidate = upsertCandidate(input.candidates, {
      key: candidateKeyFor("unknown", input.tree.species, null),
      species: input.tree.species,
      raw_name: null,
      source_status: "unknown",
      resolution_status: "accepted_unknown",
      resolution_action: "keep_unknown",
      suggested_variety_id: null,
      resolved_variety_id: null,
      source_row_key: sourceKey,
    });

    return {
      variety_id: null,
      candidate_key: candidate.key,
      diagnostics,
      blocks_ready: false,
    };
  }

  if (variety.status === "new_candidate" && nameMatch) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNTRUSTED_CONTEXT",
        severity: "warning",
        source: input.source,
        message: "New variety candidate now matches an existing orchard variety and needs owner mapping.",
        entity_refs: {
          orchard_id: input.orchardId,
          variety_id: nameMatch.id,
        },
      }),
    );
  }

  const candidate = upsertCandidate(input.candidates, {
    key: candidateKeyFor(variety.status, input.tree.species, variety.raw_name),
    species: input.tree.species,
    raw_name: variety.raw_name,
    source_status: variety.status,
    resolution_status: nameMatch ? "suggested" : "unresolved",
    resolution_action: nameMatch ? "use_existing" : null,
    suggested_variety_id: nameMatch?.id ?? null,
    resolved_variety_id: null,
    source_row_key: sourceKey,
  });

  if (candidate.normalized_name === rawNameKey && candidate.raw_name !== variety.raw_name) {
    const duplicateDiagnostic = createTreeInventoryDiagnostic({
      code: "UNTRUSTED_CONTEXT",
      severity: "warning",
      source: input.source,
      message: "Multiple raw variety labels normalized to the same candidate group.",
      normalized_value: candidate.normalized_name,
      entity_refs: { orchard_id: input.orchardId },
    });
    candidate.diagnostics.push(duplicateDiagnostic);
    diagnostics.push(duplicateDiagnostic);
  }

  return {
    variety_id: null,
    candidate_key: candidate.key,
    diagnostics,
    blocks_ready: true,
  };
}

function upsertCandidate(
  candidates: Map<string, CandidateWorkItem>,
  input: {
    key: string;
    species: string;
    raw_name: string | null;
    source_status: TreeInventoryVarietyConfidence;
    resolution_status: CandidateWorkItem["resolution_status"];
    resolution_action: CandidateWorkItem["resolution_action"];
    suggested_variety_id: string | null;
    resolved_variety_id: string | null;
    source_row_key: string;
  },
) {
  const existing = candidates.get(input.key);

  if (existing) {
    existing.positions_count += 1;
    existing.source_row_keys.add(input.source_row_key);
    return existing;
  }

  const candidate: CandidateWorkItem = {
    key: input.key,
    species: input.species,
    raw_name: input.raw_name,
    normalized_name: normalizeLookup(input.raw_name),
    source_status: input.source_status,
    resolution_status: input.resolution_status,
    resolution_action: input.resolution_action,
    suggested_variety_id: input.suggested_variety_id,
    resolved_variety_id: input.resolved_variety_id,
    positions_count: 1,
    source_row_keys: new Set([input.source_row_key]),
    diagnostics: [],
  };
  candidates.set(input.key, candidate);
  return candidate;
}

async function insertPreviewStaging(input: {
  supabase: QueryClient;
  canonical: TreeInventoryCanonicalImport;
  file: TreeInventoryPreviewFileMetadata;
  orchardId: string;
  plotId: string;
  fileHash: string;
  normalizedHash: string;
  confirmTokenHash: string;
  status: TreeInventoryPreviewStatus;
  diagnostics: TreeInventoryDiagnostic[];
  summary: TreeInventoryPreviewSummary;
  candidates: Map<string, CandidateWorkItem>;
  positions: PositionWorkItem[];
}) {
  const { data: importRow, error: importError } = await input.supabase
    .from("inventory_imports")
    .insert({
      orchard_id: input.orchardId,
      plot_id: input.plotId,
      xlsx_contract_version: input.canonical.xlsx_contract_version,
      canonical_contract_version: input.canonical.canonical_contract_version,
      import_mode: input.canonical.requested_behavior.import_mode,
      conflict_strategy: input.canonical.requested_behavior.conflict_strategy,
      status: input.status,
      file_name: input.file.file_name ?? null,
      file_size_bytes: input.file.file_size_bytes ?? null,
      file_hash: input.fileHash,
      normalized_hash: input.normalizedHash,
      idempotency_key: input.file.idempotency_key ?? null,
      confirm_version: 1,
      confirm_token_hash: input.confirmTokenHash,
      summary_json: input.summary,
      diagnostics_json: input.diagnostics,
      canonical_payload_json: input.canonical,
      validated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (importError) {
    throw importError;
  }

  const importId = (importRow as { id: string }).id;
  const sourceRows = await insertSourceRows(input.supabase, importId, input.canonical);
  const sourceRowIdByKey = new Map(
    sourceRows.map((row) => [row.source_key, row.id]),
  );
  const candidateIdByKey = await insertCandidates({
    supabase: input.supabase,
    importId,
    candidates: input.candidates,
    sourceRowIdByKey,
  });

  await insertPositions({
    supabase: input.supabase,
    importId,
    plotId: input.plotId,
    positions: input.positions,
    sourceRowIdByKey,
    candidateIdByKey,
  });

  return importId;
}

async function insertSourceRows(
  supabase: QueryClient,
  importId: string,
  canonical: TreeInventoryCanonicalImport,
) {
  const rows: SourceRowInsert[] = [];

  for (const segment of canonical.segments) {
    rows.push({
      import_id: importId,
      row_kind: "segment",
      sheet_name: segment.source.sheet,
      source_row_number: segment.source.row_number,
      source_row_key: segment.source.row_key ?? segment.segment_key,
      raw_values_json: segment.source.raw_values ?? {},
      normalized_values_json: jsonObject({
        segment_key: segment.segment_key,
        location: segment.location,
        tree_defaults: segment.tree_defaults,
        import_only: segment.import_only,
      }),
      diagnostics_json: diagnosticsForSource(canonical.diagnostics, segment.source),
    });
  }

  for (const exception of canonical.exceptions) {
    rows.push({
      import_id: importId,
      row_kind: "exception",
      sheet_name: exception.source.sheet,
      source_row_number: exception.source.row_number,
      source_row_key: exception.source.row_key ?? exception.exception_key,
      raw_values_json: exception.source.raw_values ?? {},
      normalized_values_json: jsonObject({
        exception_key: exception.exception_key,
        segment_key: exception.segment_key,
        location: exception.location,
        exception_type: exception.exception_type,
        override: exception.override,
      }),
      diagnostics_json: diagnosticsForSource(canonical.diagnostics, exception.source),
    });
  }

  if (rows.length === 0) {
    return [];
  }

  const inserted: SourceRowReference[] = [];

  for (const chunk of chunkArray(rows, 500)) {
    const { data, error } = await supabase
      .from("inventory_import_source_rows")
      .insert(chunk)
      .select("id, sheet_name, source_row_number");

    if (error) {
      throw error;
    }

    inserted.push(
      ...((data ?? []) as Array<{
        id: string;
        sheet_name: string;
        source_row_number: number;
      }>).map((row) => ({
        id: row.id,
        source_key: sourceLookupKey(row.sheet_name, row.source_row_number),
      })),
    );
  }

  return inserted;
}

async function insertCandidates(input: {
  supabase: QueryClient;
  importId: string;
  candidates: Map<string, CandidateWorkItem>;
  sourceRowIdByKey: Map<string, string>;
}) {
  if (input.candidates.size === 0) {
    return new Map<string, string>();
  }

  const rows = [...input.candidates.values()].map((candidate) => ({
    import_id: input.importId,
    candidate_key: candidate.key,
    species: candidate.species,
    raw_name: candidate.raw_name,
    normalized_name: candidate.normalized_name,
    source_status: candidate.source_status,
    resolution_status: candidate.resolution_status,
    resolution_action: candidate.resolution_action,
    suggested_variety_id: candidate.suggested_variety_id,
    resolved_variety_id: candidate.resolved_variety_id,
    positions_count: candidate.positions_count,
    source_row_ids: [...candidate.source_row_keys]
      .map((sourceKey) => input.sourceRowIdByKey.get(sourceKey))
      .filter((sourceRowId): sourceRowId is string => Boolean(sourceRowId)),
    diagnostics_json: candidate.diagnostics,
  }));
  const candidateIdByKey = new Map<string, string>();

  for (const chunk of chunkArray(rows, 500)) {
    const { data, error } = await input.supabase
      .from("inventory_import_variety_candidates")
      .insert(chunk)
      .select("id, candidate_key");

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as Array<{ id: string; candidate_key: string }>) {
      candidateIdByKey.set(row.candidate_key, row.id);
    }
  }

  return candidateIdByKey;
}

async function insertPositions(input: {
  supabase: QueryClient;
  importId: string;
  plotId: string;
  positions: PositionWorkItem[];
  sourceRowIdByKey: Map<string, string>;
  candidateIdByKey: Map<string, string>;
}) {
  if (input.positions.length === 0) {
    return;
  }

  const rows = input.positions.map((item) => ({
    import_id: input.importId,
    source_row_id: input.sourceRowIdByKey.get(sourceLookupKey(
      item.position.source.sheet,
      item.position.source.row_number,
    )) ?? null,
    variety_candidate_id: item.variety_candidate_key
      ? input.candidateIdByKey.get(item.variety_candidate_key) ?? null
      : null,
    plot_id: input.plotId,
    variety_id: item.variety_id,
    existing_tree_id: item.existing_tree_id,
    section_name: item.position.location.section_name,
    row_number: item.position.location.row_number,
    position_in_row: item.position.location.position_in_row,
    tree_code: null,
    display_name: null,
    species: item.species,
    planned_action: item.planned_action,
    condition_status: item.position.tree?.condition_status ?? null,
    rootstock: item.position.tree?.rootstock ?? null,
    planted_at: item.position.tree?.planted_at ?? null,
    notes: item.position.tree?.notes ?? null,
    diagnostics_json: item.diagnostics,
    defaults_json: item.position.tree ?? {},
    overrides_json: {
      segment_key: item.position.segment_key,
      exception_key: item.position.exception_key ?? null,
      import_only: item.position.import_only,
    },
  }));

  for (const chunk of chunkArray(rows, 500)) {
    const { error } = await input.supabase
      .from("inventory_import_positions")
      .insert(chunk);

    if (error) {
      throw error;
    }
  }
}

function summarizePositions(
  canonical: TreeInventoryCanonicalImport,
  positions: PositionWorkItem[],
  candidates: Map<string, CandidateWorkItem>,
): Omit<TreeInventoryPreviewSummary, "diagnostics"> {
  const treePositions = positions.filter((item) => item.position.tree);

  return {
    total_positions: canonical.expanded_positions.length,
    planned_tree_records: treePositions.length,
    missing_positions: positions.filter((item) => item.planned_action === "missing_tree")
      .length,
    active_conflicts: positions.filter((item) =>
      item.diagnostics.some((diagnostic) =>
        diagnostic.code === "TREE_LOCATION_CONFLICT" &&
        diagnostic.severity === "error",
      ),
    ).length,
    inactive_contexts: positions.filter((item) =>
      item.diagnostics.some((diagnostic) =>
        diagnostic.code === "TREE_LOCATION_CONFLICT" &&
        diagnostic.severity === "info",
      ),
    ).length,
    known_variety_positions: treePositions.filter((item) =>
      item.position.tree?.variety.status === "known",
    ).length,
    new_candidate_positions: treePositions.filter((item) =>
      item.position.tree?.variety.status === "new_candidate",
    ).length,
    uncertain_variety_positions: treePositions.filter((item) =>
      item.position.tree?.variety.status === "uncertain",
    ).length,
    unknown_variety_positions: treePositions.filter((item) =>
      item.position.tree?.variety.status === "unknown",
    ).length,
    grouped_variety_candidates: candidates.size,
    unresolved_variety_candidates: [...candidates.values()].filter((candidate) =>
      candidate.resolution_status === "unresolved" ||
      candidate.resolution_status === "suggested",
    ).length,
    suggested_variety_candidates: [...candidates.values()].filter((candidate) =>
      candidate.resolution_status === "suggested",
    ).length,
  };
}

function buildEmptySummary(
  canonical: TreeInventoryCanonicalImport,
  diagnostics: TreeInventoryDiagnostic[],
): TreeInventoryPreviewSummary {
  return buildSummary(
    {
      total_positions: canonical.expanded_positions.length,
      planned_tree_records: canonical.expanded_positions.filter((position) => position.tree)
        .length,
      missing_positions: canonical.expanded_positions.filter((position) =>
        position.planned_action === "skip_missing",
      ).length,
      active_conflicts: 0,
      inactive_contexts: 0,
      known_variety_positions: 0,
      new_candidate_positions: 0,
      uncertain_variety_positions: 0,
      unknown_variety_positions: 0,
      grouped_variety_candidates: 0,
      unresolved_variety_candidates: 0,
      suggested_variety_candidates: 0,
    },
    diagnostics,
  );
}

function buildSummary(
  counts: Omit<TreeInventoryPreviewSummary, "diagnostics">,
  diagnostics: TreeInventoryDiagnostic[],
): TreeInventoryPreviewSummary {
  return {
    ...counts,
    diagnostics: {
      errors: diagnostics.filter((diagnostic) => diagnostic.severity === "error").length,
      warnings: diagnostics.filter((diagnostic) => diagnostic.severity === "warning").length,
      info: diagnostics.filter((diagnostic) => diagnostic.severity === "info").length,
      returned: diagnostics.length,
    },
  };
}

function determinePreviewStatus(
  diagnostics: TreeInventoryDiagnostic[],
  candidates: Map<string, CandidateWorkItem>,
): TreeInventoryPreviewStatus {
  if (hasErrorDiagnostic(diagnostics)) {
    return "validated";
  }

  const hasUnresolvedCandidates = [...candidates.values()].some((candidate) =>
    candidate.resolution_status === "unresolved" ||
    candidate.resolution_status === "suggested",
  );

  return hasUnresolvedCandidates
    ? "awaiting_variety_resolution"
    : "ready_for_owner_confirm";
}

function buildVarietyNameIndex(varieties: VarietyRow[]) {
  return new Map(
    varieties.map((variety) => [
      varietyLookupKey(variety.species, variety.name),
      variety,
    ]),
  );
}

function buildTreeLocationIndex(trees: TreeLocationRow[]) {
  const byLocation = new Map<string, TreeLocationRow[]>();

  for (const tree of trees) {
    if (typeof tree.row_number !== "number" || typeof tree.position_in_row !== "number") {
      continue;
    }

    const key = locationKey(tree.row_number, tree.position_in_row);
    byLocation.set(key, [...(byLocation.get(key) ?? []), tree]);
  }

  return byLocation;
}

function diagnosticsForSource(
  diagnostics: TreeInventoryDiagnostic[],
  source: TreeInventoryRowSource,
) {
  return diagnostics.filter((diagnostic) =>
    diagnostic.source?.sheet === source.sheet &&
    diagnostic.source.row_number === source.row_number,
  );
}

function hasErrorDiagnostic(diagnostics: TreeInventoryDiagnostic[]) {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

function candidateKeyFor(
  status: TreeInventoryVarietyConfidence,
  species: string,
  rawName: string | null,
) {
  return [
    normalizeLookup(species) ?? "unknown_species",
    status,
    normalizeLookup(rawName) ?? "unknown",
  ].join(":");
}

function varietyLookupKey(species: string | null, name: string | null) {
  return `${normalizeLookup(species) ?? ""}:${normalizeLookup(name) ?? ""}`;
}

function locationKey(rowNumber: number, positionInRow: number) {
  return `${rowNumber}:${positionInRow}`;
}

function sourceRowKey(source: TreeInventoryRowSource) {
  return sourceLookupKey(source.sheet, source.row_number);
}

function sourceLookupKey(sheet: string, rowNumber: number) {
  return `${sheet}:${rowNumber}`;
}

function normalizeLookup(value: string | null | undefined) {
  const normalized = value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("pl");
  return normalized ? normalized : null;
}

function normalizeHashInput(value: string) {
  return /^[a-f0-9]{64}$/.test(value) ? value : sha256Hex(value);
}

function sha256Hex(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  if (value == null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, child]) => `${JSON.stringify(key)}:${stableStringify(child)}`)
    .join(",")}}`;
}

function jsonObject(value: unknown): Record<string, TreeInventoryJsonValue> {
  return JSON.parse(JSON.stringify(value)) as Record<string, TreeInventoryJsonValue>;
}

function limitDiagnostics(diagnostics: TreeInventoryDiagnostic[]) {
  return diagnostics.slice(0, TREE_INVENTORY_IMPORT_LIMITS.max_diagnostics_returned);
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}
