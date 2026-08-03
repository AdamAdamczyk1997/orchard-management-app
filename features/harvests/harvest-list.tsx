import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import { LinkButton } from "@/components/ui/link-button";
import {
  formatHarvestKg,
  formatHarvestQuantity,
  formatHarvestScopeLabel,
} from "@/lib/domain/harvests";
import {
  buildHarvestPageHref,
  formatHarvestPageRange,
} from "@/lib/domain/harvest-pagination";
import { deleteHarvestRecord } from "@/server/actions/harvests";
import type { HarvestRecordSummary } from "@/types/contracts";

type HarvestListProps = {
  harvestRecords: HarvestRecordSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  urlSearchParams: URLSearchParams;
  redirectTo: string;
  hasActiveFilters: boolean;
  clearHref: string;
  createHref: string;
};

function formatHarvestDate(harvestDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(harvestDate));
}

function HarvestPagination({
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
  const previousHref = buildHarvestPageHref(
    urlSearchParams,
    Math.max(1, page - 1),
    pageSize,
  );
  const nextHref = buildHarvestPageHref(
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
          Pokazano {formatHarvestPageRange(page, pageSize, totalCount)} wpisow
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

export function HarvestList({
  harvestRecords,
  page,
  pageSize,
  totalCount,
  totalPages,
  urlSearchParams,
  redirectTo,
  hasActiveFilters,
  clearHref,
  createHref,
}: HarvestListProps) {
  if (harvestRecords.length === 0) {
    if (totalCount > 0 && page > 1) {
      return (
        <EmptyStateCard
          actions={[
            {
              href: buildHarvestPageHref(urlSearchParams, 1, pageSize),
              label: "Wroc do pierwszej strony",
              variant: "secondary",
            },
            { href: clearHref, label: "Wyczysc filtry", variant: "ghost" },
          ]}
          description="Wybrana strona nie ma rekordow. Wroc do poczatku listy albo zmien filtry."
          title="Brak wpisow zbioru na tej stronie"
        />
      );
    }

    return hasActiveFilters ? (
      <EmptyStateCard
        actions={[
          { href: clearHref, label: "Wyczysc filtry", variant: "secondary" },
          { href: createHref, label: "Nowy wpis zbioru", variant: "ghost" },
        ]}
        description="Zmien sezon, zakres dat, dzialke albo odmiane, aby zobaczyc inne rekordy zbioru."
        title="Brak wynikow dla wybranych filtrow"
      />
    ) : (
      <EmptyStateCard
        actions={[{ href: createHref, label: "Nowy wpis zbioru" }]}
        description="Dodaj pierwszy wpis zbioru, aby zaczac sledzic ilosc zebranego plonu w aktywnym sadzie."
        title="Brak wpisow zbioru"
      />
    );
  }

  return (
    <div className="grid gap-4">
      <HarvestPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        urlSearchParams={urlSearchParams}
      />
      {harvestRecords.map((harvestRecord) => (
        <Card className="grid gap-4" key={harvestRecord.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="rounded-xl transition hover:text-[#274430] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
                  href={`/harvests/${harvestRecord.id}`}
                >
                  <CardTitle className="text-lg">
                    {formatHarvestScopeLabel(harvestRecord)}
                  </CardTitle>
                </Link>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {formatHarvestQuantity(
                    harvestRecord.quantity_value,
                    harvestRecord.quantity_unit,
                  )}
                </span>
              </div>
              <CardDescription>
                {formatHarvestDate(harvestRecord.harvest_date)} · sezon{" "}
                {harvestRecord.season_year}
              </CardDescription>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/harvests/${harvestRecord.id}/edit`}
              >
                Edytuj
              </Link>
              <form action={deleteHarvestRecord}>
                <input
                  name="harvest_record_id"
                  type="hidden"
                  value={harvestRecord.id}
                />
                <input name="redirect_to" type="hidden" value={redirectTo} />
                <Button type="submit" variant="danger">
                  Usun
                </Button>
              </form>
            </div>
          </div>

          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2 lg:grid-cols-4">
            <p>
              <span className="font-medium text-[#304335]">Znormalizowano:</span>{" "}
              {formatHarvestKg(harvestRecord.quantity_kg)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Dzialka:</span>{" "}
              {harvestRecord.plot_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Odmiana:</span>{" "}
              {harvestRecord.variety_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Autor wpisu:</span>{" "}
              {harvestRecord.created_by_display ?? "Brak"}
            </p>
            {harvestRecord.tree_display_name ? (
              <p className="sm:col-span-2">
                <span className="font-medium text-[#304335]">Drzewo:</span>{" "}
                {harvestRecord.tree_display_name}
              </p>
            ) : null}
            {harvestRecord.activity_title ? (
              <p className="sm:col-span-2">
                <span className="font-medium text-[#304335]">Aktywnosc:</span>{" "}
                {harvestRecord.activity_title}
              </p>
            ) : null}
          </div>

          {harvestRecord.notes ? (
            <Link
              className="rounded-xl transition hover:text-[#304335] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
              href={`/harvests/${harvestRecord.id}`}
            >
              <CardDescription>{harvestRecord.notes}</CardDescription>
            </Link>
          ) : null}
        </Card>
      ))}
      <HarvestPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        totalPages={totalPages}
        urlSearchParams={urlSearchParams}
      />
    </div>
  );
}
