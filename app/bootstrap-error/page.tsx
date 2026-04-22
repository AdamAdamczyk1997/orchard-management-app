import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export default function BootstrapErrorPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6">
      <Card className="grid w-full gap-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
            Blad przygotowania profilu
          </p>
          <CardTitle>Nie znaleziono profilu wymaganego dla tego konta.</CardTitle>
          <CardDescription>
            Trigger bazy danych, ktory powinien utworzyc rekord `profiles` po
            logowaniu, nie zakonczyl sie poprawnie. To bezpieczny ekran stopu,
            aby aplikacja nie kontynuowala pracy z niespojnym kontekstem.
          </CardDescription>
        </div>
        <div className="rounded-2xl border border-[#e6d7bb] bg-[#fbfaf7] px-4 py-3 text-sm leading-6 text-[#5b6155]">
          Sprawdz migracje i triggery odpowiedzialne za bootstrap profilu, a potem
          sprobuj zalogowac sie ponownie.
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#2c5b3b] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#234a30]"
          href="/login"
        >
          Wroc do logowania
        </Link>
      </Card>
    </main>
  );
}
