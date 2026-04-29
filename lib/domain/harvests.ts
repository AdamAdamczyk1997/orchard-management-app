import type {
  HarvestLocationSummary,
  HarvestLocationPlotSummary,
  HarvestSeasonSummary,
  HarvestTimeline,
  HarvestQuantityUnit,
  HarvestRecordSummary,
  HarvestScopeLevel,
  PlotStatus,
} from "@/types/contracts";

export const HARVEST_SCOPE_LEVELS = [
  "orchard",
  "plot",
  "variety",
  "location_range",
  "tree",
] as const;

export const HARVEST_QUANTITY_UNITS = ["kg", "t"] as const;

const harvestScopeLabels: Record<HarvestScopeLevel, string> = {
  orchard: "Caly sad",
  plot: "Dzialka",
  variety: "Odmiana",
  location_range: "Zakres lokalizacji",
  tree: "Jedno drzewo",
};

type HarvestScopeDescriptor = Pick<
  HarvestRecordSummary,
  | "scope_level"
  | "plot_name"
  | "variety_name"
  | "tree_display_name"
  | "section_name"
  | "row_number"
  | "from_position"
  | "to_position"
>;

export type HarvestLocationSourceRecord = {
  id: string;
  scope_level: HarvestScopeLevel;
  harvest_date: string;
  quantity_kg: number;
  plot_id: string | null;
  plot_name: string | null;
  plot_status: PlotStatus | null;
  section_name: string | null;
  row_number: number | null;
  from_position: number | null;
  to_position: number | null;
};

export function getHarvestScopeLabel(scopeLevel: HarvestScopeLevel) {
  return harvestScopeLabels[scopeLevel];
}

export function deriveHarvestSeasonYearFromDate(harvestDate: string) {
  const [yearPart] = harvestDate.split("-");
  const parsedYear = Number(yearPart);

  return Number.isInteger(parsedYear) ? parsedYear : Number.NaN;
}

export function normalizeHarvestQuantityToKg(
  quantityValue: number,
  quantityUnit: HarvestQuantityUnit,
) {
  return quantityUnit === "t" ? quantityValue * 1000 : quantityValue;
}

export function formatHarvestQuantity(
  quantityValue: number,
  quantityUnit: HarvestQuantityUnit,
) {
  return `${formatDecimal(quantityValue)} ${quantityUnit}`;
}

export function formatHarvestKg(quantityKg: number) {
  return `${formatDecimal(quantityKg)} kg`;
}

export function aggregateHarvestSeasonSummary(
  records: HarvestRecordSummary[],
  seasonYear: number,
): HarvestSeasonSummary {
  const byVariety = new Map<
    string,
    {
      variety_id: string;
      variety_name: string | null;
      total_quantity_kg: number;
      record_count: number;
    }
  >();
  const byPlot = new Map<
    string,
    {
      plot_id: string;
      plot_name: string | null;
      total_quantity_kg: number;
      record_count: number;
    }
  >();

  let totalQuantityKg = 0;

  for (const record of records) {
    totalQuantityKg = roundHarvestKg(totalQuantityKg + record.quantity_kg);

    if (record.variety_id) {
      const currentVariety = byVariety.get(record.variety_id);

      if (currentVariety) {
        currentVariety.total_quantity_kg = roundHarvestKg(
          currentVariety.total_quantity_kg + record.quantity_kg,
        );
        currentVariety.record_count += 1;
      } else {
        byVariety.set(record.variety_id, {
          variety_id: record.variety_id,
          variety_name: record.variety_name ?? null,
          total_quantity_kg: roundHarvestKg(record.quantity_kg),
          record_count: 1,
        });
      }
    }

    if (record.plot_id) {
      const currentPlot = byPlot.get(record.plot_id);

      if (currentPlot) {
        currentPlot.total_quantity_kg = roundHarvestKg(
          currentPlot.total_quantity_kg + record.quantity_kg,
        );
        currentPlot.record_count += 1;
      } else {
        byPlot.set(record.plot_id, {
          plot_id: record.plot_id,
          plot_name: record.plot_name ?? null,
          total_quantity_kg: roundHarvestKg(record.quantity_kg),
          record_count: 1,
        });
      }
    }
  }

  return {
    season_year: seasonYear,
    total_quantity_kg: totalQuantityKg,
    record_count: records.length,
    by_variety: [...byVariety.values()].sort(sortHarvestSummaryGroups),
    by_plot: [...byPlot.values()].sort(sortHarvestSummaryGroups),
  };
}

export function aggregateHarvestTimeline(
  records: HarvestRecordSummary[],
): HarvestTimeline {
  const timeline = new Map<
    string,
    {
      harvest_date: string;
      total_quantity_kg: number;
      record_count: number;
    }
  >();

  for (const record of records) {
    const existingEntry = timeline.get(record.harvest_date);

    if (existingEntry) {
      existingEntry.total_quantity_kg = roundHarvestKg(
        existingEntry.total_quantity_kg + record.quantity_kg,
      );
      existingEntry.record_count += 1;
      continue;
    }

    timeline.set(record.harvest_date, {
      harvest_date: record.harvest_date,
      total_quantity_kg: roundHarvestKg(record.quantity_kg),
      record_count: 1,
    });
  }

  return [...timeline.values()].sort((left, right) =>
    left.harvest_date.localeCompare(right.harvest_date),
  );
}

