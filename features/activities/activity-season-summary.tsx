import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import {
  ACTIVITY_PRUNING_SUBTYPES,
  ACTIVITY_SCOPE_REQUIRED_TYPES,
  formatActivityScopeLabel,
  getActivityPruningSubtypeLabel,
  getActivityTypeLabel,
} from "@/lib/domain/activities";
import type {
  ActiveMemberOption,
  PlotOption,
  SeasonalActivityCoverage,
  SeasonalActivitySummary,
  SeasonalActivitySummaryFilters,
} from "@/types/contracts";

type ActivitySeasonSummaryProps = {
  summary: SeasonalActivitySummary;
  coverage: SeasonalActivityCoverage;
  filters: SeasonalActivitySummaryFilters;
  plotOptions: PlotOption[];
  memberOptions: ActiveMemberOption[];
  preservedListParams: Array<{
    name: string;
    value: string;
  }>;
  resetHref: string;
};

type CoverageGroup = {
  activity_id: string;
  activity_date: string;
  plot_name: string;
  activity_type: SeasonalActivityCoverage[number]["activity_type"];
  activity_subtype: SeasonalActivityCoverage[number]["activity_subtype"];
  scopes: SeasonalActivityCoverage[number]["scope"][];
};

function formatActivityDate(activityDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(activityDate));
}

function groupCoverageByActivity(coverage: SeasonalActivityCoverage) {
  const groups = new Map<string, CoverageGroup>();

  for (const item of coverage) {
    const existingGroup = groups.get(item.activity_id);

    if (existingGroup) {
      existingGroup.scopes.push(item.scope);
      continue;
    }

    groups.set(item.activity_id, {
      activity_id: item.activity_id,
      activity_date: item.activity_date,
      plot_name: item.plot_name,
      activity_type: item.activity_type,
      activity_subtype: item.activity_subtype ?? null,
      scopes: [item.scope],
    });
  }

  return [...groups.values()];
}

function HiddenInputs({
  entries,
}: {
  entries: ActivitySeasonSummaryProps["preservedListParams"];
}) {
  return entries.map((entry) => (
    <input
      key={`${entry.name}:${entry.value}`}
      name={entry.name}
      type="hidden"
      value={entry.value}
    />
  ));
}

