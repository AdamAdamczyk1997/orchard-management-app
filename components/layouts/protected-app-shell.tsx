import type { ReactNode } from "react";
import Link from "next/link";
import type {
  OrchardMembershipRole,
  OrchardSummary,
  ProfileSummary,
} from "@/types/contracts";
import { signOut } from "@/server/actions/auth";
import { OrchardSwitcher } from "@/features/orchards/orchard-switcher";
import { Button } from "@/components/ui/button";
import { getOrchardRoleLabel } from "@/lib/domain/labels";

type ProtectedAppShellProps = {
  profile: ProfileSummary;
  activeOrchard: OrchardSummary;
  activeRole: OrchardMembershipRole;
  availableOrchards: OrchardSummary[];
  canManageOrchard: boolean;
  children: ReactNode;
};

export function ProtectedAppShell({
  profile,
  activeOrchard,
  activeRole,
  availableOrchards,
  canManageOrchard,
  children,
}: ProtectedAppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[#e4dac6] bg-[#fbfaf7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#9d7e4e]">
              Aktywny sad
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#1f2a1f]">
                {activeOrchard.name}
              </h1>
              <span className="rounded-full bg-[#efe6d3] px-3 py-1 text-xs font-medium text-[#355139]">
                {getOrchardRoleLabel(activeRole)}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <OrchardSwitcher
              activeOrchardId={activeOrchard.id}
              orchards={availableOrchards}
            />
            <div className="flex items-center gap-2 rounded-2xl border border-[#dfd3bb] bg-white px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[#1f2a1f]">
                  {profile.display_name ?? profile.email}
                </p>
                <p className="truncate text-xs text-[#6d7269]">{profile.email}</p>
              </div>
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href="/settings/profile"
              >
                Profil
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="secondary">
                  Wyloguj sie
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="grid content-start gap-2 rounded-3xl border border-[#e2d7c1] bg-white/85 p-4 shadow-[0_20px_50px_rgba(56,49,34,0.05)]">
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/dashboard"
          >
            Panel glowny
          </Link>
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/plots"
          >
            Dzialki
          </Link>
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/varieties"
          >
            Odmiany
          </Link>
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/trees"
          >
            Drzewa
          </Link>
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/activities"
          >
            Aktywnosci
          </Link>
          <Link
            className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
            href="/harvests"
          >
            Zbiory
          </Link>
          <div className="mt-2 border-t border-[#eee5d5] pt-3">
            <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#9d7e4e]">
              Ustawienia
            </p>
            <div className="grid gap-2">
              <Link
                className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                href="/settings/profile"
              >
                Profil
              </Link>
              {canManageOrchard ? (
                <>
                  <Link
                    className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                    href="/settings/orchard"
                  >
                    Ustawienia sadu
                  </Link>
                  <Link
                    className="rounded-2xl px-3 py-2 text-sm font-medium text-[#274430] transition hover:bg-[#efe6d3]"
                    href="/settings/members"
                  >
                    Czlonkowie
                  </Link>
                </>
              ) : null}
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-[#dfd3bb] px-3 py-3 text-sm leading-6 text-[#6d7269]">
            Harvestowe podsumowanie sezonu jest juz dostepne w raportach, a panel
            glowny zbiera teraz najwazniejsze wpisy operacyjne dla aktywnego sadu.
          </div>
        </aside>
        <section>{children}</section>
      </div>
    </div>
  );
}
