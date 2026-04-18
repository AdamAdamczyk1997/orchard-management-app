import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { TreeForm } from "@/features/trees/tree-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { createTree } from "@/server/actions/trees";

export default async function NewTreePage() {
  const context = await requireActiveOrchard("/trees/new");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for tree creation.");
  }

  const [plotOptions, varietyOptions] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listVarietyOptionsForOrchard(orchard.id),
  ]);
  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <Card className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Create tree
          </p>
          <CardTitle>Create a plot first</CardTitle>
          <CardDescription>
            Trees need an active plot. Add at least one active plot in the orchard before creating a tree record.
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
          Create tree
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          Save a single tree record with its plot, optional variety, and baseline location fields.
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
