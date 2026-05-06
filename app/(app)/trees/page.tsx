import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { FeedbackBanner } from "@/components/ui/feedback-banner";
import { Input } from "@/components/ui/input";
import { ListPageLoading } from "@/components/ui/list-page-loading";
import { LinkButton } from "@/components/ui/link-button";
import { Select } from "@/components/ui/select";
import { TreeList } from "@/features/trees/tree-list";
import {
  FEEDBACK_NOTICE_QUERY_PARAM,
  resolveFeedbackNotice,
} from "@/lib/domain/feedback-notices";
import { hasActiveTreeListFilters } from "@/lib/domain/list-filters";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listTreesForOrchard } from "@/lib/orchard-data/trees";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildPathWithSearchParams,
  getSingleSearchParam,
  type NextSearchParams,
  toUrlSearchParams,
} from "@/lib/utils/search-params";
import { treeListFiltersSchema } from "@/lib/validation/trees";
import type { TreeListFilters } from "@/types/contracts";

type TreesPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function TreesPage({ searchParams }: TreesPageProps) {
  const context = await requireActiveOrchard("/trees");

  return (
    <Suspense fallback={<ListPageLoading filterFieldCount={6} />}>
      <TreesPageContent
        orchardId={context.orchard.id}
        orchardName={context.orchard.name}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function TreesPageContent({
  orchardId,
  orchardName,
  searchParams,
}: {
  orchardId: string;
  orchardName: string;
  searchParams: Promise<NextSearchParams>;
}) {
  const [plotOptions, varietyOptions, resolvedSearchParams] = await Promise.all(
    [
      listPlotOptionsForOrchard(orchardId),
      listVarietyOptionsForOrchard(orchardId),
      searchParams,
    ],
  );
  const feedbackNotice = resolveFeedbackNotice(
    getSingleSearchParam(resolvedSearchParams[FEEDBACK_NOTICE_QUERY_PARAM]),
  );

  const parsedFilters = treeListFiltersSchema.safeParse({
    q: getSingleSearchParam(resolvedSearchParams.q),
    plot_id: getSingleSearchParam(resolvedSearchParams.plot_id),
    variety_id: getSingleSearchParam(resolvedSearchParams.variety_id),
    species: getSingleSearchParam(resolvedSearchParams.species),
    condition_status: getSingleSearchParam(
      resolvedSearchParams.condition_status,
    ),
    is_active: getSingleSearchParam(resolvedSearchParams.is_active) ?? "true",
  });

  const filters: TreeListFilters = parsedFilters.success
    ? parsedFilters.data
    : {
        is_active: "true" as const,
      };

  const trees = await listTreesForOrchard(orchardId, filters);
  const hasActiveFilters = hasActiveTreeListFilters(filters);
  const dismissHref = buildPathWithSearchParams(
    "/trees",
    toUrlSearchParams(resolvedSearchParams, {
      excludeKeys: [FEEDBACK_NOTICE_QUERY_PARAM],
    }),
  );

  return (
    <div className="grid gap-6">
      {feedbackNotice ? (
        <FeedbackBanner dismissHref={dismissHref} notice={feedbackNotice} />
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Drzewa
          </p>
          <h2 className="text-2xl font-semibold text-[#1f2a1f]">
            Struktura drzew w sadzie {orchardName}
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-[#5b6155]">
            Drzewa lacza dzialki, odmiany i lokalizacje terenowe. Ta struktura
            bedzie pozniej zasilac dziennik prac oraz wpisy zbiorow.
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <LinkButton className="w-full sm:w-auto" href="/trees/new">
            Utworz drzewo
          </LinkButton>
          <LinkButton className="w-full sm:w-auto" href="/trees/batch/new" variant="secondary">
            Batch create
          </LinkButton>
          <LinkButton
            className="w-full sm:w-auto"
            href="/trees/batch/deactivate"
            variant="ghost"
          >
            Bulk deactivate
          </LinkButton>
        </div>
      </div>

      <Card className="grid gap-4">
        <div className="grid gap-1">
          <CardTitle className="text-lg">Filtry</CardTitle>
          <CardDescription>
            Zawęź liste drzew po dzialce, odmianie, gatunku, kondycji lub
            aktywnosci.
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
            <span className="text-sm font-medium text-[#304335]">
              Aktywnosc
            </span>
            <Select defaultValue={filters.is_active ?? "true"} name="is_active">
              <option value="true">Tylko aktywne</option>
              <option value="false">Tylko nieaktywne</option>
              <option value="all">Wszystkie drzewa</option>
            </Select>
          </label>
          <div className="flex flex-wrap items-end gap-3 lg:col-span-3">
            <Button className="w-full sm:w-auto" type="submit" variant="secondary">
              Zastosuj
            </Button>
            <LinkButton className="w-full sm:w-auto" href="/trees" variant="ghost">
              Wyczysc filtry
            </LinkButton>
          </div>
        </form>
      </Card>

      <TreeList
        clearHref="/trees"
        createHref="/trees/new"
        hasActiveFilters={hasActiveFilters}
        trees={trees}
      />
    </div>
  );
}
