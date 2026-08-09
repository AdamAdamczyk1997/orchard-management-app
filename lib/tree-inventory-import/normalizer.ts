import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_CONFLICT_STRATEGIES,
  TREE_INVENTORY_CONTRACT_VERSION,
  TREE_INVENTORY_IMPORT_MODES,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  createTreeInventoryDiagnostic,
  getTreeInventoryConditionMapping,
  parseTreeInventoryConditionInput,
  parseTreeInventoryExceptionType,
  parseTreeInventoryVarietyConfidence,
  type TreeInventoryCanonicalImport,
  type TreeInventoryDiagnostic,
  type TreeInventoryException,
  type TreeInventoryExceptionOverride,
  type TreeInventoryExceptionType,
  type TreeInventoryExpandedPosition,
  type TreeInventoryImportOnlyFields,
  type TreeInventoryJsonValue,
  type TreeInventoryMetadataField,
  type TreeInventoryRawValues,
  type TreeInventoryRowSource,
  type TreeInventorySegment,
  type TreeInventoryTreeDefaults,
  type TreeInventoryVarietyReference,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import type {
  TreeInventoryParsedRow,
  TreeInventoryParsedWorkbook,
} from "@/lib/tree-inventory-import/parser.server";
import type { TreeConditionStatus } from "@/types/contracts";
import type { PlotLayoutType } from "@/types/contracts";

export type NormalizeTreeInventoryResult = {
  canonical: TreeInventoryCanonicalImport;
  diagnostics: TreeInventoryDiagnostic[];
};

type SegmentWorkItem = {
  segment: TreeInventorySegment;
  valid_for_expansion: boolean;
};

type ExceptionWorkItem = {
  exception: TreeInventoryException;
  raw_values: TreeInventoryRawValues;
};

type PositionWorkItem = {
  position: TreeInventoryExpandedPosition;
  segment: TreeInventorySegment;
};

type NormalizerContext = {
  diagnostics: TreeInventoryDiagnostic[];
  plot_id: string;
};

export function normalizeTreeInventoryParsedWorkbook(
  parsed: TreeInventoryParsedWorkbook,
): NormalizeTreeInventoryResult {
  const diagnostics = [...parsed.diagnostics];
  const context = buildNormalizerContext(parsed, diagnostics);
  const segments = parsed.segments.map((row, index) =>
    normalizeSegment(row, index, context),
  );
  const exceptions = parsed.exceptions.map((row, index) =>
    normalizeException(row, index, context),
  );
  const expandedPositions = expandAndValidatePositions(
    segments,
    exceptions,
    context,
  );
  const canonical: TreeInventoryCanonicalImport = {
    xlsx_contract_version: TREE_INVENTORY_XLSX_CONTRACT_VERSION,
    canonical_contract_version: TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
    import_id: null,
    file_hash: parsed.workbook.workbook_sha256 ?? null,
    generated_context: {
      orchard_id: readMetadataText(parsed, "orchard_id") ?? "",
      orchard_name: readMetadataText(parsed, "orchard_name"),
      plot_id: context.plot_id,
      plot_code: readMetadataText(parsed, "plot_code"),
      plot_name: readMetadataText(parsed, "plot_name"),
      plot_layout_type: normalizePlotLayoutType(
        readMetadataText(parsed, "plot_layout_type"),
      ),
      generated_at: readMetadataText(parsed, "generated_at"),
      generated_by_profile_id: readMetadataText(
        parsed,
        "generated_by_profile_id",
      ),
    },
    requested_behavior: {
      import_mode: TREE_INVENTORY_IMPORT_MODES[0],
      conflict_strategy: TREE_INVENTORY_CONFLICT_STRATEGIES[0],
      allow_new_varieties: false,
    },
    segments: segments.map((item) => item.segment),
    exceptions: exceptions.map((item) => item.exception),
    expanded_positions: expandedPositions.map((item) => item.position),
    diagnostics,
  };

  return { canonical, diagnostics };
}

