import { z } from "zod";
import {
  ACTIVITY_PREFILL_QUERY_PARAMS,
  type ActivityFormPrefill,
} from "@/lib/domain/activity-prefill";
import {
  PLOT_SELECTION_QUERY_LENGTH_LIMIT,
  PLOT_SELECTION_SCOPE_LIMIT,
} from "@/lib/domain/plot-selection";
import { supportsActivityScopeLevelForPlotLayout } from "@/lib/domain/plots";
import { getSingleSearchParam, type NextSearchParams } from "@/lib/utils/search-params";
import { activityScopeSchema } from "@/lib/validation/activities";
import type { ActivityScopeInput, PlotOption, TreeOption } from "@/types/contracts";

export type ActivityPrefillParseResult =
  | {
      status: "none";
      prefill: null;
      message: null;
    }
  | {
      status: "applied";
      prefill: ActivityFormPrefill;
      message: string;
    }
  | {
      status: "invalid";
      prefill: null;
      message: string;
    };

type ResolveActivityPrefillOptions = {
  plotOptions: PlotOption[];
  treeOptions: TreeOption[];
};

const uuidParamSchema = z.string().uuid();

function parseJsonArrayInput(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  if (trimmed === "") {
    return [];
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

const activityPrefillScopesSchema = z.preprocess(
  parseJsonArrayInput,
  z
    .array(activityScopeSchema)
    .max(
      PLOT_SELECTION_SCOPE_LIMIT,
      `Prefill moze zawierac maksymalnie ${PLOT_SELECTION_SCOPE_LIMIT} zakresow.`,
    ),
);

function none(): ActivityPrefillParseResult {
  return {
    status: "none",
    prefill: null,
    message: null,
  };
}

function invalid(message: string): ActivityPrefillParseResult {
  return {
    status: "invalid",
    prefill: null,
    message,
  };
}

function applied(prefill: ActivityFormPrefill): ActivityPrefillParseResult {
  return {
    status: "applied",
    prefill,
    message: "Zastosowano zakres z widoku dzialki.",
  };
}

function getPlotOption(plotOptions: PlotOption[], plotId: string) {
  return plotOptions.find((plot) => plot.id === plotId);
}

function getTreeOption(treeOptions: TreeOption[], treeId: string) {
  return treeOptions.find((tree) => tree.id === treeId);
}

function validateTreeForPrefill(
  treeOptions: TreeOption[],
  treeId: string,
  plotId: string,
) {
  const tree = getTreeOption(treeOptions, treeId);

  if (!tree || tree.plot_id !== plotId || !tree.is_active) {
    return false;
  }

  return true;
}

function normalizePrefillScopes(input: {
  scopes: ActivityScopeInput[];
  treeId?: string;
}) {
  if (input.scopes.length > 0) {
    return input.scopes.map((scope, index) => ({
      ...scope,
      scope_order: scope.scope_order ?? index + 1,
    }));
  }

  if (!input.treeId) {
    return [];
  }

  return [
    {
      scope_order: 1,
      scope_level: "tree",
      tree_id: input.treeId,
    } satisfies ActivityScopeInput,
  ];
}

export function resolveActivityPrefillFromSearchParams(
  searchParams: NextSearchParams,
  options: ResolveActivityPrefillOptions,
): ActivityPrefillParseResult {
  const plotIdParam = getSingleSearchParam(
    searchParams[ACTIVITY_PREFILL_QUERY_PARAMS.plot_id],
  );
  const treeIdParam = getSingleSearchParam(
    searchParams[ACTIVITY_PREFILL_QUERY_PARAMS.tree_id],
  );
  const scopesParam = getSingleSearchParam(
    searchParams[ACTIVITY_PREFILL_QUERY_PARAMS.scopes],
  );

  if (!plotIdParam && !treeIdParam && !scopesParam) {
    return none();
  }

  const parsedPlotId = plotIdParam
    ? uuidParamSchema.safeParse(plotIdParam)
    : null;
  const parsedTreeId = treeIdParam
    ? uuidParamSchema.safeParse(treeIdParam)
    : null;

  if (parsedPlotId && !parsedPlotId.success) {
    return invalid("Nie udalo sie odczytac dzialki z linku prefill.");
  }

  if (parsedTreeId && !parsedTreeId.success) {
    return invalid("Nie udalo sie odczytac drzewa z linku prefill.");
  }

  if (
    scopesParam &&
    `scopes=${encodeURIComponent(scopesParam)}`.length >
      PLOT_SELECTION_QUERY_LENGTH_LIMIT
  ) {
    return invalid("Zakres z linku prefill przekracza limit URL.");
  }

  const parsedScopes = scopesParam
    ? activityPrefillScopesSchema.safeParse(scopesParam)
    : { success: true as const, data: [] };

  if (!parsedScopes.success) {
    return invalid("Zakres z linku prefill jest niepoprawny.");
  }

  let plotId = parsedPlotId?.success ? parsedPlotId.data : undefined;
  const treeId = parsedTreeId?.success ? parsedTreeId.data : undefined;

  if (!plotId && treeId) {
    plotId = getTreeOption(options.treeOptions, treeId)?.plot_id;
  }

  if (!plotId) {
    return invalid("Link prefill nie wskazuje dzialki.");
  }

  const plot = getPlotOption(options.plotOptions, plotId);

  if (!plot) {
    return invalid("Dzialka z linku prefill nie nalezy do aktywnego sadu.");
  }

  if (treeId && !validateTreeForPrefill(options.treeOptions, treeId, plotId)) {
    return invalid("Drzewo z linku prefill nie nalezy do tej dzialki albo jest nieaktywne.");
  }

  let scopes = normalizePrefillScopes({
    scopes: parsedScopes.data,
    treeId,
  });

  if (!treeId && scopes.length === 1 && scopes[0]?.scope_level === "tree") {
    const scopeTreeId = scopes[0].tree_id ?? undefined;

    if (!scopeTreeId) {
      return invalid("Zakres drzewa w linku prefill nie wskazuje drzewa.");
    }

    if (!validateTreeForPrefill(options.treeOptions, scopeTreeId, plotId)) {
      return invalid("Drzewo z zakresu prefill nie nalezy do tej dzialki albo jest nieaktywne.");
    }

    scopes = [
      {
        ...scopes[0],
        tree_id: scopeTreeId,
      },
    ];

    return applied({
      plot_id: plotId,
      tree_id: scopeTreeId,
      scopes,
    });
  }

  if (treeId && scopes.length > 1) {
    return invalid("Pojedyncze drzewo nie moze byc laczone z wieloma zakresami prefill.");
  }

  if (treeId && scopes.length === 1) {
    const [scope] = scopes;

    if (!scope || scope.scope_level !== "tree") {
      return invalid("Pojedyncze drzewo mozna laczyc tylko z zakresem typu `tree`.");
    }

    if (scope.tree_id && scope.tree_id !== treeId) {
      return invalid("Drzewo glowne i drzewo w zakresie prefill musza byc takie same.");
    }

    scopes = [
      {
        ...scope,
        tree_id: treeId,
      },
    ];
  }

  for (const scope of scopes) {
    if (!supportsActivityScopeLevelForPlotLayout(plot.layout_type, scope.scope_level)) {
      return invalid("Zakres z linku prefill nie pasuje do ukladu tej dzialki.");
    }

    if (
      scope.scope_level === "tree" &&
      (!scope.tree_id ||
        !validateTreeForPrefill(options.treeOptions, scope.tree_id, plotId))
    ) {
      return invalid("Drzewo z zakresu prefill nie nalezy do tej dzialki albo jest nieaktywne.");
    }
  }

  return applied({
    plot_id: plotId,
    tree_id: treeId,
    scopes,
  });
}
