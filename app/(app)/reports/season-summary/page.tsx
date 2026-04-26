import { HarvestSeasonSummaryView } from "@/features/harvests/harvest-season-summary-view";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  getHarvestSeasonSummaryForOrchard,
  getHarvestTimelineForOrchard,
} from "@/lib/orchard-data/harvests";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { resolveHarvestSeasonSummaryFilters } from "@/lib/validation/harvests";

type HarvestSeasonSummaryPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function HarvestSeasonSummaryPage({
  searchParams,
}: HarvestSeasonSummaryPageProps) {
  const context = await requireActiveOrchard("/reports/season-summary");
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

  const [summary, timeline] = await Promise.all([
    getHarvestSeasonSummaryForOrchard(context.orchard.id, filters),
    getHarvestTimelineForOrchard(context.orchard.id, filters),
  ]);

  const resetHref = "/reports/season-summary";
  const harvestListHref = buildPathWithSearchParams("/harvests", (() => {
    const search = new URLSearchParams();
    search.set("season_year", String(filters.season_year));

    if (filters.plot_id) {
      search.set("plot_id", filters.plot_id);
    }

    if (filters.variety_id) {
      search.set("variety_id", filters.variety_id);
    }

    return search;
  })());

  return (
    <HarvestSeasonSummaryView
      filters={filters}
      harvestListHref={harvestListHref}
      plotOptions={plotOptions}
      resetHref={resetHref}
      summary={summary}
      timeline={timeline}
      varietyOptions={varietyOptions}
    />
  );
}