function buildNormalizerContext(
  parsed: TreeInventoryParsedWorkbook,
  diagnostics: TreeInventoryDiagnostic[],
): NormalizerContext {
  validateMetadataContract(parsed, diagnostics);

  const plotId = readMetadataText(parsed, "plot_id");

  if (!plotId) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_REQUIRED_VALUE",
        severity: "error",
        source: {
          workbook: parsed.workbook,
          sheet: "METADANE",
          column: "plot_id",
          raw_value: parsed.metadata.values.plot_id ?? null,
        },
        message: "tree_inventory_v1 canonical normalization requires plot_id metadata.",
      }),
    );
  }

  return {
    diagnostics,
    plot_id: plotId ?? "",
  };
}

function validateMetadataContract(
  parsed: TreeInventoryParsedWorkbook,
  diagnostics: TreeInventoryDiagnostic[],
) {
  const xlsxVersion = readMetadataText(parsed, "xlsx_contract_version");
  const canonicalVersion = readMetadataText(
    parsed,
    "canonical_contract_version",
  );

  if (xlsxVersion !== TREE_INVENTORY_CONTRACT_VERSION) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNSUPPORTED_CONTRACT_VERSION",
        severity: "error",
        source: {
          workbook: parsed.workbook,
          sheet: "METADANE",
          column: "xlsx_contract_version",
          raw_value: xlsxVersion,
        },
        message: "Cannot normalize unsupported XLSX contract version.",
        normalized_value: TREE_INVENTORY_CONTRACT_VERSION,
      }),
    );
  }

  if (canonicalVersion !== TREE_INVENTORY_CONTRACT_VERSION) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "UNSUPPORTED_CONTRACT_VERSION",
        severity: "error",
        source: {
          workbook: parsed.workbook,
          sheet: "METADANE",
          column: "canonical_contract_version",
          raw_value: canonicalVersion,
        },
        message: "Cannot normalize unsupported canonical contract version.",
        normalized_value: TREE_INVENTORY_CONTRACT_VERSION,
      }),
    );
  }
}

function normalizeSegment(
  row: TreeInventoryParsedRow,
  index: number,
  context: NormalizerContext,
): SegmentWorkItem {
  const raw = row.raw_values;
  const segmentKey = normalizeText(raw.segment_key) ?? `S${index + 1}`;
  const rowNumber = parsePositiveInteger(raw.row_number, row, "row_number", context);
  const fromPosition = parsePositiveInteger(
    raw.from_position,
    row,
    "from_position",
    context,
  );
  const toPosition = parsePositiveInteger(
    raw.to_position,
    row,
    "to_position",
    context,
  );
  const variety = normalizeVarietyReference(raw, row, context);
  const conditionStatus = normalizeConditionStatus(
    raw.condition_status,
    row,
    "condition_status",
    context,
  );
  const importOnly = normalizeImportOnlyFields(raw, variety);
  const segment: TreeInventorySegment = {
    source: toRowSource(row),
    segment_key: segmentKey,
    location: {
      plot_id: context.plot_id,
      section_name: normalizeText(raw.section_name),
      row_number: rowNumber ?? 0,
      from_position: fromPosition ?? 0,
      to_position: toPosition ?? 0,
    },
    tree_defaults: {
      species: normalizeText(raw.species) ?? "",
      variety_id: variety.resolved_variety_id,
      variety_name: variety.raw_name,
      variety,
      condition_status: conditionStatus,
      planted_at: normalizeDate(raw.planted_at, row, "planted_at", context),
      rootstock: normalizeText(raw.rootstock),
      pollinator_info: normalizeText(raw.pollinator_info),
      location_verified: normalizeBoolean(raw.location_verified),
      notes: normalizeText(raw.notes),
    },
    import_only: importOnly,
  };

  if (
    fromPosition != null &&
    toPosition != null &&
    fromPosition > toPosition
  ) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_RANGE",
        severity: "error",
        source: sourceFor(row, "to_position", raw.to_position),
        message: "Segment to_position must be greater than or equal to from_position.",
        entity_refs: {
          segment_key: segmentKey,
          row_number: rowNumber,
        },
      }),
    );
  }

  return {
    segment,
    valid_for_expansion:
      rowNumber != null &&
      fromPosition != null &&
      toPosition != null &&
      fromPosition <= toPosition,
  };
}

