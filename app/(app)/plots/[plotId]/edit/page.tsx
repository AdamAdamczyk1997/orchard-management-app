import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { PlotForm } from "@/features/plots/plot-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import { updatePlot } from "@/server/actions/plots";

type EditPlotPageProps = {
  params: Promise<{
    plotId: string;
  }>;
};

export default async function EditPlotPage({ params }: EditPlotPageProps) {
  const context = await requireActiveOrchard("/plots");
  const { plotId } = await params;
  const plot = await readPlotByIdForOrchard(context.orchard.id, plotId);

  if (!plot) {
    return (
      <RecordNotFoundCard
        backHref="/plots"
        description="Nie da sie otworzyc tej dzialki do edycji, bo nie istnieje w aktywnym sadzie albo zostala juz usunieta."
        title="Nie znaleziono dzialki do edycji"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Edycja dzialki
        </p>
        <CardTitle>{plot.name}</CardTitle>
        <CardDescription>
          Zmien podstawowe informacje oraz status zycia tej dzialki w aktywnym sadzie.
        </CardDescription>
      </Card>
      <Card className="grid gap-5">
        <PlotForm action={updatePlot} mode="edit" plot={plot} />
      </Card>
    </div>
  );
}
