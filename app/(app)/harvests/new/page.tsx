import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { HarvestForm } from "@/features/harvests/harvest-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listHarvestActivityOptionsForOrchard } from "@/lib/orchard-data/harvests";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listTreeOptionsForOrchard } from "@/lib/orchard-data/activities";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { createHarvestRecord } from "@/server/actions/harvests";

export default async function NewHarvestPage() {
  const context = await requireActiveOrchard("/harvests/new");
  const [plotOptions, varietyOptions, treeOptions, harvestActivityOptions] =
    await Promise.all([
      listPlotOptionsForOrchard(context.orchard.id),
      listVarietyOptionsForOrchard(context.orchard.id),
      listTreeOptionsForOrchard(context.orchard.id),
      listHarvestActivityOptionsForOrchard(context.orchard.id),
    ]);

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Nowy wpis zbioru
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Dodaj ilosciowy zapis zbioru, ktory pozniej zasili liste historyczna i
          raporty sezonowe.
        </CardDescription>
      </Card>
      <HarvestForm
        action={createHarvestRecord}
        harvestActivityOptions={harvestActivityOptions}
        mode="create"
        plotOptions={plotOptions}
        treeOptions={treeOptions}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
