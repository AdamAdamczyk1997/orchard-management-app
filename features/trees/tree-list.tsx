import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import type { TreeSummary } from "@/types/contracts";

type TreeListProps = {
  trees: TreeSummary[];
};

function renderCondition(condition: TreeSummary["condition_status"]) {
  switch (condition) {
    case "new":
      return "New";
    case "good":
      return "Good";
    case "warning":
      return "Warning";
    case "critical":
      return "Critical";
    case "removed":
      return "Removed";
    default:
      return condition;
  }
}

export function TreeList({ trees }: TreeListProps) {
  if (trees.length === 0) {
    return (
      <Card className="grid gap-3">
        <CardTitle>No trees found</CardTitle>
        <CardDescription>
          Add the first tree or adjust filters to see orchard structure records in the active orchard.
        </CardDescription>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {trees.map((tree) => (
        <Card className="grid gap-3" key={tree.id}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg">
                  {tree.display_name ?? tree.tree_code ?? `${tree.species} tree`}
                </CardTitle>
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {renderCondition(tree.condition_status)}
                </span>
                {!tree.is_active ? (
                  <span className="rounded-full border border-[#dfd3bb] px-3 py-1 text-xs font-medium text-[#5b6155]">
                    Inactive
                  </span>
                ) : null}
              </div>
              <CardDescription>
                {tree.plot_name}
                {tree.variety_name ? ` · ${tree.variety_name}` : ""}
                {tree.variety_species ? ` (${tree.variety_species})` : ""}
              </CardDescription>
            </div>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
              href={`/trees/${tree.id}/edit`}
            >
              Edit
            </Link>
          </div>
          <div className="grid gap-2 text-sm text-[#5b6155] sm:grid-cols-2">
            <p>
              <span className="font-medium text-[#304335]">Species:</span>{" "}
              {tree.species}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Location:</span>{" "}
              {tree.location_label ?? "No logical location yet"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Verified:</span>{" "}
              {tree.location_verified ? "Yes" : "No"}
            </p>
            <p>
              <span className="font-medium text-[#304335]">Plot status:</span>{" "}
              {tree.plot_status}
            </p>
          </div>
          {tree.notes ? <CardDescription>{tree.notes}</CardDescription> : null}
        </Card>
      ))}
    </div>
  );
}