function normalizeException(
  row: TreeInventoryParsedRow,
  index: number,
  context: NormalizerContext,
): ExceptionWorkItem {
  const raw = row.raw_values;
  const exceptionKey = normalizeText(raw.exception_key) ?? `E${index + 1}`;
  const exceptionType =
    parseTreeInventoryExceptionType(normalizeText(raw.exception_type)) ??
    "notes_only";
  const rowNumber = parsePositiveInteger(raw.row_number, row, "row_number", context);
  const positionInRow = parsePositiveInteger(
    raw.position_in_row,
    row,
    "position_in_row",
    context,
  );
  const override = normalizeExceptionOverride(raw, row, context);

  if (!parseTreeInventoryExceptionType(normalizeText(raw.exception_type))) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_ENUM_VALUE",
        severity: "error",
        source: sourceFor(row, "exception_type", raw.exception_type),
        message: "Unsupported tree inventory exception type.",
        normalized_value: exceptionType,
        entity_refs: { exception_key: exceptionKey },
      }),
    );
  }

  return {
    raw_values: raw,
    exception: {
      source: toRowSource(row),
      exception_key: exceptionKey,
      segment_key: normalizeText(raw.segment_key),
      location: {
        plot_id: context.plot_id,
        section_name: normalizeText(raw.section_name),
        row_number: rowNumber ?? 0,
        position_in_row: positionInRow ?? 0,
      },
      exception_type: exceptionType,
      override,
    },
  };
}

function normalizeExceptionOverride(
  raw: TreeInventoryRawValues,
  row: TreeInventoryParsedRow,
  context: NormalizerContext,
): TreeInventoryExceptionOverride {
  const variety = normalizeVarietyReference(raw, row, context, {
    allow_empty_known: true,
  });
  const conditionStatus =
    normalizeText(raw.condition_status) == null
      ? undefined
      : normalizeConditionStatus(
          raw.condition_status,
          row,
          "condition_status",
          context,
        );

  return removeUndefinedProperties({
    species: normalizeText(raw.species) ?? undefined,
    variety_id: variety.raw_name != null || variety.raw_variety_id != null
      ? variety.resolved_variety_id
      : undefined,
    variety_name: variety.raw_name ?? undefined,
    variety: variety.raw_name != null || variety.raw_variety_id != null
      ? variety
      : undefined,
    condition_status: conditionStatus,
    planted_at:
      raw.planted_at == null
        ? undefined
        : normalizeDate(raw.planted_at, row, "planted_at", context),
    planted_year:
      raw.planted_year == null
        ? undefined
        : parsePlantingYear(raw.planted_year, row, "planted_year", context),
    planted_year_from:
      raw.planted_year_from == null
        ? undefined
        : parsePlantingYear(
            raw.planted_year_from,
            row,
            "planted_year_from",
            context,
          ),
    planted_year_to:
      raw.planted_year_to == null
        ? undefined
        : parsePlantingYear(
            raw.planted_year_to,
            row,
            "planted_year_to",
            context,
          ),
    rootstock: normalizeText(raw.rootstock) ?? undefined,
    pollinator_info: normalizeText(raw.pollinator_info) ?? undefined,
    location_verified:
      raw.location_verified == null
        ? undefined
        : normalizeBoolean(raw.location_verified),
    notes: normalizeText(raw.notes) ?? undefined,
    raw_values: raw,
  });
}

