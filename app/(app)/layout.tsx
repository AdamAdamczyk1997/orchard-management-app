import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ProtectedAppShell } from "@/components/layouts/protected-app-shell";
import {
  buildActiveOrchardSyncPath,
} from "@/lib/orchard-context/active-orchard-cookie";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";
import { normalizeNextPath } from "@/lib/utils/navigation";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    redirect("/login");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" || !context.profile) {
    redirect("/bootstrap-error");
  }

  if (context.requires_onboarding || !context.orchard || !context.membership) {
    if (context.should_clear_cookie) {
      redirect(buildActiveOrchardSyncPath({ next: "/orchards/new" }));
    }

    redirect("/orchards/new");
  }

  const headerStore = await headers();
  const currentPath = normalizeNextPath(
    headerStore.get("x-current-path"),
    "/dashboard",
  );

  if (context.should_persist_cookie && context.resolved_orchard_id) {
    redirect(
      buildActiveOrchardSyncPath({
        orchardId: context.resolved_orchard_id,
        next: currentPath,
      }),
    );
  }

  return (
    <ProtectedAppShell
      activeOrchard={context.orchard}
      activeRole={context.membership.role}
      availableOrchards={context.available_orchards}
      canManageOrchard={context.membership.role === "owner"}
      currentPath={currentPath}
      profile={context.profile}
    >
      {children}
    </ProtectedAppShell>
  );
}
