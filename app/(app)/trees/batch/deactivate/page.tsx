import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { BulkTreeDeactivateForm } from "@/features/trees/bulk-tree-deactivate-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { submitBulkDeactivateTrees } from "@/server/actions/trees";

export default async function BulkDeactivateTreesPage() {
  const context = await requireActiveOrchard("/trees/batch/deactivate");
  const plotOptions = await listPlotOptionsForOrchard(context.orchard.id);
  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
          ]}
          description="Masowe wycofanie drzew wymaga aktywnej dzialki i lokalizacji w rzedzie. Dodaj lub przywroc co najmniej jedna aktywna dzialke, zanim uruchomisz ten flow."
          eyebrow="Bulk deactivate drzew"
          title="Najpierw przygotuj dzialke"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Bulk deactivate drzew
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Oznacz caly zakres drzew jako `removed`, bez fizycznego usuwania rekordow i
          bez wychodzenia poza jedna dzialke oraz jeden rzad.
        </CardDescription>
      </Card>
      <BulkTreeDeactivateForm action={submitBulkDeactivateTrees} plotOptions={activePlots} />
    </div>
  );
}

