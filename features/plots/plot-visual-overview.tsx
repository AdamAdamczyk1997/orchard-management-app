"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { PlotTreeDetailPanel } from "@/features/plots/plot-tree-detail-panel";
import {
  buildActivityPrefillFromPlotSelection,
  buildActivityPrefillHref,
} from "@/lib/domain/activity-prefill";
import { getTreeConditionLabel } from "@/lib/domain/labels";
import {
  buildBulkTreeBatchPrefillFromEmptyRange,
  buildBulkTreeBatchPrefillHref,
  buildBulkDeactivateTreesPrefillHref,
  resolveBulkDeactivateTreesPrefillFromPlotSelection,
  type BulkTreeBatchPrefill,
  type PlotEmptyPositionSelection,
  type PlotEmptyRangePosition,
} from "@/lib/domain/tree-batch-prefill";
import {
  buildSameRowPlotSelectionRange,
  compressPlotSelectionToActivityScopes,
  getPlotSelectionActivityActionState,
  isSelectablePlotSelectionTree,
  type PlotSelectionActivityActionState,
  type PlotSelectionCompressionResult,
  type PlotSelectionMode,
  type PlotSelectionRangeError,
} from "@/lib/domain/plot-selection";
import {
  DEFAULT_PLOT_VISUAL_TREE_FILTERS,
  buildPlotVisualGrid,
  filterPlotVisualTrees,
  hasActivePlotVisualTreeFilters,
  type PlotVisualPosition,
  type PlotVisualTreeFilters,
  type PlotVisualTreePosition,
} from "@/lib/domain/plot-visual-grid";
import type {
  PlotLayoutType,
  TreeConditionStatus,
  TreeSummary,
} from "@/types/contracts";

type PlotVisualOverviewProps = {
  layoutType: PlotLayoutType;
  plotId: string;
  trees: TreeSummary[];
};

type VarietyFilterOption = {
  id: string;
  label: string;
};

type TreeInteractionHandler = (
  tree: TreeSummary,
  trigger: HTMLButtonElement,
) => void;

type EmptyPositionInteractionHandler = (
  position: PlotEmptyPositionSelection,
  rowPositions: PlotEmptyRangePosition[],
) => void;

function getTreeDisplayName(tree: TreeSummary) {
  return tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`;
}

function getTreeLocationSummary(tree: TreeSummary) {
  return (
    tree.location_label ??
    ([
      tree.section_name ? `Sekcja ${tree.section_name}` : null,
      typeof tree.row_number === "number" ? `rzad ${tree.row_number}` : null,
      typeof tree.position_in_row === "number"
        ? `pozycja ${tree.position_in_row}`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Brak pelnej lokalizacji")
  );
}

function hasCompleteRangeLocation(tree: TreeSummary) {
  return (
    typeof tree.row_number === "number" &&
    typeof tree.position_in_row === "number"
  );
}

function getRangeSelectionErrorMessage(error: PlotSelectionRangeError) {
  switch (error) {
    case "unsupported_layout":
      return "Zakres jest dostepny tylko dla ukladu rows albo mixed.";
    case "missing_location":
      return "Zakres wymaga drzew z row_number i position_in_row.";
    case "different_plot":
      return "Zakres musi zostac w tej samej dzialce.";
    case "different_row":
      return "Koniec zakresu musi byc w tym samym rzedzie i sekcji.";
    case "empty_range":
      return "W tym zakresie nie ma aktywnych drzew do zaznaczenia.";
  }
}

function getEmptyPositionLabel(position: PlotEmptyPositionSelection) {
  const section = position.section_name ? `sekcja ${position.section_name}, ` : "";

  return `${section}rzad ${position.row_number}, pozycja ${position.position}`;
}

function isSameEmptyPosition(
  left: PlotEmptyPositionSelection | null,
  right: PlotEmptyPositionSelection,
) {
  return Boolean(
    left &&
      left.plot_id === right.plot_id &&
      left.row_number === right.row_number &&
      (left.section_name ?? null) === (right.section_name ?? null) &&
      left.position === right.position,
  );
}

function isEmptyPositionInPrefillRange(
  position: PlotEmptyPositionSelection,
  prefill: BulkTreeBatchPrefill | null,
) {
  if (!prefill) {
    return false;
  }

  return (
    prefill.plot_id === position.plot_id &&
    prefill.row_number === position.row_number &&
    (prefill.section_name ?? null) === (position.section_name ?? null) &&
    position.position >= prefill.from_position &&
    position.position <= prefill.to_position
  );
}

function mapRowPositionsForPlantNew(
  positions: PlotVisualPosition[],
): PlotEmptyRangePosition[] {
  return positions.map((position) => ({
    position: position.position,
    kind: position.kind === "empty_inferred" ? "empty_inferred" : "occupied",
  }));
}

function getTreeMarkerClasses(
  position: PlotVisualTreePosition,
  isSelected: boolean,
  isRangeAnchor: boolean,
  isDisabled: boolean,
) {
  const baseClasses =
    "flex h-12 w-12 shrink-0 cursor-pointer flex-col items-center justify-center rounded-full border text-[11px] font-semibold transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#b48446] focus:ring-offset-2 focus:ring-offset-[#fbfaf7]";
  const verificationClasses = position.tree.location_verified
    ? ""
    : " ring-2 ring-[#b48446] ring-offset-2 ring-offset-[#fbfaf7]";
  const selectedClasses = isSelected
    ? " outline outline-2 outline-[#1f3c28] outline-offset-2"
    : "";
  const rangeAnchorClasses = isRangeAnchor
    ? " outline outline-2 outline-[#4f6f8f] outline-offset-2"
    : "";
  const disabledClasses = isDisabled
    ? " cursor-not-allowed opacity-50 hover:scale-100"
    : "";

  if (position.kind === "removed_tree") {
    return `${baseClasses} border-[#c9c2b4] bg-[#ede9df] text-[#6f7469] opacity-70${verificationClasses}${selectedClasses}${rangeAnchorClasses}${disabledClasses}`;
  }

  switch (position.tree.condition_status) {
    case "critical":
      return `${baseClasses} border-[#9a3f2b] bg-[#f2d6cf] text-[#6f2419]${verificationClasses}${selectedClasses}${rangeAnchorClasses}${disabledClasses}`;
    case "warning":
      return `${baseClasses} border-[#b48446] bg-[#f5e7c8] text-[#6d4c1d]${verificationClasses}${selectedClasses}${rangeAnchorClasses}${disabledClasses}`;
    case "new":
      return `${baseClasses} border-[#6b8f71] bg-[#e4f0df] text-[#244a2d]${verificationClasses}${selectedClasses}${rangeAnchorClasses}${disabledClasses}`;
    default:
      return `${baseClasses} border-[#47724f] bg-[#dcebd8] text-[#1f3c28]${verificationClasses}${selectedClasses}${rangeAnchorClasses}${disabledClasses}`;
  }
}

