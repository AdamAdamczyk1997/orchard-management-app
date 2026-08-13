"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createDataErrorResult, createErrorResult, createSuccessResult } from "@/lib/errors/action-result";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  type TreeInventoryDiagnostic,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import { normalizeTreeInventoryParsedWorkbook } from "@/lib/tree-inventory-import/normalizer";
import { parseTreeInventoryWorkbook } from "@/lib/tree-inventory-import/parser.server";
import { stageTreeInventoryPreviewForOrchard } from "@/lib/tree-inventory-import/preview.server";
import {
  TREE_INVENTORY_UPLOAD_PREVIEW_VARIETY_RESOLUTION_ACTIONS,
  type TreeInventoryUploadPreviewConflict,
  type TreeInventoryUploadPreviewData,
  type TreeInventoryUploadPreviewSourceRowRef,
  type TreeInventoryUploadPreviewVarietyCandidate,
  type TreeInventoryUploadPreviewVarietyResolutionRequest,
} from "@/lib/tree-inventory-import/upload-preview-contract";
import { resolveTreeInventoryVarietyCandidateForOrchard } from "@/lib/tree-inventory-import/variety-resolution.server";
import type { ActionResult, OrchardMembershipRole } from "@/types/contracts";

const TREE_INVENTORY_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ACCEPTED_XLSX_CONTENT_TYPES = new Set([
  "",
  TREE_INVENTORY_XLSX_CONTENT_TYPE,
  "application/octet-stream",
]);

type QueryClient = SupabaseClient;

type SourceRowRecord = TreeInventoryUploadPreviewSourceRowRef;

type CandidateRow = {
  id: string;
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
  source_row_ids: string[] | null;
  diagnostics_json: unknown;
};

type ConflictPositionRow = {
  id: string;
  source_row_id: string | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  species: string | null;
  planned_action: string;
  existing_tree_id: string | null;
  diagnostics_json: unknown;
};

export async function submitTreeInventoryImportPreview(
  _previousState: ActionResult<TreeInventoryUploadPreviewData>,
  formData: FormData,
): Promise<ActionResult<TreeInventoryUploadPreviewData>> {
  if (formData.get("intent") === "resolve_variety_candidate") {
    return handleResolveVarietyCandidateAction(formData);
  }

  const file = formData.get("workbook");
  const fileValidation = validateWorkbookFile(file);

  if (!fileValidation.valid) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Wybierz poprawny plik XLSX z szablonu tree_inventory_v1.",
      { workbook: fileValidation.message },
    );
  }

  const context = await requireActiveOrchard("/trees/import");
  const orchard = context.orchard;
  const role = context.membership.role;

  if (!orchard) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby przygotowac podglad importu.",
    );
  }

  try {
    const workbookBuffer = await fileValidation.file.arrayBuffer();
    const parsed = await parseTreeInventoryWorkbook({
      workbook: workbookBuffer,
      workbook_name: fileValidation.file.name,
    });
    const normalized = normalizeTreeInventoryParsedWorkbook(parsed);
    const supabase = await createSupabaseServerClient();
    const preview = await stageTreeInventoryPreviewForOrchard(
      orchard.id,
      {
        canonical: normalized.canonical,
        file: {
          file_name: fileValidation.file.name,
          file_size_bytes: fileValidation.file.size,
          file_hash: parsed.workbook.workbook_sha256,
          normalized_hash: normalized.canonical.file_hash,
        },
      },
      supabase,
    );
    const data = await buildUploadPreviewData({
      supabase,
      role,
      preview,
    });

    revalidatePath("/trees/import");

    if (!preview.import_id || preview.summary.diagnostics.errors > 0) {
      return createDataErrorResult(
        "VALIDATION_ERROR",
        "Podglad importu zawiera bledy. Popraw workbook i wgraj go ponownie.",
        data,
      );
    }

    if (preview.status === "awaiting_variety_resolution") {
      return createSuccessResult(
        data,
        "Podglad zapisany. Wymaga rozstrzygniecia kandydatow odmian przez wlasciciela.",
      );
    }

    return createSuccessResult(
      data,
      "Podglad zapisany. Confirm pozostaje wylaczony do kolejnej fazy importu.",
    );
  } catch {
    return createErrorResult(
      "TREE_BATCH_MUTATION_FAILED",
      "Nie udalo sie przygotowac podgladu importu.",
    );
  }
}

