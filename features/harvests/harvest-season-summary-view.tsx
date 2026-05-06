import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { formatHarvestKg } from "@/lib/domain/harvests";
import { buildPathWithSearchParams } from "@/lib/utils/search-params";
import type {
  HarvestSeasonSummary,
  HarvestSeasonSummaryFilters,
  HarvestTimeline,
  PlotOption,
  VarietyOption,
} from "@/types/contracts";

type HarvestSeasonSummaryViewProps = {
  summary: HarvestSeasonSummary;
  timeline: HarvestTimeline;
  filters: HarvestSeasonSummaryFilters;
  plotOptions: PlotOption[];
  varietyOptions: VarietyOption[];
  resetHref: string;
  harvestListHref: string;
};

function formatHarvestDate(harvestDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(harvestDate));
}

function buildHarvestListHref(
  filters: HarvestSeasonSummaryFilters,
  overrides: Partial<{
    plot_id: string;
    variety_id: string;
    date_from: string;
    date_to: string;
  }> = {},
) {
  const searchParams = new URLSearchParams();
  searchParams.set("season_year", String(filters.season_year));

  const plotId = overrides.plot_id ?? filters.plot_id;
  const varietyId = overrides.variety_id ?? filters.variety_id;

  if (plotId) {
    searchParams.set("plot_id", plotId);
  }

  if (varietyId) {
    searchParams.set("variety_id", varietyId);
  }

  if (overrides.date_from) {
    searchParams.set("date_from", overrides.date_from);
  }

  if (overrides.date_to) {
    searchParams.set("date_to", overrides.date_to);
  }

  return buildPathWithSearchParams("/harvests", searchParams);
}

function buildHarvestLocationHref(filters: HarvestSeasonSummaryFilters) {
  const searchParams = new URLSearchParams();
  searchParams.set("season_year", String(filters.season_year));

  if (filters.plot_id) {
    searchParams.set("plot_id", filters.plot_id);
  }

  if (filters.variety_id) {
    searchParams.set("variety_id", filters.variety_id);
  }

  return buildPathWithSearchParams("/reports/harvest-locations", searchParams);
}

