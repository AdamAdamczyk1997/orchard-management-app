import type {
  PlotLayoutType,
  PlotSummary,
  TreeConditionStatus,
  TreeSummary,
} from "@/types/contracts";

export type PlotVisualGridMode = "grid" | "fallback";

export type PlotVisualPositionKind =
  | "active_tree"
  | "removed_tree"
  | "empty_inferred";

export type PlotVisualWarningCode =
  | "IRREGULAR_LAYOUT"
  | "ROWS_MISSING_COORDINATES"
  | "MIXED_PARTIAL_COVERAGE"
  | "DUPLICATE_ACTIVE_LOCATION";

export type PlotVisualWarning = {
  code: PlotVisualWarningCode;
  message: string;
};

export type PlotVisualTreeLifecycleFilter = "all" | "active" | "removed";

export type PlotVisualLocationVerifiedFilter =
  | "all"
  | "verified"
  | "unverified";

export type PlotVisualTreeFilters = {
  lifecycle: PlotVisualTreeLifecycleFilter;
  variety_id: "all" | "unassigned" | string;
  condition_status: "all" | TreeConditionStatus;
  location_verified: PlotVisualLocationVerifiedFilter;
};

export const DEFAULT_PLOT_VISUAL_TREE_FILTERS: PlotVisualTreeFilters = {
  lifecycle: "all",
  variety_id: "all",
  condition_status: "all",
  location_verified: "all",
};

export type PlotVisualTreePosition = {
  kind: Exclude<PlotVisualPositionKind, "empty_inferred">;
  key: string;
  position: number;
  tree: TreeSummary;
  historical_trees: TreeSummary[];
  overlapping_active_trees: TreeSummary[];
};

export type PlotVisualEmptyPosition = {
  kind: "empty_inferred";
  key: string;
  position: number;
};

export type PlotVisualPosition =
  | PlotVisualTreePosition
  | PlotVisualEmptyPosition;

export type PlotVisualRow = {
  key: string;
  section_name: string | null;
  row_number: number;
  positions: PlotVisualPosition[];
  active_tree_count: number;
  removed_tree_count: number;
  empty_position_count: number;
  unverified_tree_count: number;
};

export type PlotVisualSection = {
  key: string;
  section_name: string | null;
  rows: PlotVisualRow[];
};

export type PlotVisualGrid = {
  mode: PlotVisualGridMode;
  layout_type: PlotLayoutType;
  sections: PlotVisualSection[];
  unlocated_trees: TreeSummary[];
  warnings: PlotVisualWarning[];
  total_tree_count: number;
  renderable_tree_count: number;
};

type PlotVisualGridPlot = Pick<PlotSummary, "layout_type">;

type LocationBucket = {
  section_name: string | null;
  row_number: number;
  treesByPosition: Map<number, TreeSummary[]>;
};

function hasCompleteGridLocation(tree: TreeSummary) {
  return (
    typeof tree.row_number === "number" &&
    typeof tree.position_in_row === "number"
  );
}

function isActiveTree(tree: TreeSummary) {
  return tree.is_active && tree.condition_status !== "removed";
}

export function hasActivePlotVisualTreeFilters(
  filters: PlotVisualTreeFilters,
) {
  return (
    filters.lifecycle !== DEFAULT_PLOT_VISUAL_TREE_FILTERS.lifecycle ||
    filters.variety_id !== DEFAULT_PLOT_VISUAL_TREE_FILTERS.variety_id ||
    filters.condition_status !==
      DEFAULT_PLOT_VISUAL_TREE_FILTERS.condition_status ||
    filters.location_verified !==
      DEFAULT_PLOT_VISUAL_TREE_FILTERS.location_verified
  );
}

function matchesPlotVisualLifecycleFilter(
  tree: TreeSummary,
  filter: PlotVisualTreeLifecycleFilter,
) {
  switch (filter) {
    case "active":
      return isActiveTree(tree);
    case "removed":
      return !isActiveTree(tree);
    default:
      return true;
  }
}

function matchesPlotVisualVarietyFilter(
  tree: TreeSummary,
  filter: PlotVisualTreeFilters["variety_id"],
) {
  if (filter === "all") {
    return true;
  }

  if (filter === "unassigned") {
    return !tree.variety_id;
  }

  return tree.variety_id === filter;
}

function matchesPlotVisualLocationVerifiedFilter(
  tree: TreeSummary,
  filter: PlotVisualLocationVerifiedFilter,
) {
  switch (filter) {
    case "verified":
      return tree.location_verified;
    case "unverified":
      return !tree.location_verified;
    default:
      return true;
  }
}

