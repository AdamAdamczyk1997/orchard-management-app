import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { CreateOrchardForm } from "@/features/orchards/create-orchard-form";
import { OnboardingIntro } from "@/features/orchards/onboarding-intro";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { requireSessionUser } from "@/lib/auth/require-session-user";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";

export default async function CreateOrchardPage() {
  await requireSessionUser();
  const [profile, context] = await Promise.all([
    readCurrentProfile(),
    resolveActiveOrchardContext(),
  ]);

  const onboardingMode = context.requires_onboarding;
  const compactIntro =
    Boolean(profile?.orchard_onboarding_dismissed_at) && onboardingMode;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <OnboardingIntro compact={compactIntro} />
      <Card className="grid gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            {onboardingMode ? "First orchard" : "Create orchard"}
          </p>
          <CardTitle>
            {onboardingMode
              ? "Create the orchard that unlocks your working context."
              : "Create another orchard for this account."}
          </CardTitle>
          <CardDescription>
            {onboardingMode
              ? "This action creates the orchard record, your active owner membership, and the first protected app context."
              : "You already have orchard access, but you can add another orchard here using the same ownership flow."}
          </CardDescription>
        </div>
        <CreateOrchardForm
          defaultDismissIntro={Boolean(profile?.orchard_onboarding_dismissed_at)}
          mode={onboardingMode ? "onboarding" : "secondary"}
        />
      </Card>
    </div>
  );
}
