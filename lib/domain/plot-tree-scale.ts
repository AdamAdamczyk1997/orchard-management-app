import type {
  PlotTreeScaleClass,
  PlotTreeScaleProfile,
  PlotTreeScaleRowSummary,
  PlotTreeScaleSectionSummary,
  TreeConditionStatus,
} from "@/types/contracts";

export const PLOT_TREE_SCALE_SMALL_MAX = 200;
export const PLOT_TREE_SCALE_MEDIUM_MAX = 800;
export const PLOT_TREE_SCALE_ROW_PREVIEW_LIMIT = 60;

export type PlotTreeScaleSourceRow = {
  id: string;
  plot_id: string;
  section_name: string | null;
  row_number: number | null;
  position_in_row: number | null;
  condition_status: TreeConditionStatus;
  location_verified: boolean;
  is_active: boolean;
};

type MutableRowSummary = PlotTreeScaleRowSummary & {
  positionSet: Set<number>;
  activeLocationCounts: Map<number, number>;
};

type MutableSectionSummary = PlotTreeScaleSectionSummary & {
  rowNumbers: Set<number>;
};

function normalizeSectionName(sectionName: string | null) {
  const trimmed = sectionName?.trim();

  return trimmed ? trimmed : null;
}

function buildSectionKey(sectionName: string | null) {
  return sectionName ?? "";
}

function buildRowKey(sectionName: string | null, rowNumber: number) {
  return `${sectionName ?? ""}::${rowNumber}`;
}

function buildLocationKey(rowNumber: number, position: number) {
  return `${rowNumber}::${position}`;
}

function hasCompleteLocation(row: PlotTreeScaleSourceRow) {
  return (
    typeof row.row_number === "number" &&
    typeof row.position_in_row === "number"
  );
}

function isActiveTree(row: PlotTreeScaleSourceRow) {
  return row.is_active && row.condition_status !== "removed";
}

function createMutableRowSummary(options: {
  key: string;
  sectionName: string | null;
  rowNumber: number;
}): MutableRowSummary {
  return {
    key: options.key,
    section_name: options.sectionName,
    row_number: options.rowNumber,
    total_trees: 0,
    active_trees: 0,
    removed_or_inactive_trees: 0,
    warning_trees: 0,
    critical_trees: 0,
    unverified_trees: 0,
    occupied_positions: 0,
    from_position: null,
    to_position: null,
    missing_positions_in_span: 0,
    duplicate_active_locations: 0,
    positionSet: new Set<number>(),
    activeLocationCounts: new Map<number, number>(),
  };
}

function createMutableSectionSummary(options: {
  key: string;
  sectionName: string | null;
}): MutableSectionSummary {
  return {
    key: options.key,
    section_name: options.sectionName,
    row_count: 0,
    total_trees: 0,
    active_trees: 0,
    removed_or_inactive_trees: 0,
    warning_trees: 0,
    critical_trees: 0,
    unverified_trees: 0,
    from_row_number: null,
    to_row_number: null,
    duplicate_active_locations: 0,
    rowNumbers: new Set<number>(),
  };
}

function compareNullableText(left: string | null, right: string | null) {
  return (left ?? "").localeCompare(right ?? "", "pl");
}

function sortRows(
  left: PlotTreeScaleRowSummary,
  right: PlotTreeScaleRowSummary,
) {
  const sectionDiff = compareNullableText(left.section_name, right.section_name);

  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  return left.row_number - right.row_number;
}

function sortSections(
  left: PlotTreeScaleSectionSummary,
  right: PlotTreeScaleSectionSummary,
) {
  return compareNullableText(left.section_name, right.section_name);
}

export function classifyPlotTreeScale(totalTrees: number): PlotTreeScaleClass {
  if (totalTrees <= PLOT_TREE_SCALE_SMALL_MAX) {
    return "small";
  }

  if (totalTrees <= PLOT_TREE_SCALE_MEDIUM_MAX) {
    return "medium";
  }

  return "large";
}

export function shouldRenderFullPlotVisual(totalTrees: number) {
  return classifyPlotTreeScale(totalTrees) === "small";
}

