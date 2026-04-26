import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getPlotStatusLabel } from "@/lib/domain/labels";
import type { PlotSummary } from "@/types/contracts";
import { archivePlot, restorePlot } from "@/server/actions/plots";

type PlotListProps = {
  plots: PlotSummary[];
  redirectTo: string;
  hasActiveFilters: boolean;
  clearHref: string;
  createHref: string;
};

export function PlotList({
  plots,
  redirectTo,
  hasActiveFilters,
  clearHref,
  createHref,
}: PlotListProps) {
  if (plots.length === 0) {
    return hasActiveFilters ? (
      <EmptyStateCard
        actions={[
          { href: clearHref, label: "Wyczysc filtry", variant: "secondary" },
          { href: createHref, label: "Utworz dzialke", variant: "ghost" },
        ]}
        description="Zmien status albo wyczysc filtry, aby zobaczyc pozostale dzialki w aktywnym sadzie."
        title="Brak wynikow dla wybranych filtrow"
      />
    ) : (
      <EmptyStateCard
        actions={[{ href: createHref, label: "Utworz dzialke" }]}
        description="Dodaj pierwsza dzialke, aby zaczac budowac strukture aktywnego sadu."
        title="Brak dzialek"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {plots.map((plot) => (
        <Card className="grid gap-4" key={plot.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{plot.name}</CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {getPlotStatusLabel(plot.status)}
                </span>
                {plot.code ? (
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    {plot.code}
                  </span>
                ) : null}
              </div>
              {plot.location_name ? (
                <CardDescription>{plot.location_name}</CardDescription>
              ) : (
                <CardDescription>Brak opisu lokalizacji.</CardDescription>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/plots/${plot.id}/edit`}
              >
                Edytuj
              </Link>
              <form action={plot.status === "archived" ? restorePlot : archivePlot}>
                <input name="plot_id" type="hidden" value={plot.id} />
                <input name="redirect_to" type="hidden" value={redirectTo} />
                <Button type="submit" variant={plot.status === "archived" ? "secondary" : "ghost"}>
                  {plot.status === "archived" ? "Przywroc" : "Archiwizuj"}
                </Button>
              </form>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Powierzchnia:</span>{" "}
              {plot.area_m2 ? `${plot.area_m2} m2` : "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Gleba:</span>{" "}
              {plot.soil_type ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Nawadnianie:</span>{" "}
              {plot.irrigation_type ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Aktywny rekord:</span>{" "}
              {plot.is_active ? "Tak" : "Nie"}
            </p>
          </div>
          {plot.description ? (
            <CardDescription>{plot.description}</CardDescription>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
