import type { SupabaseClient } from "@supabase/supabase-js";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createTreeInventoryDiagnostic,
  type TreeInventoryDiagnostic,
} from "@/lib/tree-inventory-import/contracts";
import type {
  TreeInventoryPreviewStatus,
  TreeInventoryPreviewSummary,
  TreeInventoryUploadPreviewVarietyCandidate,
  TreeInventoryUploadPreviewVarietyResolutionRequest,
  TreeInventoryUploadPreviewVarietyResolutionResult,
} from "@/lib/tree-inventory-import/upload-preview-contract";
import type {
  ActionErrorCode,
  OrchardMembershipRole,
  SystemRole,
  VarietySummary,
} from "@/types/contracts";

type QueryClient = SupabaseClient;

type InventoryImportRow = {
  id: string;
  orchard_id: string;
  status: string;
  summary_json: unknown;
  diagnostics_json: unknown;
  confirm_version: number;
};

type CandidateRow = {
  id: string;
  import_id: string;
  candidate_key: string;
  species: string;
  raw_name: string | null;
  normalized_name: string | null;
  source_status: TreeInventoryUploadPreviewVarietyCandidate["source_status"];
  resolution_status: TreeInventoryUploadPreviewVarietyCandidate["resolution_status"];
  resolution_action: TreeInventoryUploadPreviewVarietyCandidate["resolution_action"];
  suggested_variety_id: string | null;
  resolved_variety_id: string | null;
  positions_count: number;
  diagnostics_json: unknown;
};

export type TreeInventoryVarietyResolutionActor = {
  profile_id: string;
  orchard_role: OrchardMembershipRole;
  system_role?: SystemRole | null;
};

export type TreeInventoryVarietyResolutionServiceResult =
  | {
      success: true;
      data: TreeInventoryUploadPreviewVarietyResolutionResult;
    }
  | {
      success: false;
      error_code: ActionErrorCode;
      message: string;
      field_errors?: Record<string, string>;
      diagnostics?: TreeInventoryDiagnostic[];
    };

const RESOLVABLE_IMPORT_STATUSES = new Set([
  "validated",
  "awaiting_variety_resolution",
  "ready_for_owner_confirm",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

export async function resolveTreeInventoryVarietyCandidateForOrchard(
  orchardId: string,
  actor: TreeInventoryVarietyResolutionActor,
  request: TreeInventoryUploadPreviewVarietyResolutionRequest,
  supabaseClient?: QueryClient,
): Promise<TreeInventoryVarietyResolutionServiceResult> {
  const permissionError = validateResolutionPermission(actor);

  if (permissionError) {
    return permissionError;
  }

  const requestError = validateResolutionRequest(request);

  if (requestError) {
    return requestError;
  }

  const supabase = await getQueryClient(supabaseClient);
  const inventoryImport = await readResolvableImport(
    supabase,
    orchardId,
    request.import_id,
  );

  if (!inventoryImport) {
    return {
      success: false,
      error_code: "NOT_FOUND",
      message: "Nie znaleziono aktywnego preview importu dla tego sadu.",
    };
  }

  if (
    typeof request.confirm_version === "number" &&
    request.confirm_version !== inventoryImport.confirm_version
  ) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Preview importu jest nieaktualny. Odswiez widok i sprobuj ponownie.",
      field_errors: { confirm_version: "Nieaktualna wersja preview." },
      diagnostics: [
        createTreeInventoryDiagnostic({
          code: "UNTRUSTED_CONTEXT",
          severity: "warning",
          source: { column: "confirm_version", raw_value: request.confirm_version },
          message: "Variety resolution was rejected because confirm_version is stale.",
          normalized_value: inventoryImport.confirm_version,
          entity_refs: { orchard_id: orchardId },
        }),
      ],
    };
  }

  if (!RESOLVABLE_IMPORT_STATUSES.has(inventoryImport.status)) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Ten import nie przyjmuje juz resolution actions.",
      field_errors: { import_id: "Status importu nie pozwala na resolution." },
    };
  }

  const candidate = await readCandidate(supabase, request.import_id, request.candidate_id);

  if (!candidate) {
    return {
      success: false,
      error_code: "NOT_FOUND",
      message: "Nie znaleziono candidate group w tym preview.",
    };
  }

  const targetVarietyResult = await resolveTargetVariety({
    supabase,
    orchardId,
    request,
    candidate,
  });

  if (!targetVarietyResult.success) {
    return targetVarietyResult;
  }

  const nextCandidatePatch = buildCandidatePatch({
    actor,
    request,
    candidate,
    targetVariety: targetVarietyResult.variety,
  });

  if (!nextCandidatePatch.success) {
    return nextCandidatePatch;
  }

  const { error: candidateUpdateError } = await supabase
    .from("inventory_import_variety_candidates")
    .update(nextCandidatePatch.patch)
    .eq("id", candidate.id)
    .eq("import_id", request.import_id);

  if (candidateUpdateError) {
    return {
      success: false,
      error_code: "TREE_BATCH_MUTATION_FAILED",
      message: "Nie udalo sie zapisac resolution dla candidate group.",
    };
  }

  const positionsError = await updateCandidatePositions({
    supabase,
    importId: request.import_id,
    candidateId: candidate.id,
    varietyId: nextCandidatePatch.positionVarietyId,
  });

  if (positionsError) {
    return {
      success: false,
      error_code: "TREE_BATCH_MUTATION_FAILED",
      message: "Nie udalo sie odswiezyc staged positions po resolution.",
    };
  }

  const statusResult = await refreshImportResolutionStatus({
    supabase,
    inventoryImport,
  });

  if (!statusResult.success) {
    return statusResult;
  }

  return {
    success: true,
    data: {
      import_id: request.import_id,
      candidate_id: candidate.id,
      status: statusResult.status,
      summary: statusResult.summary,
      diagnostics: asDiagnostics(inventoryImport.diagnostics_json),
      confirm_version: statusResult.confirmVersion,
    },
  };
}