function normalizeVarietyReference(
  raw: TreeInventoryRawValues,
  row: TreeInventoryParsedRow,
  context: NormalizerContext,
  options: { allow_empty_known?: boolean } = {},
): TreeInventoryVarietyReference {
  const rawStatus = normalizeText(raw.variety_confidence);
  const status =
    parseTreeInventoryVarietyConfidence(rawStatus) ?? ("known" as const);
  const rawName = normalizeText(raw.variety_name);
  const rawVarietyId = normalizeText(raw.variety_id);

  if (!parseTreeInventoryVarietyConfidence(rawStatus)) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_ENUM_VALUE",
        severity: "error",
        source: sourceFor(row, "variety_confidence", raw.variety_confidence),
        message: "Unsupported tree inventory variety confidence.",
        normalized_value: status,
      }),
    );
  }

  if (status === "known" && !rawName && !options.allow_empty_known) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_REQUIRED_VALUE",
        severity: "error",
        source: sourceFor(row, "variety_name", raw.variety_name),
        message: "Known variety rows require a variety_name before DB validation.",
        normalized_value: status,
      }),
    );
  }

  if (status === "new_candidate" && !rawName) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_REQUIRED_VALUE",
        severity: "error",
        source: sourceFor(row, "variety_name", raw.variety_name),
        message: "New variety candidates require a human variety_name.",
        normalized_value: status,
      }),
    );
  }

  return {
    status,
    raw_name: rawName,
    raw_variety_id: rawVarietyId,
    resolved_variety_id: status === "known" ? rawVarietyId : null,
  };
}

function normalizeConditionStatus(
  value: TreeInventoryJsonValue | undefined,
  row: TreeInventoryParsedRow,
  column: string,
  context: NormalizerContext,
): TreeConditionStatus {
  const input = parseTreeInventoryConditionInput(normalizeText(value));

  if (!input) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_ENUM_VALUE",
        severity: "error",
        source: sourceFor(row, column, value),
        message: "Unsupported tree inventory condition status.",
        normalized_value: "good",
      }),
    );

    return "good";
  }

  return getTreeInventoryConditionMapping(input).tree_condition_status ?? "good";
}

function normalizeImportOnlyFields(
  raw: TreeInventoryRawValues,
  variety: TreeInventoryVarietyReference,
): TreeInventoryImportOnlyFields {
  return {
    variety_confidence: variety.status,
    planted_year: normalizePlantingYearValue(raw.planted_year),
    planted_year_from: normalizePlantingYearValue(raw.planted_year_from),
    planted_year_to: normalizePlantingYearValue(raw.planted_year_to),
    raw_values: raw,
  };
}

function expandAndValidatePositions(
  segments: SegmentWorkItem[],
  exceptions: ExceptionWorkItem[],
  context: NormalizerContext,
): PositionWorkItem[] {
  const positions: PositionWorkItem[] = [];
  const byLocation = new Map<string, PositionWorkItem>();

  for (const item of segments) {
    if (!item.valid_for_expansion) {
      continue;
    }

    const { segment } = item;

    for (
      let position = segment.location.from_position;
      position <= segment.location.to_position;
      position += 1
    ) {
      if (positions.length >= TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp) {
        context.diagnostics.push(
          createTreeInventoryDiagnostic({
            code: "IMPORT_LIMIT_EXCEEDED",
            severity: "error",
            source: {
              ...segment.source,
              column: "to_position",
              raw_value: segment.location.to_position,
            },
            message: "Expanded tree position count exceeds the MVP import limit.",
            normalized_value:
              TREE_INVENTORY_IMPORT_LIMITS.max_expanded_tree_positions_mvp,
            entity_refs: { segment_key: segment.segment_key },
          }),
        );

        break;
      }

      const key = locationKey(segment.location.row_number, position);
      const expanded = buildExpandedPosition(segment, position);

      if (byLocation.has(key)) {
        context.diagnostics.push(
          createTreeInventoryDiagnostic({
            code: "SEGMENT_OVERLAP",
            severity: "error",
            source: {
              ...segment.source,
              column: "from_position",
              raw_value: position,
            },
            message: "Multiple import segments describe the same row/position.",
            entity_refs: {
              segment_key: segment.segment_key,
              row_number: segment.location.row_number,
              position_in_row: position,
            },
          }),
        );
      }

      positions.push(expanded);
      byLocation.set(key, expanded);
    }
  }

  detectGaps(positions, context);
  applyExceptions(positions, byLocation, exceptions, context);

  return positions.sort(compareExpandedPositions);
}

