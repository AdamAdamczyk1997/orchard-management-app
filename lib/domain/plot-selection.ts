import type {
  ActivityScopeInput,
  PlotLayoutType,
  TreeSummary,
} from "@/types/contracts";

export const PLOT_SELECTION_SCOPE_LIMIT = 20;
export const PLOT_SELECTION_QUERY_LENGTH_LIMIT = 2000;

export type PlotSelectionMode = "browse" | "select";

export type PlotSelectionCompressedScope = ActivityScopeInput & {
  key: string;
  label: string;
  selected_tree_ids: string[];
};

export type PlotSelectionCompressionResult = {
  input_tree_count: number;
  selected_tree_count: number;
  excluded_tree_ids: string[];
  cross_plot_selection_detected: boolean;
  scopes: PlotSelectionCompressedScope[];
  activity_scopes: ActivityScopeInput[];
  scope_count_limit: number;
  scope_count_limit_exceeded: boolean;
  query_string_length_limit: number;
  estimated_query_string_length: number;
  query_string_limit_exceeded: boolean;
  can_prefill_activity: boolean;
};

export type PlotSelectionActivityActionBlockReason =
  | "empty_selection"
  | "cross_plot_selection"
  | "scope_count_limit_exceeded"
  | "query_string_limit_exceeded"
  | "invalid_selection";

export type PlotSelectionActivityActionState = {
  status: "empty" | "blocked" | "ready";
  can_start_activity: boolean;
  block_reason: PlotSelectionActivityActionBlockReason | null;
};

export type PlotSelectionRangeError =
  | "unsupported_layout"
  | "missing_location"
  | "different_plot"
  | "different_row"
  | "empty_range";

export type PlotSelectionRangeResult =
  | {
      ok: true;
      trees: TreeSummary[];
    }
  | {
      ok: false;
      error: PlotSelectionRangeError;
      trees: TreeSummary[];
    };

type CompressionOptions = {
  max_scopes?: number;
  max_query_string_length?: number;
};

type CompressionInput = {
  layout_type: PlotLayoutType;
  trees: TreeSummary[];
};

type SameRowRangeInput = {
  layout_type: PlotLayoutType;
  trees: TreeSummary[];
  start_tree: TreeSummary;
  end_tree: TreeSummary;
};

type LocatedTree = {
  tree: TreeSummary;
  section_name: string | undefined;
  row_number: number;
  position_in_row: number;
};

