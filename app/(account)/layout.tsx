import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/layouts/account-shell";
import {
  buildActiveOrchardSyncPath,
} from "@/lib/orchard-context/active-orchard-cookie";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";

type AccountLayoutProps = {
  children: ReactNode;
};

export default async function AccountLayout({ children }: AccountLayoutProps) {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    redirect("/login");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED" || !context.profile) {
    redirect("/bootstrap-error");
  }

  if (
    context.should_clear_cookie ||
    (context.should_persist_cookie && context.resolved_orchard_id)
  ) {
    redirect(
      buildActiveOrchardSyncPath({
        orchardId: context.resolved_orchard_id,
        next: "/settings/profile",
      }),
    );
  }

  return (
    <AccountShell
      activeOrchardName={context.orchard?.name}
      canReturnToDashboard={Boolean(context.orchard && context.membership)}
      profile={context.profile}
    >
      {children}
    </AccountShell>
  );
}