export function aggregateHarvestLocationSummary(
  records: HarvestLocationSourceRecord[],
  seasonYear: number,
): HarvestLocationSummary {
  const plots = new Map<
    string,
    HarvestLocationPlotSummary & {
      rowsMap: Map<
        string,
        HarvestLocationPlotSummary["rows"][number] & {
          rangesMap: Map<string, HarvestLocationPlotSummary["rows"][number]["ranges"][number]>;
        }
      >;
    }
  >();

  let totalQuantityKg = 0;
  let preciselyLocatedQuantityKg = 0;
  let preciselyLocatedRecordCount = 0;
  let unresolvedQuantityKg = 0;
  let unresolvedRecordCount = 0;
  let orchardLevelQuantityKg = 0;
  let orchardLevelRecordCount = 0;

  for (const record of records) {
    totalQuantityKg = roundHarvestKg(totalQuantityKg + record.quantity_kg);

    const hasPreciseLocation =
      Boolean(record.plot_id) &&
      typeof record.row_number === "number" &&
      typeof record.from_position === "number" &&
      typeof record.to_position === "number";

    if (hasPreciseLocation) {
      preciselyLocatedQuantityKg = roundHarvestKg(
        preciselyLocatedQuantityKg + record.quantity_kg,
      );
      preciselyLocatedRecordCount += 1;
    } else {
      unresolvedQuantityKg = roundHarvestKg(unresolvedQuantityKg + record.quantity_kg);
      unresolvedRecordCount += 1;
    }

    if (!record.plot_id) {
      orchardLevelQuantityKg = roundHarvestKg(orchardLevelQuantityKg + record.quantity_kg);
      orchardLevelRecordCount += 1;
      continue;
    }

    const plot = getOrCreatePlotAccumulator(plots, {
      plot_id: record.plot_id,
      plot_name: record.plot_name,
      plot_status: record.plot_status ?? "active",
    });
    plot.total_quantity_kg = roundHarvestKg(plot.total_quantity_kg + record.quantity_kg);
    plot.record_count += 1;

    if (!hasPreciseLocation) {
      plot.unresolved_quantity_kg = roundHarvestKg(
        plot.unresolved_quantity_kg + record.quantity_kg,
      );
      plot.unresolved_record_count += 1;
      continue;
    }

    plot.precisely_located_quantity_kg = roundHarvestKg(
      plot.precisely_located_quantity_kg + record.quantity_kg,
    );
    plot.precisely_located_record_count += 1;

    const rowNumber = record.row_number as number;
    const fromPosition = record.from_position as number;
    const toPosition = record.to_position as number;

    const row = getOrCreateRowAccumulator(plot.rowsMap, {
      section_name: record.section_name,
      row_number: rowNumber,
    });
    row.total_quantity_kg = roundHarvestKg(row.total_quantity_kg + record.quantity_kg);
    row.record_count += 1;

    const rangeKey = `${fromPosition}:${toPosition}`;
    const currentRange = row.rangesMap.get(rangeKey);

    if (currentRange) {
      currentRange.total_quantity_kg = roundHarvestKg(
        currentRange.total_quantity_kg + record.quantity_kg,
      );
      currentRange.record_count += 1;
    } else {
      row.rangesMap.set(rangeKey, {
        from_position: fromPosition,
        to_position: toPosition,
        total_quantity_kg: roundHarvestKg(record.quantity_kg),
        record_count: 1,
      });
    }
  }

  return {
    season_year: seasonYear,
    total_quantity_kg: totalQuantityKg,
    record_count: records.length,
    precisely_located_quantity_kg: preciselyLocatedQuantityKg,
    precisely_located_record_count: preciselyLocatedRecordCount,
    unresolved_quantity_kg: unresolvedQuantityKg,
    unresolved_record_count: unresolvedRecordCount,
    orchard_level_quantity_kg: orchardLevelQuantityKg,
    orchard_level_record_count: orchardLevelRecordCount,
    plots: [...plots.values()]
      .map((plot) => ({
        plot_id: plot.plot_id,
        plot_name: plot.plot_name,
        plot_status: plot.plot_status,
        total_quantity_kg: plot.total_quantity_kg,
        record_count: plot.record_count,
        precisely_located_quantity_kg: plot.precisely_located_quantity_kg,
        precisely_located_record_count: plot.precisely_located_record_count,
        unresolved_quantity_kg: plot.unresolved_quantity_kg,
        unresolved_record_count: plot.unresolved_record_count,
        rows: [...plot.rowsMap.values()]
          .map((row) => ({
            section_name: row.section_name,
            row_number: row.row_number,
            total_quantity_kg: row.total_quantity_kg,
            record_count: row.record_count,
            ranges: [...row.rangesMap.values()].sort(sortHarvestLocationRanges),
          }))
          .sort(sortHarvestLocationRows),
      }))
      .sort(sortHarvestLocationPlots),
  };
}

