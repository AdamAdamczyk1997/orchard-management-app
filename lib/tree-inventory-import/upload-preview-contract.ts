import type {
  TreeInventoryDiagnostic,
  TreeInventoryVarietyConfidence,
} from "@/lib/tree-inventory-import/contracts";
import type { OrchardMembershipRole } from "@/types/contracts";

export type TreeInventoryPreviewStatus =
  | "failed"
  | "validated"
  | "awaiting_variety_resolution"
  | "ready_for_owner_confirm";

export type TreeInventoryPreviewSummary = {
  total_positions: number;
  planned_tree_records: number;
  missing_positions: number;
  active_conflicts: number;
  inactive_contexts: number;
  known_variety_positions: number;
  new_candidate_positions: number;
  uncertain_variety_positions: number;
  unknown_variety_positions: number;
  grouped_variety_candidates: number;
  unresolved_variety_candidates: number;
  suggested_variety_candidates: number;
  diagnostics: {
    errors: number;
    warnings: number;
    info: number;
    returned: number;
  };
};

export type TreeInventoryPreviewResult = {
  import_id: string | null;
  status: TreeInventoryPreviewStatus;
  summary: TreeInventoryPreviewSummary;
  diagnostics: TreeInventoryDiagnostic[];
  confirm_version: number | null;
  confirm_token: string | null;
};

export type TreeInventoryUploadPreviewSourceRowRef = {
  id: string;
  row_kind: "segment" | "exception";
  sheet_name: string;
  source_row_number: number;
  source_row_key: string | null;
};

export type TreeInventoryUploadPreviewVarietyResolutionStatus =
  | "unresolved"
  | "suggested"
  | "resolved"
  | "accepted_unknown"
  | "rejected";

export type TreeInventoryUploadPreviewVarietyResolutionAction =
  | "use_existing"
  | "create_new"
  | "keep_unknown"
  | "reject"
  | null;

export const TREE_INVENTORY_UPLOAD_PREVIEW_VARIETY_RESOLUTION_ACTIONS = [
  "use_existing",
  "create_new",
  "keep_unknown",
] as const;

export type TreeInventoryUploadPreviewVarietyResolutionSubmitAction =
  typeof TREE_INVENTORY_UPLOAD_PREVIEW_VARIETY_RESOLUTION_ACTIONS[number];

export type TreeInventoryUploadPreviewVarietyCandidate = {
  id: string;
  candidate_key: string;
  species: string;
  raw_name: string | null;
  normalized_name: string | null;
  source_status: TreeInventoryVarietyConfidence;
  resolution_status: TreeInventoryUploadPreviewVarietyResolutionStatus;
  resolution_action: TreeInventoryUploadPreviewVarietyResolutionAction;
  suggested_variety_id: string | null;
  resolved_variety_id: string | null;
  positions_count: number;
  source_rows: TreeInventoryUploadPreviewSourceRowRef[];
  diagnostics: TreeInventoryDiagnostic[];
};

export type TreeInventoryUploadPreviewConflict = {
  id: string;
  source_row: TreeInventoryUploadPreviewSourceRowRef | null;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  species: string | null;
  planned_action: "blocked_conflict";
  existing_tree_id: string | null;
  diagnostics: TreeInventoryDiagnostic[];
};

export type TreeInventoryUploadPreviewData = {
  import_id: string | null;
  status: TreeInventoryPreviewStatus;
  summary: TreeInventoryPreviewSummary;
  diagnostics: TreeInventoryDiagnostic[];
  confirm_version: number | null;
  role: OrchardMembershipRole;
  can_confirm: false;
  candidates: TreeInventoryUploadPreviewVarietyCandidate[];
  conflicts: TreeInventoryUploadPreviewConflict[];
};

export type TreeInventoryUploadPreviewVarietyResolutionRequest = {
  import_id: string;
  candidate_id: string;
  resolution_action: TreeInventoryUploadPreviewVarietyResolutionSubmitAction;
  variety_id?: string | null;
  confirm_version?: number | null;
};

export type TreeInventoryUploadPreviewVarietyResolutionResult = {
  import_id: string;
  candidate_id: string;
  status: TreeInventoryPreviewStatus;
  summary: TreeInventoryPreviewSummary;
  diagnostics: TreeInventoryDiagnostic[];
  confirm_version: number;
};

export const TREE_INVENTORY_UPLOAD_PREVIEW_DIAGNOSTIC_RENDER_LIMIT = 80;
