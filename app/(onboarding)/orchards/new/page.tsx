import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { OrchardForm } from "@/features/orchards/orchard-form";
import { OnboardingIntro } from "@/features/orchards/onboarding-intro";
import { createOrchard } from "@/server/actions/orchards";
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
  const orchardFormAction = async (_state: { success: boolean }, formData: FormData) => {
    "use server";

    return createOrchard({ success: false }, formData);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <OnboardingIntro compact={compactIntro} />
      <Card className="grid gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            {onboardingMode ? "Pierwszy sad" : "Nowy sad"}
          </p>
          <CardTitle>
            {onboardingMode
              ? "Utworz sad, ktory odblokuje Twoj kontekst pracy."
              : "Dodaj kolejny sad do tego konta."}
          </CardTitle>
          <CardDescription>
            {onboardingMode
              ? "Ta akcja utworzy rekord sadu, aktywne czlonkostwo `owner` i pierwszy chroniony kontekst aplikacji."
              : "Masz juz dostep do sadu, ale mozesz dodac tutaj kolejny sad w tym samym modelu ownership."}
          </CardDescription>
        </div>
        <OrchardForm
          action={orchardFormAction}
          defaultDismissIntro={Boolean(profile?.orchard_onboarding_dismissed_at)}
          mode={onboardingMode ? "onboarding" : "secondary"}
        />
      </Card>
    </div>
  );
}