export function formatHarvestScopeLabel(descriptor: HarvestScopeDescriptor) {
  switch (descriptor.scope_level) {
    case "orchard":
      return "Caly sad";
    case "plot":
      return descriptor.plot_name ? `Dzialka ${descriptor.plot_name}` : "Dzialka";
    case "variety":
      if (descriptor.variety_name && descriptor.plot_name) {
        return `${descriptor.variety_name} · ${descriptor.plot_name}`;
      }

      if (descriptor.variety_name) {
        return `Odmiana ${descriptor.variety_name}`;
      }

      if (descriptor.plot_name) {
        return `Odmiana na dzialce ${descriptor.plot_name}`;
      }

      return "Odmiana";
    case "location_range": {
      const parts: string[] = [];

      if (descriptor.plot_name) {
        parts.push(descriptor.plot_name);
      }

      if (descriptor.section_name) {
        parts.push(`Sekcja ${descriptor.section_name}`);
      }

      if (typeof descriptor.row_number === "number") {
        parts.push(`Rzad ${descriptor.row_number}`);
      }

      if (
        typeof descriptor.from_position === "number" &&
        typeof descriptor.to_position === "number"
      ) {
        parts.push(`Pozycje ${descriptor.from_position}-${descriptor.to_position}`);
      }

      return parts.join(" · ") || "Zakres lokalizacji";
    }
    case "tree":
      return descriptor.tree_display_name ?? "Jedno drzewo";
    default:
      return getHarvestScopeLabel(descriptor.scope_level);
  }
}

function formatDecimal(value: number) {
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 3,
  }).format(value);
}

function roundHarvestKg(value: number) {
  return Math.round(value * 1000) / 1000;
}

function compareNullableText(left: string | null | undefined, right: string | null | undefined) {
  return (left ?? "").localeCompare(right ?? "", "pl");
}

function getOrCreatePlotAccumulator(
  plots: Map<
    string,
    HarvestLocationPlotSummary & {
      rowsMap: Map<
        string,
        HarvestLocationPlotSummary["rows"][number] & {
          rangesMap: Map<string, HarvestLocationPlotSummary["rows"][number]["ranges"][number]>;
        }
      >;
    }
  >,
  input: {
    plot_id: string;
    plot_name: string | null;
    plot_status: PlotStatus;
  },
) {
  const current = plots.get(input.plot_id);

  if (current) {
    return current;
  }

  const next = {
    plot_id: input.plot_id,
    plot_name: input.plot_name,
    plot_status: input.plot_status,
    total_quantity_kg: 0,
    record_count: 0,
    precisely_located_quantity_kg: 0,
    precisely_located_record_count: 0,
    unresolved_quantity_kg: 0,
    unresolved_record_count: 0,
    rows: [],
    rowsMap: new Map(),
  };

  plots.set(input.plot_id, next);

  return next;
}

function getOrCreateRowAccumulator(
  rows: Map<
    string,
    HarvestLocationPlotSummary["rows"][number] & {
      rangesMap: Map<string, HarvestLocationPlotSummary["rows"][number]["ranges"][number]>;
    }
  >,
  input: {
    section_name: string | null;
    row_number: number;
  },
) {
  const key = `${input.section_name ?? ""}:${input.row_number}`;
  const current = rows.get(key);

  if (current) {
    return current;
  }

  const next = {
    section_name: input.section_name,
    row_number: input.row_number,
    total_quantity_kg: 0,
    record_count: 0,
    ranges: [],
    rangesMap: new Map(),
  };

  rows.set(key, next);

  return next;
}

function sortHarvestLocationPlots(
  left: HarvestLocationSummary["plots"][number],
  right: HarvestLocationSummary["plots"][number],
) {
  return compareNullableText(left.plot_name, right.plot_name);
}

function sortHarvestLocationRows(
  left: HarvestLocationSummary["plots"][number]["rows"][number],
  right: HarvestLocationSummary["plots"][number]["rows"][number],
) {
  const sectionDiff = compareNullableText(left.section_name, right.section_name);

  if (sectionDiff !== 0) {
    return sectionDiff;
  }

  return left.row_number - right.row_number;
}

function sortHarvestLocationRanges(
  left: HarvestLocationSummary["plots"][number]["rows"][number]["ranges"][number],
  right: HarvestLocationSummary["plots"][number]["rows"][number]["ranges"][number],
) {
  if (left.from_position !== right.from_position) {
    return left.from_position - right.from_position;
  }

  return left.to_position - right.to_position;
}

function sortHarvestSummaryGroups<
  T extends {
    total_quantity_kg: number;
    variety_name?: string | null;
    plot_name?: string | null;
  },
>(left: T, right: T) {
  if (left.total_quantity_kg !== right.total_quantity_kg) {
    return right.total_quantity_kg - left.total_quantity_kg;
  }

  const leftLabel = left.variety_name ?? left.plot_name ?? "";
  const rightLabel = right.variety_name ?? right.plot_name ?? "";

  return leftLabel.localeCompare(rightLabel, "pl");
}
