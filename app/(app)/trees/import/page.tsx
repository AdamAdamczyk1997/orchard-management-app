import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { TreeInventoryImportForm } from "@/features/trees/tree-inventory-import-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { submitTreeInventoryImportPreview } from "@/server/actions/tree-inventory-import";

export default async function TreeInventoryImportPage() {
  const context = await requireActiveOrchard("/trees/import");
  const plotOptions = await listPlotOptionsForOrchard(context.orchard.id);
  const rowPlotOptions = plotOptions.filter(
    (plot) => plot.status !== "archived" && plot.layout_type === "rows",
  );

  if (rowPlotOptions.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
          ]}
          description="Import tree_inventory_v1 wymaga dzialki rzedowej. Dodaj albo przywroc dzialke typu rows, zanim pobierzesz szablon i wgrasz workbook."
          eyebrow="Import drzew"
          title="Najpierw przygotuj dzialke rzedowa"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Import drzew
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Pobierz szablon dla jednej dzialki, wgraj uzupelniony workbook i sprawdz
          podglad przed pozniejszym zatwierdzeniem przez wlasciciela.
        </CardDescription>
      </Card>
      <TreeInventoryImportForm
        action={submitTreeInventoryImportPreview}
        plotOptions={rowPlotOptions}
        role={context.membership.role}
      />
    </div>
  );
}
