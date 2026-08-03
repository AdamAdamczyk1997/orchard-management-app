import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PLOT_TREE_SCALE_ROW_PREVIEW_LIMIT } from "@/lib/domain/plot-tree-scale";
import { buildPlotVisualRowFocusHref } from "@/lib/domain/plot-visual-row-detail";
import type {
  PlotSummary,
  PlotTreeScaleClass,
  PlotTreeScaleProfile,
  PlotTreeScaleRowSummary,
  PlotTreeScaleSectionSummary,
} from "@/types/contracts";

type PlotTreeScaleOverviewProps = {
  plot: Pick<PlotSummary, "id" | "name">;
  profile: PlotTreeScaleProfile;
};

const scaleLabels: Record<PlotTreeScaleClass, string> = {
  small: "mala dzialka",
  medium: "srednia dzialka",
  large: "duza dzialka",
};

function formatSectionName(sectionName: string | null) {
  return sectionName ? `Sekcja ${sectionName}` : "Bez sekcji";
}

function formatRowRange(section: PlotTreeScaleSectionSummary) {
  if (
    section.from_row_number === null ||
    section.to_row_number === null
  ) {
    return "Brak rzedow";
  }

  if (section.from_row_number === section.to_row_number) {
    return `Rzad ${section.from_row_number}`;
  }

  return `Rzedy ${section.from_row_number}-${section.to_row_number}`;
}

function formatPositionRange(row: PlotTreeScaleRowSummary) {
  if (row.from_position === null || row.to_position === null) {
    return "Brak pozycji";
  }

  if (row.from_position === row.to_position) {
    return `Poz. ${row.from_position}`;
  }

  return `Poz. ${row.from_position}-${row.to_position}`;
}

function buildTreeListHref(plotId: string) {
  const params = new URLSearchParams({
    plot_id: plotId,
    is_active: "true",
  });

  return `/trees?${params.toString()}`;
}

function buildActivityHref(plotId: string) {
  const params = new URLSearchParams({
    plot_id: plotId,
  });

  return `/activities/new?${params.toString()}`;
}

function buildRowFocusHref(plotId: string, row: PlotTreeScaleRowSummary) {
  return buildPlotVisualRowFocusHref(plotId, {
    section_name: row.section_name,
    row_number: row.row_number,
    lifecycle: "all",
    variety_id: "all",
    condition_status: "all",
    location_verified: "all",
  });
}

function CountPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#eadfcb] bg-white px-2.5 py-1 text-xs font-medium text-[#4f584e]">
      <span className="text-[#1f2a1f]">{value}</span>
      {label}
    </span>
  );
}

