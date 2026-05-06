import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getExportAccountDataForProfile } from "@/lib/orchard-data/export";

function buildExportFilename(exportedAt: string) {
  const day = exportedAt.slice(0, 10);
  return `orchardlog-account-export-${day}.json`;
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      {
        success: false,
        error_code: "UNAUTHORIZED",
        message: "Musisz sie zalogowac, aby pobrac eksport konta.",
      },
      { status: 401 },
    );
  }

  const exportPayload = await getExportAccountDataForProfile(user.id, supabase);

  if (!exportPayload) {
    return NextResponse.json(
      {
        success: false,
        error_code: "EXPORT_NOT_ALLOWED_FOR_ROLE",
        message:
          "Eksport danych konta jest dostepny tylko dla wlasciciela co najmniej jednego sadu albo administratora systemu.",
      },
      { status: 403 },
    );
  }

  const body = `${JSON.stringify(exportPayload, null, 2)}\n`;

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${buildExportFilename(exportPayload.exported_at)}"`,
      "Cache-Control": "no-store",
    },
  });
}
