import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { PrerequisiteCard } from "@/components/ui/prerequisite-card";
import { BulkTreeBatchForm } from "@/features/trees/bulk-tree-batch-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { listPlotOptionsForOrchard } from "@/lib/orchard-data/plots";
import { listVarietyOptionsForOrchard } from "@/lib/orchard-data/varieties";
import { type NextSearchParams } from "@/lib/utils/search-params";
import { resolveBulkTreeBatchPrefillFromSearchParams } from "@/lib/validation/tree-batch-prefill";
import { submitBulkTreeBatch } from "@/server/actions/trees";

type NewBulkTreeBatchPageProps = {
  searchParams: Promise<NextSearchParams>;
};

export default async function NewBulkTreeBatchPage({
  searchParams,
}: NewBulkTreeBatchPageProps) {
  const context = await requireActiveOrchard("/trees/batch/new");
  const [plotOptions, varietyOptions, resolvedSearchParams] = await Promise.all([
    listPlotOptionsForOrchard(context.orchard.id),
    listVarietyOptionsForOrchard(context.orchard.id),
    searchParams,
  ]);
  const activePlots = plotOptions.filter((plot) => plot.status !== "archived");
  const prefillResult = resolveBulkTreeBatchPrefillFromSearchParams(
    resolvedSearchParams,
    {
      plotOptions: activePlots,
    },
  );

  if (activePlots.length === 0) {
    return (
      <div className="grid gap-6">
        <PrerequisiteCard
          actions={[
            { href: "/plots/new", label: "Utworz dzialke" },
            { href: "/trees", label: "Wroc do drzew", variant: "secondary" },
          ]}
          description="Batch create wymaga aktywnej dzialki. Dodaj lub przywroc co najmniej jedna aktywna dzialke, zanim utworzysz zakres drzew."
          eyebrow="Batch create drzew"
          title="Najpierw przygotuj dzialke"
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Batch create drzew
        </p>
        <CardTitle>{context.orchard.name}</CardTitle>
        <CardDescription>
          Ten flow sluzy do szybkiego zalozenia calego zakresu drzew w jednym rzedzie
          i na jednej dzialce, z transakcyjnym zapisem all-or-nothing.
        </CardDescription>
      </Card>
      {prefillResult.status === "applied" ? (
        <Card
          className="grid gap-1 border-[#d8c7a9] bg-[#fbfaf7]"
          data-testid="bulk-tree-batch-prefill-message"
        >
          <CardTitle className="text-lg">Zakres zostal uzupelniony</CardTitle>
          <CardDescription>{prefillResult.message}</CardDescription>
        </Card>
      ) : null}
      {prefillResult.status === "invalid" ? (
        <Card
          className="grid gap-1 border-[#d8b675] bg-[#f8f0df]"
          data-testid="bulk-tree-batch-prefill-message"
        >
          <CardTitle className="text-lg">Nie uzyto linku prefill</CardTitle>
          <CardDescription>{prefillResult.message}</CardDescription>
        </Card>
      ) : null}
      <BulkTreeBatchForm
        action={submitBulkTreeBatch}
        plotOptions={activePlots}
        prefill={prefillResult.prefill ?? undefined}
        varietyOptions={varietyOptions}
      />
    </div>
  );
}
