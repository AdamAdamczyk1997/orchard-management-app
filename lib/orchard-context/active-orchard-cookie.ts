import { cookies } from "next/headers";
import { isProduction } from "@/lib/supabase/config";
import { normalizeNextPath } from "@/lib/utils/navigation";

export const ACTIVE_ORCHARD_COOKIE_NAME = "ol_active_orchard";
export const ACTIVE_ORCHARD_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export function getActiveOrchardCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: isProduction(),
    maxAge: ACTIVE_ORCHARD_COOKIE_MAX_AGE,
  };
}

export async function readActiveOrchardCookie() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_ORCHARD_COOKIE_NAME)?.value ?? null;
}

export async function persistActiveOrchardCookie(orchardId: string) {
  const cookieStore = await cookies();
  cookieStore.set(
    ACTIVE_ORCHARD_COOKIE_NAME,
    orchardId,
    getActiveOrchardCookieOptions(),
  );
}

export async function clearActiveOrchardCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORCHARD_COOKIE_NAME, "", {
    ...getActiveOrchardCookieOptions(),
    maxAge: 0,
  });
}

export function buildActiveOrchardSyncPath(input: {
  orchardId?: string | null;
  next?: string | null;
}) {
  const params = new URLSearchParams();
  params.set("next", normalizeNextPath(input.next, "/"));

  if (input.orchardId) {
    params.set("orchardId", input.orchardId);
  }

  return `/auth/sync-active-orchard?${params.toString()}`;
}
