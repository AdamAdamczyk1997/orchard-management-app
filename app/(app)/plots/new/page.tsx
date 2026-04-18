import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PlotForm } from "@/features/plots/plot-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { createPlot } from "@/server/actions/plots";

export default async function NewPlotPage() {
  const context = await requireActiveOrchard("/plots/new");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for plot creation.");
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Create plot
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          Add a physical plot to the active orchard so trees and later orchard activity can be organized in a stable structure.
        </CardDescription>
      </Card>
      <Card className="grid gap-5">
        <PlotForm action={createPlot} mode="create" />
      </Card>
    </div>
  );
}
