import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { TreeForm } from "@/features/trees/tree-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { readTreeByIdForOrchard } from "@/lib/orchard-data/trees";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { updateTree } from "@/server/actions/trees";

type EditTreePageProps = {
  params: Promise<{
    treeId: string;
  }>;
};

export default async function EditTreePage({ params }: EditTreePageProps) {
  const context = await requireActiveOrchard("/trees");
  const { treeId } = await params;
  const [plotOptions, varietyOptions, tree] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listVarietyOptionsForOrchard(context.orchard.id),
    readTreeByIdForOrchard(context.orchard.id, treeId),
  ]);

  if (!tree) {
    return (
      <RecordNotFoundCard
        backHref="/trees"
        description="Nie da sie edytowac tego drzewa, bo nie istnieje w aktywnym sadzie albo zostalo juz usuniete."
        title="Nie znaleziono drzewa do edycji"
      />
    );
  }

  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");
  const selectedPlotIsArchived = tree.plot_status === "archived";

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
          ]}
          description="Tego drzewa nie da sie teraz zapisac, bo w sadzie nie ma zadnej aktywnej dzialki. Najpierw utworz lub przywroc dzialke."
          eyebrow="Edycja drzewa"
          title="Brak aktywnej dzialki"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Edycja drzewa
        </p>
        <CardTitle>
          {tree.display_name ?? tree.tree_code ?? `${tree.species} drzewo`}
        </CardTitle>
        <CardDescription>
          Zmien polozenie, kondycje i podstawowe informacje lokalizacyjne tego
          drzewa.
        </CardDescription>
      </Card>
      <TreeForm
        action={updateTree}
        mode="edit"
        plotHint={
          selectedPlotIsArchived
            ? "Obecna dzialka jest zarchiwizowana. Przed zapisem wybierz aktywna dzialke."
            : undefined
        }
        plotOptions={activePlots}
        tree={tree}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
