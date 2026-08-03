import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { PlotVisualOverview } from "@/features/plots/plot-visual-overview";
import { buildActivityPrefillHref } from "@/lib/domain/activity-prefill";
import { getTreeConditionLabel } from "@/lib/domain/labels";
import {
  PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS,
  PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT,
  buildPlotVisualRowFocusHref,
  hasActivePlotVisualRowDetailFilters,
  toPlotVisualTreeFilters,
} from "@/lib/domain/plot-visual-row-detail";
import type {
  ActivityScopeInput,
  PlotSummary,
  PlotVisualRowDetail,
  TreeConditionStatus,
  TreeSummary,
  VarietyOption,
} from "@/types/contracts";

type PlotVisualFocusedRowProps = {
  detail: PlotVisualRowDetail;
  plot: Pick<PlotSummary, "id" | "layout_type" | "name">;
  varietyOptions: VarietyOption[];
};

const conditionStatuses: TreeConditionStatus[] = [
  "new",
  "good",
  "warning",
  "critical",
  "removed",
];

function formatSectionName(sectionName: string | null) {
  return sectionName ? `Sekcja ${sectionName}` : "Bez sekcji";
}

function formatFocusedRowLabel(detail: PlotVisualRowDetail) {
  return `${formatSectionName(detail.section_name)}, rzad ${detail.row_number}`;
}

function buildTreeListHref(plotId: string) {
  const params = new URLSearchParams({
    plot_id: plotId,
    is_active: "true",
  });

  return `/trees?${params.toString()}`;
}

function buildRowActivityHref(detail: PlotVisualRowDetail) {
  const scope: ActivityScopeInput = {
    scope_order: 1,
    scope_level: "row",
    row_number: detail.row_number,
  };

  if (detail.section_name) {
    scope.section_name = detail.section_name;
  }

  return buildActivityPrefillHref({
    plot_id: detail.plot_id,
    scopes: [scope],
  });
}

function buildClearFiltersHref(detail: PlotVisualRowDetail) {
  return buildPlotVisualRowFocusHref(detail.plot_id, {
    ...detail.filters,
    lifecycle: "all",
    variety_id: "all",
    condition_status: "all",
    location_verified: "all",
  });
}