function buildExpandedPosition(
  segment: TreeInventorySegment,
  positionInRow: number,
): PositionWorkItem {
  return {
    segment,
    position: {
      source: segment.source,
      segment_key: segment.segment_key,
      exception_key: null,
      location: {
        plot_id: segment.location.plot_id,
        section_name: segment.location.section_name,
        row_number: segment.location.row_number,
        position_in_row: positionInRow,
      },
      planned_action: "create_tree",
      tree: { ...segment.tree_defaults },
      import_only: segment.import_only,
    },
  };
}

function detectGaps(
  positions: PositionWorkItem[],
  context: NormalizerContext,
) {
  const byRow = new Map<number, PositionWorkItem[]>();

  for (const position of positions) {
    const row = position.position.location.row_number;
    byRow.set(row, [...(byRow.get(row) ?? []), position]);
  }

  for (const [rowNumber, rowPositions] of byRow) {
    const sorted = [...rowPositions].sort(compareExpandedPositions);

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1]?.position.location.position_in_row;
      const current = sorted[index]?.position.location.position_in_row;

      if (previous != null && current != null && current > previous + 1) {
        context.diagnostics.push(
          createTreeInventoryDiagnostic({
            code: "ROW_POSITION_GAP",
            severity: "warning",
            source: sorted[index]?.position.source,
            message: "Import row has a gap between described positions.",
            normalized_value: {
              previous_position: previous,
              next_position: current,
            },
            entity_refs: {
              row_number: rowNumber,
              position_in_row: current,
            },
          }),
        );
      }
    }
  }
}

function applyExceptions(
  positions: PositionWorkItem[],
  byLocation: Map<string, PositionWorkItem>,
  exceptions: ExceptionWorkItem[],
  context: NormalizerContext,
) {
  const exceptionsByLocation = new Map<string, ExceptionWorkItem[]>();

  for (const item of exceptions) {
    const key = locationKey(
      item.exception.location.row_number,
      item.exception.location.position_in_row,
    );
    exceptionsByLocation.set(key, [...(exceptionsByLocation.get(key) ?? []), item]);
  }

  for (const [key, items] of exceptionsByLocation) {
    if (items.length > 1) {
      context.diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "CONFLICTING_EXCEPTIONS",
          severity: "error",
          source: items[1]?.exception.source,
          message: "Multiple exceptions target the same row/position.",
          entity_refs: {
            exception_key: items[1]?.exception.exception_key,
            row_number: items[1]?.exception.location.row_number,
            position_in_row: items[1]?.exception.location.position_in_row,
          },
        }),
      );
    }

    const item = items[0];
    if (!item) {
      continue;
    }

    const existing = byLocation.get(key);

    if (!existing) {
      if (item.exception.exception_type === "replacement") {
        const replacement = buildReplacementOutsideSegment(item, context);
        positions.push(replacement);
        byLocation.set(key, replacement);
        continue;
      }

      context.diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "EXCEPTION_OUTSIDE_SEGMENT",
          severity: "error",
          source: item.exception.source,
          message: "Exception references a row/position outside normalized segments.",
          entity_refs: {
            exception_key: item.exception.exception_key,
            row_number: item.exception.location.row_number,
            position_in_row: item.exception.location.position_in_row,
          },
        }),
      );
      continue;
    }

    applyExceptionToPosition(existing, item, context);
  }
}

