import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_VARIETY_CONFIDENCES,
} from "@/lib/tree-inventory-import/contracts";

type NormalizedSpikeWorkbook = {
  worksheets: Array<{
    name: string;
    state: string;
    hidden_first_column: boolean;
    first_rows: unknown[][];
    j2_validation_formulae: unknown[] | null;
    sheet_protected: boolean;
  }>;
};

type WorksheetWithRuntimeProtection = ExcelJS.Worksheet & {
  sheetProtection?: unknown;
};

async function writeAndReadWorkbook(workbook: ExcelJS.Workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  const loaded = new ExcelJS.Workbook();
  await loaded.xlsx.load(buffer);

  return { buffer, loaded };
}

function normalizeRowValues(row: ExcelJS.Row) {
  const values = row.values;
  const valueArray = Array.isArray(values) ? values.slice(1) : Object.values(values);

  return valueArray.map((value) =>
    value instanceof Date ? value.toISOString() : value,
  );
}

function hasRuntimeSheetProtection(
  worksheet: ExcelJS.Worksheet | undefined,
) {
  return Boolean((worksheet as WorksheetWithRuntimeProtection | undefined)
    ?.sheetProtection);
}

function normalizeSpikeWorkbook(
  workbook: ExcelJS.Workbook,
): NormalizedSpikeWorkbook {
  return {
    worksheets: workbook.worksheets.map((worksheet) => ({
      name: worksheet.name,
      state: worksheet.state,
      hidden_first_column: worksheet.getColumn(1).hidden === true,
      first_rows: [1, 2, 3].map((rowNumber) =>
        normalizeRowValues(worksheet.getRow(rowNumber)),
      ),
      j2_validation_formulae:
        worksheet.getCell("J2").dataValidation?.formulae ?? null,
      sheet_protected: hasRuntimeSheetProtection(worksheet),
    })),
  };
}

async function buildSpikeWorkbook(options: { segmentRows: number }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OrchardLog tree_inventory_v1 dependency spike";
  workbook.created = new Date("2026-08-08T00:00:00.000Z");
  workbook.modified = new Date("2026-08-08T00:00:00.000Z");

  for (const sheetName of TREE_INVENTORY_REQUIRED_WORKSHEETS) {
    workbook.addWorksheet(sheetName);
  }

  const metadata = workbook.getWorksheet("METADANE");
  if (!metadata) {
    throw new Error("METADANE worksheet missing in spike workbook.");
  }

  metadata.getColumn(1).hidden = true;
  metadata.getCell("A1").value = "orchard_id";
  metadata.getCell("B1").value = "90000000-0000-4000-8000-000000000001";
  metadata.getCell("A2").value = "xlsx_contract_version";
  metadata.getCell("B2").value = "tree_inventory_v1";
  metadata.getCell("A3").value = "conflict_strategy";
  metadata.getCell("B3").value = "reject";
  metadata.getCell("B1").protection = { locked: false };
  await metadata.protect("phase2-spike", {
    selectLockedCells: false,
    selectUnlockedCells: true,
  });

  const dictionaries = workbook.getWorksheet("SLOWNIKI");
  if (!dictionaries) {
    throw new Error("SLOWNIKI worksheet missing in spike workbook.");
  }

  dictionaries.state = "veryHidden";
  dictionaries.getCell("A1").value = "variety_confidence";
  TREE_INVENTORY_VARIETY_CONFIDENCES.forEach((value, index) => {
    dictionaries.getCell(index + 2, 1).value = value;
  });

  const segments = workbook.getWorksheet("NASADZENIA");
  if (!segments) {
    throw new Error("NASADZENIA worksheet missing in spike workbook.");
  }

  segments.columns = [
    { header: "segment_key", key: "segment_key", width: 16 },
    { header: "row_number", key: "row_number", width: 12 },
    { header: "from_position", key: "from_position", width: 14 },
    { header: "to_position", key: "to_position", width: 14 },
    { header: "species", key: "species", width: 18 },
    { header: "variety_name", key: "variety_name", width: 22 },
    { header: "condition_status", key: "condition_status", width: 18 },
    { header: "planted_year_from", key: "planted_year_from", width: 20 },
    { header: "planted_year_to", key: "planted_year_to", width: 18 },
    { header: "variety_confidence", key: "variety_confidence", width: 22 },
  ];

  for (let index = 0; index < options.segmentRows; index += 1) {
    segments.addRow({
      segment_key: `S${index + 1}`,
      row_number: Math.floor(index / 100) + 1,
      from_position: (index % 100) + 1,
      to_position: (index % 100) + 1,
      species: "Apple",
      variety_name: "Szampion",
      condition_status: "good",
      planted_year_from: 2015,
      planted_year_to: 2017,
      variety_confidence: "known",
    });
  }

  for (let rowNumber = 2; rowNumber <= options.segmentRows + 1; rowNumber += 1) {
    segments.getCell(`J${rowNumber}`).dataValidation = {
      type: "list",
      allowBlank: false,
      formulae: ['"known,unknown,uncertain,new_candidate"'],
    };
  }

  const exceptions = workbook.getWorksheet("WYJATKI");
  if (!exceptions) {
    throw new Error("WYJATKI worksheet missing in spike workbook.");
  }

  exceptions.getCell("A1").value = "exception_key";
  exceptions.getCell("B1").value = "exception_type";
  exceptions.getCell("A2").value = "E1";
  exceptions.getCell("B2").value = "missing_tree";

  return workbook;
}

