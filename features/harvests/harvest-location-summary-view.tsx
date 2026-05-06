import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { formatHarvestKg } from "@/lib/domain/harvests";
import { getPlotStatusLabel } from "@/lib/domain/labels";
import { buildPathWithSearchParams } from "@/lib/utils/search-params";
import type {
  HarvestLocationSummary,
  HarvestLocationSummaryFilters,
  PlotOption,
  VarietyOption,
} from "@/types/contracts";

type HarvestLocationSummaryViewProps = {
  summary: HarvestLocationSummary;
  filters: HarvestLocationSummaryFilters;
  plotOptions: PlotOption[];
  varietyOptions: VarietyOption[];
  resetHref: string;
  harvestListHref: string;
  seasonSummaryHref: string;
};

function buildHarvestListHref(
  filters: HarvestLocationSummaryFilters,
  overrides: Partial<{
    plot_id: string;
    variety_id: string;
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

  return buildPathWithSearchParams("/harvests", searchParams);
}

function formatRowHeading(row: HarvestLocationSummary["plots"][number]["rows"][number]) {
  if (row.section_name) {
    return `Sekcja ${row.section_name} - Rzad ${row.row_number}`;
  }

  return `Rzad ${row.row_number}`;
}

export function HarvestLocationSummaryView({
  summary,
  filters,
  plotOptions,
  varietyOptions,
  resetHref,
  harvestListHref,
  seasonSummaryHref,
}: HarvestLocationSummaryViewProps) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Raporty
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Zbiory po lokalizacji
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Ten raport pokazuje, ile plonu przypisano do konkretnych dzialek,
            rzedow i zakresow pozycji oraz ile wpisow pozostaje tylko na poziomie
            sadu, dzialki albo odmiany.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton
            className="w-full sm:w-auto"
            href={seasonSummaryHref}
            variant="secondary"
          >
            Podsumowanie sezonu
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

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry raportu</CardTitle>
          <CardDescription>
            Raport domyslnie pokazuje biezacy sezon. Mozesz zawezic wynik po
            dzialce albo odmianie.
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
            Wszystkie rekordy sezonu po zastosowaniu aktywnych filtrow.
          </CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Precyzyjna lokalizacja</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {formatHarvestKg(summary.precisely_located_quantity_kg)}
          </p>
          <CardDescription>
            {summary.precisely_located_record_count} wpisow z konkretnym rzedem i
            zakresem pozycji.
          </CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Bez precyzyjnej lokalizacji</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {formatHarvestKg(summary.unresolved_quantity_kg)}
          </p>
          <CardDescription>
            {summary.unresolved_record_count} wpisow pozostaje na poziomie sadu,
            dzialki, odmiany albo drzewa bez kompletnej pozycji.
          </CardDescription>
        </Card>
      </div>

      {summary.record_count === 0 ? (
        <EmptyStateCard
          actions={[
            { href: resetHref, label: "Wyczysc filtry", variant: "secondary" },
            { href: "/harvests/new", label: "Dodaj wpis zbioru", variant: "ghost" },
          ]}
          description="Zmien sezon lub aktywne filtry, albo dodaj pierwszy wpis zbioru w aktywnym sadzie."
          title="Brak danych dla tej kombinacji filtrow"
        />
      ) : (
        <>
          {summary.orchard_level_record_count > 0 ? (
            <Card className="grid gap-3 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
              <CardTitle className="text-lg">Wpisy tylko na poziomie sadu</CardTitle>
              <CardDescription>
                {summary.orchard_level_record_count} rekordow o lacznej wartosci{" "}
                {formatHarvestKg(summary.orchard_level_quantity_kg)} nie da sie
                przypisac do konkretnej dzialki, dlatego nie pojawiaja sie w
                grupach terenowych ponizej.
              </CardDescription>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {summary.plots.map((plot) => (
              <Card
                className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none"
                key={plot.plot_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <CardTitle className="text-lg">
                      {plot.plot_name ?? "Nieznana dzialka"}
                    </CardTitle>
                    <CardDescription>
                      Status dzialki: {getPlotStatusLabel(plot.plot_status)}.
                    </CardDescription>
                  </div>
                  <LinkButton
                    href={buildHarvestListHref(filters, { plot_id: plot.plot_id })}
                    variant="ghost"
                  >
                    Pokaz wpisy dzialki
                  </LinkButton>
                </div>

                <div className="grid gap-2 text-sm text-[#5b6155] md:grid-cols-4">
                  <p>
                    <span className="font-medium text-[#304335]">Suma:</span>{" "}
                    {formatHarvestKg(plot.total_quantity_kg)}
                  </p>
                  <p>
                    <span className="font-medium text-[#304335]">Wpisy:</span>{" "}
                    {plot.record_count}
                  </p>
                  <p>
                    <span className="font-medium text-[#304335]">
                      Precyzyjna lokalizacja:
                    </span>{" "}
                    {formatHarvestKg(plot.precisely_located_quantity_kg)}
                  </p>
                  <p>
                    <span className="font-medium text-[#304335]">
                      Bez precyzyjnej lokalizacji:
                    </span>{" "}
                    {formatHarvestKg(plot.unresolved_quantity_kg)}
                  </p>
                </div>

                {plot.rows.length === 0 ? (
                  <CardDescription>
                    W tej dzialce nie ma jeszcze wpisow z konkretnym rzedem i
                    zakresem pozycji. Wystepuja tu tylko rekordy plot, variety albo
                    inne mniej precyzyjne wpisy.
                  </CardDescription>
                ) : (
                  <div className="grid gap-4">
                    {plot.rows.map((row) => (
                      <div
                        className="grid gap-3 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4"
                        key={`${plot.plot_id}:${row.section_name ?? ""}:${row.row_number}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <p className="text-sm font-medium text-[#304335]">
                              {formatRowHeading(row)}
                            </p>
                            <CardDescription>
                              {row.record_count} wpisow, lacznie{" "}
                              {formatHarvestKg(row.total_quantity_kg)}.
                            </CardDescription>
                          </div>
                        </div>
                        <div className="grid gap-3">
                          {row.ranges.map((range) => (
                            <div
                              className="grid gap-2 rounded-2xl border border-[#efe6d3] bg-[#fbfaf7] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_220px]"
                              key={`${plot.plot_id}:${row.row_number}:${range.from_position}:${range.to_position}`}
                            >
                              <div className="grid gap-1">
                                <p className="text-sm font-medium text-[#304335]">
                                  {range.from_position === range.to_position
                                    ? `Pozycja ${range.from_position}`
                                    : `Pozycje ${range.from_position}-${range.to_position}`}
                                </p>
                                <CardDescription>
                                  {range.record_count} wpisow w tym zakresie.
                                </CardDescription>
                              </div>
                              <div className="grid gap-1 text-sm text-[#5b6155] sm:justify-items-end">
                                <p>{formatHarvestKg(range.total_quantity_kg)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
