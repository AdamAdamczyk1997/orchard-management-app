import { LinkButton } from "@/components/ui/link-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";

export default async function DashboardPage() {
  const context = await requireActiveOrchard("/dashboard");
  const orchard = context.orchard;

  if (!orchard) {
    throw new Error("Active orchard is required on the dashboard.");
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Active context
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          You are working as `{context.membership?.role}` in this orchard. Phase 1 keeps the shell intentionally lean so the next slices can attach domain modules on a stable base.
        </CardDescription>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grid gap-2">
          <CardTitle className="text-lg">What works now</CardTitle>
          <CardDescription>
            Auth, onboarding, first-orchard creation, active orchard resolution, profile management, and the first orchard structure modules are live.
          </CardDescription>
        </Card>
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Build orchard structure</CardTitle>
          <CardDescription>
            Start with plots, then add varieties, and finally place individual trees inside the active orchard.
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/plots" variant="secondary">
              Open plots
            </LinkButton>
            <LinkButton href="/varieties" variant="secondary">
              Open varieties
            </LinkButton>
            <LinkButton href="/trees" variant="secondary">
              Open trees
            </LinkButton>
          </div>
        </Card>
        <Card className="grid gap-2">
          <CardTitle className="text-lg">What comes after this</CardTitle>
          <CardDescription>
            The next vertical slice will attach `activities`, `activity_scopes`, and `activity_materials` to the orchard structure created in this phase.
          </CardDescription>
        </Card>
      </div>
    </div>
  );
}
