import { redirect } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
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
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for activity editing.");
  }

  const { activityId } = await params;
  const [plotOptions, treeOptions, memberOptions, activity] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listTreeOptionsForOrchard(orchard.id),
    listActiveMemberOptionsForOrchard(orchard.id),
    readActivityByIdForOrchard(orchard.id, activityId),
  ]);

  if (!activity) {
    redirect("/activities");
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