describe("tree inventory xlsx dependency spike", () => {
  it("round-trips v1 workbook features server-side with exceljs", async () => {
    const workbook = await buildSpikeWorkbook({ segmentRows: 3 });
    const { buffer, loaded } = await writeAndReadWorkbook(workbook);

    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(loaded.worksheets.map((worksheet) => worksheet.name)).toEqual([
      "INSTRUKCJA",
      "METADANE",
      "NASADZENIA",
      "WYJATKI",
      "SLOWNIKI",
    ]);

    const metadata = loaded.getWorksheet("METADANE");
    const dictionaries = loaded.getWorksheet("SLOWNIKI");
    const segments = loaded.getWorksheet("NASADZENIA");
    const exceptions = loaded.getWorksheet("WYJATKI");

    expect(metadata?.getColumn(1).hidden).toBe(true);
    expect(hasRuntimeSheetProtection(metadata)).toBe(true);
    expect(metadata?.getCell("B1").protection).toEqual({
      hidden: false,
      locked: false,
    });
    expect(metadata?.getCell("B2").value).toBe("tree_inventory_v1");
    expect(dictionaries?.state).toBe("veryHidden");
    expect(segments?.getCell("J2").dataValidation).toMatchObject({
      type: "list",
      formulae: ['"known,unknown,uncertain,new_candidate"'],
    });
    expect(exceptions?.getCell("B2").value).toBe("missing_tree");
  });

  it("uses normalized workbook data for deterministic assertions", async () => {
    const first = await writeAndReadWorkbook(
      await buildSpikeWorkbook({ segmentRows: 5 }),
    );
    const second = await writeAndReadWorkbook(
      await buildSpikeWorkbook({ segmentRows: 5 }),
    );

    expect(normalizeSpikeWorkbook(first.loaded)).toEqual(
      normalizeSpikeWorkbook(second.loaded),
    );
  });

  it("generates and parses a 1k-position equivalent workbook within MVP bounds", async () => {
    const startedAt = Date.now();
    const workbook = await buildSpikeWorkbook({ segmentRows: 1_000 });
    const { buffer, loaded } = await writeAndReadWorkbook(workbook);
    const elapsedMs = Date.now() - startedAt;

    expect(buffer.byteLength).toBeGreaterThan(10_000);
    expect(buffer.byteLength).toBeLessThan(1_000_000);
    expect(loaded.getWorksheet("NASADZENIA")?.rowCount).toBe(1_001);
    expect(elapsedMs).toBeLessThan(5_000);
  });
});
