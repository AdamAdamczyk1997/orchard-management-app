import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import {
  formatHarvestKg,
  formatHarvestQuantity,
  formatHarvestScopeLabel,
} from "@/lib/domain/harvests";
import { deleteHarvestRecord } from "@/server/actions/harvests";
import type { HarvestRecordSummary } from "@/types/contracts";

type HarvestListProps = {
  harvestRecords: HarvestRecordSummary[];
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

export function HarvestList({
  harvestRecords,
  redirectTo,
  hasActiveFilters,
  clearHref,
  createHref,
}: HarvestListProps) {
  if (harvestRecords.length === 0) {
    return hasActiveFilters ? (
      <EmptyStateCard
        actions={[
          { href: clearHref, label: "Przywroc domyslne", variant: "secondary" },
          { href: createHref, label: "Nowy wpis zbioru", variant: "ghost" },
        ]}
        description="Zmien sezon, zakres dat, dzialke albo odmiane, aby zobaczyc inne rekordy zbioru."
        title="Brak wpisow zbioru dla wybranych filtrow"
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
    </div>
  );
}
