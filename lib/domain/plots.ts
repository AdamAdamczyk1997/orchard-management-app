import type {
  ActivityScopeInput,
  HarvestRecordFormInput,
  PlotOption,
  PlotLayoutType,
  PlotSummary,
  RowNumberingScheme,
  TreeFormInput,
  TreeNumberingScheme,
} from "@/types/contracts";

export const PLOT_STATUSES = [
  "planned",
  "active",
  "archived",
] as const;

export const PLOT_LAYOUT_TYPES = [
  "rows",
  "mixed",
  "irregular",
] as const;

export const ROW_NUMBERING_SCHEMES = [
  "left_to_right_from_entrance",
  "right_to_left_from_entrance",
  "north_to_south",
  "south_to_north",
  "custom",
] as const;

export const TREE_NUMBERING_SCHEMES = [
  "from_row_start",
  "from_row_end",
  "custom",
] as const;

const plotLayoutTypeLabels: Record<PlotLayoutType, string> = {
  rows: "Rzedowy",
  mixed: "Mieszany",
  irregular: "Nieregularny",
};

const rowNumberingSchemeLabels: Record<RowNumberingScheme, string> = {
  left_to_right_from_entrance: "Od lewej do prawej od strony wejscia",
  right_to_left_from_entrance: "Od prawej do lewej od strony wejscia",
  north_to_south: "Od polnocy do poludnia",
  south_to_north: "Od poludnia do polnocy",
  custom: "Wlasna numeracja",
};

const treeNumberingSchemeLabels: Record<TreeNumberingScheme, string> = {
  from_row_start: "Od poczatku rzedu",
  from_row_end: "Od konca rzedu",
  custom: "Wlasna numeracja",
};

export function getPlotLayoutTypeLabel(layoutType: PlotLayoutType) {
  return plotLayoutTypeLabels[layoutType];
}

export function getRowNumberingSchemeLabel(
  scheme: RowNumberingScheme,
) {
  return rowNumberingSchemeLabels[scheme];
}

export function getTreeNumberingSchemeLabel(
  scheme: TreeNumberingScheme,
) {
  return treeNumberingSchemeLabels[scheme];
}

type PlotLayoutContext = Pick<
  PlotSummary,
  | "layout_type"
  | "row_numbering_scheme"
  | "tree_numbering_scheme"
  | "entrance_description"
  | "layout_notes"
  | "default_row_count"
  | "default_trees_per_row"
>;

type TreeLocationInput = Pick<
  TreeFormInput,
  | "section_name"
  | "row_number"
  | "position_in_row"
  | "row_label"
  | "position_label"
  | "tree_code"
>;

export type PlotTreeWorkflowOption = PlotOption & PlotLayoutContext;

type ActivityScopeLevel = ActivityScopeInput["scope_level"];
type HarvestScopeLevel = HarvestRecordFormInput["scope_level"];

function hasRowCoordinates(input: TreeLocationInput) {
  return (
    typeof input.row_number === "number" &&
    typeof input.position_in_row === "number"
  );
}

function hasAnyTreeLocationHint(input: TreeLocationInput) {
  return Boolean(
    input.section_name ||
      input.row_label ||
      input.position_label ||
      input.tree_code ||
      hasRowCoordinates(input),
  );
}

export function formatPlotDefaultGridLabel(plot: {
  default_row_count?: number | null;
  default_trees_per_row?: number | null;
}) {
  if (plot.default_row_count && plot.default_trees_per_row) {
    return `${plot.default_row_count} rzedow x ${plot.default_trees_per_row} drzew`;
  }

  if (plot.default_row_count) {
    return `${plot.default_row_count} rzedow`;
  }

  if (plot.default_trees_per_row) {
    return `${plot.default_trees_per_row} drzew w rzedzie`;
  }

  return "Brak";
}

export function isRowLocationRequiredForPlot(layoutType: PlotLayoutType) {
  return layoutType === "rows";
}

export function supportsRowRangeWorkflows(layoutType: PlotLayoutType) {
  return layoutType === "rows" || layoutType === "mixed";
}

export function supportsActivityScopeLevelForPlotLayout(
  layoutType: PlotLayoutType,
  scopeLevel: ActivityScopeLevel,
) {
  if (scopeLevel === "row" || scopeLevel === "location_range") {
    return supportsRowRangeWorkflows(layoutType);
  }

  return true;
}

export function supportsHarvestScopeLevelForPlotLayout(
  layoutType: PlotLayoutType,
  scopeLevel: HarvestScopeLevel,
) {
  if (scopeLevel === "location_range") {
    return supportsRowRangeWorkflows(layoutType);
  }

  return true;
}

