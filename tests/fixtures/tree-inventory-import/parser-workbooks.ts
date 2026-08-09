import ExcelJS from "exceljs";
import {
  TREE_INVENTORY_EXCEPTION_FIELDS,
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_SEGMENT_FIELDS,
} from "@/lib/tree-inventory-import/contracts";
import {
  TREE_INVENTORY_DICTIONARY_WORKSHEET_HEADERS,
} from "@/lib/tree-inventory-import/parser.server";
import {
  generateTreeInventoryTemplateBuffer,
  type GenerateTreeInventoryTemplateInput,
} from "@/lib/tree-inventory-import/template-generator.server";

const ORCHARD_ID = "90000000-0000-4000-8000-000000000001";
const PLOT_ID = "92000000-0000-4000-8000-000000000002";

export function buildParserTemplateInput(
  overrides: Partial<GenerateTreeInventoryTemplateInput> = {},
): GenerateTreeInventoryTemplateInput {
  return {
    orchard: overrides.orchard ?? {
      id: ORCHARD_ID,
      name: "MAIN Orchard",
    },
    plot: overrides.plot ?? {
      id: PLOT_ID,
      orchard_id: ORCHARD_ID,
      name: "Kwatera 1",
      code: "SAD-01",
      status: "active",
      layout_type: "rows",
    },
    varieties: overrides.varieties ?? [
      {
        id: "93000000-0000-4000-8000-000000000001",
        orchard_id: ORCHARD_ID,
        species: "Apple",
        name: "Szampion",
      },
    ],
    generated_at: overrides.generated_at ?? "2026-08-08T18:00:00.000Z",
    generated_by_profile_id:
      overrides.generated_by_profile_id ??
      "95000000-0000-4000-8000-000000000005",
  };
}

export async function buildFilledParserWorkbookBuffer(
  overrides: Partial<GenerateTreeInventoryTemplateInput> = {},
) {
  const workbook = await loadWorkbook(
    await generateTreeInventoryTemplateBuffer(buildParserTemplateInput(overrides)),
  );
  const segments = requireWorksheet(workbook, "NASADZENIA");
  const exceptions = requireWorksheet(workbook, "WYJATKI");

  segments.getCell("A2").value = "S1";
  segments.getCell("D2").value = 1;
  segments.getCell("E2").value = 1;
  segments.getCell("F2").value = 3;
  segments.getCell("G2").value = "Apple";
  segments.getCell("H2").value = "93000000-0000-4000-8000-000000000001";
  segments.getCell("I2").value = "Szampion";
  segments.getCell("J2").value = "known";
  segments.getCell("K2").value = "good";
  segments.getCell("S2").value = {
    formula: 'CONCAT("not","trusted")',
    result: "nottrusted",
  };

  segments.getCell("A3").value = "S2";
  segments.getCell("D3").value = 2;
  segments.getCell("E3").value = 1;
  segments.getCell("F3").value = 2;
  segments.getCell("G3").value = "";
  segments.getCell("I3").value = "";
  segments.getCell("J3").value = "unknown";
  segments.getCell("K3").value = "good";

  exceptions.getCell("A2").value = "E1";
  exceptions.getCell("B2").value = "S1";
  exceptions.getCell("E2").value = 1;
  exceptions.getCell("F2").value = 2;
  exceptions.getCell("G2").value = "missing_tree";
  exceptions.getCell("J2").value = "";
  exceptions.getCell("K2").value = "uncertain";

  return writeWorkbookBuffer(workbook);
}

export async function buildWorkbookWithoutSheetBuffer(sheetName: string) {
  const workbook = new ExcelJS.Workbook();

  for (const requiredSheetName of TREE_INVENTORY_REQUIRED_WORKSHEETS) {
    if (requiredSheetName !== sheetName) {
      workbook.addWorksheet(requiredSheetName);
    }
  }

  addMinimalHeaders(workbook);

  return writeWorkbookBuffer(workbook);
}

export async function buildWorkbookWithUnsupportedVersionBuffer() {
  const workbook = await loadWorkbook(
    await generateTreeInventoryTemplateBuffer(buildParserTemplateInput()),
  );
  const metadata = requireWorksheet(workbook, "METADANE");

  metadata.getCell("B2").value = "tree_inventory_v2";

  return writeWorkbookBuffer(workbook);
}

export async function buildWorkbookWithMissingSegmentHeaderBuffer() {
  const workbook = await loadWorkbook(
    await generateTreeInventoryTemplateBuffer(buildParserTemplateInput()),
  );
  const segments = requireWorksheet(workbook, "NASADZENIA");

  segments.getCell("E1").value = "from";

  return writeWorkbookBuffer(workbook);
}

export async function buildLargeParserWorkbookBuffer(segmentRows: number) {
  const workbook = new ExcelJS.Workbook();

  TREE_INVENTORY_REQUIRED_WORKSHEETS.forEach((sheetName) => {
    workbook.addWorksheet(sheetName);
  });
  addMinimalHeaders(workbook);

  const metadata = requireWorksheet(workbook, "METADANE");
  metadata.addRow(["xlsx_contract_version", "tree_inventory_v1"]);
  metadata.addRow(["canonical_contract_version", "tree_inventory_v1"]);

  const segments = requireWorksheet(workbook, "NASADZENIA");

  for (let index = 0; index < segmentRows; index += 1) {
    segments.addRow({
      segment_key: `S${index + 1}`,
      plot_code: "SAD-01",
      row_number: index + 1,
      from_position: 1,
      to_position: 1,
      species: "Apple",
      variety_name: "Szampion",
      variety_confidence: "known",
      condition_status: "good",
    });
  }

  return writeWorkbookBuffer(workbook);
}

async function loadWorkbook(buffer: Buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );

  return workbook;
}

async function writeWorkbookBuffer(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function addMinimalHeaders(workbook: ExcelJS.Workbook) {
  const metadata = workbook.getWorksheet("METADANE");
  if (metadata) {
    metadata.addRow(["field", "value"]);
  }

  setHeaders(workbook.getWorksheet("NASADZENIA"), TREE_INVENTORY_SEGMENT_FIELDS);
  setHeaders(workbook.getWorksheet("WYJATKI"), TREE_INVENTORY_EXCEPTION_FIELDS);
  setHeaders(
    workbook.getWorksheet("SLOWNIKI"),
    TREE_INVENTORY_DICTIONARY_WORKSHEET_HEADERS,
  );
}

function setHeaders(
  worksheet: ExcelJS.Worksheet | undefined,
  headers: readonly string[],
) {
  if (!worksheet) {
    return;
  }

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: 20,
  }));
}

function requireWorksheet(workbook: ExcelJS.Workbook, sheetName: string) {
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`Expected ${sheetName} worksheet in parser fixture.`);
  }

  return worksheet;
}
