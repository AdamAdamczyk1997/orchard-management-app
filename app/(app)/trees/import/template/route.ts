import { NextResponse, type NextRequest } from "next/server";
import { resolveActiveOrchardContext } from "@/lib/orchard-context/resolve-active-orchard";
import { readPlotByIdForOrchard } from "@/lib/orchard-data/plots";
import { listVarietiesForOrchard } from "@/lib/orchard-data/varieties";
import {
  buildTreeInventoryTemplateFileName,
  generateTreeInventoryTemplateBuffer,
  TREE_INVENTORY_TEMPLATE_CONTENT_TYPE,
} from "@/lib/tree-inventory-import/template-generator.server";

export async function GET(request: NextRequest) {
  const context = await resolveActiveOrchardContext();

  if (!context.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error_code: "UNAUTHORIZED",
        message: "Musisz sie zalogowac, aby pobrac szablon importu.",
      },
      { status: 401 },
    );
  }

  if (!context.orchard || !context.membership || !context.profile) {
    return NextResponse.json(
      {
        success: false,
        error_code: "NO_ACTIVE_ORCHARD",
        message: "Wybierz sad, aby pobrac szablon importu.",
      },
      { status: 403 },
    );
  }

  const plotId = request.nextUrl.searchParams.get("plot_id");

  if (!plotId) {
    return NextResponse.json(
      {
        success: false,
        error_code: "VALIDATION_ERROR",
        message: "Wybierz dzialke dla szablonu importu.",
      },
      { status: 400 },
    );
  }

  const plot = await readPlotByIdForOrchard(context.orchard.id, plotId);

  if (!plot) {
    return NextResponse.json(
      {
        success: false,
        error_code: "NOT_FOUND",
        message: "Nie znaleziono dzialki w aktywnym sadzie.",
      },
      { status: 404 },
    );
  }

  if (plot.status === "archived") {
    return NextResponse.json(
      {
        success: false,
        error_code: "PLOT_ARCHIVED",
        message: "Nie mozna pobrac szablonu dla zarchiwizowanej dzialki.",
      },
      { status: 400 },
    );
  }

  if (plot.layout_type !== "rows") {
    return NextResponse.json(
      {
        success: false,
        error_code: "PLOT_LAYOUT_UNSUPPORTED",
        message: "Szablon importu tree_inventory_v1 obsluguje tylko dzialki rzedowe.",
      },
      { status: 400 },
    );
  }

  const generatedAt = new Date().toISOString();
  const varieties = await listVarietiesForOrchard(context.orchard.id);
  const buffer = await generateTreeInventoryTemplateBuffer({
    orchard: {
      id: context.orchard.id,
      name: context.orchard.name,
    },
    plot: {
      id: plot.id,
      orchard_id: context.orchard.id,
      name: plot.name,
      code: plot.code,
      status: plot.status,
      layout_type: plot.layout_type,
    },
    varieties,
    generated_at: generatedAt,
    generated_by_profile_id: context.profile.id,
  });
  const filename = buildTreeInventoryTemplateFileName({
    plot_code: plot.code,
    plot_name: plot.name,
    generated_at: generatedAt,
  });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": TREE_INVENTORY_TEMPLATE_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