export function ActivitySeasonSummary({
  summary,
  coverage,
  filters,
  plotOptions,
  memberOptions,
  preservedListParams,
  resetHref,
}: ActivitySeasonSummaryProps) {
  const coverageGroups = groupCoverageByActivity(coverage);

  return (
    <Card className="grid gap-5">
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Podsumowanie sezonowe
        </p>
        <CardTitle className="text-lg">
          {getActivityTypeLabel(filters.activity_type)} w sezonie {filters.season_year}
        </CardTitle>
        <CardDescription>
          Raport opiera sie tylko na wykonanych wpisach i zapisanych `activity_scopes`.
        </CardDescription>
      </div>

      <form className="grid gap-4 lg:grid-cols-3" method="get">
        <HiddenInputs entries={preservedListParams} />
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#304335]">Sezon</span>
          <Input
            defaultValue={String(filters.season_year)}
            max="9999"
            min="2000"
            name="summary_season_year"
            type="number"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#304335]">Typ aktywnosci</span>
          <Select
            defaultValue={filters.activity_type}
            name="summary_activity_type"
          >
            {ACTIVITY_SCOPE_REQUIRED_TYPES.map((activityType) => (
              <option key={activityType} value={activityType}>
                {getActivityTypeLabel(activityType)}
              </option>
            ))}
          </Select>
        </label>
        {filters.activity_type === "pruning" ? (
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Podtyp ciecia</span>
            <Select
              defaultValue={filters.activity_subtype ?? ""}
              name="summary_activity_subtype"
            >
              <option value="">Wszystkie podtypy</option>
              {ACTIVITY_PRUNING_SUBTYPES.map((subtype) => (
                <option key={subtype} value={subtype}>
                  {getActivityPruningSubtypeLabel(subtype)}
                </option>
              ))}
            </Select>
          </label>
        ) : null}
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[#304335]">Dzialka do coverage</span>
          <Select defaultValue={filters.plot_id ?? ""} name="summary_plot_id">
            <option value="">Bez wybranej dzialki</option>
            {plotOptions.map((plot) => (
              <option key={plot.id} value={plot.id}>
                {plot.name}
                {plot.status === "archived" ? " (zarchiwizowana)" : ""}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-2 lg:col-span-2">
          <span className="text-sm font-medium text-[#304335]">Wykonawca</span>
          <Select
            defaultValue={filters.performed_by_profile_id ?? ""}
            name="summary_performed_by_profile_id"
          >
            <option value="">Wszyscy wykonawcy</option>
            {memberOptions.map((member) => (
              <option key={member.profile_id} value={member.profile_id}>
                {member.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
          <Button type="submit" variant="secondary">
            Pokaz podsumowanie
          </Button>
          <LinkButton href={resetHref} variant="ghost">
            Przywroc domyslne
          </LinkButton>
        </div>
      </form>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="grid gap-4">
          <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
            <CardTitle className="text-lg">Wykonane wpisy</CardTitle>
            <p className="text-3xl font-semibold text-[#1f2a1f]">
              {summary.total_done_count}
            </p>
            <CardDescription>
              Wszystkie rekordy `done` po zastosowaniu aktywnych filtrow.
            </CardDescription>
          </Card>
          <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
            <CardTitle className="text-lg">Dzialki z wykonaniem</CardTitle>
            <p className="text-3xl font-semibold text-[#1f2a1f]">
              {summary.affected_plots.length}
            </p>
            <CardDescription>
              Liczba dzialek, na ktorych odnotowano wykonane prace tego typu.
            </CardDescription>
          </Card>
        </div>

        <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <div className="grid gap-1">
            <CardTitle className="text-lg">Rozklad po dzialkach</CardTitle>
            <CardDescription>
              Agregacja pokazuje liczbe wykonanych wpisow i ostatnia date pracy.
            </CardDescription>
          </div>
          {summary.affected_plots.length === 0 ? (
            <CardDescription>
              Nie znaleziono wykonanych aktywnosci dla wybranych filtrow.
            </CardDescription>
          ) : (
            <div className="grid gap-3">
              {summary.affected_plots.map((plot) => (
                <div
                  className="grid gap-2 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4 sm:grid-cols-[minmax(0,1fr)_180px]"
                  key={plot.plot_id}
                >
                  <div className="grid gap-1">
                    <p className="text-sm font-medium text-[#304335]">{plot.plot_name}</p>
                    <CardDescription>
                      Ostatnia aktywnosc:{" "}
                      {plot.last_activity_date
                        ? formatActivityDate(plot.last_activity_date)
                        : "Brak"}
                    </CardDescription>
                  </div>
                  <div className="text-sm text-[#5b6155] sm:text-right">
                    <span className="font-medium text-[#304335]">Liczba wpisow:</span>{" "}
                    {plot.total_done_count}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Coverage po zapisanych zakresach</CardTitle>
          <CardDescription>
            Widok pokazuje kazdy zapisany `activity_scope` bez inferencji z danych drzew.
          </CardDescription>
        </div>

        {!filters.plot_id ? (
          <CardDescription>
            Wybierz konkretna dzialke w filtrach podsumowania, aby zobaczyc coverage.
          </CardDescription>
        ) : coverageGroups.length === 0 ? (
          <CardDescription>
            Dla tej dzialki i tych filtrow nie znaleziono zapisanych zakresow wykonania.
          </CardDescription>
        ) : (
          <div className="grid gap-3">
            {coverageGroups.map((group) => (
              <div
                className="grid gap-3 rounded-2xl border border-[#e3d8c4] bg-white px-4 py-4"
                key={group.activity_id}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="grid gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-[#304335]">
                        {getActivityTypeLabel(group.activity_type)}
                      </p>
                      {group.activity_subtype ? (
                        <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                          {getActivityPruningSubtypeLabel(group.activity_subtype)}
                        </span>
                      ) : null}
                    </div>
                    <CardDescription>
                      {formatActivityDate(group.activity_date)} · {group.plot_name}
                    </CardDescription>
                  </div>
                  <LinkButton
                    href={`/activities/${group.activity_id}`}
                    variant="ghost"
                  >
                    Szczegoly wpisu
                  </LinkButton>
                </div>
                <div className="grid gap-2">
                  {group.scopes.map((scope) => (
                    <div
                      className="rounded-2xl border border-[#eee5d5] bg-[#fbfaf7] px-4 py-3 text-sm text-[#5b6155]"
                      key={scope.id}
                    >
                      <span className="font-medium text-[#304335]">
                        {formatActivityScopeLabel(scope)}
                      </span>
                      {scope.notes ? ` · ${scope.notes}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Card>
  );
}
