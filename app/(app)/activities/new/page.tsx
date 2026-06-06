import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { ActivityForm } from "@/features/activities/activity-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import {
  listActiveMemberOptionsForOrchard,
  listTreeOptionsForOrchard,
} from "@/lib/orchard-data/activities";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { type NextSearchParams } from "@/lib/utils/search-params";
import { resolveActivityPrefillFromSearchParams } from "@/lib/validation/activity-prefill";
import { createActivity } from "@/server/actions/activities";

type NewActivityPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function NewActivityPage({
  searchParams,
}: NewActivityPageProps) {
  const context = await requireActiveOrchard("/activities/new");
  const [plotOptions, treeOptions, memberOptions, resolvedSearchParams] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listTreeOptionsForOrchard(context.orchard.id),
    listActiveMemberOptionsForOrchard(context.orchard.id),
    searchParams,
  ]);
  const prefillResult = resolveActivityPrefillFromSearchParams(
    resolvedSearchParams,
    {
      plotOptions,
      treeOptions,
    },
  );

  if (plotOptions.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/activities", label: "Wroc do aktywnosci", variant: "secondary" },
          ]}
          description="Aktywnosci musza byc przypisane do konkretnej dzialki. Dodaj pierwsza dzialke, zanim zapiszesz wpis do dziennika prac."
          eyebrow="Nowa aktywnosc"
          title="Najpierw utworz dzialke"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Nowa aktywnosc
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Dodaj wpis do dziennika prac razem z zakresem wykonania i opcjonalnymi
          materialami.
        </CardDescription>
      </Card>
      {prefillResult.status === "applied" ? (
        <Card
          className="grid gap-1 border-[#d8c7a9] bg-[#fbfaf7]"
          data-testid="activity-prefill-message"
        >
          <CardTitle className="text-lg">Zakres zostal uzupelniony</CardTitle>
          <CardDescription>{prefillResult.message}</CardDescription>
        </Card>
      ) : null}
      {prefillResult.status === "invalid" ? (
        <Card
          className="grid gap-1 border-[#d8b675] bg-[#f8f0df]"
          data-testid="activity-prefill-message"
        >
          <CardTitle className="text-lg">Nie uzyto linku prefill</CardTitle>
          <CardDescription>{prefillResult.message}</CardDescription>
        </Card>
      ) : null}
      <ActivityForm
        action={createActivity}
        defaultPerformedBy={context.profile?.display_name ?? context.profile?.email ?? ""}
        defaultPerformedByProfileId={context.profile?.id ?? ""}
        memberOptions={memberOptions}
        mode="create"
        prefill={prefillResult.prefill ?? undefined}
        plotOptions={plotOptions}
        treeOptions={treeOptions}
      />
    </div>
  );
}
