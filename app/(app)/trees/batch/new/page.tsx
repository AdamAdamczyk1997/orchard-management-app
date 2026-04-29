import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { BulkTreeBatchForm } from "@/features/trees/bulk-tree-batch-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { submitBulkTreeBatch } from "@/server/actions/trees";

export default async function NewBulkTreeBatchPage() {
  const context = await requireActiveOrchard("/trees/batch/new");
  const [plotOptions, varietyOptions] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listVarietyOptionsForOrchard(context.orchard.id),
  ]);
  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
          ]}
          description="Batch create wymaga aktywnej dzialki. Dodaj lub przywroc co najmniej jedna aktywna dzialke, zanim utworzysz zakres drzew."
          eyebrow="Batch create drzew"
          title="Najpierw przygotuj dzialke"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Batch create drzew
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Ten flow sluzy do szybkiego zalozenia calego zakresu drzew w jednym rzedzie
          i na jednej dzialce, z transakcyjnym zapisem all-or-nothing.
        </CardDescription>
      </Card>
      <BulkTreeBatchForm
        action={submitBulkTreeBatch}
        plotOptions={activePlots}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}

