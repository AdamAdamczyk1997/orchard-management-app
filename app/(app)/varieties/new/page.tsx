import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { VarietyForm } from "@/features/varieties/variety-form";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { createVariety } from "@/server/actions/varieties";

export default async function NewVarietyPage() {
  const context = await requireActiveOrchard("/varieties/new");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required for variety creation.");
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Create variety
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          Add a new orchard-specific variety record that can later be linked to trees, harvests, and seasonal reports.
        </CardDescription>
      </Card>
      <Card className="grid gap-5">
        <VarietyForm action={createVariety} mode="create" />
      </Card>
    </div>
  );
}
