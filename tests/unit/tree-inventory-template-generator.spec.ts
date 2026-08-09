import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  TREE_INVENTORY_EXCEPTION_FIELDS,
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_SEGMENT_FIELDS,
} from "@/lib/tree-inventory-import/contracts";
import {
  buildTreeInventoryTemplateFileName,
  generateTreeInventoryTemplateBuffer,
  generateTreeInventoryTemplateWorkbook,
  type GenerateTreeInventoryTemplateInput,
} from "@/lib/tree-inventory-import/template-generator.server";

const ORCHARD_ID = "90000000-0000-4000-8000-000000000001";
const PLOT_ID = "92000000-0000-4000-8000-000000000002";

function buildInput(
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
        name: "Ligol",
      },
      {
        id: "93000000-0000-4000-8000-000000000002",
        orchard_id: ORCHARD_ID,
        species: "Apple",
        name: "Szampion",
      },
      {
        id: "93000000-0000-4000-8000-000000000003",
        orchard_id: ORCHARD_ID,
        species: "Pear",
        name: "Konferencja",
      },
    ],
    generated_at: overrides.generated_at ?? "2026-08-08T18:00:00.000Z",
    generated_by_profile_id:
      overrides.generated_by_profile_id ??
      "95000000-0000-4000-8000-000000000005",
  };
}

async function loadWorkbook(
  buffer: Awaited<ReturnType<typeof generateTreeInventoryTemplateBuffer>>,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );

  return workbook;
}

function headersFor(worksheet: ExcelJS.Worksheet | undefined) {
  if (!worksheet) {
    return undefined;
  }

  const values = worksheet.getRow(1).values;

  return Array.isArray(values) ? values.slice(1) : Object.values(values);
}

