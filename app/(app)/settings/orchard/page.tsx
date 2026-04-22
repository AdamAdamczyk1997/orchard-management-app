import { redirect } from "next/navigation";
import { AccessDeniedCard } from "@/components/ui/access-denied-card";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrchardStatusLabel } from "@/lib/domain/labels";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";
import { readOrchardDetailsForOrchard } from "@/lib/orchard-data/orchards";
import { updateOrchard } from "@/server/actions/orchards";
import { OrchardForm } from "@/features/orchards/orchard-form";

export default async function OrchardSettingsPage() {
  const context = await requireActiveOrchard("/settings/orchard");
  const orchard = context.orchard;

  if (!orchard || !context.membership) {
    throw new Error("Active orchard is required for orchard settings.");
  }

  if (context.membership.role !== "owner") {
    return (
      <AccessDeniedCard description="Tylko wlasciciel sadu moze edytowac nazwe, kod i opis aktywnego sadu." />
    );
  }

  const orchardDetails = await readOrchardDetailsForOrchard(orchard.id);

  if (!orchardDetails) {
    redirect("/dashboard");
  }

  const orchardFormAction = async (_state: { success: boolean }, formData: FormData) => {
    "use server";

    return updateOrchard({ success: false }, formData);
  };

  return (
    <div className="grid gap-6">
      <Card className="grid gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Ustawienia sadu
          </p>
          <CardTitle>{orchardDetails.name}</CardTitle>
          <CardDescription>
            Edytuj podstawowe informacje o aktywnym sadzie. Status sadu jest teraz
            tylko do odczytu i pozostaje zgodny z obecnym MVP.
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#5b6155]">
          <span className="font-medium text-[#304335]">Status:</span>
          <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
            {getOrchardStatusLabel(orchardDetails.status)}
          </span>
        </div>
      </Card>

      <Card className="grid gap-5">
        <OrchardForm
          action={orchardFormAction}
          mode="settings"
          orchard={orchardDetails}
        />
      </Card>
    </div>
  );
}