function getPlotMarkerTestId(position: PlotVisualPosition) {
  return `plot-visual-marker-${position.kind.replaceAll("_", "-")}`;
}

function PlotMarker({
  position,
  mode,
  plotId,
  rowNumber,
  sectionName,
  rowPositions,
  canSelectEmptyPositions,
  plantRangeAnchor,
  plantRangePrefill,
  selectedTreeId,
  selectedTreeIds,
  rangeAnchorTreeId,
  onEmptyPositionAction,
  onTreeAction,
}: {
  position: PlotVisualPosition;
  mode: PlotSelectionMode;
  plotId: string;
  rowNumber: number;
  sectionName: string | null;
  rowPositions: PlotVisualPosition[];
  canSelectEmptyPositions: boolean;
  plantRangeAnchor: PlotEmptyPositionSelection | null;
  plantRangePrefill: BulkTreeBatchPrefill | null;
  selectedTreeId: string | null;
  selectedTreeIds: string[];
  rangeAnchorTreeId: string | null;
  onEmptyPositionAction: EmptyPositionInteractionHandler;
  onTreeAction: TreeInteractionHandler;
}) {
  if (position.kind === "empty_inferred") {
    const emptyPosition: PlotEmptyPositionSelection = {
      plot_id: plotId,
      section_name: sectionName,
      row_number: rowNumber,
      position: position.position,
    };
    const isPlantAnchor = isSameEmptyPosition(plantRangeAnchor, emptyPosition);
    const isPlantRangePosition = isEmptyPositionInPrefillRange(
      emptyPosition,
      plantRangePrefill,
    );
    const emptyClasses = `flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-dashed border-[#cfc4ae] bg-[#fbfaf7] text-[11px] font-semibold text-[#9a8d78] ${
      isPlantAnchor || isPlantRangePosition
        ? "outline outline-2 outline-[#1f3c28] outline-offset-2"
        : ""
    }`;

    if (mode === "select") {
      return (
        <button
          aria-label={`Puste miejsce, ${getEmptyPositionLabel(emptyPosition)}`}
          aria-pressed={isPlantAnchor || isPlantRangePosition}
          className={`${emptyClasses} ${
            canSelectEmptyPositions
              ? "cursor-pointer transition hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-[#b48446] focus:ring-offset-2 focus:ring-offset-[#fbfaf7]"
              : "cursor-not-allowed opacity-50"
          }`}
          data-testid={getPlotMarkerTestId(position)}
          disabled={!canSelectEmptyPositions}
          onClick={() =>
            onEmptyPositionAction(
              emptyPosition,
              mapRowPositionsForPlantNew(rowPositions),
            )
          }
          title={`Puste miejsce, ${getEmptyPositionLabel(emptyPosition)}`}
          type="button"
        >
          {position.position}
        </button>
      );
    }

    return (
      <div
        aria-label={`Puste miejsce, ${getEmptyPositionLabel(emptyPosition)}`}
        className={emptyClasses}
        data-testid={getPlotMarkerTestId(position)}
        title={`Puste miejsce, ${getEmptyPositionLabel(emptyPosition)}`}
      >
        {position.position}
      </div>
    );
  }

  const tree = position.tree;
  const isSelectionMode = mode === "select";
  const isSelected = isSelectionMode
    ? selectedTreeIds.includes(tree.id)
    : selectedTreeId === tree.id;
  const isRangeAnchor = isSelectionMode && rangeAnchorTreeId === tree.id;
  const isDisabled = isSelectionMode && !isSelectablePlotSelectionTree(tree);
  const label = `${getTreeDisplayName(tree)} - ${getTreeConditionLabel(
    tree.condition_status,
  )}, ${getTreeLocationSummary(tree)}`;
  const markerLabel = [
    label,
    isSelected ? "wybrane" : null,
    isRangeAnchor ? "poczatek zakresu" : null,
    isDisabled ? "niedostepne do zaznaczenia" : null,
  ]
    .filter(Boolean)
    .join(" - ");

  return (
    <button
      aria-label={markerLabel}
      aria-pressed={isSelected}
      className={getTreeMarkerClasses(
        position,
        isSelected,
        isRangeAnchor,
        isDisabled,
      )}
      data-testid={getPlotMarkerTestId(position)}
      disabled={isDisabled}
      onClick={(event: MouseEvent<HTMLButtonElement>) =>
        onTreeAction(tree, event.currentTarget)
      }
      title={label}
      type="button"
    >
      <span>{position.position}</span>
      {position.historical_trees.length > 0 ? (
        <span className="text-[9px] font-medium">hist.</span>
      ) : null}
    </button>
  );
}

