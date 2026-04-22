import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { TreeList } from "@/features/trees/tree-list";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listTreesForOrchard } from "@/lib/orchard-data/trees";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  getSingleSearchParam,
  type NextSearchParams,
} from "@/lib/utils/search-params";
import { treeListFiltersSchema } from "@/lib/validation/trees";
import type { TreeListFilters } from "@/types/contracts";

type TreesPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function TreesPage({ searchParams }: TreesPageProps) {
  const context = await requireActiveOrchard("/trees");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for trees.");
  }

  const [plotOptions, varietyOptions, resolvedSearchParams] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listVarietyOptionsForOrchard(orchard.id),
    searchParams,
  ]);

  const parsedFilters = treeListFiltersSchema.safeParse({
    q: getSingleSearchParam(resolvedSearchParams.q),
    plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
    variety_id: getSingleSearchParam(resolvedSearchParams.variety_id),
    species: getSingleSearchParam(resolvedSearchParams.species),
    condition_status: getSingleSearchParam(resolvedSearchParams.condition_status),
    is_active: getSingleSearchParam(resolvedSearchParams.is_active) ?? "true",
  });

  const filters: TreeListFilters = parsedFilters.success
    ? parsedFilters.data
    : {
        is_active: "true" as const,
      };

  const trees = await listTreesForOrchard(orchard.id, filters);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Drzewa
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Struktura drzew w sadzie {orchard.name}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Drzewa lacza dzialki, odmiany i lokalizacje terenowe. Ta struktura bedzie
            pozniej zasilac dziennik prac oraz wpisy zbiorow.
          </p>
        </div>
        <LinkButton href="/trees/new">Utworz drzewo</LinkButton>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Zawęź liste drzew po dzialce, odmianie, gatunku, kondycji lub aktywnosci.
          </CardDescription>
        </div>
        <form className="grid gap-4 lg:grid-cols-3" method="get">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Szukaj</span>
            <Input
              defaultValue={filters.q ?? ""}
              name="q"
              placeholder="Kod drzewa lub nazwa"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Dzialka</span>
            <Select defaultValue={filters.plot_id ?? ""} name="plot_id">
              <option value="">Wszystkie dzialki</option>
              {plotOptions.map((plot) => (
                <option key={plot.id} value={plot.id}>
                  {plot.name}
                  {plot.status === "archived" ? " (zarchiwizowana)" : ""}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Odmiana</span>
            <Select defaultValue={filters.variety_id ?? ""} name="variety_id">
              <option value="">Wszystkie odmiany</option>
              {varietyOptions.map((variety) => (
                <option key={variety.id} value={variety.id}>
                  {variety.species} - {variety.name}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Gatunek</span>
            <Input
              defaultValue={filters.species ?? ""}
              name="species"
              placeholder="np. apple"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Kondycja</span>
            <Select
              defaultValue={filters.condition_status ?? "all"}
              name="condition_status"
            >
              <option value="all">Wszystkie stany</option>
              <option value="new">Nowe</option>
              <option value="good">Dobre</option>
              <option value="warning">Uwaga</option>
              <option value="critical">Krytyczne</option>
              <option value="removed">Usuniete</option>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-[#304335]">Aktywnosc</span>
            <Select defaultValue={filters.is_active ?? "true"} name="is_active">
              <option value="true">Tylko aktywne</option>
              <option value="false">Tylko nieaktywne</option>
              <option value="all">Wszystkie drzewa</option>
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#efe6d3] px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#e5d9bf]"
              type="submit"
            >
              Zastosuj
            </button>
            <LinkButton href="/trees" variant="ghost">
              Wyczyść
            </LinkButton>
          </div>
        </form>
      </Card>

      <TreeList trees={trees} />
    </div>
  );
}