function validateResolutionPermission(
  actor: TreeInventoryVarietyResolutionActor,
): TreeInventoryVarietyResolutionServiceResult | null {
  if (actor.orchard_role === "owner" || actor.system_role === "super_admin") {
    return null;
  }

  return {
    success: false,
    error_code: "FORBIDDEN",
    message: "Tylko owner albo super_admin moze rozstrzygac kandydatow odmian.",
  };
}

function validateResolutionRequest(
  request: TreeInventoryUploadPreviewVarietyResolutionRequest,
): TreeInventoryVarietyResolutionServiceResult | null {
  const fieldErrors: Record<string, string> = {};

  if (!UUID_PATTERN.test(request.import_id)) {
    fieldErrors.import_id = "Nieprawidlowe import_id.";
  }

  if (!UUID_PATTERN.test(request.candidate_id)) {
    fieldErrors.candidate_id = "Nieprawidlowe candidate_id.";
  }

  if (
    request.resolution_action === "use_existing" &&
    (!request.variety_id || !UUID_PATTERN.test(request.variety_id))
  ) {
    fieldErrors.variety_id = "Wybierz odmiane z aktywnego sadu.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Sprawdz resolution action i sprobuj ponownie.",
      field_errors: fieldErrors,
    };
  }

  return null;
}

async function readResolvableImport(
  supabase: QueryClient,
  orchardId: string,
  importId: string,
) {
  const { data, error } = await supabase
    .from("inventory_imports")
    .select("id, orchard_id, status, summary_json, diagnostics_json, confirm_version")
    .eq("id", importId)
    .eq("orchard_id", orchardId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as InventoryImportRow | null) ?? null;
}

async function readCandidate(
  supabase: QueryClient,
  importId: string,
  candidateId: string,
) {
  const { data, error } = await supabase
    .from("inventory_import_variety_candidates")
    .select(
      "id, import_id, candidate_key, species, raw_name, normalized_name, source_status, resolution_status, resolution_action, suggested_variety_id, resolved_variety_id, positions_count, diagnostics_json",
    )
    .eq("import_id", importId)
    .eq("id", candidateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as CandidateRow | null) ?? null;
}

