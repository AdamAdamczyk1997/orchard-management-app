import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import {
  formatHarvestKg,
  formatHarvestQuantity,
  formatHarvestScopeLabel,
  getHarvestScopeLabel,
} from "@/lib/domain/harvests";
import { deleteHarvestRecord } from "@/server/actions/harvests";
import type { HarvestRecordDetails } from "@/types/contracts";

type HarvestDetailProps = {
  harvestRecord: HarvestRecordDetails;
};

function formatHarvestDate(harvestDate: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
  }).format(new Date(harvestDate));
}

function formatTimestamp(timestamp: string | undefined) {
  if (!timestamp) {
    return "Brak danych";
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function HarvestDetail({ harvestRecord }: HarvestDetailProps) {
  return (
    <div className="grid gap-6">
      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
              Szczegoly wpisu zbioru
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{formatHarvestScopeLabel(harvestRecord)}</CardTitle>
              <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                {formatHarvestQuantity(
                  harvestRecord.quantity_value,
                  harvestRecord.quantity_unit,
                )}
              </span>
              <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                {getHarvestScopeLabel(harvestRecord.scope_level)}
              </span>
            </div>
            <CardDescription>
              {formatHarvestDate(harvestRecord.harvest_date)} · sezon{" "}
              {harvestRecord.season_year}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/harvests" variant="secondary">
              Powrot
            </LinkButton>
            <LinkButton href={`/harvests/${harvestRecord.id}/edit`}>
              Edytuj
            </LinkButton>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Dzialka:</span>{" "}
              {harvestRecord.plot_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Odmiana:</span>{" "}
              {harvestRecord.variety_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Drzewo:</span>{" "}
              {harvestRecord.tree_display_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Znormalizowano:</span>{" "}
              {formatHarvestKg(harvestRecord.quantity_kg)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Autor wpisu:</span>{" "}
              {harvestRecord.created_by_display ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Sekcja:</span>{" "}
              {harvestRecord.section_name ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Rzad:</span>{" "}
              {harvestRecord.row_number ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Pozycje:</span>{" "}
              {typeof harvestRecord.from_position === "number" &&
              typeof harvestRecord.to_position === "number"
                ? `${harvestRecord.from_position}-${harvestRecord.to_position}`
                : "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Utworzono:</span>{" "}
              {formatTimestamp(harvestRecord.created_at)}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Ostatnia aktualizacja:</span>{" "}
              {formatTimestamp(harvestRecord.updated_at)}
            </p>
            <p className="sm:col-span-2">
              <span className="font-medium text-[#304335]">Powiazana aktywnosc:</span>{" "}
              {harvestRecord.activity_id && harvestRecord.activity_title ? (
                <Link
                  className="rounded transition hover:text-[#274430] focus:outline-none focus:ring-2 focus:ring-[#b48446]"
                  href={`/activities/${harvestRecord.activity_id}`}
                >
                  {harvestRecord.activity_title}
                </Link>
              ) : (
                "Brak"
              )}
            </p>
          </div>

          <Card className="grid gap-3 border-[#eadfcb] bg-[#fbfaf7] p-5 shadow-none">
            <div className="grid gap-1">
              <CardTitle className="text-lg">Szybkie akcje</CardTitle>
              <CardDescription>
                Ten wpis mozesz skorygowac edycja albo usunac jako korekte pomylki.
              </CardDescription>
            </div>
            <form action={deleteHarvestRecord}>
              <input
                name="harvest_record_id"
                type="hidden"
                value={harvestRecord.id}
              />
              <input name="redirect_to" type="hidden" value="/harvests" />
              <Button type="submit" variant="danger">
                Usun wpis zbioru
              </Button>
            </form>
          </Card>
        </div>
      </Card>

      {harvestRecord.notes ? (
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Notatki</CardTitle>
          <CardDescription>{harvestRecord.notes}</CardDescription>
        </Card>
      ) : null}
    </div>
  );
}
