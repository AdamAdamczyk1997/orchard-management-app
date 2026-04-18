import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type OnboardingIntroProps = {
  compact?: boolean;
};

export function OnboardingIntro({ compact = false }: OnboardingIntroProps) {
  return (
    <Card className="grid gap-4 bg-[#264430] text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7c5a1]">
        Orchard context
      </p>
      <CardTitle className="text-white">
        {compact
          ? "Create the orchard that you want to work in."
          : "Create your first orchard to start using the app."}
      </CardTitle>
      <CardDescription className="text-[#d7e3d8]">
        OrchardLog separates account identity from orchard ownership. Your first orchard creates the base working context, membership, and protected shell for the rest of the product.
      </CardDescription>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#d7e3d8]">
        <p>1. Create the orchard record.</p>
        <p>2. The app creates your `owner` membership automatically.</p>
        <p>3. `active_orchard` is resolved and the protected shell opens.</p>
      </div>
    </Card>
  );
}