async function resolveTargetVariety(input: {
  supabase: QueryClient;
  orchardId: string;
  request: TreeInventoryUploadPreviewVarietyResolutionRequest;
  candidate: CandidateRow;
}): Promise<
  | { success: true; variety: VarietySummary | null }
  | {
      success: false;
      error_code: ActionErrorCode;
      message: string;
      field_errors?: Record<string, string>;
      diagnostics?: TreeInventoryDiagnostic[];
    }
> {
  if (input.request.resolution_action !== "use_existing") {
    return { success: true, variety: null };
  }

  const variety = await readVarietyByIdForOrchard(
    input.orchardId,
    input.request.variety_id ?? "",
    input.supabase,
  );

  if (!variety) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Wybierz odmiane z aktywnego sadu.",
      field_errors: { variety_id: "Odmiana nie jest dostepna w aktywnym sadzie." },
    };
  }

  if (normalizeLookup(variety.species) !== normalizeLookup(input.candidate.species)) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Odmiana musi miec ten sam species co candidate group.",
      field_errors: { variety_id: "Species odmiany nie pasuje do candidate group." },
      diagnostics: [
        createTreeInventoryDiagnostic({
          code: "VARIETY_SPECIES_MISMATCH",
          severity: "error",
          message: "Mapped variety species does not match the staged candidate species.",
          normalized_value: {
            candidate_species: input.candidate.species,
            variety_species: variety.species,
          },
          entity_refs: {
            orchard_id: input.orchardId,
            variety_id: variety.id,
          },
        }),
      ],
    };
  }

  return { success: true, variety };
}

function buildCandidatePatch(input: {
  actor: TreeInventoryVarietyResolutionActor;
  request: TreeInventoryUploadPreviewVarietyResolutionRequest;
  candidate: CandidateRow;
  targetVariety: VarietySummary | null;
}):
  | {
      success: true;
      patch: Record<string, unknown>;
      positionVarietyId: string | null;
    }
  | {
      success: false;
      error_code: ActionErrorCode;
      message: string;
      field_errors?: Record<string, string>;
    } {
  const resolvedMetadata = {
    resolved_by_profile_id: input.actor.profile_id,
    resolved_at: new Date().toISOString(),
  };

  if (input.request.resolution_action === "use_existing") {
    if (!input.targetVariety) {
      return {
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "Wybierz odmiane z aktywnego sadu.",
        field_errors: { variety_id: "Odmiana jest wymagana." },
      };
    }

    return {
      success: true,
      patch: {
        resolution_status: "resolved",
        resolution_action: "use_existing",
        suggested_variety_id: input.candidate.suggested_variety_id,
        resolved_variety_id: input.targetVariety.id,
        ...resolvedMetadata,
      },
      positionVarietyId: input.targetVariety.id,
    };
  }

  if (input.request.resolution_action === "create_new") {
    if (!input.candidate.raw_name || !input.candidate.normalized_name) {
      return {
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "Create-new-at-confirm wymaga nazwy candidate group.",
        field_errors: { candidate_id: "Candidate group nie ma nazwy odmiany." },
      };
    }

    return {
      success: true,
      patch: {
        resolution_status: "resolved",
        resolution_action: "create_new",
        resolved_variety_id: null,
        ...resolvedMetadata,
      },
      positionVarietyId: null,
    };
  }

  if (input.request.resolution_action === "keep_unknown") {
    return {
      success: true,
      patch: {
        resolution_status: "accepted_unknown",
        resolution_action: "keep_unknown",
        resolved_variety_id: null,
        ...resolvedMetadata,
      },
      positionVarietyId: null,
    };
  }

  return {
    success: false,
    error_code: "VALIDATION_ERROR",
    message: "Nieobslugiwana resolution action.",
    field_errors: { resolution_action: "Nieobslugiwana resolution action." },
  };
}

async function updateCandidatePositions(input: {
  supabase: QueryClient;
  importId: string;
  candidateId: string;
  varietyId: string | null;
}) {
  const { error } = await input.supabase
    .from("inventory_import_positions")
    .update({ variety_id: input.varietyId })
    .eq("import_id", input.importId)
    .eq("variety_candidate_id", input.candidateId);

  return error;
}

