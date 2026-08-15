import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  TreeInventoryImportConfirmReport,
} from "@/lib/tree-inventory-import/upload-preview-contract";
import type { ActionErrorCode } from "@/types/contracts";

type QueryClient = SupabaseClient;

export type TreeInventoryImportConfirmRequest = {
  import_id: string;
  confirm_token: string;
  confirm_version: number;
};

export type TreeInventoryImportConfirmResult = {
  import_id: string;
  status: "confirmed";
  created_trees_count: number;
  created_varieties_count: number;
  final_report: TreeInventoryImportConfirmReport;
};

export type TreeInventoryImportConfirmServiceResult =
  | {
      success: true;
      data: TreeInventoryImportConfirmResult;
    }
  | {
      success: false;
      error_code: ActionErrorCode;
      message: string;
      field_errors?: Record<string, string>;
    };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getQueryClient(supabaseClient?: QueryClient) {
  return supabaseClient ?? createSupabaseServerClient();
}

export async function confirmTreeInventoryImportForOrchard(
  orchardId: string,
  request: TreeInventoryImportConfirmRequest,
  supabaseClient?: QueryClient,
): Promise<TreeInventoryImportConfirmServiceResult> {
  const requestError = validateConfirmRequest(request);

  if (requestError) {
    return requestError;
  }

  const supabase = await getQueryClient(supabaseClient);
  const { data, error } = await supabase
    .rpc("confirm_tree_inventory_import", {
      p_import_id: request.import_id,
      p_active_orchard_id: orchardId,
      p_confirm_token: request.confirm_token,
      p_confirm_version: request.confirm_version,
    })
    .single();

  if (error) {
    return mapConfirmError(error);
  }

  const row = data as {
    import_id: string;
    status: string;
    created_trees_count: number;
    created_varieties_count: number;
    final_report_json: unknown;
  };

  return {
    success: true,
    data: {
      import_id: row.import_id,
      status: "confirmed",
      created_trees_count: row.created_trees_count,
      created_varieties_count: row.created_varieties_count,
      final_report: asConfirmReport(row.final_report_json, row),
    },
  };
}

function validateConfirmRequest(
  request: TreeInventoryImportConfirmRequest,
): TreeInventoryImportConfirmServiceResult | null {
  const fieldErrors: Record<string, string> = {};

  if (!UUID_PATTERN.test(request.import_id)) {
    fieldErrors.import_id = "Nieprawidlowe import_id.";
  }

  if (!request.confirm_token.trim()) {
    fieldErrors.confirm_token = "Brakuje confirm token.";
  }

  if (!Number.isInteger(request.confirm_version) || request.confirm_version <= 0) {
    fieldErrors.confirm_version = "Nieprawidlowa wersja preview.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Sprawdz confirm request i sprobuj ponownie.",
      field_errors: fieldErrors,
    };
  }

  return null;
}

function mapConfirmError(
  error: PostgrestError,
): TreeInventoryImportConfirmServiceResult {
  const message = error.message;

  if (error.code === "42501") {
    return {
      success: false,
      error_code: "FORBIDDEN",
      message: "Nie masz uprawnien do confirm tego importu.",
    };
  }

  if (error.code === "P0002" && message.includes("TREE_INVENTORY_IMPORT_NOT_FOUND")) {
    return {
      success: false,
      error_code: "NOT_FOUND",
      message: "Nie znaleziono staged importu do confirm.",
    };
  }

  if (error.code === "23505" && message.includes("TREE_INVENTORY_LOCATION_CONFLICT")) {
    return {
      success: false,
      error_code: "LOCATION_CONFLICT",
      message: "Aktualny stan sadu ma juz aktywne drzewo w importowanej lokalizacji.",
    };
  }

  if (
    error.code === "23505" &&
    message.includes("TREE_INVENTORY_CREATE_NEW_VARIETY_EXISTS")
  ) {
    return {
      success: false,
      error_code: "DUPLICATE_VARIETY",
      message:
        "Odmiana wybrana jako create-new-at-confirm juz istnieje. Odswiez preview i zmapuj candidate do istniejacej odmiany.",
    };
  }

  if (error.code === "23514" && message.includes("VARIETY")) {
    return {
      success: false,
      error_code: "VALIDATION_ERROR",
      message: "Resolved variety jest nieaktualna. Odswiez preview i resolution.",
    };
  }

  if (error.code === "22023" && message.includes("TREE_INVENTORY_CONFIRM_VERSION_STALE")) {
    return {
      success: false,
      error_code: "PREVIEW_REQUIRED",
      message: "Preview jest nieaktualny. Odswiez import przed confirm.",
    };
  }

  if (
    error.code === "22023" &&
    message.includes("TREE_INVENTORY_UNRESOLVED_VARIETY_CANDIDATES")
  ) {
    return {
      success: false,
      error_code: "PREVIEW_REQUIRED",
      message: "Najpierw rozstrzygnij wszystkie blocking candidate groups.",
    };
  }

  if (error.code === "22023") {
    return {
      success: false,
      error_code: "PREVIEW_REQUIRED",
      message: "Import nie jest gotowy do confirm. Odswiez preview.",
    };
  }

  if (error.code === "57014" && message.includes("statement timeout")) {
    return {
      success: false,
      error_code: "TREE_BATCH_MUTATION_FAILED",
      message: "Confirm importu przekroczyl limit czasu lokalnej bazy.",
    };
  }

  return {
    success: false,
    error_code: "TREE_BATCH_MUTATION_FAILED",
    message: "Nie udalo sie zatwierdzic importu drzew.",
  };
}

function asConfirmReport(
  value: unknown,
  fallback: {
    import_id: string;
    created_trees_count: number;
    created_varieties_count: number;
  },
): TreeInventoryImportConfirmReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      import_id: fallback.import_id,
      status: "confirmed",
      created_trees_count: fallback.created_trees_count,
      created_varieties_count: fallback.created_varieties_count,
      missing_positions_count: 0,
      unknown_variety_trees_count: 0,
      mapped_existing_variety_trees_count: 0,
      created_variety_trees_count: 0,
    };
  }

  const report = value as Partial<TreeInventoryImportConfirmReport>;

  return {
    import_id: report.import_id ?? fallback.import_id,
    status: "confirmed",
    created_trees_count:
      report.created_trees_count ?? fallback.created_trees_count,
    created_varieties_count:
      report.created_varieties_count ?? fallback.created_varieties_count,
    missing_positions_count: report.missing_positions_count ?? 0,
    unknown_variety_trees_count: report.unknown_variety_trees_count ?? 0,
    mapped_existing_variety_trees_count:
      report.mapped_existing_variety_trees_count ?? 0,
    created_variety_trees_count: report.created_variety_trees_count ?? 0,
    confirmed_by_profile_id: report.confirmed_by_profile_id ?? null,
    confirmed_at: report.confirmed_at ?? null,
  };
}
