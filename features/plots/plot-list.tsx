import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { PlotSummary } from "@/types/contracts";
import { archivePlot, restorePlot } from "@/server/actions/plots";

type PlotListProps = {
  plots: PlotSummary[];
  redirectTo: string;
};

function renderPlotStatus(status: PlotSummary["status"]) {
  if (status === "active") {
    return "Active";
  }

  if (status === "planned") {
    return "Planned";
  }

  return "Archived";
}

export function PlotList({ plots, redirectTo }: PlotListProps) {
  if (plots.length === 0) {
    return (
      <Card className="grid gap-3">
        <CardTitle>No plots yet</CardTitle>
        <CardDescription>
          Create the first plot to start building the orchard structure in the active orchard.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {plots.map((plot) => (
        <Card className="grid gap-4" key={plot.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">{plot.name}</CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {renderPlotStatus(plot.status)}
                </span>
                {plot.code ? (
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    {plot.code}
                  </span>
                ) : null}
              </div>
              {plot.location_name ? (
                <CardDescription>{plot.location_name}</CardDescription>
              ) : (
                <CardDescription>No descriptive location set yet.</CardDescription>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href={`/plots/${plot.id}/edit`}
              >
                Edit
              </Link>
              <form action={plot.status === "archived" ? restorePlot : archivePlot}>
                <input name="plot_id" type="hidden" value={plot.id} />
                <input name="redirect_to" type="hidden" value={redirectTo} />
                <Button type="submit" variant={plot.status === "archived" ? "secondary" : "ghost"}>
                  {plot.status === "archived" ? "Restore" : "Archive"}
                </Button>
              </form>
            </div>
          </div>
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Area:</span>{" "}
              {plot.area_m2 ? `${plot.area_m2} m2` : "Not set"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Soil:</span>{" "}
              {plot.soil_type ?? "Not set"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Irrigation:</span>{" "}
              {plot.irrigation_type ?? "Not set"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Active record:</span>{" "}
              {plot.is_active ? "Yes" : "No"}
            </p>
          </div>
          {plot.description ? (
            <CardDescription>{plot.description}</CardDescription>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
