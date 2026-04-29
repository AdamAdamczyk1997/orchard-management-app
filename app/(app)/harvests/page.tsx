import { Suspense } from "react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Input } from "@/components/ui/input";
import { ListPageLoading } from "@/components/ui/list-page-loading";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { HarvestList } from "@/features/harvests/harvest-list";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { hasActiveHarvestListFilters } from "@/lib/domain/list-filters";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listHarvestRecordsForOrchard } from "@/lib/orchard-data/harvests";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import { resolveHarvestListFilters } from "@/lib/validation/harvests";

type HarvestsPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function HarvestsPage({
  searchParams,
}: HarvestsPageProps) {
  const context = await requireActiveOrchard("/harvests");

  return (
    <Suspense fallback={<ListPageLoading filterFieldCount={5} />}>
      <HarvestsPageContent
        orchardId={context.orchard.id}
        orchardName={context.orchard.name}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function HarvestsPageContent({
  orchardId,
  orchardName,
  searchParams,
}: {
  orchardId: string;
  orchardName: string;
  searchParams: Promise<NextSearchParams>;
}) {
  const currentYear = new Date().getFullYear();
  const [plotOptions, varietyOptions, resolvedSearchParams] = await Promise.all(
    [
      listPlotOptionsForOrchard(orchardId),
      listVarietyOptionsForOrchard(orchardId),
      searchParams,
    ],
  );
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );

  const filters = resolveHarvestListFilters(
    {
      season_year: getSingleSearchParam(resolvedSearchParams.season_year),
      date_from: getSingleSearchParam(resolvedSearchParams.date_from),
      date_to: getSingleSearchParam(resolvedSearchParams.date_to),
      plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
      variety_id: getSingleSearchParam(resolvedSearchParams.variety_id),
    },
    currentYear,
  );

  const harvestRecords = await listHarvestRecordsForOrchard(orchardId, filters);
  const hasActiveFilters = hasActiveHarvestListFilters(filters, currentYear);
  const dismissHref = buildPathWithSearchParams(
    "/harvests",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );
  const currentSearchParams = new URLSearchParams();

  if (filters.season_year !== currentYear) {
    currentSearchParams.set("season_year", String(filters.season_year));
  }

  if (filters.date_from) {
    currentSearchParams.set("date_from", filters.date_from);
  }

  if (filters.date_to) {
    currentSearchParams.set("date_to", filters.date_to);
  }

  if (filters.plot_id) {
    currentSearchParams.set("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    currentSearchParams.set("variety_id", filters.variety_id);
  }

  const redirectTo = buildPathWithSearchParams(
    "/harvests",
    currentSearchParams,
  );
  const seasonSummarySearchParams = new URLSearchParams();

  if (filters.season_year !== currentYear) {
    seasonSummarySearchParams.set("season_year", String(filters.season_year));
  }

  if (filters.plot_id) {
    seasonSummarySearchParams.set("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    seasonSummarySearchParams.set("variety_id", filters.variety_id);
  }

  const seasonSummaryHref = buildPathWithSearchParams(
    "/reports/season-summary",
    seasonSummarySearchParams,
  );
  const locationSummaryHref = buildPathWithSearchParams(
    "/reports/harvest-locations",
    seasonSummarySearchParams,
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Zbiory
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Wpisy zbioru w sadzie {orchardName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Rejestruj ilosc zebranego plonu na poziomie sadu, dzialki, odmiany,
            zakresu lokalizacji albo pojedynczego drzewa.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <LinkButton href={locationSummaryHref} variant="secondary">
            Zbiory po lokalizacji
          </LinkButton>
          <LinkButton href={seasonSummaryHref} variant="secondary">
            Podsumowanie sezonu
          </LinkButton>
          <div className="text-[#fffefe]">
            <LinkButton href="/harvests/new">Nowy wpis zbioru</LinkButton>
          </div>
        </div>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Lista domyslnie pokazuje biezacy sezon. Mozesz zawęzic wynik po
            dacie, dzialce albo odmianie.
          </CardDescription>
        </div>
        <form className="grid gap-4 lg:grid-cols-3" method="get">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Sezon</span>
            <Input
              defaultValue={String(filters.season_year)}
              max="9999"
              min="2000"
              name="season_year"
              type="number"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Od daty</span>
            <Input
              defaultValue={filters.date_from ?? ""}
              name="date_from"
              type="date"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Do daty</span>
            <Input
              defaultValue={filters.date_to ?? ""}
              name="date_to"
              type="date"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Dzialka</span>
            <Select defaultValue={filters.plot_id ?? ""} name="plot_id">
              <option value="">Wszystkie dzialki</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                  {plot.status === "archived" ? " (zarchiwizowana)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Odmiana</span>
            <Select defaultValue={filters.variety_id ?? ""} name="variety_id">
              <option value="">Wszystkie odmiany</option>
              {varietyOptions.map((variety) => (
                <option key={variety.id} value={variety.id}>
                  {variety.species} - {variety.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
              type="submit"
            >
              Zastosuj
            </button>
            <LinkButton href="/harvests" variant="ghost">
              Przywroc domyslne
            </LinkButton>
          </div>
        </form>
      </Card>

      <HarvestList
        clearHref="/harvests"
        createHref="/harvests/new"
        harvestRecords={harvestRecords}
        hasActiveFilters={hasActiveFilters}
        redirectTo={redirectTo}
      />
    </div>
  );
}