function RowFilterForm({
  detail,
  varietyOptions,
}: {
  detail: PlotVisualRowDetail;
  varietyOptions: VarietyOption[];
}) {
  const hasFilters = hasActivePlotVisualRowDetailFilters(detail.filters);

  return (
    <form className="grid gap-4 lg:grid-cols-5" method="get">
      <input
        name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.row_number}
        type="hidden"
        value={detail.row_number}
      />
      {detail.section_name ? (
        <input
          name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.section_name}
          type="hidden"
          value={detail.section_name}
        />
      ) : null}
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#304335]">Cykl zycia</span>
        <Select
          defaultValue={detail.filters.lifecycle}
          name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.lifecycle}
        >
          <option value="all">Wszystkie</option>
          <option value="active">Aktywne</option>
          <option value="removed">Historia</option>
        </Select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#304335]">Odmiana</span>
        <Select
          defaultValue={detail.filters.variety_id}
          name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.variety_id}
        >
          <option value="all">Wszystkie odmiany</option>
          <option value="unassigned">Bez odmiany</option>
          {varietyOptions.map((variety) => (
            <option key={variety.id} value={variety.id}>
              {variety.species} - {variety.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#304335]">Kondycja</span>
        <Select
          defaultValue={detail.filters.condition_status}
          name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.condition_status}
        >
          <option value="all">Wszystkie</option>
          {conditionStatuses.map((status) => (
            <option key={status} value={status}>
              {getTreeConditionLabel(status)}
            </option>
          ))}
        </Select>
      </label>
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[#304335]">Lokalizacja</span>
        <Select
          defaultValue={detail.filters.location_verified}
          name={PLOT_VISUAL_ROW_DETAIL_QUERY_PARAMS.location_verified}
        >
          <option value="all">Wszystkie</option>
          <option value="verified">Potwierdzone</option>
          <option value="unverified">Niepotwierdzone</option>
        </Select>
      </label>
      <div className="flex flex-col justify-end gap-3 sm:flex-row lg:flex-col">
        <Button type="submit">Zastosuj</Button>
        {hasFilters ? (
          <LinkButton href={buildClearFiltersHref(detail)} variant="ghost">
            Wyczysc
          </LinkButton>
        ) : null}
      </div>
    </form>
  );
}

function getTreeDisplayName(tree: TreeSummary) {
  return tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`;
}

function RowTreePreviewTable({ detail }: { detail: PlotVisualRowDetail }) {
  if (detail.filtered_tree_count === 0) {
    return (
      <p className="text-sm text-[#6f7469]">
        Ten rzad nie ma drzew pasujacych do aktywnych filtrow.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-xl border border-[#eadfcb] bg-white">
        <table className="min-w-full divide-y divide-[#eadfcb] text-left text-sm">
          <thead className="bg-[#fbfaf7] text-xs uppercase tracking-[0.16em] text-[#6f7469]">
            <tr>
              <th className="px-4 py-3 font-semibold">Pozycja</th>
              <th className="px-4 py-3 font-semibold">Drzewo</th>
              <th className="px-4 py-3 font-semibold">Odmiana</th>
              <th className="px-4 py-3 font-semibold">Kondycja</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Akcja</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#eadfcb]">
            {detail.filtered_trees.map((tree) => (
              <tr key={tree.id}>
                <td className="px-4 py-3 font-medium text-[#304335]">
                  {tree.position_in_row ?? "Brak"}
                </td>
                <td className="px-4 py-3 text-[#1f2a1f]">
                  {getTreeDisplayName(tree)}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {tree.variety_name ?? "Brak"}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {getTreeConditionLabel(tree.condition_status)}
                </td>
                <td className="px-4 py-3 text-[#4f584e]">
                  {tree.is_active ? "Aktywne" : "Historia"}
                </td>
                <td className="px-4 py-3">
                  <LinkButton href={`/trees/${tree.id}/edit`} variant="ghost">
                    Edytuj
                  </LinkButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {detail.filtered_trees_truncated ? (
        <p className="text-sm text-[#6f7469]">
          Pokazano pierwsze {PLOT_VISUAL_ROW_DETAIL_TABLE_PREVIEW_LIMIT} z{" "}
          {detail.filtered_tree_count} pasujacych drzew.
        </p>
      ) : null}
    </div>
  );
}

export function PlotVisualFocusedRow({
  detail,
  plot,
  varietyOptions,
}: PlotVisualFocusedRowProps) {
  const visualFilters = toPlotVisualTreeFilters(detail.filters);
  const rowActivityHref = buildRowActivityHref(detail);
  const treeListHref = buildTreeListHref(plot.id);

  return (
    <Card className="grid gap-6" data-testid="plot-visual-row-detail">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">
            Fokus rzedu: {formatFocusedRowLabel(detail)}
          </CardTitle>
          <CardDescription>
            {detail.row_tree_count} drzew w tym rzedzie. Widok jest ograniczony do
            jednej lokalizacji, wiec akcje wyboru nie wczytuja calej dzialki.
          </CardDescription>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton className="w-full sm:w-auto" href={`/plots/${plot.id}`} variant="secondary">
            Wroc do overview
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href={treeListHref} variant="secondary">
            Szukaj drzew
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href={rowActivityHref}>
            Dodaj aktywnosc
          </LinkButton>
        </div>
      </div>

      <RowFilterForm detail={detail} varietyOptions={varietyOptions} />

      {detail.row_tree_count === 0 ? (
        <p className="text-sm text-[#6f7469]">
          Ten rzad nie ma jeszcze drzew w aktywnym sadzie.
        </p>
      ) : detail.can_render_marker_visual ? (
        <PlotVisualOverview
          initialFilters={visualFilters}
          layoutType={plot.layout_type}
          plotId={plot.id}
          showFilters={false}
          trees={detail.row_trees}
        />
      ) : (
        <div className="grid gap-3">
          <div className="grid gap-1">
            <h3 className="text-base font-semibold text-[#304335]">
              Tabela rzedu
            </h3>
            <p className="text-sm text-[#6f7469]">
              Ten rzad przekracza limit markerow, wiec pokazujemy filtrowany
              podglad tabelaryczny.
            </p>
          </div>
          <RowTreePreviewTable detail={detail} />
        </div>
      )}
    </Card>
  );
}
