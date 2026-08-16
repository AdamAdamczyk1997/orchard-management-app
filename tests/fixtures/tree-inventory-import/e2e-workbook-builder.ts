import ExcelJS from "exceljs";
import {
  TREE_INVENTORY_EXCEPTION_FIELDS,
  TREE_INVENTORY_SEGMENT_FIELDS,
  type TreeInventoryExceptionField,
  type TreeInventorySegmentField,
} from "@/lib/tree-inventory-import/contracts";
import type {
  TreeInventoryE2eExceptionRow,
  TreeInventoryE2eSegmentRow,
  TreeInventoryE2eWorkbookFixture,
} from "@/tests/fixtures/tree-inventory-import/e2e-full-cycle";

type WorkbookRowValue = ExcelJS.CellValue | undefined;
type SegmentWorkbookRow = Partial<
  Record<TreeInventorySegmentField, WorkbookRowValue>
>;
type ExceptionWorkbookRow = Partial<
  Record<TreeInventoryExceptionField, WorkbookRowValue>
>;

export async function fillTreeInventoryWorkbookBuffer(
  templateBuffer: Buffer,
  fixture: TreeInventoryE2eWorkbookFixture,
) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    templateBuffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );

  writeRowsToWorksheet(
    requireWorksheet(workbook, "NASADZENIA"),
    TREE_INVENTORY_SEGMENT_FIELDS,
    fixture.segments.map(mapSegmentRow),
  );
  writeRowsToWorksheet(
    requireWorksheet(workbook, "WYJATKI"),
    TREE_INVENTORY_EXCEPTION_FIELDS,
    fixture.exceptions.map(mapExceptionRow),
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

function mapSegmentRow(row: TreeInventoryE2eSegmentRow): SegmentWorkbookRow {
  return {
    segment_key: row.segment_key,
    section_name: row.section_name,
    row_number: row.row_number,
    from_position: row.from_position,
    to_position: row.to_position,
    species: row.species,
    variety_id: row.variety_id,
    variety_name: row.variety_name,
    variety_confidence: row.variety_confidence,
    condition_status: row.condition_status,
    rootstock: row.rootstock,
    location_verified: row.location_verified,
    notes: row.notes,
  };
}

function mapExceptionRow(row: TreeInventoryE2eExceptionRow): ExceptionWorkbookRow {
  return {
    exception_key: row.exception_key,
    segment_key: row.segment_key,
    section_name: row.section_name,
    row_number: row.row_number,
    position_in_row: row.position_in_row,
    exception_type: row.exception_type,
    species: row.species,
    variety_id: row.variety_id,
    variety_name: row.variety_name,
    variety_confidence: row.variety_confidence,
    condition_status: row.condition_status,
    notes: row.notes,
  };
}

function writeRowsToWorksheet<TField extends string>(
  worksheet: ExcelJS.Worksheet,
  expectedFields: readonly TField[],
  rows: Array<Partial<Record<TField, WorkbookRowValue>>>,
) {
  const columnByField = mapWorksheetColumns(worksheet);

  for (const field of expectedFields) {
    if (!columnByField.has(field)) {
      throw new Error(
        `Downloaded workbook ${worksheet.name} sheet is missing ${field} column.`,
      );
    }
  }

  rows.forEach((input, index) => {
    const worksheetRow = worksheet.getRow(index + 2);

    for (const [field, value] of Object.entries(input) as Array<
      [TField, WorkbookRowValue]
    >) {
      if (value === undefined) {
        continue;
      }

      const columnNumber = columnByField.get(field);

      if (!columnNumber) {
        throw new Error(
          `Downloaded workbook ${worksheet.name} sheet is missing ${field} column.`,
        );
      }

      worksheetRow.getCell(columnNumber).value = value;
    }

    worksheetRow.commit();
  });
}

function mapWorksheetColumns(worksheet: ExcelJS.Worksheet) {
  const columnByField = new Map<string, number>();
  const headerValues = worksheet.getRow(1).values;

  if (!Array.isArray(headerValues)) {
    throw new Error(`Downloaded workbook ${worksheet.name} header row is invalid.`);
  }

  headerValues.slice(1).forEach((value, index) => {
    if (typeof value === "string" && value.trim()) {
      columnByField.set(value.trim(), index + 1);
    }
  });

  return columnByField;
}

function requireWorksheet(workbook: ExcelJS.Workbook, sheetName: string) {
  const worksheet = workbook.getWorksheet(sheetName);

  if (!worksheet) {
    throw new Error(`Downloaded workbook does not contain ${sheetName} sheet.`);
  }

  return worksheet;
}
