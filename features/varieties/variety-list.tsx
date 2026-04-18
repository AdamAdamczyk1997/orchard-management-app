import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { VarietySummary } from "@/types/contracts";

type VarietyListProps = {
  varieties: VarietySummary[];
};

export function VarietyList({ varieties }: VarietyListProps) {
  if (varieties.length === 0) {
    return (
      <Card className="grid gap-3">
        <CardTitle>No varieties yet</CardTitle>
        <CardDescription>
          Add the first variety so trees and later harvest records can reference orchard-specific variety data.
        </CardDescription>
      </Card>
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
                    Favorite
                  </span>
                ) : null}
              </div>
              <CardDescription>
                {variety.ripening_period
                  ? `Ripening: ${variety.ripening_period}`
                  : "No ripening period noted yet."}
              </CardDescription>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
              href={`/varieties/${variety.id}/edit`}
            >
              Edit
            </Link>
          </div>
          {variety.description ? (
            <CardDescription>{variety.description}</CardDescription>
          ) : null}
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Origin:</span>{" "}
              {variety.origin_country ?? "Not set"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Resistance notes:</span>{" "}
              {variety.resistance_notes ?? "Not set"}
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}