function applyExceptionToPosition(
  target: PositionWorkItem,
  item: ExceptionWorkItem,
  context: NormalizerContext,
) {
  const { exception } = item;

  target.position.exception_key = exception.exception_key;
  target.position.source = exception.source;

  if (exception.exception_type === "missing_tree") {
    target.position.planned_action = "skip_missing";
    target.position.tree = null;
    target.position.import_only = {
      ...target.position.import_only,
      raw_values: item.raw_values,
    };
    return;
  }

  const baseTree = target.position.tree ?? target.segment.tree_defaults;
  const overridden = applyOverrideToTree(baseTree, exception.override);

  if (exception.exception_type === "dead_tree") {
    overridden.condition_status = "critical";
  }

  target.position.tree = overridden;
  target.position.import_only = {
    ...target.position.import_only,
    variety_confidence:
      exception.override.variety?.status ??
      exception.override.variety_confidence ??
      target.position.import_only.variety_confidence,
    raw_values: item.raw_values,
  };

  if (exception.exception_type === "notes_only") {
    target.position.tree.notes =
      exception.override.notes ?? target.position.tree.notes;
  }

  if (!isExceptionOverrideExpected(exception.exception_type, exception.override)) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_REQUIRED_VALUE",
        severity: "warning",
        source: exception.source,
        message: "Exception has no normalized override fields for its type.",
        entity_refs: { exception_key: exception.exception_key },
      }),
    );
  }
}

function buildReplacementOutsideSegment(
  item: ExceptionWorkItem,
  context: NormalizerContext,
): PositionWorkItem {
  const exception = item.exception;
  const fallbackVariety = normalizeVarietyReference(
    item.raw_values,
    {
      sheet: exception.source.sheet,
      row_number: exception.source.row_number,
      row_key: exception.exception_key,
      raw_values: item.raw_values,
      cells: [],
    },
    context,
    { allow_empty_known: true },
  );
  const fallbackTree: TreeInventoryTreeDefaults = {
    species: exception.override.species ?? "",
    variety_id: exception.override.variety_id ?? fallbackVariety.resolved_variety_id,
    variety_name: exception.override.variety_name ?? fallbackVariety.raw_name,
    variety: exception.override.variety ?? fallbackVariety,
    condition_status: exception.override.condition_status ?? "good",
    planted_at: exception.override.planted_at ?? null,
    rootstock: exception.override.rootstock ?? null,
    pollinator_info: exception.override.pollinator_info ?? null,
    location_verified: exception.override.location_verified ?? false,
    notes: exception.override.notes ?? null,
  };

  return {
    segment: {
      source: exception.source,
      segment_key: exception.segment_key ?? `replacement:${exception.exception_key}`,
      location: {
        plot_id: context.plot_id,
        section_name: exception.location.section_name,
        row_number: exception.location.row_number,
        from_position: exception.location.position_in_row,
        to_position: exception.location.position_in_row,
      },
      tree_defaults: fallbackTree,
      import_only: {
        variety_confidence: fallbackTree.variety.status,
        planted_year: exception.override.planted_year ?? null,
        planted_year_from: exception.override.planted_year_from ?? null,
        planted_year_to: exception.override.planted_year_to ?? null,
        raw_values: item.raw_values,
      },
    },
    position: {
      source: exception.source,
      segment_key: exception.segment_key ?? `replacement:${exception.exception_key}`,
      exception_key: exception.exception_key,
      location: exception.location,
      planned_action: "create_tree",
      tree: fallbackTree,
      import_only: {
        variety_confidence: fallbackTree.variety.status,
        planted_year: exception.override.planted_year ?? null,
        planted_year_from: exception.override.planted_year_from ?? null,
        planted_year_to: exception.override.planted_year_to ?? null,
        raw_values: item.raw_values,
      },
    },
  };
}

function applyOverrideToTree(
  tree: TreeInventoryTreeDefaults,
  override: TreeInventoryExceptionOverride,
): TreeInventoryTreeDefaults {
  const variety = override.variety ?? tree.variety;

  return {
    ...tree,
    species: override.species ?? tree.species,
    variety_id: override.variety_id ?? variety.resolved_variety_id,
    variety_name: override.variety_name ?? variety.raw_name,
    variety,
    condition_status: override.condition_status ?? tree.condition_status,
    planted_at: override.planted_at ?? tree.planted_at,
    rootstock: override.rootstock ?? tree.rootstock,
    pollinator_info: override.pollinator_info ?? tree.pollinator_info,
    location_verified: override.location_verified ?? tree.location_verified,
    notes: override.notes ?? tree.notes,
  };
}

