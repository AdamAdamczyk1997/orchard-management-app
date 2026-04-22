import { LinkButton } from "@/components/ui/link-button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getOrchardRoleLabel } from "@/lib/domain/labels";
import { requireActiveOrchard } from "@/lib/orchard-context/require-active-orchard";

export default async function DashboardPage() {
  const context = await requireActiveOrchard("/dashboard");
  const orchard = context.orchard;
  const membership = context.membership;

  if (!orchard || !membership) {
    throw new Error("Active orchard is required on the dashboard.");
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
          Kontekst pracy
        </p>
        <CardTitle>{orchard.name}</CardTitle>
        <CardDescription>
          Pracujesz teraz jako `{getOrchardRoleLabel(membership.role)}`.
          Ten sad jest aktywnym kontekstem dla dzialek, odmian, drzew i kolejnych
          modulow operacyjnych.
        </CardDescription>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Co jest gotowe</CardTitle>
          <CardDescription>
            Mozesz juz przejsc przez logowanie, onboarding pierwszego sadu,
            przelaczanie kontekstu, ustawienia profilu, strukture sadu oraz
            dziennik prac sezonowych.
          </CardDescription>
        </Card>
        <Card className="grid gap-2">
          <CardTitle className="text-lg">Buduj strukture i zapisuj prace</CardTitle>
          <CardDescription>
            Zacznij od dzialek, potem dopisz odmiany, rozmiesc drzewa i przejdz
            do dziennika aktywnosci dla zabiegow sezonowych.
          </CardDescription>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/plots" variant="secondary">
              Otworz dzialki
            </LinkButton>
            <LinkButton href="/varieties" variant="secondary">
              Otworz odmiany
            </LinkButton>
            <LinkButton href="/trees" variant="secondary">
              Otworz drzewa
            </LinkButton>
            <LinkButton href="/activities" variant="secondary">
              Otworz aktywnosci
            </LinkButton>
          </div>
        </Card>
        <Card className="grid gap-2">
          <CardTitle className="text-lg">
            {membership.role === "owner"
              ? "Zarzadzaj sadem i zespolem"
              : "Kolejny krok w aplikacji"}
          </CardTitle>
          {membership.role === "owner" ? (
            <>
              <CardDescription>
                Jako wlasciciel mozesz dopracowac ustawienia aktywnego sadu i
                zarzadzac dostepem pracownikow.
              </CardDescription>
              <div className="flex flex-wrap gap-3">
                <LinkButton href="/settings/orchard" variant="secondary">
                  Ustawienia sadu
                </LinkButton>
                <LinkButton href="/settings/members" variant="secondary">
                  Czlonkowie
                </LinkButton>
              </div>
            </>
          ) : (
            <CardDescription>
              Mozesz juz przejsc do dziennika prac i zapisywac wykonane zabiegi
              razem z zakresem oraz materialami.
            </CardDescription>
          )}
        </Card>
      </div>
    </div>
  );
}
