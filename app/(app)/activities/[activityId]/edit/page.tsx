import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { ActivityForm } from "@/features/activities/activity-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
  readActivityByIdForOrchard,
} from "@/lib/orchard-data/activities";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { updateActivity } from "@/server/actions/activities";

type EditActivityPageProps = {
  params: Promise<{
    activityId: string;
  }>;
};

export default async function EditActivityPage({ params }: EditActivityPageProps) {
  const context = await requireActiveOrchard("/activities");
  const { activityId } = await params;
  const [plotOptions, treeOptions, memberOptions, activity] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listTreeOptionsForOrchard(context.orchard.id),
    listActiveMemberOptionsForOrchard(context.orchard.id),
    readActivityByIdForOrchard(context.orchard.id, activityId),
  ]);

  if (!activity) {
    return (
      <RecordNotFoundCard
        backHref="/activities"
        description="Nie da sie edytowac tego wpisu, bo nie istnieje w aktywnym sadzie albo zostal juz usuniety."
        title="Nie znaleziono aktywnosci do edycji"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Edycja aktywnosci
        </p>
        <CardTitle>{activity.title}</CardTitle>
        <CardDescription>
          Zmien zakres, opis i status wpisu dziennika bez wychodzenia z aktywnego sadu.
        </CardDescription>
      </Card>
      <ActivityForm
        action={updateActivity}
        activity={activity}
        defaultPerformedBy={context.profile?.display_name ?? context.profile?.email ?? ""}
        defaultPerformedByProfileId={context.profile?.id ?? ""}
        memberOptions={memberOptions}
        mode="edit"
        plotOptions={plotOptions}
        treeOptions={treeOptions}
      />
    </div>
  );
}
