import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { VarietyForm } from "@/features/varieties/variety-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readVarietyByIdForOrchard } from "@/lib/orchard-data/varieties";
import { updateVariety } from "@/server/actions/varieties";

type EditVarietyPageProps = {
  params: Promise<{
    varietyId: string;
  }>;
};

export default async function EditVarietyPage({
  params,
}: EditVarietyPageProps) {
  const context = await requireActiveOrchard("/varieties");
  const { varietyId } = await params;
  const variety = await readVarietyByIdForOrchard(context.orchard.id, varietyId);

  if (!variety) {
    return (
      <RecordNotFoundCard
        backHref="/varieties"
        description="Nie da sie edytowac tej odmiany, bo nie istnieje w aktywnym sadzie albo zostala juz usunieta."
        title="Nie znaleziono odmiany do edycji"
      />
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Edycja odmiany
        </p>
        <CardTitle>{variety.name}</CardTitle>
        <CardDescription>
          Zmien informacje o odmianie wykorzystywane pozniej przez drzewa,
          aktywnosci i podsumowania zbiorow.
        </CardDescription>
      </Card>
      <Card className="grid gap-5">
        <VarietyForm action={updateVariety} mode="edit" variety={variety} />
      </Card>
    </div>
  );
}
