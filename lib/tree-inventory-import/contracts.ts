import type {
  PlotLayoutType,
  TreeConditionStatus,
} from "@/types/contracts";

export const TREE_INVENTORY_CONTRACT_VERSION = "tree_inventory_v1" as const;
export const TREE_INVENTORY_XLSX_CONTRACT_VERSION =
  TREE_INVENTORY_CONTRACT_VERSION;
export const TREE_INVENTORY_CANONICAL_CONTRACT_VERSION =
  TREE_INVENTORY_CONTRACT_VERSION;

export type TreeInventoryContractVersion =
  typeof TREE_INVENTORY_CONTRACT_VERSION;

export const TREE_INVENTORY_WORKSHEETS = [
  "INSTRUKCJA",
  "METADANE",
  "RZEDY",
  "NASADZENIA",
  "WYJATKI",
  "SLOWNIKI",
] as const;

export const TREE_INVENTORY_REQUIRED_WORKSHEETS = [
  "INSTRUKCJA",
  "METADANE",
  "NASADZENIA",
  "WYJATKI",
  "SLOWNIKI",
] as const;

export type TreeInventoryWorksheetName =
  (typeof TREE_INVENTORY_WORKSHEETS)[number];

export const TREE_INVENTORY_METADATA_FIELDS = [
  "xlsx_contract_version",
  "canonical_contract_version",
  "generated_at",
  "generated_by_profile_id",
  "orchard_id",
  "orchard_name",
  "plot_id",
  "plot_code",
  "plot_name",
  "plot_layout_type",
  "import_mode",
  "allow_new_varieties",
  "conflict_strategy",
] as const;

export const TREE_INVENTORY_SEGMENT_FIELDS = [
  "segment_key",
  "plot_code",
  "section_name",
  "row_number",
  "from_position",
  "to_position",
  "species",
  "variety_id",
  "variety_name",
  "variety_confidence",
  "condition_status",
  "planted_at",
  "planted_year",
  "planted_year_from",
  "planted_year_to",
  "rootstock",
  "pollinator_info",
  "location_verified",
  "notes",
] as const;

export const TREE_INVENTORY_EXCEPTION_FIELDS = [
  "exception_key",
  "segment_key",
  "plot_code",
  "section_name",
  "row_number",
  "position_in_row",
  "exception_type",
  "species",
  "variety_id",
  "variety_name",
  "variety_confidence",
  "condition_status",
  "planted_at",
  "planted_year",
  "planted_year_from",
  "planted_year_to",
  "rootstock",
  "pollinator_info",
  "location_verified",
  "notes",
] as const;

export const TREE_INVENTORY_DICTIONARY_FIELDS = [
  "dictionary_name",
  "value",
  "label",
  "plot_id",
  "plot_code",
  "plot_name",
  "layout_type",
  "status",
  "variety_id",
  "species",
  "name",
] as const;

export type TreeInventoryMetadataField =
  (typeof TREE_INVENTORY_METADATA_FIELDS)[number];
export type TreeInventorySegmentField =
  (typeof TREE_INVENTORY_SEGMENT_FIELDS)[number];
export type TreeInventoryExceptionField =
  (typeof TREE_INVENTORY_EXCEPTION_FIELDS)[number];
export type TreeInventoryDictionaryField =
  (typeof TREE_INVENTORY_DICTIONARY_FIELDS)[number];
export type TreeInventoryKnownColumnName =
  | TreeInventoryMetadataField
  | TreeInventorySegmentField
  | TreeInventoryExceptionField
  | TreeInventoryDictionaryField;

export const TREE_INVENTORY_IMPORT_MODES = [
  "incremental_create",
] as const;

export type TreeInventoryImportMode =
  (typeof TREE_INVENTORY_IMPORT_MODES)[number];

export const TREE_INVENTORY_CONFLICT_STRATEGIES = ["reject"] as const;

export type TreeInventoryConflictStrategy =
  (typeof TREE_INVENTORY_CONFLICT_STRATEGIES)[number];

export const TREE_INVENTORY_VARIETY_CONFIDENCES = [
  "known",
  "unknown",
  "uncertain",
  "new_candidate",
] as const;

