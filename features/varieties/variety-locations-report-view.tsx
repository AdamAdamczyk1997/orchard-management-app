import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { LinkButton } from "@/components/ui/link-button";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { Select } from "@/components/ui/select";
import { formatVarietyLocationRangeLabel } from "@/lib/domain/variety-locations";
import { getPlotStatusLabel } from "@/lib/domain/labels";
import { buildPathWithSearchParams } from "@/lib/utils/search-params";
import type {
  VarietyLocationsReport,
  VarietyOption,
} from "@/types/contracts";

type VarietyLocationsReportViewProps = {
  varietyOptions: VarietyOption[];
  selectedVarietyId?: string;
  report: VarietyLocationsReport | null;
  isMissingSelectedVariety: boolean;
  resetHref: string;
};

function buildTreesHref(varietyId: string, plotId?: string) {
  const searchParams = new URLSearchParams();
  searchParams.set("variety_id", varietyId);
  searchParams.set("is_active", "true");

  if (plotId) {
    searchParams.set("plot_id", plotId);
  }

  return buildPathWithSearchParams("/trees", searchParams);
}

function formatSelectedVarietyLabel(report: VarietyLocationsReport) {
  return `${report.variety_species} - ${report.variety_name}`;
}

function formatGroupHeading(group: VarietyLocationsReport["groups"][number]) {
  if (group.section_name) {
    return `${group.plot_name} - ${group.section_name} - Rzad ${group.row_number}`;
  }

  return `${group.plot_name} - Rzad ${group.row_number}`;
}

