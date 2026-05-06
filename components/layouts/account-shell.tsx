import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { signOut } from "@/server/actions/auth";
import type { ProfileSummary } from "@/types/contracts";

type AccountShellProps = {
  children: ReactNode;
  profile: ProfileSummary;
  canReturnToDashboard: boolean;
  activeOrchardName?: string | null;
};

export function AccountShell({
  children,
  profile,
  canReturnToDashboard,
  activeOrchardName,
}: AccountShellProps) {
  const displayName = profile.display_name ?? profile.email;
  const isSuperAdmin = profile.system_role === "super_admin";

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f4eb_0%,#fbfaf7_42%,#f3ede0_100%)]">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-10 sm:px-6">
        <Card className="grid gap-6 border-[#ded3be] bg-white/90 p-6 shadow-[0_24px_80px_rgba(54,48,35,0.08)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
                Konto
              </p>
              <div className="space-y-2">
                <CardTitle>Ustawienia profilu i eksport konta</CardTitle>
                <CardDescription>
                  Ten obszar pozostaje powiazany z kontem uzytkownika, a nie z
                  pojedynczym sadem. Reszta modulow operacyjnych nadal pracuje w
                  kontekscie aktywnego sadu.
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canReturnToDashboard ? (
                <LinkButton href="/dashboard" variant="secondary">
                  Wroc do panelu
                </LinkButton>
              ) : null}
              <form action={signOut}>
                <Button type="submit" variant="ghost">
                  Wyloguj sie
                </Button>
              </form>
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-[#e4dac6] bg-[#fbfaf7] p-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-[#1f2a1f]">{displayName}</p>
              <p className="text-sm text-[#5b6155]">{profile.email}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                  {isSuperAdmin ? "Super Admin" : "Konto uzytkownika"}
                </span>
                {activeOrchardName ? (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6d7269]">
                    Aktywny sad: {activeOrchardName}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="rounded-3xl border border-dashed border-[#d9ccb4] bg-white/80 p-4 text-sm leading-6 text-[#5b6155]">
              <p>
                Profil pozostaje dostepny niezaleznie od aktywnego sadu, ale tylko
                konta z odpowiednim zakresem moga pobrac eksport danych.
              </p>
              {canReturnToDashboard ? (
                <p className="pt-2">
                  Do pracy terenowej i raportow wrocisz przez{" "}
                  <Link className="font-medium text-[#274430] underline-offset-4 hover:underline" href="/dashboard">
                    panel glowny
                  </Link>
                  .
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <section>{children}</section>
      </div>
    </main>
  );
}