async function refreshImportResolutionStatus(input: {
  supabase: QueryClient;
  inventoryImport: InventoryImportRow;
}): Promise<
  | {
      success: true;
      status: TreeInventoryPreviewStatus;
      summary: TreeInventoryPreviewSummary;
      confirmVersion: number;
    }
  | {
      success: false;
      error_code: ActionErrorCode;
      message: string;
    }
> {
  const candidates = await listCandidatesForImport(
    input.supabase,
    input.inventoryImport.id,
  );
  const summary = refreshResolutionCounts(
    asSummary(input.inventoryImport.summary_json),
    candidates,
  );
  const status = determinePreviewStatus(
    summary,
    asDiagnostics(input.inventoryImport.diagnostics_json),
  );
  const nextConfirmVersion = input.inventoryImport.confirm_version + 1;
  const { error } = await input.supabase
    .from("inventory_imports")
    .update({
      status,
      summary_json: summary,
      confirm_version: nextConfirmVersion,
    })
    .eq("id", input.inventoryImport.id);

  if (error) {
    return {
      success: false,
      error_code: "TREE_BATCH_MUTATION_FAILED",
      message: "Nie udalo sie odswiezyc statusu preview po resolution.",
    };
  }

  return {
    success: true,
    status,
    summary,
    confirmVersion: nextConfirmVersion,
  };
}

async function listCandidatesForImport(
  supabase: QueryClient,
  importId: string,
) {
  const { data, error } = await supabase
    .from("inventory_import_variety_candidates")
    .select("resolution_status")
    .eq("import_id", importId);

  if (error) {
    throw error;
  }

  return (data ?? []) as Array<Pick<CandidateRow, "resolution_status">>;
}

function refreshResolutionCounts(
  summary: TreeInventoryPreviewSummary,
  candidates: Array<Pick<CandidateRow, "resolution_status">>,
) {
  return {
    ...summary,
    grouped_variety_candidates: candidates.length,
    unresolved_variety_candidates: candidates.filter((candidate) =>
      candidate.resolution_status === "unresolved" ||
      candidate.resolution_status === "suggested",
    ).length,
    suggested_variety_candidates: candidates.filter((candidate) =>
      candidate.resolution_status === "suggested",
    ).length,
  };
}

function determinePreviewStatus(
  summary: TreeInventoryPreviewSummary,
  diagnostics: TreeInventoryDiagnostic[],
): TreeInventoryPreviewStatus {
  if (
    summary.diagnostics.errors > 0 ||
    diagnostics.some((diagnostic) => diagnostic.severity === "error")
  ) {
    return "validated";
  }

  return summary.unresolved_variety_candidates > 0
    ? "awaiting_variety_resolution"
    : "ready_for_owner_confirm";
}

function asSummary(value: unknown): TreeInventoryPreviewSummary {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptySummary();
  }

  return {
    ...emptySummary(),
    ...(value as Partial<TreeInventoryPreviewSummary>),
    diagnostics: {
      ...emptySummary().diagnostics,
      ...((value as Partial<TreeInventoryPreviewSummary>).diagnostics ?? {}),
    },
  };
}

function emptySummary(): TreeInventoryPreviewSummary {
  return {
    total_positions: 0,
    planned_tree_records: 0,
    missing_positions: 0,
    active_conflicts: 0,
    inactive_contexts: 0,
    known_variety_positions: 0,
    new_candidate_positions: 0,
    uncertain_variety_positions: 0,
    unknown_variety_positions: 0,
    grouped_variety_candidates: 0,
    unresolved_variety_candidates: 0,
    suggested_variety_candidates: 0,
    diagnostics: {
      errors: 0,
      warnings: 0,
      info: 0,
      returned: 0,
    },
  };
}

function asDiagnostics(value: unknown): TreeInventoryDiagnostic[] {
  return Array.isArray(value) ? value as TreeInventoryDiagnostic[] : [];
}

function normalizeLookup(value: string | null | undefined) {
  return value?.trim().toLocaleLowerCase("pl") ?? "";
}