export function VarietyLocationsReportView({
  varietyOptions,
  selectedVarietyId,
  report,
  isMissingSelectedVariety,
  resetHref,
}: VarietyLocationsReportViewProps) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Raporty
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Raport lokalizacji odmiany
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Widok terenowy pokazuje aktywne drzewa jednej odmiany, grupuje je po
            dzialce, sekcji i rzedzie oraz scala kolejne pozycje w czytelne zakresy.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          {report ? (
            <LinkButton
              className="w-full sm:w-auto"
              href={buildTreesHref(report.variety_id)}
              variant="secondary"
            >
              Pokaz drzewa tej odmiany
            </LinkButton>
          ) : null}
          <LinkButton className="w-full sm:w-auto" href="/varieties" variant="ghost">
            Wroc do odmian
          </LinkButton>
        </div>
      </div>

      {varietyOptions.length === 0 ? (
        <PrerequisiteCard
          actions={[
            { href: "/varieties/new", label: "Utworz odmiane" },
            { href: "/varieties", label: "Wroc do odmian", variant: "secondary" },
          ]}
          description="Raport lokalizacji wymaga co najmniej jednej odmiany zapisanej w aktywnym sadzie."
          eyebrow="Raport lokalizacji"
          title="Najpierw dodaj odmiane"
        />
      ) : (
        <>
          <Card className="grid gap-4">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Filtr raportu</CardTitle>
              <CardDescription>
                Wybierz odmiane, aby zobaczyc lokalizacje aktywnych drzew i zakresy
                gotowe do pracy w terenie.
              </CardDescription>
            </div>
            <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]" method="get">
              <label className="grid gap-2">
                <span className="text-sm font-medium text-[#304335]">Odmiana</span>
                <Select defaultValue={selectedVarietyId ?? ""} name="variety_id">
                  <option value="">Wybierz odmiane</option>
                  {varietyOptions.map((variety) => (
                    <option key={variety.id} value={variety.id}>
                      {variety.species} - {variety.name}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <Button className="w-full sm:w-auto" type="submit" variant="secondary">
                  Pokaz raport
                </Button>
                <LinkButton className="w-full sm:w-auto" href={resetHref} variant="ghost">
                  Wyczysc filtry
                </LinkButton>
              </div>
            </form>
          </Card>

          {isMissingSelectedVariety ? (
            <RecordNotFoundCard
              backHref={resetHref}
              backLabel="Wroc do wyboru odmiany"
              description="Wybrana odmiana nie jest dostepna w aktywnym sadzie albo nie mozna jej juz odczytac z tego kontekstu."
              title="Nie znaleziono tej odmiany"
            />
          ) : !selectedVarietyId || !report ? (
            <EmptyStateCard
              actions={[
                { href: "/varieties", label: "Przejdz do odmian", variant: "secondary" },
              ]}
              description="Po wyborze odmiany zobaczysz tylko aktywne drzewa z wystarczajaco precyzyjna lokalizacja oraz licznik rekordow poza raportem."
              title="Wybierz odmiane do raportu"
            />
          ) : (
            <>
              <Card className="grid gap-3">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
                    Wybrana odmiana
                  </p>
                  <CardTitle>{formatSelectedVarietyLabel(report)}</CardTitle>
                  <CardDescription>
                    Raport obejmuje tylko aktywne drzewa z aktywnego sadu. Do grup
                    terenowych trafiaja wylacznie rekordy z konkretnym `row_number`
                    oraz `position_in_row`.
                  </CardDescription>
                </div>
              </Card>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
                  <CardTitle className="text-lg">Aktywne drzewa</CardTitle>
                  <p className="text-3xl font-semibold text-[#1f2a1f]">
                    {report.total_active_trees_count}
                  </p>
                  <CardDescription>
                    Wszystkie aktywne drzewa tej odmiany w biezacym sadzie.
                  </CardDescription>
                </Card>
                <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
                  <CardTitle className="text-lg">Drzewa w raporcie</CardTitle>
                  <p className="text-3xl font-semibold text-[#1f2a1f]">
                    {report.located_trees_count}
                  </p>
                  <CardDescription>
                    Rekordy z row i position gotowe do grupowania w zakresy.
                  </CardDescription>
                </Card>
                <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
                  <CardTitle className="text-lg">Potwierdzone lokalizacje</CardTitle>
                  <p className="text-3xl font-semibold text-[#1f2a1f]">
                    {report.verified_trees_count}
                  </p>
                  <CardDescription>
                    {report.unverified_trees_count > 0
                      ? `${report.unverified_trees_count} drzew z raportu nadal czeka na potwierdzenie.`
                      : "Wszystkie drzewa z raportu maja potwierdzona lokalizacje."}
                  </CardDescription>
                </Card>
              </div>

              {report.total_active_trees_count === 0 ? (
                <EmptyStateCard
                  actions={[
                    { href: "/trees/new", label: "Utworz drzewo" },
                    {
                      href: `/varieties/${report.variety_id}/edit`,
                      label: "Edytuj odmiane",
                      variant: "secondary",
                    },
                  ]}
                  description="Odmiana istnieje w bibliotece, ale nie ma jeszcze zadnych aktywnych drzew przypisanych do tej odmiany."
                  title="Brak aktywnych drzew dla tej odmiany"
                />
              ) : report.located_trees_count === 0 ? (
                <EmptyStateCard
                  actions={[
                    {
                      href: buildTreesHref(report.variety_id),
                      label: "Pokaz drzewa tej odmiany",
                    },
                    {
                      href: "/trees/batch/new",
                      label: "Przejdz do batch create",
                      variant: "secondary",
                    },
                  ]}
                  description="Aktywne drzewa tej odmiany istnieja, ale nie maja jeszcze kompletnej lokalizacji rzedowej potrzebnej do raportu terenowego."
                  title="Brak drzew z raportowalna lokalizacja"
                />
              ) : (
                <>
                  {report.unlocated_trees_count > 0 ? (
                    <Card className="grid gap-3 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
                      <CardTitle className="text-lg">
                        Nie wszystkie drzewa weszly do grup terenowych
                      </CardTitle>
                      <CardDescription>
                        Poza raportem pozostaje {report.unlocated_trees_count} aktywnych
                        drzew tej odmiany bez kompletnego `row_number` i
                        `position_in_row`. Warto uzupelnic te rekordy, zanim raport
                        bedzie uzywany jako referencja terenowa.
                      </CardDescription>
                      <div className="flex flex-wrap gap-3">
                        <LinkButton href={buildTreesHref(report.variety_id)}>
                          Uzupelnij drzewa tej odmiany
                        </LinkButton>
                      </div>
                    </Card>
                  ) : null}

                  <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
                    <div className="grid gap-1">
                      <CardTitle className="text-lg">Zakresy lokalizacji</CardTitle>
                      <CardDescription>
                        Grupy sa ukladane po dzialce, sekcji i rzedzie. Kolejne pozycje
                        w tym samym rzedzie lacza sie w jeden zakres.
                      </CardDescription>
                    </div>
                    <div className="grid gap-4">
                      {report.groups.map((group) => (
                        <div
                          className="grid gap-4 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4"
                          key={`${group.plot_id}:${group.section_name ?? ""}:${group.row_number}`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="grid gap-1">
                              <p className="text-sm font-medium text-[#304335]">
                                {formatGroupHeading(group)}
                              </p>
                              <CardDescription>
                                Status dzialki: {getPlotStatusLabel(group.plot_status)}.
                              </CardDescription>
                            </div>
                            <LinkButton
                              href={buildTreesHref(report.variety_id, group.plot_id)}
                              variant="ghost"
                            >
                              Pokaz drzewa dzialki
                            </LinkButton>
                          </div>

                          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-3">
                            <p>
                              <span className="font-medium text-[#304335]">Drzewa:</span>{" "}
                              {group.tree_count}
                            </p>
                            <p>
                              <span className="font-medium text-[#304335]">
                                Potwierdzone:
                              </span>{" "}
                              {group.verified_trees_count}
                            </p>
                            <p>
                              <span className="font-medium text-[#304335]">
                                Niepotwierdzone:
                              </span>{" "}
                              {group.unverified_trees_count}
                            </p>
                          </div>

                          <div className="grid gap-3">
                            {group.ranges.map((range) => (
                              <div
                                className="grid gap-2 rounded-2xl border border-[#efe6d3] bg-[#fbfaf7] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_220px]"
                                key={`${group.plot_id}:${group.row_number}:${range.from_position}:${range.to_position}`}
                              >
                                <div className="grid gap-1">
                                  <p className="text-sm font-medium text-[#304335]">
                                    {formatVarietyLocationRangeLabel(range)}
                                  </p>
                                  <CardDescription>
                                    Liczba drzew w zakresie: {range.tree_count}
                                  </CardDescription>
                                </div>
                                <div className="grid gap-1 text-sm text-[#5b6155] sm:justify-items-end">
                                  <p>
                                    Potwierdzone: {range.verified_trees_count}
                                  </p>
                                  <p>
                                    Niepotwierdzone: {range.unverified_trees_count}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
