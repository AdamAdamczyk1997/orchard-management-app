import { buildPathWithSearchParams } from "@/lib/utils/search-params";
import type { ActivityScopeInput, TreeSummary } from "@/types/contracts";

export const BULK_DEACTIVATE_PREFILL_QUERY_PARAMS = {
  plot_id: "plot_id",
  row_number: "row_number",
  from_position: "from_position",
  to_position: "to_position",
} as const;

export const BULK_TREE_BATCH_PREFILL_QUERY_PARAMS = {
  plot_id: "plot_id",
  section_name: "section_name",
  row_number: "row_number",
  from_position: "from_position",
  to_position: "to_position",
} as const;

export type BulkDeactivateTreesPrefill = {
  plot_id: string;
  row_number: number;
  from_position: number;
  to_position: number;
};

export type BulkTreeBatchPrefill = {
  plot_id: string;
  section_name?: string | null;
  row_number: number;
  from_position: number;
  to_position: number;
};

export type PlotEmptyPositionSelection = {
  plot_id: string;
  section_name?: string | null;
  row_number: number;
  position: number;
};

export type PlotEmptyRangePosition = {
  position: number;
  kind: "empty_inferred" | "occupied";
};

export type BulkDeactivateTreesPrefillActionState =
  | {
      status: "empty";
      can_start: false;
      prefill: null;
      message: string;
    }
  | {
      status: "blocked";
      can_start: false;
      prefill: null;
      message: string;
    }
  | {
      status: "ready";
      can_start: true;
      prefill: BulkDeactivateTreesPrefill;
      message: string;
    };

export type BulkTreeBatchPrefillFromEmptyRangeResult =
  | {
      ok: true;
      prefill: BulkTreeBatchPrefill;
      message: string;
    }
  | {
      ok: false;
      prefill: null;
      message: string;
    };

type BulkDeactivateTreesPrefillFromSelectionInput = {
  selectedTrees: TreeSummary[];
  activityScopes: ActivityScopeInput[];
};

function isCompleteLocationRangeScope(
  scope: ActivityScopeInput | undefined,
): scope is ActivityScopeInput & {
  scope_level: "location_range";
  row_number: number;
  from_position: number;
  to_position: number;
} {
  return Boolean(
    scope &&
      scope.scope_level === "location_range" &&
    typeof scope.row_number === "number" &&
    typeof scope.from_position === "number" &&
      typeof scope.to_position === "number",
  );
}

function normalizeOptionalSectionName(sectionName: string | null | undefined) {
  return sectionName && sectionName.trim().length > 0 ? sectionName.trim() : null;
}

function hasSameSectionName(
  left: string | null | undefined,
  right: string | null | undefined,
) {
  return normalizeOptionalSectionName(left) === normalizeOptionalSectionName(right);
}

export function resolveBulkDeactivateTreesPrefillFromPlotSelection({
  selectedTrees,
  activityScopes,
}: BulkDeactivateTreesPrefillFromSelectionInput): BulkDeactivateTreesPrefillActionState {
  if (selectedTrees.length === 0) {
    return {
      status: "empty",
      can_start: false,
      prefill: null,
      message: "Zaznacz jeden zakres w rzedzie, aby przejsc do bulk deactivate.",
    };
  }

  const plotIds = new Set(selectedTrees.map((tree) => tree.plot_id));

  if (plotIds.size !== 1) {
    return {
      status: "blocked",
      can_start: false,
      prefill: null,
      message: "Bulk deactivate wymaga zaznaczenia w jednej dzialce.",
    };
  }

  if (activityScopes.length !== 1 || !isCompleteLocationRangeScope(activityScopes[0])) {
    return {
      status: "blocked",
      can_start: false,
      prefill: null,
      message: "Bulk deactivate w MVP obsluguje jeden zakres w jednym rzedzie.",
    };
  }

  const [scope] = activityScopes;
  const [plotId] = plotIds;

  if (!scope || !plotId) {
    return {
      status: "blocked",
      can_start: false,
      prefill: null,
      message: "Nie udalo sie przygotowac zakresu do bulk deactivate.",
    };
  }

  return {
    status: "ready",
    can_start: true,
    prefill: {
      plot_id: plotId,
      row_number: scope.row_number,
      from_position: scope.from_position,
      to_position: scope.to_position,
    },
    message: `Bulk deactivate: rzad ${scope.row_number}, pozycje ${scope.from_position}-${scope.to_position}.`,
  };
}