export type TreeInventoryVarietyConfidence =
  (typeof TREE_INVENTORY_VARIETY_CONFIDENCES)[number];

export const TREE_INVENTORY_TREE_CONDITION_STATUSES = [
  "new",
  "good",
  "warning",
  "critical",
  "removed",
] as const satisfies readonly TreeConditionStatus[];

export const TREE_INVENTORY_CONDITION_INPUTS = [
  "new",
  "good",
  "warning",
  "critical",
  "removed",
  "healthy_normal",
  "needs_attention",
  "dead_severely_damaged",
  "physically_removed",
  "missing_position",
] as const;

export type TreeInventoryConditionInput =
  (typeof TREE_INVENTORY_CONDITION_INPUTS)[number];

export type TreeInventoryConditionMapping = {
  tree_condition_status: TreeConditionStatus | null;
  is_active: boolean;
  creates_tree_record: boolean;
};

export const TREE_INVENTORY_CONDITION_MAPPINGS = {
  new: {
    tree_condition_status: "new",
    is_active: true,
    creates_tree_record: true,
  },
  good: {
    tree_condition_status: "good",
    is_active: true,
    creates_tree_record: true,
  },
  warning: {
    tree_condition_status: "warning",
    is_active: true,
    creates_tree_record: true,
  },
  critical: {
    tree_condition_status: "critical",
    is_active: true,
    creates_tree_record: true,
  },
  removed: {
    tree_condition_status: "removed",
    is_active: false,
    creates_tree_record: true,
  },
  healthy_normal: {
    tree_condition_status: "good",
    is_active: true,
    creates_tree_record: true,
  },
  needs_attention: {
    tree_condition_status: "warning",
    is_active: true,
    creates_tree_record: true,
  },
  dead_severely_damaged: {
    tree_condition_status: "critical",
    is_active: true,
    creates_tree_record: true,
  },
  physically_removed: {
    tree_condition_status: "removed",
    is_active: false,
    creates_tree_record: true,
  },
  missing_position: {
    tree_condition_status: null,
    is_active: false,
    creates_tree_record: false,
  },
} as const satisfies Record<
  TreeInventoryConditionInput,
  TreeInventoryConditionMapping
>;

export const TREE_INVENTORY_EXCEPTION_TYPES = [
  "missing_tree",
  "different_variety",
  "condition_override",
  "dead_tree",
  "replacement",
  "notes_only",
] as const;

export type TreeInventoryExceptionType =
  (typeof TREE_INVENTORY_EXCEPTION_TYPES)[number];

export const TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES = [
  "rows",
] as const satisfies readonly PlotLayoutType[];

export type TreeInventoryMvpSupportedPlotLayoutType =
  (typeof TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES)[number];

export const TREE_INVENTORY_POSITION_ACTIONS = [
  "create_tree",
  "skip_missing",
] as const;

export type TreeInventoryPositionAction =
  (typeof TREE_INVENTORY_POSITION_ACTIONS)[number];

export const TREE_INVENTORY_DIAGNOSTIC_SEVERITIES = [
  "info",
  "warning",
  "error",
] as const;

export type TreeInventoryDiagnosticSeverity =
  (typeof TREE_INVENTORY_DIAGNOSTIC_SEVERITIES)[number];

export const TREE_INVENTORY_DIAGNOSTIC_CODES = [
  "UNSUPPORTED_CONTRACT_VERSION",
  "MISSING_REQUIRED_SHEET",
  "MISSING_REQUIRED_COLUMN",
  "INVALID_REQUIRED_VALUE",
  "INVALID_ENUM_VALUE",
  "INVALID_INTEGER",
  "INVALID_DATE",
  "INVALID_BOOLEAN",
  "INVALID_RANGE",
  "IMPORT_LIMIT_EXCEEDED",
  "SEGMENT_OVERLAP",
  "EXCEPTION_OUTSIDE_SEGMENT",
  "CONFLICTING_EXCEPTIONS",
  "ROW_POSITION_GAP",
  "VARIETY_NOT_FOUND",
  "VARIETY_SPECIES_MISMATCH",
  "PLOT_LAYOUT_UNSUPPORTED",
  "TREE_LOCATION_CONFLICT",
  "IMPORT_ONLY_FIELD_TO_NOTES",
  "UNTRUSTED_CONTEXT",
] as const;

