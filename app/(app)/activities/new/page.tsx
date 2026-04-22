import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { ActivityForm } from "@/features/activities/activity-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
} from "@/lib/orchard-data/activities";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { createActivity } from "@/server/actions/activities";

export default async function NewActivityPage() {
  const context = await requireActiveOrchard("/activities/new");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for activity creation.");
  }

  const [plotOptions, treeOptions, memberOptions] = await Promise.all([
    listPlotOptionsForOrchard(orchard.id),
    listTreeOptionsForOrchard(orchard.id),
    listActiveMemberOptionsForOrchard(orchard.id),
  ]);

  if (plotOptions.length === 0) {
    return (
      <div className="grid gap-6">
        <Card className="grid gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Nowa aktywnosc
          </p>
          <CardTitle>Najpierw utworz dzialke</CardTitle>
          <CardDescription>
            Aktywnosci musza byc przypisane do konkretnej dzialki. Dodaj pierwsza
            dzialke, zanim zapiszesz wpis do dziennika prac.
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/plots/new">Utworz dzialke</LinkButton>
            <LinkButton href="/activities" variant="secondary">
              Wroc do aktywnosci
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
          Nowa aktywnosc
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          Dodaj wpis do dziennika prac razem z zakresem wykonania i opcjonalnymi
          materialami.
        </CardDescription>
      </Card>
      <ActivityForm
        action={createActivity}
        defaultPerformedBy={context.profile?.display_name ?? context.profile?.email ?? ""}
        defaultPerformedByProfileId={context.profile?.id ?? ""}
        memberOptions={memberOptions}
        mode="create"
        plotOptions={plotOptions}
        treeOptions={treeOptions}
      />
    </div>
  );
}