export function filterPlotVisualTrees(
  trees: TreeSummary[],
  filters: PlotVisualTreeFilters,
) {
  return trees.filter(
    (tree) =>
      matchesPlotVisualLifecycleFilter(tree, filters.lifecycle) &&
      matchesPlotVisualVarietyFilter(tree, filters.variety_id) &&
      (filters.condition_status === "all" ||
        tree.condition_status === filters.condition_status) &&
      matchesPlotVisualLocationVerifiedFilter(tree, filters.location_verified),
  );
}

function normalizeSectionName(sectionName?: string | null) {
  const trimmed = sectionName?.trim();

  return trimmed ? trimmed : null;
}

function getSectionSortValue(sectionName: string | null) {
  return sectionName ?? "";
}

function sortTreesForVisualGrid(left: TreeSummary, right: TreeSummary) {
  const sectionDiff = getSectionSortValue(left.section_name ?? null).localeCompare(
    getSectionSortValue(right.section_name ?? null),
  );

  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  const rowDiff =
    (left.row_number ?? Number.MAX_SAFE_INTEGER) -
    (right.row_number ?? Number.MAX_SAFE_INTEGER);

  if (rowDiff !== 0) {
    return rowDiff;
  }

  const positionDiff =
    (left.position_in_row ?? Number.MAX_SAFE_INTEGER) -
    (right.position_in_row ?? Number.MAX_SAFE_INTEGER);

  if (positionDiff !== 0) {
    return positionDiff;
  }

  return (left.tree_code ?? left.display_name ?? left.id).localeCompare(
    right.tree_code ?? right.display_name ?? right.id,
  );
}

function buildBucketKey(sectionName: string | null, rowNumber: number) {
  return `${sectionName ?? ""}::${rowNumber}`;
}

function buildPositionKey(
  sectionName: string | null,
  rowNumber: number,
  position: number,
) {
  return `${sectionName ?? "none"}:${rowNumber}:${position}`;
}

function pickVisibleTree(trees: TreeSummary[]) {
  const sortedTrees = [...trees].sort(sortTreesForVisualGrid);
  const activeTrees = sortedTrees.filter(isActiveTree);
  const visibleTree = activeTrees[0] ?? sortedTrees[0];

  return {
    visibleTree,
    activeTrees,
    historicalTrees: sortedTrees.filter((tree) => tree.id !== visibleTree?.id),
  };
}

function createWarnings(options: {
  layoutType: PlotLayoutType;
  unlocatedTreesCount: number;
  duplicateActiveLocationCount: number;
}) {
  const warnings: PlotVisualWarning[] = [];

  if (options.layoutType === "irregular") {
    warnings.push({
      code: "IRREGULAR_LAYOUT",
      message:
        "Ta dzialka ma uklad nieregularny, wiec MVP nie renderuje dla niej siatki rzedowej.",
    });
  }

  if (options.layoutType === "rows" && options.unlocatedTreesCount > 0) {
    warnings.push({
      code: "ROWS_MISSING_COORDINATES",
      message:
        "Czesc drzew nie ma kompletnego numeru rzedu i pozycji, mimo ze dzialka ma uklad rzedowy.",
    });
  }

  if (options.layoutType === "mixed") {
    warnings.push({
      code: "MIXED_PARTIAL_COVERAGE",
      message:
        "Dzialka mieszana pokazuje siatke tylko dla drzew z kompletna lokalizacja rzedowa.",
    });
  }

  if (options.duplicateActiveLocationCount > 0) {
    warnings.push({
      code: "DUPLICATE_ACTIVE_LOCATION",
      message:
        "Wykryto wiecej niz jedno aktywne drzewo w tej samej logicznej lokalizacji.",
    });
  }

  return warnings;
}

