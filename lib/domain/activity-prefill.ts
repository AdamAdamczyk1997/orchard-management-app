import { buildPathWithSearchParams } from "@/lib/utils/search-params";
import type { ActivityScopeInput, TreeSummary } from "@/types/contracts";

export const ACTIVITY_PREFILL_QUERY_PARAMS = {
  plot_id: "plot_id",
  tree_id: "tree_id",
  scopes: "scopes",
} as const;

export type ActivityFormPrefill = {
  plot_id: string;
  tree_id?: string;
  scopes: ActivityScopeInput[];
};

type ActivityPrefillFromPlotSelectionInput = {
  selectedTrees: TreeSummary[];
  activityScopes: ActivityScopeInput[];
};

export function buildActivityPrefillFromPlotSelection({
  selectedTrees,
  activityScopes,
}: ActivityPrefillFromPlotSelectionInput): ActivityFormPrefill | null {
  if (selectedTrees.length === 0) {
    return null;
  }

  const plotIds = new Set(selectedTrees.map((tree) => tree.plot_id));

  if (plotIds.size !== 1) {
    return null;
  }

  const [firstTree] = selectedTrees;

  if (!firstTree) {
    return null;
  }

  if (selectedTrees.length === 1) {
    return {
      plot_id: firstTree.plot_id,
      tree_id: firstTree.id,
      scopes: [
        {
          scope_order: 1,
          scope_level: "tree",
          tree_id: firstTree.id,
        },
      ],
    };
  }

  return {
    plot_id: firstTree.plot_id,
    scopes: activityScopes,
  };
}

export function buildActivityPrefillSearchParams(prefill: ActivityFormPrefill) {
  const searchParams = new URLSearchParams();

  searchParams.set(ACTIVITY_PREFILL_QUERY_PARAMS.plot_id, prefill.plot_id);

  if (prefill.tree_id) {
    searchParams.set(ACTIVITY_PREFILL_QUERY_PARAMS.tree_id, prefill.tree_id);
  }

  if (prefill.scopes.length > 0) {
    searchParams.set(
      ACTIVITY_PREFILL_QUERY_PARAMS.scopes,
      JSON.stringify(prefill.scopes),
    );
  }

  return searchParams;
}

export function buildActivityPrefillHref(prefill: ActivityFormPrefill) {
  return buildPathWithSearchParams(
    "/activities/new",
    buildActivityPrefillSearchParams(prefill),
  );
}