function isExceptionOverrideExpected(
  type: TreeInventoryExceptionType,
  override: TreeInventoryExceptionOverride,
) {
  if (type === "notes_only") {
    return override.notes != null;
  }

  if (type === "dead_tree" || type === "missing_tree") {
    return true;
  }

  if (type === "condition_override") {
    return override.condition_status != null;
  }

  return (
    override.species != null ||
    override.variety != null ||
    override.condition_status != null
  );
}

function parsePositiveInteger(
  value: TreeInventoryJsonValue | undefined,
  row: TreeInventoryParsedRow,
  column: string,
  context: NormalizerContext,
) {
  const integer = parseInteger(value);

  if (integer == null || integer < 1) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_INTEGER",
        severity: "error",
        source: sourceFor(row, column, value),
        message: "Expected a positive integer value.",
      }),
    );

    return null;
  }

  return integer;
}

function parsePlantingYear(
  value: TreeInventoryJsonValue | undefined,
  row: TreeInventoryParsedRow,
  column: string,
  context: NormalizerContext,
) {
  const year = normalizePlantingYearValue(value);

  if (year == null) {
    context.diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_INTEGER",
        severity: "error",
        source: sourceFor(row, column, value),
        message: "Expected planting year as an integer.",
      }),
    );
  }

  return year;
}

function normalizePlantingYearValue(value: TreeInventoryJsonValue | undefined) {
  const year = parseInteger(value);

  if (year == null || year < 1) {
    return null;
  }

  return year;
}

function normalizeDate(
  value: TreeInventoryJsonValue | undefined,
  row: TreeInventoryParsedRow,
  column: string,
  context: NormalizerContext,
) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value === "string") {
    const timestamp = Date.parse(value);

    if (!Number.isNaN(timestamp)) {
      return new Date(timestamp).toISOString().slice(0, 10);
    }
  }

  context.diagnostics.push(
    createTreeInventoryDiagnostic({
      code: "INVALID_DATE",
      severity: "error",
      source: sourceFor(row, column, value),
      message: "Expected an ISO-compatible date value.",
    }),
  );

  return null;
}

function normalizeBoolean(value: TreeInventoryJsonValue | undefined) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (normalized === "true" || normalized === "tak" || normalized === "yes") {
      return true;
    }
  }

  return false;
}

function parseInteger(value: TreeInventoryJsonValue | undefined) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function normalizeText(value: TreeInventoryJsonValue | undefined) {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }

  const text = String(value).trim();

  return text.length > 0 ? text : null;
}

function sourceFor(
  row: TreeInventoryParsedRow,
  column: string,
  rawValue: TreeInventoryJsonValue | undefined,
) {
  return {
    sheet: row.sheet,
    row_number: row.row_number,
    column,
    raw_value: rawValue ?? null,
  };
}

function toRowSource(row: TreeInventoryParsedRow): TreeInventoryRowSource {
  return {
    sheet: row.sheet,
    row_number: row.row_number,
    row_key: row.row_key,
    raw_values: row.raw_values,
  };
}

function readMetadataText(
  parsed: TreeInventoryParsedWorkbook,
  field: TreeInventoryMetadataField,
) {
  return normalizeText(parsed.metadata.values[field]);
}

function normalizePlotLayoutType(value: string | null): PlotLayoutType {
  if (value === "mixed" || value === "irregular" || value === "rows") {
    return value;
  }

  return "rows";
}

function locationKey(rowNumber: number, positionInRow: number) {
  return `${rowNumber}:${positionInRow}`;
}

function compareExpandedPositions(
  first: PositionWorkItem,
  second: PositionWorkItem,
) {
  return (
    first.position.location.row_number - second.position.location.row_number ||
    first.position.location.position_in_row -
      second.position.location.position_in_row ||
    first.position.segment_key.localeCompare(second.position.segment_key)
  );
}

function removeUndefinedProperties<TObject extends Record<string, unknown>>(
  value: TObject,
) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  ) as TObject;
}
