import { redirect } from "next/navigation";
import {
  buildActiveOrchardSyncPath,
} from "@/lib/orchard-context/active-orchard-cookie";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";

export default async function HomePage() {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    redirect("/login");
  }

  if (context.error_code === "PROFILE_BOOTSTRAP_REQUIRED") {
    redirect("/bootstrap-error");
  }

  const isSuperAdminWithoutOrchard =
    context.profile?.system_role === "super_admin" &&
    (context.requires_onboarding || !context.orchard);

  if (isSuperAdminWithoutOrchard) {
    if (context.should_clear_cookie) {
      redirect(buildActiveOrchardSyncPath({ next: "/settings/profile" }));
    }

    redirect("/settings/profile");
  }

  if (context.requires_onboarding || !context.orchard) {
    if (context.should_clear_cookie) {
      redirect(buildActiveOrchardSyncPath({ next: "/orchards/new" }));
    }

    redirect("/orchards/new");
  }

  if (context.should_persist_cookie && context.resolved_orchard_id) {
    redirect(
      buildActiveOrchardSyncPath({
        orchardId: context.resolved_orchard_id,
        next: "/dashboard",
      }),
    );
  }

  redirect("/dashboard");
}
