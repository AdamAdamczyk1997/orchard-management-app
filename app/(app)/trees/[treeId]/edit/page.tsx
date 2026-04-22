import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
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
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for tree editing.");
  }

  const { treeId } = await params;
  const [plotOptions, varietyOptions, tree] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listVarietyOptionsForOrchard(orchard.id),
    readTreeByIdForOrchard(orchard.id, treeId),
  ]);

  if (!tree) {
    redirect("/trees");
  }

  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");
  const selectedPlotIsArchived = tree.plot_status === "archived";

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <Card className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Edycja drzewa
          </p>
          <CardTitle>Brak aktywnej dzialki</CardTitle>
          <CardDescription>
            Tego drzewa nie da sie teraz zapisac, bo w sadzie nie ma zadnej
            aktywnej dzialki. Najpierw utworz lub przywroc dzialke.
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/plots/new">Utworz dzialke</LinkButton>
            <LinkButton href="/trees" variant="secondary">
              Wroc do drzew
            </LinkButton>
          </div>
        </Card>
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