function TreeFallbackList({
  trees,
  title,
  description,
  mode,
  selectedTreeId,
  selectedTreeIds,
  rangeAnchorTreeId,
  onTreeAction,
}: {
  trees: TreeSummary[];
  title: string;
  description: string;
  mode: PlotSelectionMode;
  selectedTreeId: string | null;
  selectedTreeIds: string[];
  rangeAnchorTreeId: string | null;
  onTreeAction: TreeInteractionHandler;
}) {
  if (trees.length === 0) {
    return null;
  }

  return (
    <Card
      className="grid gap-4 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none"
      data-testid="plot-visual-fallback"
    >
      <div className="grid gap-1">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {trees.map((tree) => {
          const isSelectionMode = mode === "select";
          const isSelected = isSelectionMode
            ? selectedTreeIds.includes(tree.id)
            : selectedTreeId === tree.id;
          const isRangeAnchor = isSelectionMode && rangeAnchorTreeId === tree.id;
          const isDisabled =
            isSelectionMode && !isSelectablePlotSelectionTree(tree);

          return (
            <div
              className={`grid gap-2 rounded-2xl border border-[#dfd3bb] bg-white/80 px-4 py-3 text-sm ${
                isSelected || isRangeAnchor
                  ? "outline outline-2 outline-[#1f3c28] outline-offset-2"
                  : ""
              }`}
              data-testid="plot-visual-fallback-tree"
              key={tree.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-[#304335]">
                  {getTreeDisplayName(tree)}
                </p>
                <span className="rounded-full bg-[#efe6d3] px-2 py-1 text-xs font-medium text-[#355139]">
                  {getTreeConditionLabel(tree.condition_status)}
                </span>
                {!tree.is_active ? (
                  <span className="rounded-full border border-[#dfd3bb] px-2 py-1 text-xs font-medium text-[#5b6155]">
                    Nieaktywne
                  </span>
                ) : null}
                {isRangeAnchor ? (
                  <span className="rounded-full border border-[#afc1d1] px-2 py-1 text-xs font-medium text-[#304c67]">
                    Poczatek zakresu
                  </span>
                ) : null}
              </div>
              <p className="text-[#5b6155]">{getTreeLocationSummary(tree)}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button
                  aria-pressed={isSelectionMode ? isSelected : undefined}
                  className="w-full sm:w-fit"
                  data-testid="plot-visual-fallback-tree-details"
                  disabled={isDisabled}
                  onClick={(event: MouseEvent<HTMLButtonElement>) =>
                    onTreeAction(tree, event.currentTarget)
                  }
                  type="button"
                  variant="secondary"
                >
                  {isSelectionMode
                    ? isSelected
                      ? "Odznacz"
                      : "Zaznacz"
                    : "Szczegoly"}
                </Button>
                <LinkButton
                  className="w-full sm:w-fit"
                  href={`/trees/${tree.id}/edit`}
                  variant="ghost"
                >
                  Edytuj drzewo
                </LinkButton>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function getVarietyOptionLabel(tree: TreeSummary) {
  if (tree.variety_name) {
    return tree.variety_species
      ? `${tree.variety_species} - ${tree.variety_name}`
      : tree.variety_name;
  }

  return tree.variety_id ?? "Nieznana odmiana";
}

function buildVarietyOptions(trees: TreeSummary[]): VarietyFilterOption[] {
  const options = new Map<string, VarietyFilterOption>();

  for (const tree of trees) {
    if (!tree.variety_id) {
      continue;
    }

    options.set(tree.variety_id, {
      id: tree.variety_id,
      label: getVarietyOptionLabel(tree),
    });
  }

  return [...options.values()].sort((left, right) =>
    left.label.localeCompare(right.label, "pl"),
  );
}

function buildConditionOptions(trees: TreeSummary[]) {
  return [...new Set(trees.map((tree) => tree.condition_status))].sort(
    (left, right) =>
      getTreeConditionLabel(left).localeCompare(getTreeConditionLabel(right), "pl"),
  );
}

function PlotVisualFilters({
  filters,
  totalCount,
  filteredCount,
  varietyOptions,
  conditionOptions,
  onChange,
  onReset,
}: {
  filters: PlotVisualTreeFilters;
  totalCount: number;
  filteredCount: number;
  varietyOptions: VarietyFilterOption[];
  conditionOptions: TreeConditionStatus[];
  onChange: <Key extends keyof PlotVisualTreeFilters>(
    key: Key,
    value: PlotVisualTreeFilters[Key],
  ) => void;
  onReset: () => void;
}) {
  const hasActiveFilters = hasActivePlotVisualTreeFilters(filters);

  return (
    <Card className="grid gap-4" data-testid="plot-visual-filters">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry widoku</CardTitle>
          <CardDescription data-testid="plot-visual-filter-count">
            Pokazano {filteredCount} z {totalCount} drzew
          </CardDescription>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={!hasActiveFilters}
          onClick={onReset}
          type="button"
          variant="secondary"
        >
          Reset filtrow
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium text-[#304335]">
          Lifecycle
          <Select
            id="plot_visual_lifecycle"
            onChange={(event) =>
              onChange(
                "lifecycle",
                event.target.value as PlotVisualTreeFilters["lifecycle"],
              )
            }
            value={filters.lifecycle}
          >
            <option value="all">Wszystkie</option>
            <option value="active">Aktywne</option>
            <option value="removed">Historyczne</option>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-[#304335]">
          Odmiana
          <Select
            id="plot_visual_variety"
            onChange={(event) =>
              onChange(
                "variety_id",
                event.target.value as PlotVisualTreeFilters["variety_id"],
              )
            }
            value={filters.variety_id}
          >
            <option value="all">Wszystkie</option>
            <option value="unassigned">Bez odmiany</option>
            {varietyOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-[#304335]">
          Stan
          <Select
            id="plot_visual_condition"
            onChange={(event) =>
              onChange(
                "condition_status",
                event.target.value as PlotVisualTreeFilters["condition_status"],
              )
            }
            value={filters.condition_status}
          >
            <option value="all">Wszystkie</option>
            {conditionOptions.map((condition) => (
              <option key={condition} value={condition}>
                {getTreeConditionLabel(condition)}
              </option>
            ))}
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium text-[#304335]">
          Lokalizacja
          <Select
            id="plot_visual_location_verified"
            onChange={(event) =>
              onChange(
                "location_verified",
                event.target
                  .value as PlotVisualTreeFilters["location_verified"],
              )
            }
            value={filters.location_verified}
          >
            <option value="all">Wszystkie</option>
            <option value="verified">Potwierdzone</option>
            <option value="unverified">Niepotwierdzone</option>
          </Select>
        </label>
      </div>
    </Card>
  );
}

function FilteredEmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="grid gap-3" data-testid="plot-visual-filtered-empty">
      <CardTitle className="text-lg">Brak drzew dla wybranych filtrow</CardTitle>
      <CardDescription>
        Zmien kryteria albo zresetuj filtry, aby wrocic do pelnego widoku
        dzialki.
      </CardDescription>
      <Button className="w-full sm:w-fit" onClick={onReset} type="button">
        Reset filtrow
      </Button>
    </Card>
  );
}

function formatSelectedTreeCount(count: number) {
  if (count === 1) {
    return "Wybrano 1 drzewo";
  }

  if (count >= 2 && count <= 4) {
    return `Wybrano ${count} drzewa`;
  }

  return `Wybrano ${count} drzew`;
}

function formatScopeCount(count: number) {
  if (count === 1) {
    return "1 zakres";
  }

  if (count >= 2 && count <= 4) {
    return `${count} zakresy`;
  }

  return `${count} zakresow`;
}

function getSelectionActivityActionMessage(
  actionState: PlotSelectionActivityActionState,
  compression: PlotSelectionCompressionResult,
) {
  switch (actionState.block_reason) {
    case "empty_selection":
      return "Zaznacz co najmniej jedno aktywne drzewo.";
    case "cross_plot_selection":
      return "Zaznaczenie musi dotyczyc jednej dzialki.";
    case "scope_count_limit_exceeded":
      return `Zaznaczenie ma ${formatScopeCount(
        compression.scopes.length,
      )}. Limit MVP to ${compression.scope_count_limit}.`;
    case "query_string_limit_exceeded":
      return "Zaznaczenie przekracza limit URL dla prefill.";
    case "invalid_selection":
      return "Zaznaczenie nie moze zostac uzyte do aktywnosci.";
    default:
      return `Gotowe do aktywnosci: ${formatScopeCount(
        compression.scopes.length,
      )}.`;
  }
}

function PlotSelectionSummary({
  compression,
  selectedTrees,
  onClear,
}: {
  compression: PlotSelectionCompressionResult;
  selectedTrees: TreeSummary[];
  onClear: () => void;
}) {
  const hasSelection = compression.selected_tree_count > 0;
  const activityActionState =
    getPlotSelectionActivityActionState(compression);
  const activityActionMessage = getSelectionActivityActionMessage(
    activityActionState,
    compression,
  );
  const activityPrefill = buildActivityPrefillFromPlotSelection({
    selectedTrees,
    activityScopes: compression.activity_scopes,
  });
  const activityHref = activityPrefill
    ? buildActivityPrefillHref(activityPrefill)
    : null;
  const bulkDeactivateActionState = resolveBulkDeactivateTreesPrefillFromPlotSelection({
    selectedTrees,
    activityScopes: compression.activity_scopes,
  });
  const bulkDeactivateHref = bulkDeactivateActionState.prefill
    ? buildBulkDeactivateTreesPrefillHref(bulkDeactivateActionState.prefill)
    : null;

  return (
    <div
      className="grid gap-3 rounded-xl border border-[#eadfcb] bg-[#fbfaf7] p-4"
      data-testid="plot-selection-summary"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-semibold text-[#304335]">
          {formatSelectedTreeCount(compression.selected_tree_count)}
        </p>
        <Button
          className="w-full sm:w-auto"
          disabled={!hasSelection}
          onClick={onClear}
          type="button"
          variant="ghost"
        >
          Wyczysc
        </Button>
      </div>

      {compression.scopes.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {compression.scopes.map((scope) => (
            <span
              className="rounded-full border border-[#dfd3bb] bg-white px-3 py-1 text-xs font-medium text-[#304335]"
              data-testid="plot-selection-scope-summary"
              key={scope.key}
            >
              {scope.label}
            </span>
          ))}
        </div>
      ) : null}

      {compression.excluded_tree_ids.length > 0 ? (
        <p className="text-sm text-[#6d4c1d]">
          Pominieto {compression.excluded_tree_ids.length} historycznych drzew.
        </p>
      ) : null}

      {compression.scope_count_limit_exceeded ? (
        <p className="text-sm text-[#8d3323]" data-testid="plot-selection-limit-warning">
          Zaznaczenie ma {compression.scopes.length} zakresow. Limit MVP to{" "}
          {compression.scope_count_limit}.
        </p>
      ) : null}

      {compression.query_string_limit_exceeded ? (
        <p className="text-sm text-[#8d3323]" data-testid="plot-selection-query-warning">
          Zaznaczenie przekracza limit URL dla przyszlego prefill.
        </p>
      ) : null}

      <div
        className="flex flex-col gap-2 rounded-xl border border-[#dfd3bb] bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
        data-state={activityActionState.status}
        data-testid="plot-selection-action-state"
      >
        <p
          aria-live="polite"
          className={
            activityActionState.can_start_activity
              ? "text-sm font-medium text-[#244a2d]"
              : "text-sm font-medium text-[#6d4c1d]"
          }
          data-testid="plot-selection-action-message"
        >
          {activityActionMessage}
        </p>
        {activityActionState.can_start_activity && activityHref ? (
          <LinkButton
            className="w-full sm:w-auto"
            data-testid="plot-selection-add-activity"
            href={activityHref}
            variant="secondary"
          >
            Dodaj aktywnosc
          </LinkButton>
        ) : (
          <Button
            className="w-full sm:w-auto"
            data-testid="plot-selection-add-activity"
            disabled
            type="button"
            variant="secondary"
          >
            Dodaj aktywnosc
          </Button>
        )}
      </div>

      <div
        className="flex flex-col gap-2 rounded-xl border border-[#dfd3bb] bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
        data-state={bulkDeactivateActionState.status}
        data-testid="plot-selection-bulk-deactivate-state"
      >
        <p
          aria-live="polite"
          className={
            bulkDeactivateActionState.can_start
              ? "text-sm font-medium text-[#244a2d]"
              : "text-sm font-medium text-[#6d4c1d]"
          }
          data-testid="plot-selection-bulk-deactivate-message"
        >
          {bulkDeactivateActionState.message}
        </p>
        {bulkDeactivateActionState.can_start && bulkDeactivateHref ? (
          <LinkButton
            className="w-full sm:w-auto"
            data-testid="plot-selection-bulk-deactivate"
            href={bulkDeactivateHref}
            variant="danger"
          >
            Wycofaj drzewa
          </LinkButton>
        ) : (
          <Button
            className="w-full sm:w-auto"
            data-testid="plot-selection-bulk-deactivate"
            disabled
            type="button"
            variant="danger"
          >
            Wycofaj drzewa
          </Button>
        )}
      </div>
    </div>
  );
}

function PlantNewSelectionSummary({
  canSelectEmptyPositions,
  disabledMessage,
  plantRangeAnchor,
  plantRangeHref,
  plantRangeMessage,
  plantRangePrefill,
  onClear,
}: {
  canSelectEmptyPositions: boolean;
  disabledMessage: string | null;
  plantRangeAnchor: PlotEmptyPositionSelection | null;
  plantRangeHref: string | null;
  plantRangeMessage: string | null;
  plantRangePrefill: BulkTreeBatchPrefill | null;
  onClear: () => void;
}) {
  const hasPlantSelection = Boolean(plantRangeAnchor || plantRangePrefill);
  const state = plantRangePrefill
    ? "ready"
    : plantRangeAnchor
      ? "selecting"
      : canSelectEmptyPositions
        ? "empty"
        : "blocked";
  const message =
    plantRangeMessage ??
    disabledMessage ??
    (plantRangeAnchor
      ? `Poczatek sadzenia: ${getEmptyPositionLabel(
          plantRangeAnchor,
        )}. Kliknij drugie puste miejsce w tym samym rzedzie.`
      : "Kliknij puste inferowane miejsce w siatce, aby przygotowac Plant New.");

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border border-[#dfd3bb] bg-white/80 p-3 sm:flex-row sm:items-center sm:justify-between"
      data-state={state}
      data-testid="plot-selection-plant-new-state"
    >
      <div className="grid gap-1">
        <p
          aria-live="polite"
          className={
            plantRangePrefill
              ? "text-sm font-medium text-[#244a2d]"
              : "text-sm font-medium text-[#6d4c1d]"
          }
          data-testid="plot-selection-plant-new-message"
        >
          {message}
        </p>
        {hasPlantSelection ? (
          <button
            className="w-fit text-sm font-medium text-[#274430] underline-offset-4 hover:underline"
            onClick={onClear}
            type="button"
          >
            Wyczysc puste miejsca
          </button>
        ) : null}
      </div>
      {plantRangePrefill && plantRangeHref ? (
        <LinkButton
          className="w-full sm:w-auto"
          data-testid="plot-selection-plant-new"
          href={plantRangeHref}
          variant="secondary"
        >
          Dosadz drzewa
        </LinkButton>
      ) : (
        <Button
          className="w-full sm:w-auto"
          data-testid="plot-selection-plant-new"
          disabled
          type="button"
          variant="secondary"
        >
          Dosadz drzewa
        </Button>
      )}
    </div>
  );
}

function PlotVisualModeToolbar({
  mode,
  compression,
  canSelectEmptyPositions,
  plantRangeAnchor,
  plantRangeHref,
  plantRangeMessage,
  plantRangePrefill,
  plantSelectionDisabledMessage,
  selectedTrees,
  rangeSelectionActive,
  rangeAnchorTree,
  rangeSelectionMessage,
  onModeChange,
  onClearSelection,
  onClearPlantRange,
  onStartRangeSelection,
  onCancelRangeSelection,
}: {
  mode: PlotSelectionMode;
  compression: PlotSelectionCompressionResult;
  canSelectEmptyPositions: boolean;
  plantRangeAnchor: PlotEmptyPositionSelection | null;
  plantRangeHref: string | null;
  plantRangeMessage: string | null;
  plantRangePrefill: BulkTreeBatchPrefill | null;
  plantSelectionDisabledMessage: string | null;
  selectedTrees: TreeSummary[];
  rangeSelectionActive: boolean;
  rangeAnchorTree: TreeSummary | null;
  rangeSelectionMessage: string | null;
  onModeChange: (mode: PlotSelectionMode) => void;
  onClearSelection: () => void;
  onClearPlantRange: () => void;
  onStartRangeSelection: () => void;
  onCancelRangeSelection: () => void;
}) {
  const rangeStatus = rangeSelectionActive
    ? rangeSelectionMessage ??
      (rangeAnchorTree
        ? `Poczatek zakresu: ${getTreeLocationSummary(rangeAnchorTree)}`
        : "Wybierz poczatek zakresu")
    : null;

  return (
    <Card className="grid gap-4" data-testid="plot-visual-mode-toolbar">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle className="text-lg">Tryb pracy</CardTitle>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            aria-pressed={mode === "browse"}
            data-testid="plot-visual-mode-browse"
            onClick={() => onModeChange("browse")}
            type="button"
            variant={mode === "browse" ? "primary" : "secondary"}
          >
            Browse
          </Button>
          <Button
            aria-pressed={mode === "select"}
            data-testid="plot-visual-mode-select"
            onClick={() => onModeChange("select")}
            type="button"
            variant={mode === "select" ? "primary" : "secondary"}
          >
            Select
          </Button>
        </div>
      </div>

      {mode === "select" ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              aria-pressed={rangeSelectionActive}
              className="w-full sm:w-auto"
              data-testid="plot-selection-range-start"
              onClick={onStartRangeSelection}
              type="button"
              variant={rangeSelectionActive ? "primary" : "secondary"}
            >
              Zakres
            </Button>
            <Button
              className="w-full sm:w-auto"
              data-testid="plot-selection-range-cancel"
              disabled={!rangeSelectionActive}
              onClick={onCancelRangeSelection}
              type="button"
              variant="ghost"
            >
              Anuluj zakres
            </Button>
          </div>

          {rangeStatus ? (
            <p
              aria-live="polite"
              className="text-sm text-[#5b6155]"
              data-testid="plot-selection-range-status"
            >
              {rangeStatus}
            </p>
          ) : null}

          <PlotSelectionSummary
            compression={compression}
            selectedTrees={selectedTrees}
            onClear={onClearSelection}
          />
          <PlantNewSelectionSummary
            canSelectEmptyPositions={canSelectEmptyPositions}
            disabledMessage={plantSelectionDisabledMessage}
            plantRangeAnchor={plantRangeAnchor}
            plantRangeHref={plantRangeHref}
            plantRangeMessage={plantRangeMessage}
            plantRangePrefill={plantRangePrefill}
            onClear={onClearPlantRange}
          />
        </>
      ) : null}
    </Card>
  );
}

export function PlotVisualOverview({
  layoutType,
  plotId,
  trees,
}: PlotVisualOverviewProps) {
  const [filters, setFilters] = useState<PlotVisualTreeFilters>(
    DEFAULT_PLOT_VISUAL_TREE_FILTERS,
  );
  const [mode, setMode] = useState<PlotSelectionMode>("browse");
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>(null);
  const [selectedTreeIds, setSelectedTreeIds] = useState<string[]>([]);
  const [rangeSelectionActive, setRangeSelectionActive] = useState(false);
  const [rangeAnchorTreeId, setRangeAnchorTreeId] = useState<string | null>(
    null,
  );
  const [rangeSelectionMessage, setRangeSelectionMessage] = useState<
    string | null
  >(null);
  const [plantRangeAnchor, setPlantRangeAnchor] =
    useState<PlotEmptyPositionSelection | null>(null);
  const [plantRangePrefill, setPlantRangePrefill] =
    useState<BulkTreeBatchPrefill | null>(null);
  const [plantRangeMessage, setPlantRangeMessage] = useState<string | null>(null);
  const lastTreeTriggerRef = useRef<HTMLButtonElement | null>(null);
  const varietyOptions = useMemo(() => buildVarietyOptions(trees), [trees]);
  const conditionOptions = useMemo(() => buildConditionOptions(trees), [trees]);
  const filteredTrees = useMemo(
    () => filterPlotVisualTrees(trees, filters),
    [trees, filters],
  );
  const grid = useMemo(
    () => buildPlotVisualGrid({ layout_type: layoutType }, filteredTrees),
    [layoutType, filteredTrees],
  );
  const selectedTree = useMemo(
    () => filteredTrees.find((tree) => tree.id === selectedTreeId) ?? null,
    [filteredTrees, selectedTreeId],
  );
  const selectedTrees = useMemo(
    () => filteredTrees.filter((tree) => selectedTreeIds.includes(tree.id)),
    [filteredTrees, selectedTreeIds],
  );
  const rangeAnchorTree = useMemo(
    () => filteredTrees.find((tree) => tree.id === rangeAnchorTreeId) ?? null,
    [filteredTrees, rangeAnchorTreeId],
  );
  const selectionCompression = useMemo(
    () =>
      compressPlotSelectionToActivityScopes({
        layout_type: layoutType,
        trees: selectedTrees,
      }),
    [layoutType, selectedTrees],
  );
  const hasActiveFilters = hasActivePlotVisualTreeFilters(filters);
  const supportsPlantNewSelection = layoutType !== "irregular";
  const canSelectEmptyPositions =
    mode === "select" && supportsPlantNewSelection && !hasActiveFilters;
  const plantSelectionDisabledMessage = supportsPlantNewSelection
    ? hasActiveFilters
      ? "Wyczysc filtry, aby wybierac puste miejsca do Plant New."
      : null
    : "Plant New z mapy jest dostepne tylko dla dzialek rows albo mixed.";
  const plantRangeHref = plantRangePrefill
    ? buildBulkTreeBatchPrefillHref(plantRangePrefill)
    : null;

  useEffect(() => {
    if (
      selectedTreeId &&
      !filteredTrees.some((tree) => tree.id === selectedTreeId)
    ) {
      setSelectedTreeId(null);
    }

    setSelectedTreeIds((currentIds) =>
      currentIds.filter((treeId) =>
        filteredTrees.some(
          (tree) => tree.id === treeId && isSelectablePlotSelectionTree(tree),
        ),
      ),
    );

    if (
      rangeAnchorTreeId &&
      !filteredTrees.some(
        (tree) =>
          tree.id === rangeAnchorTreeId && isSelectablePlotSelectionTree(tree),
      )
    ) {
      setRangeAnchorTreeId(null);
      setRangeSelectionMessage(null);
    }
  }, [filteredTrees, rangeAnchorTreeId, selectedTreeId]);

  useEffect(() => {
    if (!supportsPlantNewSelection || hasActiveFilters) {
      setPlantRangeAnchor(null);
      setPlantRangePrefill(null);
      setPlantRangeMessage(null);
    }
  }, [hasActiveFilters, supportsPlantNewSelection]);

  function updateFilter<Key extends keyof PlotVisualTreeFilters>(
    key: Key,
    value: PlotVisualTreeFilters[Key],
  ) {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilters(DEFAULT_PLOT_VISUAL_TREE_FILTERS);
  }

  function changeMode(nextMode: PlotSelectionMode) {
    setMode(nextMode);
    setSelectedTreeId(null);

    if (nextMode === "browse") {
      setSelectedTreeIds([]);
      setRangeSelectionActive(false);
      setRangeAnchorTreeId(null);
      setRangeSelectionMessage(null);
      setPlantRangeAnchor(null);
      setPlantRangePrefill(null);
      setPlantRangeMessage(null);
    }
  }

  function selectTree(tree: TreeSummary, trigger: HTMLButtonElement) {
    lastTreeTriggerRef.current = trigger;
    setSelectedTreeId(tree.id);
  }

  function toggleTreeSelection(tree: TreeSummary) {
    if (!isSelectablePlotSelectionTree(tree)) {
      return;
    }

    setSelectedTreeIds((currentIds) =>
      currentIds.includes(tree.id)
        ? currentIds.filter((treeId) => treeId !== tree.id)
        : [...currentIds, tree.id],
    );
  }

  function startRangeSelection() {
    setRangeSelectionActive(true);
    setRangeAnchorTreeId(null);
    setRangeSelectionMessage(null);
  }

  function cancelRangeSelection() {
    setRangeSelectionActive(false);
    setRangeAnchorTreeId(null);
    setRangeSelectionMessage(null);
  }

  function addTreesToSelection(nextTrees: TreeSummary[]) {
    setSelectedTreeIds((currentIds) => {
      const nextIds = new Set(currentIds);

      for (const tree of nextTrees) {
        nextIds.add(tree.id);
      }

      return [...nextIds];
    });
  }

  function handleRangeSelection(tree: TreeSummary) {
    if (!isSelectablePlotSelectionTree(tree)) {
      return;
    }

    if (layoutType === "irregular" || !hasCompleteRangeLocation(tree)) {
      setRangeSelectionMessage(
        getRangeSelectionErrorMessage(
          layoutType === "irregular" ? "unsupported_layout" : "missing_location",
        ),
      );
      return;
    }

    if (!rangeAnchorTreeId) {
      setRangeAnchorTreeId(tree.id);
      setRangeSelectionMessage(null);
      return;
    }

    const anchorTree = filteredTrees.find(
      (candidate) => candidate.id === rangeAnchorTreeId,
    );

    if (!anchorTree) {
      setRangeAnchorTreeId(tree.id);
      setRangeSelectionMessage(null);
      return;
    }

    const rangeResult = buildSameRowPlotSelectionRange({
      layout_type: layoutType,
      trees: filteredTrees,
      start_tree: anchorTree,
      end_tree: tree,
    });

    if (!rangeResult.ok) {
      setRangeSelectionMessage(getRangeSelectionErrorMessage(rangeResult.error));
      return;
    }

    addTreesToSelection(rangeResult.trees);
    setRangeSelectionActive(false);
    setRangeAnchorTreeId(null);
    setRangeSelectionMessage(null);
  }

  function clearSelection() {
    setSelectedTreeIds([]);
    setRangeAnchorTreeId(null);
    setRangeSelectionMessage(null);
  }

  function clearPlantRangeSelection() {
    setPlantRangeAnchor(null);
    setPlantRangePrefill(null);
    setPlantRangeMessage(null);
  }

  function handleEmptyPositionSelection(
    position: PlotEmptyPositionSelection,
    rowPositions: PlotEmptyRangePosition[],
  ) {
    if (!canSelectEmptyPositions) {
      setPlantRangeMessage(
        plantSelectionDisabledMessage ??
          "Nie mozna teraz wybrac pustego miejsca do Plant New.",
      );
      return;
    }

    if (plantRangePrefill) {
      setPlantRangeAnchor(position);
      setPlantRangePrefill(null);
      setPlantRangeMessage(null);
      return;
    }

    if (!plantRangeAnchor) {
      setPlantRangeAnchor(position);
      setPlantRangeMessage(null);
      return;
    }

    const result = buildBulkTreeBatchPrefillFromEmptyRange({
      start: plantRangeAnchor,
      end: position,
      rowPositions,
    });

    if (!result.ok) {
      setPlantRangeMessage(result.message);
      return;
    }

    setPlantRangeAnchor(null);
    setPlantRangePrefill(result.prefill);
    setPlantRangeMessage(result.message);
  }

  function handleTreeAction(tree: TreeSummary, trigger: HTMLButtonElement) {
    if (mode === "select") {
      if (rangeSelectionActive) {
        handleRangeSelection(tree);
        return;
      }

      toggleTreeSelection(tree);
      return;
    }

    selectTree(tree, trigger);
  }

  const closeTreePanel = useCallback(() => {
    setSelectedTreeId(null);
    window.requestAnimationFrame(() => {
      const trigger = lastTreeTriggerRef.current;

      if (trigger?.isConnected) {
        trigger.focus();
      }
    });
  }, []);

  if (trees.length === 0) {
    return (
      <Card className="grid gap-3">
        <CardTitle className="text-lg">Brak drzew w tej dzialce</CardTitle>
        <CardDescription>
          Dodaj pojedyncze drzewo albo uzyj batch create, aby zaczac budowac
          widok operacyjny tej dzialki.
        </CardDescription>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <LinkButton className="w-full sm:w-auto" href="/trees/new">
            Utworz drzewo
          </LinkButton>
          <LinkButton
            className="w-full sm:w-auto"
            href="/trees/batch/new"
            variant="secondary"
          >
            Batch create
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      <PlotVisualFilters
        conditionOptions={conditionOptions}
        filteredCount={filteredTrees.length}
        filters={filters}
        onChange={updateFilter}
        onReset={resetFilters}
        totalCount={trees.length}
        varietyOptions={varietyOptions}
      />

      <PlotVisualModeToolbar
        canSelectEmptyPositions={canSelectEmptyPositions}
        compression={selectionCompression}
        mode={mode}
        plantRangeAnchor={plantRangeAnchor}
        plantRangeHref={plantRangeHref}
        plantRangeMessage={plantRangeMessage}
        plantRangePrefill={plantRangePrefill}
        plantSelectionDisabledMessage={plantSelectionDisabledMessage}
        selectedTrees={selectedTrees}
        rangeAnchorTree={rangeAnchorTree}
        rangeSelectionActive={rangeSelectionActive}
        rangeSelectionMessage={rangeSelectionMessage}
        onCancelRangeSelection={cancelRangeSelection}
        onClearPlantRange={clearPlantRangeSelection}
        onClearSelection={clearSelection}
        onModeChange={changeMode}
        onStartRangeSelection={startRangeSelection}
      />

      {filteredTrees.length === 0 && hasActiveFilters ? (
        <FilteredEmptyState onReset={resetFilters} />
      ) : (
        <>
          {grid.warnings.length > 0 ? (
            <div className="grid gap-2">
              {grid.warnings.map((warning) => (
                <div
                  className="rounded-2xl border border-[#d8b675] bg-[#f8f0df] px-4 py-3 text-sm text-[#6d4c1d]"
                  data-testid={`plot-visual-warning-${warning.code}`}
                  key={warning.code}
                >
                  {warning.message}
                </div>
              ))}
            </div>
          ) : null}

          {grid.mode === "grid" && grid.sections.length > 0 ? (
            <Card className="grid gap-5" data-testid="plot-visual-grid">
              <div className="grid gap-1">
                <CardTitle className="text-lg">Schemat rzedow</CardTitle>
                <CardDescription>
                  Read-only widok pozycji wyliczony z aktualnych rekordow drzew.
                  Puste miejsca sa inferowane tylko miedzy realnymi pozycjami w
                  rzedzie.
                </CardDescription>
              </div>
              <div className="grid gap-3 text-sm">
                <div className="flex flex-wrap gap-3 text-[#5b6155]">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#dcebd8]" />{" "}
                    Aktywne
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#ede9df]" />{" "}
                    Usuniete / nieaktywne
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border border-dashed border-[#cfc4ae] bg-[#fbfaf7]" />{" "}
                    Puste inferowane
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#dcebd8] ring-2 ring-[#b48446]" />{" "}
                    Lokalizacja niepotwierdzona
                  </span>
                </div>
              </div>

              <div className="grid gap-5">
                {grid.sections.map((section) => (
                  <div className="grid gap-3" key={section.key}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-[#304335]">
                        {section.section_name
                          ? `Sekcja ${section.section_name}`
                          : "Bez sekcji"}
                      </p>
                      <p className="text-sm text-[#6f7469]">
                        {section.rows.length} rzedow
                      </p>
                    </div>
                    <div className="grid gap-3">
                      {section.rows.map((row) => (
                        <div
                          className="grid gap-2 rounded-2xl border border-[#eadfcb] bg-[#fbfaf7] p-4"
                          key={row.key}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium text-[#304335]">
                              Rzad {row.row_number}
                            </p>
                            <p className="text-sm text-[#6f7469]">
                              {row.active_tree_count} aktywne ·{" "}
                              {row.removed_tree_count} historyczne ·{" "}
                              {row.empty_position_count} puste
                            </p>
                          </div>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {row.positions.map((position) => (
                              <PlotMarker
                                key={position.key}
                                canSelectEmptyPositions={canSelectEmptyPositions}
                                mode={mode}
                                onEmptyPositionAction={handleEmptyPositionSelection}
                                onTreeAction={handleTreeAction}
                                plantRangeAnchor={plantRangeAnchor}
                                plantRangePrefill={plantRangePrefill}
                                plotId={plotId}
                                position={position}
                                rangeAnchorTreeId={rangeAnchorTreeId}
                                rowNumber={row.row_number}
                                rowPositions={row.positions}
                                sectionName={row.section_name}
                                selectedTreeId={selectedTreeId}
                                selectedTreeIds={selectedTreeIds}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          <TreeFallbackList
            description={
              grid.mode === "fallback"
                ? "Dla tej dzialki pokazujemy liste drzew zamiast sztucznej siatki rzedowej."
                : "Te drzewa nie maja kompletnej pary row_number + position_in_row, wiec nie trafily na siatke."
            }
            title={
              grid.mode === "fallback"
                ? "Drzewa bez siatki rzedowej"
                : "Drzewa poza siatka"
            }
            mode={mode}
            onTreeAction={handleTreeAction}
            rangeAnchorTreeId={rangeAnchorTreeId}
            selectedTreeId={selectedTreeId}
            selectedTreeIds={selectedTreeIds}
            trees={grid.unlocated_trees}
          />

          {selectedTree ? (
            <PlotTreeDetailPanel tree={selectedTree} onClose={closeTreePanel} />
          ) : null}
        </>
      )}
    </div>
  );
}