export function buildBulkTreeBatchPrefillFromEmptyRange({
  start,
  end,
  rowPositions,
}: {
  start: PlotEmptyPositionSelection;
  end: PlotEmptyPositionSelection;
  rowPositions: PlotEmptyRangePosition[];
}): BulkTreeBatchPrefillFromEmptyRangeResult {
  if (start.plot_id !== end.plot_id) {
    return {
      ok: false,
      prefill: null,
      message: "Plant New wymaga pustych miejsc w jednej dzialce.",
    };
  }

  if (
    start.row_number !== end.row_number ||
    !hasSameSectionName(start.section_name, end.section_name)
  ) {
    return {
      ok: false,
      prefill: null,
      message: "Plant New w MVP obsluguje jeden ciagly pusty zakres w jednym rzedzie.",
    };
  }

  const fromPosition = Math.min(start.position, end.position);
  const toPosition = Math.max(start.position, end.position);
  const positionsByNumber = new Map(
    rowPositions.map((position) => [position.position, position.kind]),
  );

  for (let position = fromPosition; position <= toPosition; position += 1) {
    if (positionsByNumber.get(position) !== "empty_inferred") {
      return {
        ok: false,
        prefill: null,
        message: "Plant New wymaga ciaglego zakresu pustych inferowanych miejsc.",
      };
    }
  }

  return {
    ok: true,
    prefill: {
      plot_id: start.plot_id,
      section_name: normalizeOptionalSectionName(start.section_name),
      row_number: start.row_number,
      from_position: fromPosition,
      to_position: toPosition,
    },
    message: `Plant New: rzad ${start.row_number}, pozycje ${fromPosition}-${toPosition}.`,
  };
}

export function buildBulkDeactivateTreesPrefillSearchParams(
  prefill: BulkDeactivateTreesPrefill,
) {
  const searchParams = new URLSearchParams();

  searchParams.set(BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.plot_id, prefill.plot_id);
  searchParams.set(
    BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.row_number,
    String(prefill.row_number),
  );
  searchParams.set(
    BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.from_position,
    String(prefill.from_position),
  );
  searchParams.set(
    BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.to_position,
    String(prefill.to_position),
  );

  return searchParams;
}

export function buildBulkTreeBatchPrefillSearchParams(
  prefill: BulkTreeBatchPrefill,
) {
  const searchParams = new URLSearchParams();

  searchParams.set(BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.plot_id, prefill.plot_id);

  if (prefill.section_name) {
    searchParams.set(
      BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.section_name,
      prefill.section_name,
    );
  }

  searchParams.set(
    BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.row_number,
    String(prefill.row_number),
  );
  searchParams.set(
    BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.from_position,
    String(prefill.from_position),
  );
  searchParams.set(
    BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.to_position,
    String(prefill.to_position),
  );

  return searchParams;
}

export function buildBulkDeactivateTreesPrefillHref(
  prefill: BulkDeactivateTreesPrefill,
) {
  return buildPathWithSearchParams(
    "/trees/batch/deactivate",
    buildBulkDeactivateTreesPrefillSearchParams(prefill),
  );
}

export function buildBulkTreeBatchPrefillHref(prefill: BulkTreeBatchPrefill) {
  return buildPathWithSearchParams(
    "/trees/batch/new",
    buildBulkTreeBatchPrefillSearchParams(prefill),
  );
}