export function buildPlotTreeScaleProfile(
  plotId: string,
  rows: PlotTreeScaleSourceRow[],
): PlotTreeScaleProfile {
  const rowSummariesByKey = new Map<string, MutableRowSummary>();
  const sectionSummariesByKey = new Map<string, MutableSectionSummary>();
  const activeLocationCounts = new Map<string, number>();
  let activeTrees = 0;
  let removedOrInactiveTrees = 0;
  let locatedTrees = 0;
  let unlocatedTrees = 0;
  let unverifiedTrees = 0;
  let warningTrees = 0;
  let criticalTrees = 0;

  for (const row of rows) {
    const active = isActiveTree(row);

    if (active) {
      activeTrees += 1;
    } else {
      removedOrInactiveTrees += 1;
    }

    if (!row.location_verified) {
      unverifiedTrees += 1;
    }

    if (row.condition_status === "warning") {
      warningTrees += 1;
    }

    if (row.condition_status === "critical") {
      criticalTrees += 1;
    }

    if (!hasCompleteLocation(row)) {
      unlocatedTrees += 1;
      continue;
    }

    const sectionName = normalizeSectionName(row.section_name);
    const rowNumber = row.row_number;
    const position = row.position_in_row;

    if (typeof rowNumber !== "number" || typeof position !== "number") {
      unlocatedTrees += 1;
      continue;
    }

    locatedTrees += 1;

    const rowKey = buildRowKey(sectionName, rowNumber);
    const rowSummary =
      rowSummariesByKey.get(rowKey) ??
      createMutableRowSummary({
        key: rowKey,
        sectionName,
        rowNumber,
      });

    rowSummary.total_trees += 1;
    rowSummary.positionSet.add(position);
    rowSummary.from_position =
      rowSummary.from_position === null
        ? position
        : Math.min(rowSummary.from_position, position);
    rowSummary.to_position =
      rowSummary.to_position === null
        ? position
        : Math.max(rowSummary.to_position, position);

    if (active) {
      rowSummary.active_trees += 1;
      rowSummary.activeLocationCounts.set(
        position,
        (rowSummary.activeLocationCounts.get(position) ?? 0) + 1,
      );

      const locationKey = buildLocationKey(rowNumber, position);
      activeLocationCounts.set(
        locationKey,
        (activeLocationCounts.get(locationKey) ?? 0) + 1,
      );
    } else {
      rowSummary.removed_or_inactive_trees += 1;
    }

    if (!row.location_verified) {
      rowSummary.unverified_trees += 1;
    }

    if (row.condition_status === "warning") {
      rowSummary.warning_trees += 1;
    }

    if (row.condition_status === "critical") {
      rowSummary.critical_trees += 1;
    }

    rowSummariesByKey.set(rowKey, rowSummary);

    const sectionKey = buildSectionKey(sectionName);
    const sectionSummary =
      sectionSummariesByKey.get(sectionKey) ??
      createMutableSectionSummary({
        key: sectionKey,
        sectionName,
      });

    sectionSummary.total_trees += 1;
    sectionSummary.rowNumbers.add(rowNumber);
    sectionSummary.from_row_number =
      sectionSummary.from_row_number === null
        ? rowNumber
        : Math.min(sectionSummary.from_row_number, rowNumber);
    sectionSummary.to_row_number =
      sectionSummary.to_row_number === null
        ? rowNumber
        : Math.max(sectionSummary.to_row_number, rowNumber);

    if (active) {
      sectionSummary.active_trees += 1;
    } else {
      sectionSummary.removed_or_inactive_trees += 1;
    }

    if (!row.location_verified) {
      sectionSummary.unverified_trees += 1;
    }

    if (row.condition_status === "warning") {
      sectionSummary.warning_trees += 1;
    }

    if (row.condition_status === "critical") {
      sectionSummary.critical_trees += 1;
    }

    sectionSummariesByKey.set(sectionKey, sectionSummary);
  }

  const rowsOutput = [...rowSummariesByKey.values()]
    .map((row): PlotTreeScaleRowSummary => {
      const fromPosition = row.from_position;
      const toPosition = row.to_position;
      const span =
        fromPosition === null || toPosition === null
          ? 0
          : toPosition - fromPosition + 1;
      const duplicateActiveLocations = [...row.activeLocationCounts.values()].filter(
        (count) => count > 1,
      ).length;

      return {
        key: row.key,
        section_name: row.section_name,
        row_number: row.row_number,
        total_trees: row.total_trees,
        active_trees: row.active_trees,
        removed_or_inactive_trees: row.removed_or_inactive_trees,
        warning_trees: row.warning_trees,
        critical_trees: row.critical_trees,
        unverified_trees: row.unverified_trees,
        occupied_positions: row.positionSet.size,
        from_position: fromPosition,
        to_position: toPosition,
        missing_positions_in_span: Math.max(0, span - row.positionSet.size),
        duplicate_active_locations: duplicateActiveLocations,
      };
    })
    .sort(sortRows);

  const duplicateActiveLocationCount = [...activeLocationCounts.values()].filter(
    (count) => count > 1,
  ).length;
  const duplicateLocationsBySectionKey = rowsOutput.reduce<Record<string, number>>(
    (accumulator, row) => {
      accumulator[row.section_name ?? ""] =
        (accumulator[row.section_name ?? ""] ?? 0) +
        row.duplicate_active_locations;

      return accumulator;
    },
    {},
  );
  const sectionsOutput = [...sectionSummariesByKey.values()]
    .map((section): PlotTreeScaleSectionSummary => ({
      key: section.key,
      section_name: section.section_name,
      row_count: section.rowNumbers.size,
      total_trees: section.total_trees,
      active_trees: section.active_trees,
      removed_or_inactive_trees: section.removed_or_inactive_trees,
      warning_trees: section.warning_trees,
      critical_trees: section.critical_trees,
      unverified_trees: section.unverified_trees,
      from_row_number: section.from_row_number,
      to_row_number: section.to_row_number,
      duplicate_active_locations: duplicateLocationsBySectionKey[section.key] ?? 0,
    }))
    .sort(sortSections);
  const maxRowLength = rowsOutput.reduce((max, row) => {
    if (row.from_position === null || row.to_position === null) {
      return max;
    }

    return Math.max(max, row.to_position - row.from_position + 1);
  }, 0);
  const scaleClass = classifyPlotTreeScale(rows.length);

  return {
    plot_id: plotId,
    scale_class: scaleClass,
    should_render_full_visual: shouldRenderFullPlotVisual(rows.length),
    total_trees: rows.length,
    active_trees: activeTrees,
    removed_or_inactive_trees: removedOrInactiveTrees,
    located_trees: locatedTrees,
    unlocated_trees: unlocatedTrees,
    unverified_trees: unverifiedTrees,
    warning_trees: warningTrees,
    critical_trees: criticalTrees,
    row_count: rowsOutput.length,
    max_row_length: maxRowLength,
    duplicate_active_location_count: duplicateActiveLocationCount,
    sections: sectionsOutput,
    rows: rowsOutput,
  };
}
