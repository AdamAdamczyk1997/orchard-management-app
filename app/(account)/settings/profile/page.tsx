import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { RecordNotFoundCard } from "@/components/ui/record-not-found-card";
import { ProfileExportCard } from "@/features/auth/profile-export-card";
import { ProfileForm } from "@/features/auth/profile-form";
import { readCurrentProfile } from "@/lib/auth/get-current-profile";
import { readExportAvailabilityForProfile } from "@/lib/orchard-data/export";

export default async function ProfileSettingsPage() {
  const profile = await readCurrentProfile();

  if (!profile) {
    return (
      <RecordNotFoundCard
        backHref="/"
        backLabel="Wroc do startu"
        description="Nie udalo sie odczytac profilu konta. Sprobuj ponownie albo wroc do strony startowej."
        title="Brak danych profilu"
      />
    );
  }

  const exportAvailability = await readExportAvailabilityForProfile(profile.id);

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Ustawienia konta
          </p>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Tutaj edytujesz dane konta uzytkownika. Kontekst pracy w sadzie i
            czlonkostwa pozostaja oddzielone od ustawien profilu.
          </CardDescription>
        </div>
        <ProfileForm profile={profile} />
      </Card>

      {profile.system_role === "super_admin" ? (
        <Card className="grid gap-3 border-[#d7c7a8] bg-[#fffaf0]">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
              Dostep administracyjny
            </p>
            <CardTitle>Profil i eksport bez aktywnego sadu</CardTitle>
            <CardDescription>
              Jako `super_admin` mozesz wejsc do ustawien profilu i pobrac eksport
              konta bez wybierania aktywnego sadu. Dashboard, raporty i widoki
              operacyjne pozostaja nadal powiazane z aktywnym sadem.
            </CardDescription>
          </div>
        </Card>
      ) : null}

      <ProfileExportCard availability={exportAvailability} />
    </div>
  );
}
