import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { HarvestForm } from "@/features/harvests/harvest-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listTreeOptionsForOrchard } from "@/lib/orchard-data/activities";
import {
  listHarvestActivityOptionsForOrchard,
  readHarvestRecordByIdForOrchard,
} from "@/lib/orchard-data/harvests";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { updateHarvestRecord } from "@/server/actions/harvests";

type EditHarvestPageProps = {
  params: Promise<{
    harvestRecordId: string;
  }>;
};

export default async function EditHarvestPage({ params }: EditHarvestPageProps) {
  const context = await requireActiveOrchard("/harvests");
  const { harvestRecordId } = await params;
  const [plotOptions, varietyOptions, treeOptions, harvestActivityOptions, harvestRecord] =
    await Promise.all([
      listPlotOptionsForOrchard(context.orchard.id),
      listVarietyOptionsForOrchard(context.orchard.id),
      listTreeOptionsForOrchard(context.orchard.id),
      listHarvestActivityOptionsForOrchard(context.orchard.id),
      readHarvestRecordByIdForOrchard(context.orchard.id, harvestRecordId),
    ]);

  if (!harvestRecord) {
    return (
      <RecordNotFoundCard
        backHref="/harvests"
        description="Nie da sie edytowac tego wpisu, bo nie istnieje w aktywnym sadzie albo zostal juz usuniety."
        title="Nie znaleziono wpisu zbioru do edycji"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Edycja wpisu zbioru
        </p>
        <CardTitle>{harvestRecord.harvest_date}</CardTitle>
        <CardDescription>
          Skoryguj ilosc, zakres lub powiazania wpisu bez opuszczania aktywnego sadu.
        </CardDescription>
      </Card>
      <HarvestForm
        action={updateHarvestRecord}
        harvestActivityOptions={harvestActivityOptions}
        harvestRecord={harvestRecord}
        mode="edit"
        plotOptions={plotOptions}
        treeOptions={treeOptions}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
