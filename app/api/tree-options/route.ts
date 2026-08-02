import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";
import { searchTreeOptionsForOrchard } from "@/lib/orchard-data/activities";
import { parseTreeOptionSearchParams } from "@/lib/domain/tree-option-search";

export async function GET(request: NextRequest) {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return NextResponse.json({ options: [] }, { status: 401 });
  }

  if (!context.orchard || !context.membership) {
    return NextResponse.json({ options: [] }, { status: 403 });
  }

  const input = parseTreeOptionSearchParams(request.nextUrl.searchParams);
  const options = await searchTreeOptionsForOrchard(context.orchard.id, input);

  return NextResponse.json({ options });
}