export function buildPlotVisualGrid(
  plot: PlotVisualGridPlot,
  trees: TreeSummary[],
): PlotVisualGrid {
  const sortedTrees = [...trees].sort(sortTreesForVisualGrid);

  if (plot.layout_type === "irregular") {
    return {
      mode: "fallback",
      layout_type: plot.layout_type,
      sections: [],
      unlocated_trees: sortedTrees,
      warnings: createWarnings({
        layoutType: plot.layout_type,
        unlocatedTreesCount: sortedTrees.length,
        duplicateActiveLocationCount: 0,
      }),
      total_tree_count: sortedTrees.length,
      renderable_tree_count: 0,
    };
  }

  const buckets = new Map<string, LocationBucket>();
  const unlocatedTrees: TreeSummary[] = [];
  const activeLogicalLocationCounts = new Map<string, number>();

  for (const tree of sortedTrees) {
    if (!hasCompleteGridLocation(tree)) {
      unlocatedTrees.push(tree);
      continue;
    }

    const sectionName = normalizeSectionName(tree.section_name);
    const rowNumber = tree.row_number;
    const position = tree.position_in_row;

    if (typeof rowNumber !== "number" || typeof position !== "number") {
      unlocatedTrees.push(tree);
      continue;
    }

    const bucketKey = buildBucketKey(sectionName, rowNumber);
    const bucket =
      buckets.get(bucketKey) ??
      ({
        section_name: sectionName,
        row_number: rowNumber,
        treesByPosition: new Map<number, TreeSummary[]>(),
      } satisfies LocationBucket);

    const positionTrees = bucket.treesByPosition.get(position) ?? [];
    positionTrees.push(tree);
    bucket.treesByPosition.set(position, positionTrees);
    buckets.set(bucketKey, bucket);

    if (isActiveTree(tree)) {
      const logicalLocationKey = `${rowNumber}:${position}`;
      activeLogicalLocationCounts.set(
        logicalLocationKey,
        (activeLogicalLocationCounts.get(logicalLocationKey) ?? 0) + 1,
      );
    }
  }

  const duplicateActiveLocationCount = [
    ...activeLogicalLocationCounts.values(),
  ].filter((count) => count > 1).length;
  const rows = [...buckets.values()]
    .sort((left, right) => {
      const sectionDiff = getSectionSortValue(left.section_name).localeCompare(
        getSectionSortValue(right.section_name),
      );

      if (sectionDiff !== 0) {
        return sectionDiff;
      }

      return left.row_number - right.row_number;
    })
    .map((bucket): PlotVisualRow => {
      const occupiedPositions = [...bucket.treesByPosition.keys()].sort(
        (left, right) => left - right,
      );
      const minPosition = occupiedPositions[0] ?? 0;
      const maxPosition = occupiedPositions.at(-1) ?? 0;
      const positions: PlotVisualPosition[] = [];

      for (let position = minPosition; position <= maxPosition; position += 1) {
        const treesAtPosition = bucket.treesByPosition.get(position);

        if (!treesAtPosition) {
          positions.push({
            kind: "empty_inferred",
            key: buildPositionKey(bucket.section_name, bucket.row_number, position),
            position,
          });
          continue;
        }

        const { visibleTree, activeTrees, historicalTrees } =
          pickVisibleTree(treesAtPosition);

        if (!visibleTree) {
          continue;
        }

        positions.push({
          kind: isActiveTree(visibleTree) ? "active_tree" : "removed_tree",
          key: buildPositionKey(bucket.section_name, bucket.row_number, position),
          position,
          tree: visibleTree,
          historical_trees: historicalTrees,
          overlapping_active_trees: activeTrees.filter(
            (tree) => tree.id !== visibleTree.id,
          ),
        });
      }

      return {
        key: buildBucketKey(bucket.section_name, bucket.row_number),
        section_name: bucket.section_name,
        row_number: bucket.row_number,
        positions,
        active_tree_count: positions.filter(
          (position) => position.kind === "active_tree",
        ).length,
        removed_tree_count: positions.filter(
          (position) => position.kind === "removed_tree",
        ).length,
        empty_position_count: positions.filter(
          (position) => position.kind === "empty_inferred",
        ).length,
        unverified_tree_count: positions.filter(
          (position) =>
            position.kind !== "empty_inferred" && !position.tree.location_verified,
        ).length,
      };
    });

  const sectionsMap = new Map<string, PlotVisualSection>();

  for (const row of rows) {
    const sectionKey = row.section_name ?? "";
    const section =
      sectionsMap.get(sectionKey) ??
      ({
        key: sectionKey,
        section_name: row.section_name,
        rows: [],
      } satisfies PlotVisualSection);

    section.rows.push(row);
    sectionsMap.set(sectionKey, section);
  }

  return {
    mode: "grid",
    layout_type: plot.layout_type,
    sections: [...sectionsMap.values()],
    unlocated_trees: unlocatedTrees,
    warnings: createWarnings({
      layoutType: plot.layout_type,
      unlocatedTreesCount: unlocatedTrees.length,
      duplicateActiveLocationCount,
    }),
    total_tree_count: sortedTrees.length,
    renderable_tree_count: sortedTrees.length - unlocatedTrees.length,
  };
}