describe("tree inventory template generator", () => {
  it("generates a v1 workbook with required worksheets and metadata", async () => {
    const workbook = await loadWorkbook(
      await generateTreeInventoryTemplateBuffer(buildInput()),
    );

    expect(workbook.worksheets.map((worksheet) => worksheet.name)).toEqual(
      TREE_INVENTORY_REQUIRED_WORKSHEETS,
    );

    const metadata = workbook.getWorksheet("METADANE");
    const metadataRows = new Map<string, unknown>();
    metadata?.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        metadataRows.set(String(row.getCell(1).value), row.getCell(2).value);
      }
    });

    expect(metadata?.state).toBe("hidden");
    expect(metadataRows.get("xlsx_contract_version")).toBe("tree_inventory_v1");
    expect(metadataRows.get("canonical_contract_version")).toBe(
      "tree_inventory_v1",
    );
    expect(metadataRows.get("generated_at")).toBe("2026-08-08T18:00:00.000Z");
    expect(metadataRows.get("orchard_id")).toBe(ORCHARD_ID);
    expect(metadataRows.get("plot_id")).toBe(PLOT_ID);
    expect(metadataRows.get("plot_code")).toBe("SAD-01");
    expect(metadataRows.get("plot_layout_type")).toBe("rows");
    expect(metadataRows.get("import_mode")).toBe("incremental_create");
    expect(metadataRows.get("allow_new_varieties")).toBe(false);
    expect(metadataRows.get("conflict_strategy")).toBe("reject");
  });

  it("matches v1 segment and exception headers", async () => {
    const workbook = await loadWorkbook(
      await generateTreeInventoryTemplateBuffer(buildInput()),
    );

    expect(headersFor(workbook.getWorksheet("NASADZENIA"))).toEqual([
      ...TREE_INVENTORY_SEGMENT_FIELDS,
    ]);
    expect(headersFor(workbook.getWorksheet("WYJATKI"))).toEqual([
      ...TREE_INVENTORY_EXCEPTION_FIELDS,
    ]);
  });

  it("generates orchard-local dictionaries and dropdown ranges", async () => {
    const workbook = await loadWorkbook(
      await generateTreeInventoryTemplateBuffer(buildInput()),
    );
    const dictionaries = workbook.getWorksheet("SLOWNIKI");
    const segments = workbook.getWorksheet("NASADZENIA");
    const exceptions = workbook.getWorksheet("WYJATKI");

    expect(dictionaries?.state).toBe("veryHidden");
    expect(dictionaries?.getColumn(6).hidden).toBe(true);
    expect(dictionaries?.getColumn(9).hidden).toBe(true);
    expect(dictionaries?.getColumn(1).values).toEqual([
      undefined,
      "species",
      "apple",
      "pear",
      "plum",
      "cherry",
      "Apple",
      "Pear",
    ]);
    expect(dictionaries?.getColumn(8).values).toEqual([
      undefined,
      "variety_name",
      "Ligol",
      "Szampion",
      "Konferencja",
    ]);

    expect(segments?.getCell("G2").dataValidation).toMatchObject({
      type: "list",
      formulae: ["'SLOWNIKI'!$A$2:$A$7"],
    });
    expect(segments?.getCell("I2").dataValidation).toMatchObject({
      type: "list",
      formulae: ["'SLOWNIKI'!$H$2:$H$4"],
    });
    expect(segments?.getCell("J2").dataValidation).toMatchObject({
      type: "list",
      formulae: ["'SLOWNIKI'!$B$2:$B$5"],
    });
    expect(segments?.getCell("K2").dataValidation).toMatchObject({
      type: "list",
      formulae: ["'SLOWNIKI'!$C$2:$C$6"],
    });
    expect(exceptions?.getCell("G2").dataValidation).toMatchObject({
      type: "list",
      formulae: ["'SLOWNIKI'!$D$2:$D$7"],
    });
  });

  it("locks technical columns while keeping worker input cells editable", async () => {
    const workbook = await loadWorkbook(
      await generateTreeInventoryTemplateBuffer(buildInput()),
    );
    const segments = workbook.getWorksheet("NASADZENIA");
    const exceptions = workbook.getWorksheet("WYJATKI");

    expect(segments?.getColumn(8).hidden).toBe(true);
    expect(exceptions?.getColumn(9).hidden).toBe(true);
    expect(segments?.getCell("B2").protection).toBeUndefined();
    expect(segments?.getCell("C2").protection).toEqual({
      hidden: false,
      locked: false,
    });
    expect(segments?.getCell("H2").protection).toBeUndefined();
    expect(exceptions?.getCell("C2").protection).toBeUndefined();
    expect(exceptions?.getCell("D2").protection).toEqual({
      hidden: false,
      locked: false,
    });
  });

  it("rejects cross-orchard plot or variety input before workbook generation", async () => {
    await expect(
      generateTreeInventoryTemplateWorkbook(
        buildInput({
          plot: {
            id: PLOT_ID,
            orchard_id: "other-orchard",
            name: "Foreign plot",
            layout_type: "rows",
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: "PLOT_ORCHARD_MISMATCH",
    });

    await expect(
      generateTreeInventoryTemplateWorkbook(
        buildInput({
          varieties: [
            {
              id: "93000000-0000-4000-8000-000000000009",
              orchard_id: "other-orchard",
              species: "Apple",
              name: "Foreign",
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({
      code: "VARIETY_ORCHARD_MISMATCH",
    });
  });

  it("rejects unsupported MVP plot layouts", async () => {
    await expect(
      generateTreeInventoryTemplateWorkbook(
        buildInput({
          plot: {
            id: PLOT_ID,
            orchard_id: ORCHARD_ID,
            name: "Irregular plot",
            layout_type: "irregular",
          },
        }),
      ),
    ).rejects.toMatchObject({
      code: "PLOT_LAYOUT_UNSUPPORTED",
    });
  });

  it("builds deterministic download file names", () => {
    expect(
      buildTreeInventoryTemplateFileName({
        plot_code: "SAD-01",
        plot_name: "Kwatera 1",
        generated_at: "2026-08-08T18:00:00.000Z",
      }),
    ).toBe("tree_inventory_v1_sad-01_2026-08-08.xlsx");
  });
});
