import { Card, CardDescription, CardTitle } from "@/components/ui/card";

type OnboardingIntroProps = {
  compact?: boolean;
};

export function OnboardingIntro({ compact = false }: OnboardingIntroProps) {
  return (
    <Card className="grid gap-4 bg-[#1f3a28] text-white shadow-[0_30px_80px_rgba(31,58,40,0.22)]">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d7c5a1]">
        Kontekst sadu
      </p>
      <CardTitle className="text-2xl leading-tight text-[#eda01b]">
        {compact
          ? "Utworz sad, w ktorym chcesz pracowac."
          : "Utworz pierwszy sad, aby zaczac korzystac z aplikacji."}
      </CardTitle>
      <CardDescription className="text-[15px] text-[#133a08]">
        OrchardLog oddziela konto uzytkownika od wlasnosci sadu. Pierwszy sad
        tworzy podstawowy kontekst pracy, czlonkostwo oraz chroniony shell dla
        dalszej czesci produktu.
      </CardDescription>
      <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/10 p-4 text-sm text-[#28591a]">
        <p>1. Tworzysz rekord sadu.</p>
        <p>2. Aplikacja automatycznie nadaje Ci role `owner`.</p>
        <p>
          3. `active_orchard` ustawia sie po stronie serwera i otwiera sie shell
          aplikacji.
        </p>
      </div>
    </Card>
  );
}