export type TreeInventoryDiagnosticCode =
  (typeof TREE_INVENTORY_DIAGNOSTIC_CODES)[number];

export type TreeInventoryJsonPrimitive = string | number | boolean | null;

export type TreeInventoryJsonValue =
  | TreeInventoryJsonPrimitive
  | { [key: string]: TreeInventoryJsonValue }
  | TreeInventoryJsonValue[];

export type TreeInventoryRawValues = Record<string, TreeInventoryJsonValue>;

export type TreeInventoryWorkbookSource = {
  workbook_name?: string | null;
  workbook_byte_size?: number | null;
  workbook_sha256?: string | null;
};

// Source provenance stays JSON-safe so diagnostics can be returned by API
// responses without losing sheet, row, column or original cell value.
export type TreeInventorySourceLocation = {
  workbook?: TreeInventoryWorkbookSource | null;
  sheet?: TreeInventoryWorksheetName | string | null;
  row_number?: number | null;
  column?: TreeInventoryKnownColumnName | string | null;
  raw_value?: TreeInventoryJsonValue;
};

export type TreeInventoryRowSource = {
  workbook?: TreeInventoryWorkbookSource | null;
  sheet: TreeInventoryWorksheetName | string;
  row_number: number;
  row_key?: string | null;
  raw_values?: TreeInventoryRawValues;
};

export type TreeInventoryCellSource = TreeInventoryRowSource & {
  column: TreeInventoryKnownColumnName | string;
  raw_value: TreeInventoryJsonValue;
};

export type TreeInventoryEntityRefs = {
  orchard_id?: string | null;
  plot_id?: string | null;
  variety_id?: string | null;
  tree_id?: string | null;
  segment_key?: string | null;
  exception_key?: string | null;
  row_number?: number | null;
  position_in_row?: number | null;
};

export type TreeInventoryDiagnostic = {
  code: TreeInventoryDiagnosticCode;
  severity: TreeInventoryDiagnosticSeverity;
  source?: TreeInventorySourceLocation;
  message: string;
  normalized_value?: TreeInventoryJsonValue;
  entity_refs?: TreeInventoryEntityRefs;
};

export type TreeInventoryGeneratedContext = {
  // IDs from files or generated workbooks are provenance until active orchard
  // and ownership are revalidated server-side in later phases.
  orchard_id: string;
  orchard_name?: string | null;
  plot_id: string;
  plot_code?: string | null;
  plot_name?: string | null;
  plot_layout_type: PlotLayoutType;
  generated_at?: string | null;
  generated_by_profile_id?: string | null;
};

export type TreeInventoryRequestedBehavior = {
  import_mode: TreeInventoryImportMode;
  conflict_strategy: TreeInventoryConflictStrategy;
  allow_new_varieties: false;
};

export type TreeInventorySegmentLocation = {
  plot_id: string;
  section_name: string | null;
  row_number: number;
  from_position: number;
  to_position: number;
};

export type TreeInventoryPositionLocation = {
  plot_id: string;
  section_name: string | null;
  row_number: number;
  position_in_row: number;
};

export type TreeInventoryTreeDefaults = {
  species: string;
  variety_id: string | null;
  variety_name: string | null;
  variety: TreeInventoryVarietyReference;
  condition_status: TreeConditionStatus;
  planted_at: string | null;
  rootstock: string | null;
  pollinator_info: string | null;
  location_verified: boolean;
  notes: string | null;
};

export type TreeInventoryVarietyReference = {
  status: TreeInventoryVarietyConfidence;
  raw_name: string | null;
  raw_variety_id: string | null;
  resolved_variety_id: string | null;
};

export type TreeInventoryImportOnlyFields = {
  variety_confidence: TreeInventoryVarietyConfidence;
  planted_year: number | null;
  planted_year_from: number | null;
  planted_year_to: number | null;
  raw_values: TreeInventoryRawValues;
};

