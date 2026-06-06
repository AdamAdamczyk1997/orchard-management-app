"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import {
  buildActivityPrefillFromPlotSelection,
  buildActivityPrefillHref,
} from "@/lib/domain/activity-prefill";
import { getTreeConditionLabel } from "@/lib/domain/labels";
import type { TreeSummary } from "@/types/contracts";

type PlotTreeDetailPanelProps = {
  tree: TreeSummary;
  onClose: () => void;
};

function formatOptionalValue(value?: number | string | null) {
  if (typeof value === "number") {
    return String(value);
  }

  return value?.trim() || "Brak";
}

function getTreeDisplayName(tree: TreeSummary) {
  return tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`;
}

function getTreeVarietyLabel(tree: TreeSummary) {
  if (!tree.variety_id) {
    return "Bez odmiany";
  }

  if (tree.variety_name) {
    return tree.variety_species
      ? `${tree.variety_species} - ${tree.variety_name}`
      : tree.variety_name;
  }

  return "Odmiana bez nazwy";
}

function isOperationallyActiveTree(tree: TreeSummary) {
  return tree.is_active && tree.condition_status !== "removed";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: number | string | null;
}) {
  return (
    <p className="grid gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7149]">
        {label}
      </span>
      <span className="text-sm text-[#304335]">{formatOptionalValue(value)}</span>
    </p>
  );
}

export function PlotTreeDetailPanel({
  tree,
  onClose,
}: PlotTreeDetailPanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const activeStateLabel = isOperationallyActiveTree(tree)
    ? "Aktywne"
    : "Historyczne";
  const locationStateLabel = tree.location_verified
    ? "Lokalizacja potwierdzona"
    : "Lokalizacja niepotwierdzona";
  const activityPrefill = isOperationallyActiveTree(tree)
    ? buildActivityPrefillFromPlotSelection({
        selectedTrees: [tree],
        activityScopes: [],
      })
    : null;
  const activityHref = activityPrefill
    ? buildActivityPrefillHref(activityPrefill)
    : null;

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [tree.id]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      onClose();
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <Card
      aria-labelledby="plot-tree-detail-panel-title"
      className="grid gap-5 border-[#d8c7a9] bg-[#fffdf8] shadow-none"
      data-testid="plot-tree-detail-panel"
      role="dialog"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-2">
          <CardTitle
            className="text-xl"
            data-testid="plot-tree-detail-panel-title"
            id="plot-tree-detail-panel-title"
          >
            {getTreeDisplayName(tree)}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
              {getTreeConditionLabel(tree.condition_status)}
            </span>
            <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
              {activeStateLabel}
            </span>
            <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
              {locationStateLabel}
            </span>
          </div>
        </div>
        <Button
          ref={closeButtonRef}
          data-testid="plot-tree-detail-close"
          onClick={onClose}
          type="button"
          variant="ghost"
        >
          Zamknij
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DetailRow label="Kod drzewa" value={tree.tree_code} />
        <DetailRow label="Gatunek" value={tree.species} />
        <DetailRow label="Odmiana" value={getTreeVarietyLabel(tree)} />
        <DetailRow label="Dzialka" value={tree.plot_name} />
        <DetailRow label="Sekcja" value={tree.section_name} />
        <DetailRow label="Rzad" value={tree.row_number} />
        <DetailRow label="Pozycja" value={tree.position_in_row} />
        <DetailRow label="Etykieta rzedu" value={tree.row_label} />
        <DetailRow label="Etykieta pozycji" value={tree.position_label} />
        <DetailRow label="Lokalizacja" value={tree.location_label} />
        <DetailRow label="Posadzone" value={tree.planted_at} />
        <DetailRow label="Pozyskane" value={tree.acquired_at} />
        <DetailRow label="Podkladka" value={tree.rootstock} />
        <DetailRow label="Zapylanie" value={tree.pollinator_info} />
        <DetailRow label="Zdrowie" value={tree.health_status} />
        <DetailRow label="Etap rozwoju" value={tree.development_stage} />
        <DetailRow label="Ostatni zbior" value={tree.last_harvest_at} />
      </div>

      {tree.notes ? (
        <div className="grid gap-1 rounded-xl border border-[#eadfcb] bg-[#fbfaf7] p-4">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a7149]">
            Notatki
          </span>
          <p className="text-sm leading-6 text-[#304335]">{tree.notes}</p>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <LinkButton
          className="w-full sm:w-auto"
          data-testid="plot-tree-detail-edit-link"
          href={`/trees/${tree.id}/edit`}
        >
          Edytuj drzewo
        </LinkButton>
        {activityHref ? (
          <LinkButton
            className="w-full sm:w-auto"
            data-testid="plot-tree-detail-add-activity"
            href={activityHref}
            variant="secondary"
          >
            Dodaj aktywnosc
          </LinkButton>
        ) : (
          <Button
            className="w-full sm:w-auto"
            data-testid="plot-tree-detail-add-activity"
            disabled
            type="button"
            variant="secondary"
          >
            Dodaj aktywnosc
          </Button>
        )}
      </div>
    </Card>
  );
}
