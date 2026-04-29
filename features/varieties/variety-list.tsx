import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { EmptyStateCard } from "@/components/ui/empty-state-card";
import type { VarietySummary } from "@/types/contracts";

type VarietyListProps = {
  varieties: VarietySummary[];
  hasActiveFilters: boolean;
  clearHref: string;
  createHref: string;
};

export function VarietyList({
  varieties,
  hasActiveFilters,
  clearHref,
  createHref,
}: VarietyListProps) {
  if (varieties.length === 0) {
    return hasActiveFilters ? (
      <EmptyStateCard
        actions={[
          { href: clearHref, label: "Wyczysc wyszukiwanie", variant: "secondary" },
          { href: createHref, label: "Utworz odmiane", variant: "ghost" },
        ]}
        description="Zmien zapytanie albo wyczysc wyszukiwanie, aby zobaczyc pozostale odmiany z aktywnego sadu."
        title="Brak wynikow dla tego wyszukiwania"
      />
    ) : (
      <EmptyStateCard
        actions={[{ href: createHref, label: "Utworz odmiane" }]}
        description="Dodaj pierwsza odmiane, aby drzewa i przyszle wpisy zbioru mogly korzystac z danych odmianowych przypisanych do sadu."
        title="Brak odmian"
      />
    );
  }

  return (
    <div className="grid gap-4">
      {varieties.map((variety) => (
        <Card className="grid gap-3" key={variety.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{variety.name}</CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {variety.species}
                </span>
                {variety.is_favorite ? (
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    Ulubiona
                  </span>
                ) : null}
              </div>
              <CardDescription>
                {variety.ripening_period
                  ? `Dojrzewanie: ${variety.ripening_period}`
                  : "Brak zapisanego okresu dojrzewania."}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/reports/variety-locations?variety_id=${variety.id}`}
              >
                Raport lokalizacji
              </Link>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/varieties/${variety.id}/edit`}
              >
                Edytuj
              </Link>
            </div>
          </div>
          {variety.description ? (
            <CardDescription>{variety.description}</CardDescription>
          ) : null}
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Pochodzenie:</span>{" "}
              {variety.origin_country ?? "Brak"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Odpornosc:</span>{" "}
              {variety.resistance_notes ?? "Brak"}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
