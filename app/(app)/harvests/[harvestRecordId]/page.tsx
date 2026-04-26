import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { HarvestDetail } from "@/features/harvests/harvest-detail";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readHarvestRecordByIdForOrchard } from "@/lib/orchard-data/harvests";

type HarvestDetailsPageProps = {
  params: Promise<{
    harvestRecordId: string;
  }>;
};

export default async function HarvestDetailsPage({
  params,
}: HarvestDetailsPageProps) {
  const context = await requireActiveOrchard("/harvests");
  const { harvestRecordId } = await params;
  const harvestRecord = await readHarvestRecordByIdForOrchard(
    context.orchard.id,
    harvestRecordId,
  );

  if (!harvestRecord) {
    return (
      <RecordNotFoundCard
        backHref="/harvests"
        description="Ten wpis zbioru nie istnieje w aktywnym sadzie albo nie jest juz dostepny."
        title="Nie znaleziono wpisu zbioru"
      />
    );
  }

  return <HarvestDetail harvestRecord={harvestRecord} />;
}
