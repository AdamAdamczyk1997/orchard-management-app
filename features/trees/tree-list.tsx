import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { LinkButton } from "@/components/ui/link-button";
import { getPlotStatusLabel, getTreeConditionLabel } from "@/lib/domain/labels";
import {
  buildTreePageHref,
  formatTreePageRange,
} from "@/lib/domain/tree-pagination";
import type { TreeSummary } from "@/types/contracts";

type TreeListProps = {
  trees: TreeSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  urlSearchParams: URLSearchParams;
  hasActiveFilters: boolean;
  clearHref: string;
  createHref: string;
};

function TreePagination({
  page,
  pageSize,
  totalCount,
  totalPages,
  urlSearchParams,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  urlSearchParams: URLSearchParams;
}) {
  const previousHref = buildTreePageHref(
    urlSearchParams,
    Math.max(1, page - 1),
    pageSize,
  );
  const nextHref = buildTreePageHref(
    urlSearchParams,
    Math.min(totalPages, page + 1),
    pageSize,
  );
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <Card className="flex flex-col gap-3 border-[#eadfcb] bg-[#fbfaf7] p-4 shadow-none sm:flex-row sm:items-center sm:justify-between">
      <div className="grid gap-1">
        <p className="text-sm font-semibold text-[#304335]">
          Pokazano {formatTreePageRange(page, pageSize, totalCount)} drzew
        </p>
        <CardDescription>
          Strona {page} z {totalPages}
        </CardDescription>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {canGoPrevious ? (
          <LinkButton
            className="w-full sm:w-auto"
            href={previousHref}
            variant="secondary"
          >
            Poprzednia
          </LinkButton>
        ) : (
          <span className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#dfd3bb] px-4 py-2 text-sm font-medium text-[#9a8d78] sm:w-auto">
            Poprzednia
          </span>
        )}
        {canGoNext ? (
          <LinkButton className="w-full sm:w-auto" href={nextHref} variant="secondary">
            Nastepna
          </LinkButton>
        ) : (
          <span className="inline-flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-xl border border-[#dfd3bb] px-4 py-2 text-sm font-medium text-[#9a8d78] sm:w-auto">
            Nastepna
          </span>
        )}
      </div>
    </Card>
  );
}

export function TreeList({
  trees,
  page,
  pageSize,
  totalCount,
  totalPages,
  urlSearchParams,
  hasActiveFilters,
  clearHref,
  createHref,
}: TreeListProps) {
  if (trees.length === 0) {
    if (totalCount > 0 && page > 1) {
      return (
        <EmptyStateCard
          actions={[
            {
              href: buildTreePageHref(urlSearchParams, 1, pageSize),
              label: "Wroc do pierwszej strony",
              variant: "secondary",
            },
            { href: clearHref, label: "Wyczysc filtry", variant: "ghost" },
          ]}
          description="Wybrana strona nie ma rekordow. Wroc do poczatku listy albo zmien filtry."
          title="Brak drzew na tej stronie"
        />
      );
    }

    return hasActiveFilters ? (
      <EmptyStateCard
        actions={[
          { href: clearHref, label: "Wyczysc filtry", variant: "secondary" },
          { href: createHref, label: "Utworz drzewo", variant: "ghost" },
        ]}
        description="Zmodyfikuj filtry albo przywroc domyslne ustawienia, aby zobaczyc pozostale drzewa w strukturze sadu."
        title="Brak drzew dla wybranych filtrow"
      />
    ) : (
      <EmptyStateCard
        actions={[{ href: createHref, label: "Utworz drzewo" }]}
        description="Dodaj pierwsze drzewo, aby powiazac dzialki, odmiany i lokalizacje terenowe."
        title="Brak drzew"
      />
    );
  }

  return (
    <div className="grid gap-4">
      <TreePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        urlSearchParams={urlSearchParams}
      />
      {trees.map((tree) => (
        <Card className="grid gap-3" key={tree.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">
                  {tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`}
                </CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {getTreeConditionLabel(tree.condition_status)}
                </span>
                {!tree.is_active ? (
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    Nieaktywne
                  </span>
                ) : null}
              </div>
              <CardDescription>
                {tree.plot_name}
                {tree.variety_name ? ` · ${tree.variety_name}` : ""}
                {tree.variety_species ? ` (${tree.variety_species})` : ""}
              </CardDescription>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
              href={`/trees/${tree.id}/edit`}
            >
              Edytuj
            </Link>
          </div>
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Gatunek:</span>{" "}
              {tree.species}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Lokalizacja:</span>{" "}
              {tree.location_label ?? "Brak logicznej lokalizacji"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Potwierdzone:</span>{" "}
              {tree.location_verified ? "Tak" : "Nie"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Status dzialki:</span>{" "}
              {getPlotStatusLabel(tree.plot_status)}
            </p>
          </div>
          {tree.notes ? <CardDescription>{tree.notes}</CardDescription> : null}
        </Card>
      ))}
      <TreePagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        urlSearchParams={urlSearchParams}
      />
    </div>
  );
}
