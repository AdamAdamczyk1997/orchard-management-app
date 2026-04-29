import { HarvestLocationSummaryView } from "@/features/harvests/harvest-location-summary-view";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { getHarvestLocationSummaryForOrchard } from "@/lib/orchard-data/harvests";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { resolveHarvestSeasonSummaryFilters } from "@/lib/validation/harvests";

type HarvestLocationSummaryPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function HarvestLocationSummaryPage({
  searchParams,
}: HarvestLocationSummaryPageProps) {
  const context = await requireActiveOrchard("/reports/harvest-locations");
  const currentYear = new Date().getFullYear();
  const [plotOptions, varietyOptions, resolvedSearchParams] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listVarietyOptionsForOrchard(context.orchard.id),
    searchParams,
  ]);

  const filters = resolveHarvestSeasonSummaryFilters(
    {
      season_year: getSingleSearchParam(resolvedSearchParams.season_year),
      plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
      variety_id: getSingleSearchParam(resolvedSearchParams.variety_id),
    },
    currentYear,
  );
  const summary = await getHarvestLocationSummaryForOrchard(
    context.orchard.id,
    filters,
  );

  const sharedSearchParams = new URLSearchParams();
  sharedSearchParams.set("season_year", String(filters.season_year));

  if (filters.plot_id) {
    sharedSearchParams.set("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    sharedSearchParams.set("variety_id", filters.variety_id);
  }

  const harvestListHref = buildPathWithSearchParams("/harvests", sharedSearchParams);
  const seasonSummaryHref = buildPathWithSearchParams(
    "/reports/season-summary",
    sharedSearchParams,
  );

  return (
    <HarvestLocationSummaryView
      filters={filters}
      harvestListHref={harvestListHref}
      plotOptions={plotOptions}
      resetHref="/reports/harvest-locations"
      seasonSummaryHref={seasonSummaryHref}
      summary={summary}
      varietyOptions={varietyOptions}
    />
  );
}