export function getPlotTreeLocationGuidance(layoutType: PlotLayoutType) {
  switch (layoutType) {
    case "rows":
      return "Ta dzialka pracuje w modelu rzedowym. Numer rzedu i pozycja sa wymagane przy zapisie drzewa.";
    case "mixed":
      return "Ta dzialka ma uklad mieszany. Podaj co najmniej jedna czytelna informacje lokalizacyjna; najlepiej sekcje albo lokalizacje rzedowa.";
    case "irregular":
      return "Ta dzialka ma uklad nieregularny. Najlepiej uzyj sekcji, etykiet albo kodu terenowego zamiast polegac tylko na rzedach.";
    default:
      return "";
  }
}

export function getPlotOperationalLocationGuidance(layoutType: PlotLayoutType) {
  switch (layoutType) {
    case "rows":
      return "Ta dzialka pracuje w modelu rzedowym. Zakresy po rzedach i pozycjach sa tu naturalnym sposobem opisu pracy.";
    case "mixed":
      return "Ta dzialka ma uklad mieszany. Zakresy rzedowe dzialaja tam, gdzie teren jest opisany rzedami, a w pozostalych miejscach lepiej uzyc sekcji albo pojedynczych drzew.";
    case "irregular":
      return "Ta dzialka ma uklad nieregularny. Do prac i zbiorow lepiej uzywac calej dzialki, sekcji albo pojedynczych drzew zamiast zakresow po rzedach.";
    default:
      return "";
  }
}

export function getPlotRowRangeWorkflowGuidance(layoutType: PlotLayoutType) {
  switch (layoutType) {
    case "rows":
      return "Zakres rzadowy jest w pelni zgodny z ukladem tej dzialki.";
    case "mixed":
      return "Ten flow dziala dla czesci dzialki opisanej rzedami.";
    case "irregular":
      return "Ta dzialka ma uklad nieregularny, wiec zakresy po rzedach nie sa tu wspierane.";
    default:
      return "";
  }
}

export function validateTreeLocationForPlotLayout(
  plot: Pick<PlotSummary, "layout_type">,
  input: TreeLocationInput,
) {
  switch (plot.layout_type) {
    case "rows":
      if (!hasRowCoordinates(input)) {
        const field_errors: Record<string, string> = {
          row_number: "Ta dzialka wymaga numeru rzedu.",
          position_in_row: "Ta dzialka wymaga pozycji w rzedzie.",
        };

        return {
          message:
            "Wybrana dzialka ma uklad rzedowy. Podaj numer rzedu i pozycje w rzedzie.",
          field_errors,
        };
      }

      return null;
    case "mixed":
      if (!hasAnyTreeLocationHint(input)) {
        const field_errors: Record<string, string> = {
          section_name:
            "Podaj sekcje, kod drzewa albo lokalizacje rzedowa dla tej dzialki.",
        };

        return {
          message:
            "Dla dzialki mieszanej podaj przynajmniej jedna informacje lokalizacyjna.",
          field_errors,
        };
      }

      return null;
    case "irregular":
      if (!hasAnyTreeLocationHint(input)) {
        const field_errors: Record<string, string> = {
          section_name:
            "Podaj sekcje, etykiete albo kod terenowy dla tej dzialki.",
        };

        return {
          message:
            "Dla dzialki nieregularnej podaj przynajmniej jedna praktyczna wskazowke lokalizacji.",
          field_errors,
        };
      }

      return null;
    default:
      return null;
  }
}

export function validateActivityScopesForPlotLayout(
  plot: Pick<PlotSummary, "layout_type">,
  scopes: Array<Pick<ActivityScopeInput, "scope_level">>,
) {
  const hasUnsupportedScope = scopes.some(
    (scope) =>
      !supportsActivityScopeLevelForPlotLayout(plot.layout_type, scope.scope_level),
  );

  if (!hasUnsupportedScope) {
    return null;
  }

  return {
    message:
      "Wybrana dzialka ma uklad nieregularny. Zakresy `rzad` i `zakres lokalizacji` nie sa dla niej wspierane.",
    field_errors: {
      scopes:
        "Dla tej dzialki uzyj calej dzialki, sekcji albo pojedynczych drzew zamiast zakresow po rzedach.",
    } satisfies Record<string, string>,
  };
}

export function validateHarvestScopeForPlotLayout(
  plot: Pick<PlotSummary, "layout_type">,
  scopeLevel: HarvestScopeLevel,
) {
  if (supportsHarvestScopeLevelForPlotLayout(plot.layout_type, scopeLevel)) {
    return null;
  }

  return {
    message:
      "Wybrana dzialka ma uklad nieregularny. Zbior w zakresie po rzedach i pozycjach nie jest dla niej wspierany.",
    field_errors: {
      plot_id:
        "Dla tej dzialki uzyj calej dzialki, odmiany albo pojedynczych drzew zamiast zakresu po rzedach.",
    } satisfies Record<string, string>,
  };
}
