import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PlotForm } from "@/features/plots/plot-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotCodesForOrchard } from "@/lib/orchard-data/plots";
import { suggestNextPlotCode } from "@/lib/orchard-data/plot-code-suggestion";
import { createPlot } from "@/server/actions/plots";

export default async function NewPlotPage() {
  const context = await requireActiveOrchard("/plots/new");
  const plotCodes = await listPlotCodesForOrchard(context.orchard.id);
  const suggestedCode = suggestNextPlotCode(plotCodes);

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Nowa dzialka
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Dodaj fizyczna dzialke do aktywnego sadu, aby uporzadkowac drzewa i
          kolejne wpisy operacyjne w stabilnej strukturze.
        </CardDescription>
      </Card>
      <Card className="grid gap-5">
        <PlotForm action={createPlot} mode="create" suggestedCode={suggestedCode} />
      </Card>
    </div>
  );
}
