import type {
  HarvestSeasonSummary,
  HarvestTimeline,
  HarvestQuantityUnit,
  HarvestRecordSummary,
  HarvestScopeLevel,
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
