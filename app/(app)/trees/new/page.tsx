import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { TreeForm } from "@/features/trees/tree-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { createTree } from "@/server/actions/trees";

export default async function NewTreePage() {
  const context = await requireActiveOrchard("/trees/new");
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
          description="Drzewa wymagaja aktywnej dzialki. Dodaj lub przywroc co najmniej jedna aktywna dzialke, zanim zapiszesz rekord drzewa."
          eyebrow="Nowe drzewo"
          title="Najpierw utworz dzialke"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Nowe drzewo
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Zapisz pojedyncze drzewo razem z dzialka, opcjonalna odmiana i podstawowa
          lokalizacja w sadzie.
        </CardDescription>
      </Card>
      <TreeForm
        action={createTree}
        mode="create"
        plotOptions={activePlots}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
