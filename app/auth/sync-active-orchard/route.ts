import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ACTIVE_ORCHARD_COOKIE_NAME,
  getActiveOrchardCookieOptions,
} from "@/lib/orchard-context/active-orchard-cookie";
import { listAccessibleOrchards } from "@/lib/orchard-context/list-accessible-orchards";
import { normalizeNextPath } from "@/lib/utils/navigation";

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const nextPath = normalizeNextPath(
    request.nextUrl.searchParams.get("next"),
    "/dashboard",
  );
  const orchardId = request.nextUrl.searchParams.get("orchardId");
  const response = NextResponse.redirect(new URL(nextPath, request.url));

  if (!orchardId) {
    response.cookies.set(ACTIVE_ORCHARD_COOKIE_NAME, "", {
      ...getActiveOrchardCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  const accessibleOrchards = await listAccessibleOrchards(user.id);
  const isAllowed = accessibleOrchards.some(
    (record) => record.orchard.id === orchardId,
  );

  if (!isAllowed) {
    response.cookies.set(ACTIVE_ORCHARD_COOKIE_NAME, "", {
      ...getActiveOrchardCookieOptions(),
      maxAge: 0,
    });
    return response;
  }

  response.cookies.set(
    ACTIVE_ORCHARD_COOKIE_NAME,
    orchardId,
    getActiveOrchardCookieOptions(),
  );

  return response;
}