function SectionSummaryList({
  sections,
}: {
  sections: PlotTreeScaleSectionSummary[];
}) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-[#6f7469]">
        Brak kompletnych lokalizacji rzedowych do podsumowania sekcji.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {sections.map((section) => (
        <div
          className="grid gap-3 rounded-xl border border-[#eadfcb] bg-white px-4 py-4"
          key={section.key}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-1">
              <p className="font-semibold text-[#304335]">
                {formatSectionName(section.section_name)}
              </p>
              <p className="text-sm text-[#6f7469]">
                {formatRowRange(section)} · {section.row_count} rzedow
              </p>
            </div>
            <p className="text-2xl font-semibold text-[#1f2a1f]">
              {section.active_trees}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CountPill label="aktywnych" value={section.active_trees} />
            <CountPill label="historycznych" value={section.removed_or_inactive_trees} />
            <CountPill label="warning" value={section.warning_trees} />
            <CountPill label="critical" value={section.critical_trees} />
            <CountPill label="niepotw." value={section.unverified_trees} />
            {section.duplicate_active_locations > 0 ? (
              <CountPill
                label="duplikatow lok."
                value={section.duplicate_active_locations}
              />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function RowSummaryTable({
  plotId,
  rows,
}: {
  plotId: string;
  rows: PlotTreeScaleRowSummary[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[#6f7469]">
        Ta dzialka nie ma jeszcze drzew z kompletna para rzad + pozycja.
      </p>
    );
  }

  const visibleRows = rows.slice(0, PLOT_TREE_SCALE_ROW_PREVIEW_LIMIT);
  const hiddenRowsCount = rows.length - visibleRows.length;

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-xl border border-[#eadfcb] bg-white">
        <table className="min-w-full divide-y divide-[#eadfcb] text-left text-sm">
          <thead className="bg-[#fbfaf7] text-xs uppercase tracking-[0.16em] text-[#6f7469]">
            <tr>
              <th className="px-4 py-3 font-semibold">Rzad</th>
              <th className="px-4 py-3 font-semibold">Zakres</th>
              <th className="px-4 py-3 font-semibold">Aktywne</th>
              <th className="px-4 py-3 font-semibold">Historia</th>
              <th className="px-4 py-3 font-semibold">Alerty</th>
              <th className="px-4 py-3 font-semibold">Luki</th>
              <th className="px-4 py-3 font-semibold">Fokus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eadfcb]">
            {visibleRows.map((row) => (
              <tr key={row.key}>
                <td className="px-4 py-3 font-medium text-[#304335]">
                  {formatSectionName(row.section_name)}, rzad {row.row_number}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {formatPositionRange(row)}
                </td>
                <td className="px-4 py-3 text-[#1f2a1f]">{row.active_trees}</td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {row.removed_or_inactive_trees}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {row.warning_trees + row.critical_trees + row.unverified_trees}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {row.missing_positions_in_span}
                </td>
                <td className="px-4 py-3">
                  <LinkButton href={buildRowFocusHref(plotId, row)} variant="ghost">
                    Otworz
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hiddenRowsCount > 0 ? (
        <p className="text-sm text-[#6f7469]">
          Pokazano pierwsze {PLOT_TREE_SCALE_ROW_PREVIEW_LIMIT} rzedow z {rows.length}.
        </p>
      ) : null}
    </div>
  );
}

export function PlotTreeScaleOverview({
  plot,
  profile,
}: PlotTreeScaleOverviewProps) {
  const treeListHref = buildTreeListHref(plot.id);
  const activityHref = buildActivityHref(plot.id);

  return (
    <Card className="grid gap-6" data-testid="plot-tree-scale-overview">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Przeglad skali dzialki</CardTitle>
          <CardDescription>
            {plot.name} ma {profile.total_trees} drzew i jest klasyfikowana jako{" "}
            {scaleLabels[profile.scale_class]}. Pierwszy widok pokazuje podsumowanie
            rzedow zamiast pelnej mapy markerow.
          </CardDescription>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton className="w-full sm:w-auto" href={treeListHref} variant="secondary">
            Szukaj drzew
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href={activityHref}>
            Dodaj aktywnosc
          </LinkButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4">
          <p className="text-sm font-medium text-[#6f7469]">Rzedy</p>
          <p className="mt-1 text-2xl font-semibold text-[#1f2a1f]">
            {profile.row_count}
          </p>
        </div>
        <div className="rounded-xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4">
          <p className="text-sm font-medium text-[#6f7469]">Najdluzszy rzad</p>
          <p className="mt-1 text-2xl font-semibold text-[#1f2a1f]">
            {profile.max_row_length}
          </p>
        </div>
        <div className="rounded-xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4">
          <p className="text-sm font-medium text-[#6f7469]">Poza siatka</p>
          <p className="mt-1 text-2xl font-semibold text-[#1f2a1f]">
            {profile.unlocated_trees}
          </p>
        </div>
        <div className="rounded-xl border border-[#eadfcb] bg-[#fbfaf7] px-4 py-4">
          <p className="text-sm font-medium text-[#6f7469]">Duplikaty lokacji</p>
          <p className="mt-1 text-2xl font-semibold text-[#1f2a1f]">
            {profile.duplicate_active_location_count}
          </p>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <CountPill label="aktywnych" value={profile.active_trees} />
          <CountPill label="historycznych" value={profile.removed_or_inactive_trees} />
          <CountPill label="warning" value={profile.warning_trees} />
          <CountPill label="critical" value={profile.critical_trees} />
          <CountPill label="niepotwierdzonych" value={profile.unverified_trees} />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-[#304335]">Sekcje</h3>
          <p className="text-sm text-[#6f7469]">
            Podsumowanie pozwala ocenic obciazenie dzialki bez renderowania kazdego
            drzewa w siatce.
          </p>
        </div>
        <SectionSummaryList sections={profile.sections} />
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <h3 className="text-base font-semibold text-[#304335]">Rzedy</h3>
          <p className="text-sm text-[#6f7469]">
            Rzedy sa pokazane jako zakresy pozycji z licznikami drzew, alertow i luk.
          </p>
        </div>
        <RowSummaryTable plotId={plot.id} rows={profile.rows} />
      </div>
    </Card>
  );
}
