import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { ActivityDetail } from "@/features/activities/activity-detail";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readActivityByIdForOrchard } from "@/lib/orchard-data/activities";

type ActivityDetailsPageProps = {
  params: Promise<{
    activityId: string;
  }>;
};

export default async function ActivityDetailsPage({
  params,
}: ActivityDetailsPageProps) {
  const context = await requireActiveOrchard("/activities");
  const { activityId } = await params;
  const activity = await readActivityByIdForOrchard(context.orchard.id, activityId);

  if (!activity) {
    return (
      <RecordNotFoundCard
        backHref="/activities"
        description="Ten wpis aktywnosci nie istnieje w aktywnym sadzie albo nie jest juz dostepny."
        title="Nie znaleziono aktywnosci"
      />
    );
  }

  return <ActivityDetail activity={activity} />;
}