function getTreeDisplayName(tree: TreeSummary) {
  return tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`;
}

function normalizeSectionName(sectionName?: string | null) {
  const trimmed = sectionName?.trim();

  return trimmed || undefined;
}

function hasCompleteGridLocation(tree: TreeSummary) {
  return (
    typeof tree.row_number === "number" &&
    typeof tree.position_in_row === "number"
  );
}

export function isSelectablePlotSelectionTree(tree: TreeSummary) {
  return tree.is_active && tree.condition_status !== "removed";
}

function sortTreesForSelection(left: TreeSummary, right: TreeSummary) {
  const sectionDiff = (left.section_name ?? "").localeCompare(
    right.section_name ?? "",
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

  return getTreeDisplayName(left).localeCompare(getTreeDisplayName(right), "pl");
}

function buildLocatedTree(tree: TreeSummary): LocatedTree | null {
  if (!hasCompleteGridLocation(tree)) {
    return null;
  }

  const rowNumber = tree.row_number;
  const positionInRow = tree.position_in_row;

  if (typeof rowNumber !== "number" || typeof positionInRow !== "number") {
    return null;
  }

  return {
    tree,
    section_name: normalizeSectionName(tree.section_name),
    row_number: rowNumber,
    position_in_row: positionInRow,
  };
}

function buildGroupKey(tree: LocatedTree) {
  return `${tree.section_name ?? ""}::${tree.row_number}`;
}

function createRangeError(error: PlotSelectionRangeError): PlotSelectionRangeResult {
  return {
    ok: false,
    error,
    trees: [],
  };
}

function stripPlotSelectionScope(
  scope: PlotSelectionCompressedScope,
): ActivityScopeInput {
  return {
    scope_order: scope.scope_order,
    scope_level: scope.scope_level,
    section_name: scope.section_name,
    row_number: scope.row_number,
    from_position: scope.from_position,
    to_position: scope.to_position,
    tree_id: scope.tree_id,
    notes: scope.notes,
  };
}

function estimateQueryStringLength(scopes: ActivityScopeInput[]) {
  return `scopes=${encodeURIComponent(JSON.stringify(scopes))}`.length;
}

function buildLocationRangeLabel(scope: {
  section_name?: string;
  row_number?: number;
  from_position?: number;
  to_position?: number;
}) {
  const parts = [
    scope.section_name ? `Sekcja ${scope.section_name}` : null,
    typeof scope.row_number === "number" ? `Rzad ${scope.row_number}` : null,
    typeof scope.from_position === "number" &&
    typeof scope.to_position === "number"
      ? scope.from_position === scope.to_position
        ? `pozycja ${scope.from_position}`
        : `pozycje ${scope.from_position}-${scope.to_position}`
      : null,
  ].filter(Boolean);

  return parts.join(", ");
}

function createTreeScope(
  tree: TreeSummary,
  scopeOrder: number,
): PlotSelectionCompressedScope {
  return {
    key: `tree:${tree.id}`,
    label: getTreeDisplayName(tree),
    scope_order: scopeOrder,
    scope_level: "tree",
    tree_id: tree.id,
    selected_tree_ids: [tree.id],
  };
}

function createLocationRangeScope(input: {
  section_name: string | undefined;
  row_number: number;
  from_position: number;
  to_position: number;
  selected_tree_ids: string[];
  scope_order: number;
}): PlotSelectionCompressedScope {
  return {
    key: `range:${input.section_name ?? ""}:${input.row_number}:${input.from_position}:${input.to_position}`,
    label: buildLocationRangeLabel(input),
    scope_order: input.scope_order,
    scope_level: "location_range",
    section_name: input.section_name,
    row_number: input.row_number,
    from_position: input.from_position,
    to_position: input.to_position,
    selected_tree_ids: input.selected_tree_ids,
  };
}

function compressLocatedTrees(locatedTrees: LocatedTree[]) {
  const scopes: Omit<PlotSelectionCompressedScope, "scope_order">[] = [];
  const groups = new Map<string, LocatedTree[]>();

  for (const locatedTree of locatedTrees) {
    const groupKey = buildGroupKey(locatedTree);
    const group = groups.get(groupKey) ?? [];

    group.push(locatedTree);
    groups.set(groupKey, group);
  }

  for (const group of [...groups.values()].sort((left, right) => {
    const [leftFirst] = left;
    const [rightFirst] = right;

    if (!leftFirst || !rightFirst) {
      return 0;
    }

    const sectionDiff = (leftFirst.section_name ?? "").localeCompare(
      rightFirst.section_name ?? "",
      "pl",
    );

    if (sectionDiff !== 0) {
      return sectionDiff;
    }

    return leftFirst.row_number - rightFirst.row_number;
  })) {
    const sortedGroup = [...group].sort(
      (left, right) =>
        left.position_in_row - right.position_in_row ||
        getTreeDisplayName(left.tree).localeCompare(
          getTreeDisplayName(right.tree),
          "pl",
        ),
    );
    let current:
      | {
          section_name: string | undefined;
          row_number: number;
          from_position: number;
          to_position: number;
          selected_tree_ids: string[];
        }
      | null = null;

    for (const locatedTree of sortedGroup) {
      if (
        current &&
        locatedTree.position_in_row <= current.to_position + 1
      ) {
        current.to_position = Math.max(
          current.to_position,
          locatedTree.position_in_row,
        );
        current.selected_tree_ids.push(locatedTree.tree.id);
        continue;
      }

      if (current) {
        scopes.push({
          ...createLocationRangeScope({
            ...current,
            scope_order: scopes.length + 1,
          }),
        });
      }

      current = {
        section_name: locatedTree.section_name,
        row_number: locatedTree.row_number,
        from_position: locatedTree.position_in_row,
        to_position: locatedTree.position_in_row,
        selected_tree_ids: [locatedTree.tree.id],
      };
    }

    if (current) {
      scopes.push({
        ...createLocationRangeScope({
          ...current,
          scope_order: scopes.length + 1,
        }),
      });
    }
  }

  return scopes;
}

export function buildSameRowPlotSelectionRange(
  input: SameRowRangeInput,
): PlotSelectionRangeResult {
  if (input.layout_type === "irregular") {
    return createRangeError("unsupported_layout");
  }

  const startLocation = buildLocatedTree(input.start_tree);
  const endLocation = buildLocatedTree(input.end_tree);

  if (!startLocation || !endLocation) {
    return createRangeError("missing_location");
  }

  if (input.start_tree.plot_id !== input.end_tree.plot_id) {
    return createRangeError("different_plot");
  }

  if (
    startLocation.section_name !== endLocation.section_name ||
    startLocation.row_number !== endLocation.row_number
  ) {
    return createRangeError("different_row");
  }

  const fromPosition = Math.min(
    startLocation.position_in_row,
    endLocation.position_in_row,
  );
  const toPosition = Math.max(
    startLocation.position_in_row,
    endLocation.position_in_row,
  );
  const trees = input.trees
    .filter((tree) => tree.plot_id === input.start_tree.plot_id)
    .map((tree) => buildLocatedTree(tree))
    .filter((tree): tree is LocatedTree => {
      if (!tree) {
        return false;
      }

      return (
        tree.section_name === startLocation.section_name &&
        tree.row_number === startLocation.row_number &&
        tree.position_in_row >= fromPosition &&
        tree.position_in_row <= toPosition &&
        isSelectablePlotSelectionTree(tree.tree)
      );
    })
    .sort((left, right) => left.position_in_row - right.position_in_row)
    .map((tree) => tree.tree);

  if (trees.length === 0) {
    return createRangeError("empty_range");
  }

  return {
    ok: true,
    trees,
  };
}

export function getPlotSelectionActivityActionState(
  compression: PlotSelectionCompressionResult,
): PlotSelectionActivityActionState {
  if (compression.selected_tree_count === 0) {
    return {
      status: "empty",
      can_start_activity: false,
      block_reason: "empty_selection",
    };
  }

  if (compression.cross_plot_selection_detected) {
    return {
      status: "blocked",
      can_start_activity: false,
      block_reason: "cross_plot_selection",
    };
  }

  if (compression.scope_count_limit_exceeded) {
    return {
      status: "blocked",
      can_start_activity: false,
      block_reason: "scope_count_limit_exceeded",
    };
  }

  if (compression.query_string_limit_exceeded) {
    return {
      status: "blocked",
      can_start_activity: false,
      block_reason: "query_string_limit_exceeded",
    };
  }

  if (!compression.can_prefill_activity) {
    return {
      status: "blocked",
      can_start_activity: false,
      block_reason: "invalid_selection",
    };
  }

  return {
    status: "ready",
    can_start_activity: true,
    block_reason: null,
  };
}

export function compressPlotSelectionToActivityScopes(
  input: CompressionInput,
  options: CompressionOptions = {},
): PlotSelectionCompressionResult {
  const scopeLimit = options.max_scopes ?? PLOT_SELECTION_SCOPE_LIMIT;
  const queryLengthLimit =
    options.max_query_string_length ?? PLOT_SELECTION_QUERY_LENGTH_LIMIT;
  const selectableTrees = [...input.trees]
    .filter(isSelectablePlotSelectionTree)
    .sort(sortTreesForSelection);
  const excludedTreeIds = input.trees
    .filter((tree) => !isSelectablePlotSelectionTree(tree))
    .map((tree) => tree.id);
  const plotIds = new Set(selectableTrees.map((tree) => tree.plot_id));
  const crossPlotSelectionDetected = plotIds.size > 1;
  const locatedTrees: LocatedTree[] = [];
  const treeScopeTrees: TreeSummary[] = [];

  for (const tree of selectableTrees) {
    const locatedTree = buildLocatedTree(tree);

    if (input.layout_type !== "irregular" && locatedTree) {
      locatedTrees.push(locatedTree);
      continue;
    }

    treeScopeTrees.push(tree);
  }

  const rangeScopes = compressLocatedTrees(locatedTrees);
  const treeScopes = treeScopeTrees.map((tree, index) =>
    createTreeScope(tree, rangeScopes.length + index + 1),
  );
  const scopes = [...rangeScopes, ...treeScopes].map((scope, index) => ({
    ...scope,
    scope_order: index + 1,
  }));
  const activityScopes = scopes.map(stripPlotSelectionScope);
  const estimatedQueryStringLength = estimateQueryStringLength(activityScopes);
  const scopeCountLimitExceeded = scopes.length > scopeLimit;
  const queryStringLimitExceeded =
    estimatedQueryStringLength > queryLengthLimit;

  return {
    input_tree_count: input.trees.length,
    selected_tree_count: selectableTrees.length,
    excluded_tree_ids: excludedTreeIds,
    cross_plot_selection_detected: crossPlotSelectionDetected,
    scopes,
    activity_scopes: activityScopes,
    scope_count_limit: scopeLimit,
    scope_count_limit_exceeded: scopeCountLimitExceeded,
    query_string_length_limit: queryLengthLimit,
    estimated_query_string_length: estimatedQueryStringLength,
    query_string_limit_exceeded: queryStringLimitExceeded,
    can_prefill_activity:
      selectableTrees.length > 0 &&
      !crossPlotSelectionDetected &&
      !scopeCountLimitExceeded &&
      !queryStringLimitExceeded,
  };
}
