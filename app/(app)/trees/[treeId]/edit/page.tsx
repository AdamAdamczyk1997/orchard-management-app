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
            Edit tree
          </p>
          <CardTitle>No active plot available</CardTitle>
          <CardDescription>
            This tree can no longer be saved because the orchard does not have any active plot available. Create or restore a plot first.
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/plots/new">Create plot</LinkButton>
            <LinkButton href="/trees" variant="secondary">
              Back to trees
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
          Edit tree
        </p>
        <CardTitle>
          {tree.display_name ?? tree.tree_code ?? `${tree.species} tree`}
        </CardTitle>
        <CardDescription>
          Update placement, health, and baseline location details for this tree.
        </CardDescription>
      </Card>
      <TreeForm
        action={updateTree}
        mode="edit"
        plotHint={
          selectedPlotIsArchived
            ? "The current plot is archived. Choose an active plot before saving."
            : undefined
        }
        plotOptions={activePlots}
        tree={tree}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