export function HarvestSeasonSummaryView({
  summary,
  timeline,
  filters,
  plotOptions,
  varietyOptions,
  resetHref,
  harvestListHref,
}: HarvestSeasonSummaryViewProps) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Raporty
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Podsumowanie sezonu zbiorow
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Raport liczy dane z `harvest_records` dla wybranego sezonu i pokazuje
            sumy globalne, rozklad per odmiana, per dzialka oraz historie w czasie.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton
            className="w-full sm:w-auto"
            href={buildHarvestLocationHref(filters)}
            variant="secondary"
          >
            Zbiory po lokalizacji
          </LinkButton>
          <LinkButton
            className="w-full sm:w-auto"
            href={harvestListHref}
            variant="secondary"
          >
            Pokaz wpisy zbioru
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href="/harvests/new">
            Nowy wpis zbioru
          </LinkButton>
        </div>
      </div>

      <Card className="grid gap-4" data-testid="harvest-season-summary">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry raportu</CardTitle>
          <CardDescription>
            Raport domyslnie pokazuje biezacy sezon. Mozesz zawezic wynik po
            dzialce albo odmianie.
          </CardDescription>
        </div>
        <form
          className="grid gap-4 lg:grid-cols-3"
          data-testid="harvest-season-summary-filters"
          method="get"
        >
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
            <Button className="w-full sm:w-auto" type="submit" variant="secondary">
              Pokaz raport
            </Button>
            <LinkButton className="w-full sm:w-auto" href={resetHref} variant="ghost">
              Wyczysc filtry
            </LinkButton>
            <LinkButton className="w-full sm:w-auto" href="/harvests" variant="ghost">
              Wroc do listy zbiorow
            </LinkButton>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Suma globalna</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {formatHarvestKg(summary.total_quantity_kg)}
          </p>
          <CardDescription>
            Wszystkie rekordy po zastosowaniu aktywnych filtrow.
          </CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Liczba wpisow</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {summary.record_count}
          </p>
          <CardDescription>
            Rekordy `harvest_records` uwzglednione w podsumowaniu.
          </CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Daty na osi czasu</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">{timeline.length}</p>
          <CardDescription>
            Liczba dni, w ktorych odnotowano zbiory w tym widoku.
          </CardDescription>
        </Card>
      </div>

      {summary.record_count === 0 ? (
        <EmptyStateCard
          actions={[
            { href: resetHref, label: "Wyczysc filtry", variant: "secondary" },
            { href: "/harvests/new", label: "Dodaj wpis zbioru", variant: "ghost" },
          ]}
          description="Zmien sezon albo filtry raportu, albo dodaj pierwszy wpis zbioru."
          title="Brak danych w tym sezonie"
        />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
              <div className="grid gap-1">
                <CardTitle className="text-lg">Suma per odmiana</CardTitle>
                <CardDescription>
                  To zestawienie pokazuje tylko rekordy z przypisana odmiana.
                </CardDescription>
              </div>
              {summary.by_variety.length === 0 ? (
                <CardDescription>
                  Dla aktywnych filtrow nie ma rekordow przypisanych do odmiany.
                </CardDescription>
              ) : (
                <div className="grid gap-3">
                  {summary.by_variety.map((entry) => (
                    <div
                      className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px]"
                      key={entry.variety_id}
                    >
                      <div className="grid gap-1">
                        <p className="text-sm font-medium text-[#304335]">
                          {entry.variety_name ?? "Nieznana odmiana"}
                        </p>
                        <CardDescription>
                          Liczba wpisow: {entry.record_count}
                        </CardDescription>
                      </div>
                      <div className="grid gap-2 sm:justify-items-end">
                        <p className="text-sm font-medium text-[#304335]">
                          {formatHarvestKg(entry.total_quantity_kg)}
                        </p>
                        <Link
                          className="text-sm font-medium text-[#274430] underline-offset-4 transition hover:underline"
                          href={buildHarvestListHref(filters, {
                            variety_id: entry.variety_id,
                          })}
                        >
                          Pokaz wpisy
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
              <div className="grid gap-1">
                <CardTitle className="text-lg">Suma per dzialka</CardTitle>
                <CardDescription>
                  To zestawienie pokazuje tylko rekordy z przypisana dzialka.
                </CardDescription>
              </div>
              {summary.by_plot.length === 0 ? (
                <CardDescription>
                  Dla aktywnych filtrow nie ma rekordow przypisanych do dzialki.
                </CardDescription>
              ) : (
                <div className="grid gap-3">
                  {summary.by_plot.map((entry) => (
                    <div
                      className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px]"
                      key={entry.plot_id}
                    >
                      <div className="grid gap-1">
                        <p className="text-sm font-medium text-[#304335]">
                          {entry.plot_name ?? "Nieznana dzialka"}
                        </p>
                        <CardDescription>
                          Liczba wpisow: {entry.record_count}
                        </CardDescription>
                      </div>
                      <div className="grid gap-2 sm:justify-items-end">
                        <p className="text-sm font-medium text-[#304335]">
                          {formatHarvestKg(entry.total_quantity_kg)}
                        </p>
                        <Link
                          className="text-sm font-medium text-[#274430] underline-offset-4 transition hover:underline"
                          href={buildHarvestListHref(filters, {
                            plot_id: entry.plot_id,
                          })}
                        >
                          Pokaz wpisy
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Historia w czasie</CardTitle>
              <CardDescription>
                Agregacja pokazuje, ile plonu odnotowano w kolejnych dniach sezonu.
              </CardDescription>
            </div>
            {timeline.length === 0 ? (
              <CardDescription>
                Nie znaleziono wpisow zbioru dla tej kombinacji filtrow.
              </CardDescription>
            ) : (
              <div className="grid gap-3">
                {timeline.map((entry) => (
                  <div
                    className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px]"
                    key={entry.harvest_date}
                  >
                    <div className="grid gap-1">
                      <p className="text-sm font-medium text-[#304335]">
                        {formatHarvestDate(entry.harvest_date)}
                      </p>
                      <CardDescription>
                        Liczba wpisow: {entry.record_count}
                      </CardDescription>
                    </div>
                    <div className="grid gap-2 sm:justify-items-end">
                      <p className="text-sm font-medium text-[#304335]">
                        {formatHarvestKg(entry.total_quantity_kg)}
                      </p>
                      <Link
                        className="text-sm font-medium text-[#274430] underline-offset-4 transition hover:underline"
                        href={buildHarvestListHref(filters, {
                          date_from: entry.harvest_date,
                          date_to: entry.harvest_date,
                        })}
                      >
                        Pokaz wpisy
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
