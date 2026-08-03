import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { PlotTreeScaleOverview } from "@/features/plots/plot-tree-scale-overview";
import { PlotVisualFocusedRow } from "@/features/plots/plot-visual-focused-row";
import { PlotVisualOverview } from "@/features/plots/plot-visual-overview";
import {
  formatPlotDefaultGridLabel,
  getPlotLayoutTypeLabel,
  getPlotOperationalLocationGuidance,
  getRowNumberingSchemeLabel,
  getTreeNumberingSchemeLabel,
} from "@/lib/domain/plots";
import { getPlotStatusLabel } from "@/lib/domain/labels";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import {
  getPlotVisualRowDetailForOrchard,
  getPlotTreeScaleProfileForOrchard,
  listTreesForPlotInOrchard,
} from "@/lib/orchard-data/trees";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  parsePlotVisualRowFocusParams,
} from "@/lib/domain/plot-visual-row-detail";
import {
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import type { PlotSummary } from "@/types/contracts";

type PlotDetailPageProps = {
  params: Promise<{
    plotId: string;
  }>;
  searchParams: Promise<NextSearchParams>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string) {
  return uuidPattern.test(value);
}

function PlotMetadata({ plot }: { plot: PlotSummary }) {
  return (
    <Card className="grid gap-4">
      <div className="grid gap-1">
        <CardTitle className="text-lg">Ustawienia dzialki</CardTitle>
        <CardDescription>{getPlotOperationalLocationGuidance(plot.layout_type)}</CardDescription>
      </div>
      <div className="grid gap-3 text-sm text-[#5b6155] md:grid-cols-2">
        <p>
          <span className="font-medium text-[#304335]">Status:</span>{" "}
          {getPlotStatusLabel(plot.status)}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Uklad:</span>{" "}
          {getPlotLayoutTypeLabel(plot.layout_type)}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Kod:</span>{" "}
          {plot.code ?? "Brak"}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Aktywny rekord:</span>{" "}
          {plot.is_active ? "Tak" : "Nie"}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Numeracja rzedow:</span>{" "}
          {plot.row_numbering_scheme
            ? getRowNumberingSchemeLabel(plot.row_numbering_scheme)
            : "Brak"}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Numeracja drzew:</span>{" "}
          {plot.tree_numbering_scheme
            ? getTreeNumberingSchemeLabel(plot.tree_numbering_scheme)
            : "Brak"}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Planowana siatka:</span>{" "}
          {formatPlotDefaultGridLabel(plot)}
        </p>
        <p>
          <span className="font-medium text-[#304335]">Powierzchnia:</span>{" "}
          {plot.area_m2 ? `${plot.area_m2} m2` : "Brak"}
        </p>
      </div>
      {plot.entrance_description ? (
        <CardDescription>
          <span className="font-medium text-[#304335]">Punkt odniesienia:</span>{" "}
          {plot.entrance_description}
        </CardDescription>
      ) : null}
      {plot.layout_notes ? <CardDescription>{plot.layout_notes}</CardDescription> : null}
    </Card>
  );
}

export default async function PlotDetailPage({
  params,
  searchParams,
}: PlotDetailPageProps) {
  const context = await requireActiveOrchard("/plots");
  const [{ plotId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);

  if (!isUuid(plotId)) {
    return (
      <RecordNotFoundCard
        backHref="/plots"
        description="Nie da sie otworzyc tej dzialki, bo identyfikator w adresie nie jest poprawnym UUID."
        title="Nie znaleziono dzialki"
      />
    );
  }

  const rowFocusFilters = parsePlotVisualRowFocusParams(
    toUrlSearchParams(resolvedSearchParams),
  );
  const [plot, scaleProfile, rowDetail, varietyOptions] = await Promise.all([
    readPlotByIdForOrchard(context.orchard.id, plotId),
    getPlotTreeScaleProfileForOrchard(context.orchard.id, plotId),
    rowFocusFilters
      ? getPlotVisualRowDetailForOrchard(
          context.orchard.id,
          plotId,
          rowFocusFilters,
        )
      : Promise.resolve(null),
    rowFocusFilters
      ? listVarietyOptionsForOrchard(context.orchard.id)
      : Promise.resolve([]),
  ]);

  if (!plot) {
    return (
      <RecordNotFoundCard
        backHref="/plots"
        description="Nie da sie otworzyc tej dzialki, bo nie istnieje w aktywnym sadzie albo nie masz do niej dostepu."
        title="Nie znaleziono dzialki"
      />
    );
  }

  const trees = !rowDetail && scaleProfile.should_render_full_visual
    ? await listTreesForPlotInOrchard(context.orchard.id, plotId)
    : [];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Dzialka
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">{plot.name}</h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            {plot.location_name ??
              "Operacyjny widok dzialki oparty o aktualne drzewa i zapisane ustawienia ukladu."}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton className="w-full sm:w-auto" href="/plots" variant="secondary">
            Wroc do dzialek
          </LinkButton>
          <LinkButton
            className="w-full sm:w-auto"
            href={`/plots/${plot.id}/edit`}
            variant="secondary"
          >
            Edytuj dzialke
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href="/activities/new">
            Dodaj aktywnosc
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Aktywne drzewa</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {scaleProfile.active_trees}
          </p>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Historyczne</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {scaleProfile.removed_or_inactive_trees}
          </p>
          <CardDescription>Removed albo nieaktywne.</CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Niepotwierdzone</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {scaleProfile.unverified_trees}
          </p>
          <CardDescription>Lokalizacja wymaga sprawdzenia.</CardDescription>
        </Card>
        <Card className="grid gap-2 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
          <CardTitle className="text-lg">Poza siatka</CardTitle>
          <p className="text-3xl font-semibold text-[#1f2a1f]">
            {scaleProfile.unlocated_trees}
          </p>
          <CardDescription>Brak kompletnej pary rzad + pozycja.</CardDescription>
        </Card>
      </div>

      <PlotMetadata plot={plot} />
      {rowDetail ? (
        <PlotVisualFocusedRow
          detail={rowDetail}
          plot={plot}
          varietyOptions={varietyOptions}
        />
      ) : scaleProfile.should_render_full_visual ? (
        <PlotVisualOverview
          layoutType={plot.layout_type}
          plotId={plot.id}
          trees={trees}
        />
      ) : (
        <PlotTreeScaleOverview plot={plot} profile={scaleProfile} />
      )}
    </div>
  );
}
