import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { getPlotStatusLabel, getTreeConditionLabel } from "@/lib/domain/labels";
import type { TreeSummary } from "@/types/contracts";

type TreeListProps = {
  trees: TreeSummary[];
  hasActiveFilters: boolean;
  clearHref: string;
  createHref: string;
};

export function TreeList({
  trees,
  hasActiveFilters,
  clearHref,
  createHref,
}: TreeListProps) {
  if (trees.length === 0) {
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
    </div>
  );
}