export type TreeInventorySegment = {
  source: TreeInventoryRowSource;
  segment_key: string;
  location: TreeInventorySegmentLocation;
  tree_defaults: TreeInventoryTreeDefaults;
  import_only: TreeInventoryImportOnlyFields;
};

export type TreeInventoryExceptionOverride = {
  species?: string;
  variety_id?: string | null;
  variety_name?: string | null;
  variety?: TreeInventoryVarietyReference;
  variety_confidence?: TreeInventoryVarietyConfidence;
  condition_status?: TreeConditionStatus;
  planted_at?: string | null;
  planted_year?: number | null;
  planted_year_from?: number | null;
  planted_year_to?: number | null;
  rootstock?: string | null;
  pollinator_info?: string | null;
  location_verified?: boolean;
  notes?: string | null;
  raw_values?: TreeInventoryRawValues;
};

export type TreeInventoryException = {
  source: TreeInventoryRowSource;
  exception_key: string;
  segment_key: string | null;
  location: TreeInventoryPositionLocation;
  exception_type: TreeInventoryExceptionType;
  override: TreeInventoryExceptionOverride;
};

export type TreeInventoryExpandedPosition = {
  source: TreeInventoryRowSource;
  segment_key: string;
  exception_key?: string | null;
  location: TreeInventoryPositionLocation;
  planned_action: TreeInventoryPositionAction;
  tree: TreeInventoryTreeDefaults | null;
  import_only: TreeInventoryImportOnlyFields;
};

// Canonical JSON is the stable boundary between parser/normalizer work and
// later preview, staging and confirm phases. It is pure data: no DB clients,
// callbacks, Date objects or XLSX library objects are allowed here.
export type TreeInventoryCanonicalImport = {
  xlsx_contract_version: typeof TREE_INVENTORY_XLSX_CONTRACT_VERSION;
  canonical_contract_version: typeof TREE_INVENTORY_CANONICAL_CONTRACT_VERSION;
  import_id: string | null;
  file_hash: string | null;
  generated_context: TreeInventoryGeneratedContext;
  requested_behavior: TreeInventoryRequestedBehavior;
  segments: TreeInventorySegment[];
  exceptions: TreeInventoryException[];
  expanded_positions: TreeInventoryExpandedPosition[];
  diagnostics: TreeInventoryDiagnostic[];
};

function isStringEnumValue<const TValues extends readonly string[]>(
  values: TValues,
  value: unknown,
): value is TValues[number] {
  return typeof value === "string" && values.includes(value);
}

export function isTreeInventoryContractVersion(
  value: unknown,
): value is TreeInventoryContractVersion {
  return value === TREE_INVENTORY_CONTRACT_VERSION;
}

export function parseTreeInventoryImportMode(
  value: unknown,
): TreeInventoryImportMode | null {
  return isStringEnumValue(TREE_INVENTORY_IMPORT_MODES, value) ? value : null;
}

export function parseTreeInventoryConflictStrategy(
  value: unknown,
): TreeInventoryConflictStrategy | null {
  return isStringEnumValue(TREE_INVENTORY_CONFLICT_STRATEGIES, value)
    ? value
    : null;
}

export function parseTreeInventoryVarietyConfidence(
  value: unknown,
): TreeInventoryVarietyConfidence | null {
  return isStringEnumValue(TREE_INVENTORY_VARIETY_CONFIDENCES, value)
    ? value
    : null;
}

export function parseTreeInventoryExceptionType(
  value: unknown,
): TreeInventoryExceptionType | null {
  return isStringEnumValue(TREE_INVENTORY_EXCEPTION_TYPES, value) ? value : null;
}

export function parseTreeInventoryConditionInput(
  value: unknown,
): TreeInventoryConditionInput | null {
  return isStringEnumValue(TREE_INVENTORY_CONDITION_INPUTS, value)
    ? value
    : null;
}

export function getTreeInventoryConditionMapping(
  condition: TreeInventoryConditionInput,
): TreeInventoryConditionMapping {
  return TREE_INVENTORY_CONDITION_MAPPINGS[condition];
}

export function createTreeInventoryDiagnostic(
  diagnostic: TreeInventoryDiagnostic,
): TreeInventoryDiagnostic {
  return diagnostic;
}