async function handleResolveVarietyCandidateAction(
  formData: FormData,
): Promise<ActionResult<TreeInventoryUploadPreviewData>> {
  const context = await requireActiveOrchard("/trees/import");
  const orchard = context.orchard;
  const role = context.membership.role;

  if (!orchard) {
    return createErrorResult(
      "NO_ACTIVE_ORCHARD",
      "Wybierz sad, aby rozstrzygnac candidate group.",
    );
  }

  if (!context.profile?.id) {
    return createErrorResult(
      "PROFILE_BOOTSTRAP_REQUIRED",
      "Profil uzytkownika jest wymagany do zapisania resolution.",
    );
  }

  const request = parseResolutionRequest(formData);

  if (!request.success || !request.data) {
    return createErrorResult(
      request.error_code ?? "VALIDATION_ERROR",
      request.message ?? "Sprawdz resolution action i sprobuj ponownie.",
      request.field_errors,
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    const resolution = await resolveTreeInventoryVarietyCandidateForOrchard(
      orchard.id,
      {
        profile_id: context.profile.id,
        orchard_role: role,
        system_role: context.profile.system_role,
      },
      request.data,
      supabase,
    );

    if (!resolution.success) {
      return createErrorResult(
        resolution.error_code,
        resolution.message,
        resolution.field_errors,
      );
    }

    const data = await buildUploadPreviewData({
      supabase,
      role,
      preview: {
        import_id: resolution.data.import_id,
        status: resolution.data.status,
        summary: resolution.data.summary,
        diagnostics: resolution.data.diagnostics,
        confirm_version: resolution.data.confirm_version,
        confirm_token: null,
      },
    });

    revalidatePath("/trees/import");

    if (data.summary.unresolved_variety_candidates > 0) {
      return createSuccessResult(
        data,
        "Resolution zapisane. Pozostaly jeszcze candidate groups do rozstrzygniecia.",
      );
    }

    return createSuccessResult(
      data,
      "Resolution zapisane. Preview jest gotowy do Phase 9 confirm.",
    );
  } catch {
    return createErrorResult(
      "TREE_BATCH_MUTATION_FAILED",
      "Nie udalo sie zapisac resolution dla candidate group.",
    );
  }
}

function parseResolutionRequest(
  formData: FormData,
): ActionResult<TreeInventoryUploadPreviewVarietyResolutionRequest> {
  const importId = getStringFormValue(formData, "import_id");
  const candidateId = getStringFormValue(formData, "candidate_id");
  const resolutionAction = getStringFormValue(formData, "resolution_action");
  const varietyId = getStringFormValue(formData, "variety_id");
  const confirmVersionValue = getStringFormValue(formData, "confirm_version");
  const fieldErrors: Record<string, string> = {};

  if (!importId) {
    fieldErrors.import_id = "Brakuje import_id.";
  }

  if (!candidateId) {
    fieldErrors.candidate_id = "Brakuje candidate_id.";
  }

  if (
    !TREE_INVENTORY_UPLOAD_PREVIEW_VARIETY_RESOLUTION_ACTIONS.includes(
      resolutionAction as TreeInventoryUploadPreviewVarietyResolutionRequest["resolution_action"],
    )
  ) {
    fieldErrors.resolution_action = "Nieobslugiwana resolution action.";
  }

  const confirmVersion = confirmVersionValue
    ? Number.parseInt(confirmVersionValue, 10)
    : null;

  if (
    confirmVersionValue &&
    (!Number.isInteger(confirmVersion) || (confirmVersion ?? 0) <= 0)
  ) {
    fieldErrors.confirm_version = "Nieprawidlowa wersja preview.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return createErrorResult(
      "VALIDATION_ERROR",
      "Sprawdz resolution action i sprobuj ponownie.",
      fieldErrors,
    );
  }

  return createSuccessResult({
    import_id: importId ?? "",
    candidate_id: candidateId ?? "",
    resolution_action:
      resolutionAction as TreeInventoryUploadPreviewVarietyResolutionRequest["resolution_action"],
    variety_id: varietyId,
    confirm_version: confirmVersion,
  });
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function validateWorkbookFile(
  value: FormDataEntryValue | null,
):
  | { valid: true; file: File }
  | { valid: false; message: string } {
  if (!(value instanceof File)) {
    return { valid: false, message: "Wybierz plik XLSX." };
  }

  if (value.size <= 0) {
    return { valid: false, message: "Plik jest pusty." };
  }

  if (value.size > TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes) {
    return {
      valid: false,
      message: `Plik moze miec maksymalnie ${formatBytes(
        TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes,
      )}.`,
    };
  }

  if (!value.name.toLocaleLowerCase("pl").endsWith(".xlsx")) {
    return {
      valid: false,
      message: "Plik musi miec rozszerzenie .xlsx.",
    };
  }

  if (!ACCEPTED_XLSX_CONTENT_TYPES.has(value.type)) {
    return {
      valid: false,
      message: "Typ pliku musi odpowiadac workbookowi XLSX.",
    };
  }

  return { valid: true, file: value };
}

async function buildUploadPreviewData(input: {
  supabase: QueryClient;
  role: OrchardMembershipRole;
  preview: Awaited<ReturnType<typeof stageTreeInventoryPreviewForOrchard>>;
}): Promise<TreeInventoryUploadPreviewData> {
  if (!input.preview.import_id) {
    return {
      import_id: null,
      status: input.preview.status,
      summary: input.preview.summary,
      diagnostics: input.preview.diagnostics,
      confirm_version: input.preview.confirm_version,
      role: input.role,
      can_confirm: false,
      candidates: [],
      conflicts: [],
    };
  }

  const [sourceRows, candidates, conflicts] = await Promise.all([
    readPreviewSourceRows(input.supabase, input.preview.import_id),
    readPreviewCandidates(input.supabase, input.preview.import_id),
    readPreviewConflicts(input.supabase, input.preview.import_id),
  ]);
  const sourceRowsById = new Map(sourceRows.map((row) => [row.id, row]));

  return {
    import_id: input.preview.import_id,
    status: input.preview.status,
    summary: input.preview.summary,
    diagnostics: input.preview.diagnostics,
    confirm_version: input.preview.confirm_version,
    role: input.role,
    can_confirm: false,
    candidates: candidates.map((candidate) =>
      mapCandidateRow(candidate, sourceRowsById),
    ),
    conflicts: conflicts.map((conflict) =>
      mapConflictRow(conflict, sourceRowsById),
    ),
  };
}

async function readPreviewSourceRows(supabase: QueryClient, importId: string) {
  const { data, error } = await supabase
    .from("inventory_import_source_rows")
    .select("id, row_kind, sheet_name, source_row_number, source_row_key")
    .eq("import_id", importId)
    .order("sheet_name", { ascending: true })
    .order("source_row_number", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SourceRowRecord[];
}

async function readPreviewCandidates(supabase: QueryClient, importId: string) {
  const { data, error } = await supabase
    .from("inventory_import_variety_candidates")
    .select(
      "id, candidate_key, species, raw_name, normalized_name, source_status, resolution_status, resolution_action, suggested_variety_id, resolved_variety_id, positions_count, source_row_ids, diagnostics_json",
    )
    .eq("import_id", importId)
    .order("source_status", { ascending: true })
    .order("species", { ascending: true })
    .order("raw_name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as CandidateRow[];
}

async function readPreviewConflicts(supabase: QueryClient, importId: string) {
  const { data, error } = await supabase
    .from("inventory_import_positions")
    .select(
      "id, source_row_id, section_name, row_number, position_in_row, species, planned_action, existing_tree_id, diagnostics_json",
    )
    .eq("import_id", importId)
    .eq("planned_action", "blocked_conflict")
    .order("row_number", { ascending: true })
    .order("position_in_row", { ascending: true })
    .limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []) as ConflictPositionRow[];
}

function mapCandidateRow(
  row: CandidateRow,
  sourceRowsById: Map<string, SourceRowRecord>,
): TreeInventoryUploadPreviewVarietyCandidate {
  return {
    id: row.id,
    candidate_key: row.candidate_key,
    species: row.species,
    raw_name: row.raw_name,
    normalized_name: row.normalized_name,
    source_status: row.source_status,
    resolution_status: row.resolution_status,
    resolution_action: row.resolution_action,
    suggested_variety_id: row.suggested_variety_id,
    resolved_variety_id: row.resolved_variety_id,
    positions_count: row.positions_count,
    source_rows: (row.source_row_ids ?? [])
      .map((sourceRowId) => sourceRowsById.get(sourceRowId))
      .filter((sourceRow): sourceRow is SourceRowRecord => Boolean(sourceRow)),
    diagnostics: asDiagnostics(row.diagnostics_json),
  };
}

function mapConflictRow(
  row: ConflictPositionRow,
  sourceRowsById: Map<string, SourceRowRecord>,
): TreeInventoryUploadPreviewConflict {
  return {
    id: row.id,
    source_row: row.source_row_id ? sourceRowsById.get(row.source_row_id) ?? null : null,
    section_name: row.section_name,
    row_number: row.row_number,
    position_in_row: row.position_in_row,
    species: row.species,
    planned_action: "blocked_conflict",
    existing_tree_id: row.existing_tree_id,
    diagnostics: asDiagnostics(row.diagnostics_json),
  };
}

function asDiagnostics(value: unknown): TreeInventoryDiagnostic[] {
  return Array.isArray(value) ? value as TreeInventoryDiagnostic[] : [];
}

function formatBytes(bytes: number) {
  const megabytes = bytes / 1024 / 1024;

  return `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB`;
}
