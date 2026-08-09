import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import {
  TREE_INVENTORY_CONTRACT_VERSION,
  TREE_INVENTORY_EXCEPTION_FIELDS,
  TREE_INVENTORY_METADATA_FIELDS,
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_SEGMENT_FIELDS,
  createTreeInventoryDiagnostic,
  type TreeInventoryDiagnostic,
  type TreeInventoryJsonValue,
  type TreeInventoryMetadataField,
  type TreeInventoryRawValues,
  type TreeInventoryWorkbookSource,
  type TreeInventoryWorksheetName,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";

export type ParseTreeInventoryWorkbookInput = {
  workbook: Buffer | ArrayBuffer | Uint8Array;
  workbook_name?: string | null;
};

export type TreeInventoryParsedCell = {
  sheet: TreeInventoryWorksheetName | string;
  row_number: number;
  column: string;
  column_number: number;
  address: string;
  raw_value: TreeInventoryJsonValue;
};

export type TreeInventoryParsedRow = {
  sheet: TreeInventoryWorksheetName | string;
  row_number: number;
  row_key: string | null;
  raw_values: TreeInventoryRawValues;
  cells: TreeInventoryParsedCell[];
};

export type TreeInventoryParsedMetadataRow = {
  source: TreeInventoryParsedCell;
  field: string | null;
  value: TreeInventoryJsonValue;
};

export type TreeInventoryParsedMetadata = {
  rows: TreeInventoryParsedMetadataRow[];
  values: Partial<Record<TreeInventoryMetadataField, TreeInventoryJsonValue>>;
};

export type TreeInventoryParsedWorkbook = {
  workbook: TreeInventoryWorkbookSource;
  is_supported_contract: boolean;
  metadata: TreeInventoryParsedMetadata;
  segments: TreeInventoryParsedRow[];
  exceptions: TreeInventoryParsedRow[];
  dictionaries: TreeInventoryParsedRow[];
  diagnostics: TreeInventoryDiagnostic[];
};

type RequiredSheetName = (typeof TREE_INVENTORY_REQUIRED_WORKSHEETS)[number];

const METADATA_HEADERS = ["field", "value"] as const;

export const TREE_INVENTORY_DICTIONARY_WORKSHEET_HEADERS = [
  "species",
  "variety_confidence",
  "condition_status",
  "exception_type",
  "boolean",
  "variety_id",
  "variety_species",
  "variety_name",
  "plot_id",
  "plot_code",
  "plot_name",
  "plot_layout_type",
  "plot_status",
] as const;

const TEMPLATE_FILLER_FIELDS = new Set<string>(["plot_code"]);

export async function parseTreeInventoryWorkbook(
  input: ParseTreeInventoryWorkbookInput,
): Promise<TreeInventoryParsedWorkbook> {
  const buffer = toBuffer(input.workbook);
  const workbookSource = buildWorkbookSource(buffer, input.workbook_name);
  const diagnostics: TreeInventoryDiagnostic[] = [];

  if (buffer.byteLength > TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes) {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "IMPORT_LIMIT_EXCEEDED",
        severity: "error",
        source: { workbook: workbookSource },
        message: "Workbook exceeds tree_inventory_v1 size limit.",
        normalized_value: TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes,
      }),
    );

    return createEmptyParsedWorkbook(workbookSource, diagnostics);
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    diagnostics.push(
      createTreeInventoryDiagnostic({
        code: "INVALID_REQUIRED_VALUE",
        severity: "error",
        source: { workbook: workbookSource },
        message: "Workbook could not be read as a valid XLSX file.",
      }),
    );

    return createEmptyParsedWorkbook(workbookSource, diagnostics);
  }

  const sheets = collectRequiredSheets(workbook, workbookSource, diagnostics);
  const metadata = parseMetadataSheet(
    sheets.METADANE,
    workbookSource,
    diagnostics,
  );
  const isSupportedContract = validateContractVersion(
    metadata,
    workbookSource,
    diagnostics,
  );

  return {
    workbook: workbookSource,
    is_supported_contract: isSupportedContract,
    metadata,
    segments: parseTableSheet(
      sheets.NASADZENIA,
      "NASADZENIA",
      TREE_INVENTORY_SEGMENT_FIELDS,
      workbookSource,
      diagnostics,
    ),
    exceptions: parseTableSheet(
      sheets.WYJATKI,
      "WYJATKI",
      TREE_INVENTORY_EXCEPTION_FIELDS,
      workbookSource,
      diagnostics,
    ),
    dictionaries: parseTableSheet(
      sheets.SLOWNIKI,
      "SLOWNIKI",
      TREE_INVENTORY_DICTIONARY_WORKSHEET_HEADERS,
      workbookSource,
      diagnostics,
      { include_template_filler_rows: true },
    ),
    diagnostics,
  };
}

function collectRequiredSheets(
  workbook: ExcelJS.Workbook,
  workbookSource: TreeInventoryWorkbookSource,
  diagnostics: TreeInventoryDiagnostic[],
) {
  const sheets = Object.fromEntries(
    TREE_INVENTORY_REQUIRED_WORKSHEETS.map((sheetName) => [
      sheetName,
      workbook.getWorksheet(sheetName),
    ]),
  ) as Record<RequiredSheetName, ExcelJS.Worksheet | undefined>;

  for (const sheetName of TREE_INVENTORY_REQUIRED_WORKSHEETS) {
    if (!sheets[sheetName]) {
      diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "MISSING_REQUIRED_SHEET",
          severity: "error",
          source: { workbook: workbookSource, sheet: sheetName },
          message: `Required worksheet ${sheetName} is missing.`,
        }),
      );
    }
  }

  return sheets;
}

function parseMetadataSheet(
  worksheet: ExcelJS.Worksheet | undefined,
  workbookSource: TreeInventoryWorkbookSource,
  diagnostics: TreeInventoryDiagnostic[],
): TreeInventoryParsedMetadata {
  if (!worksheet) {
    return { rows: [], values: {} };
  }

  validateHeaders(worksheet, "METADANE", METADATA_HEADERS, diagnostics);

  const rows: TreeInventoryParsedMetadataRow[] = [];
  const values: Partial<Record<TreeInventoryMetadataField, TreeInventoryJsonValue>> =
    {};

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const field = toNullableString(readCellRawValue(row.getCell(1)));
    const value = readCellRawValue(row.getCell(2));

    if (field == null && value == null) {
      continue;
    }

    const source = buildParsedCell("METADANE", rowNumber, "value", 2, value);
    rows.push({ source, field, value });

    if (isMetadataField(field)) {
      values[field] = value;
    }
  }

  return { rows, values };
}

function validateContractVersion(
  metadata: TreeInventoryParsedMetadata,
  workbookSource: TreeInventoryWorkbookSource,
  diagnostics: TreeInventoryDiagnostic[],
) {
  const version = metadata.values.xlsx_contract_version;

  if (version === TREE_INVENTORY_CONTRACT_VERSION) {
    return true;
  }

  const sourceRow = metadata.rows.find(
    (row) => row.field === "xlsx_contract_version",
  );

  diagnostics.push(
    createTreeInventoryDiagnostic({
      code: "UNSUPPORTED_CONTRACT_VERSION",
      severity: "error",
      source: {
        workbook: workbookSource,
        sheet: "METADANE",
        row_number: sourceRow?.source.row_number ?? null,
        column: "xlsx_contract_version",
        raw_value: version ?? null,
      },
      message: "Unsupported tree inventory XLSX contract version.",
      normalized_value: TREE_INVENTORY_CONTRACT_VERSION,
    }),
  );

  return false;
}

function parseTableSheet<const TField extends string>(
  worksheet: ExcelJS.Worksheet | undefined,
  sheetName: TreeInventoryWorksheetName,
  expectedHeaders: readonly TField[],
  workbookSource: TreeInventoryWorkbookSource,
  diagnostics: TreeInventoryDiagnostic[],
  options: { include_template_filler_rows?: boolean } = {},
): TreeInventoryParsedRow[] {
  if (!worksheet) {
    return [];
  }

  const headerMap = validateHeaders(
    worksheet,
    sheetName,
    expectedHeaders,
    diagnostics,
  );
  const rows: TreeInventoryParsedRow[] = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const parsedRow = parseRawRow(row, rowNumber, sheetName, expectedHeaders);

    if (
      options.include_template_filler_rows ||
      hasUserEnteredRawValues(parsedRow.raw_values)
    ) {
      rows.push({
        ...parsedRow,
        row_key: getRowKey(parsedRow.raw_values, headerMap),
      });
    }
  }

  return rows;
}

function validateHeaders<const TField extends string>(
  worksheet: ExcelJS.Worksheet,
  sheetName: TreeInventoryWorksheetName,
  expectedHeaders: readonly TField[],
  diagnostics: TreeInventoryDiagnostic[],
) {
  const headerMap = new Map<string, number>();

  for (let columnNumber = 1; columnNumber <= worksheet.columnCount; columnNumber += 1) {
    const rawHeader = readCellRawValue(worksheet.getRow(1).getCell(columnNumber));
    const header = toNullableString(rawHeader);

    if (header) {
      headerMap.set(header, columnNumber);
    }
  }

  expectedHeaders.forEach((expectedHeader, index) => {
    const actualColumnNumber = headerMap.get(expectedHeader);

    if (actualColumnNumber == null) {
      diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "MISSING_REQUIRED_COLUMN",
          severity: "error",
          source: {
            sheet: sheetName,
            row_number: 1,
            column: expectedHeader,
            raw_value: null,
          },
          message: `Required column ${expectedHeader} is missing from ${sheetName}.`,
        }),
      );

      return;
    }

    if (actualColumnNumber !== index + 1) {
      diagnostics.push(
        createTreeInventoryDiagnostic({
          code: "MISSING_REQUIRED_COLUMN",
          severity: "error",
          source: {
            sheet: sheetName,
            row_number: 1,
            column: expectedHeader,
            raw_value: actualColumnNumber,
          },
          message: `Required column ${expectedHeader} is not in the expected position in ${sheetName}.`,
        }),
      );
    }
  });

  return headerMap;
}

function parseRawRow<const TField extends string>(
  row: ExcelJS.Row,
  rowNumber: number,
  sheetName: TreeInventoryWorksheetName,
  expectedHeaders: readonly TField[],
): TreeInventoryParsedRow {
  const rawValues: TreeInventoryRawValues = {};
  const cells: TreeInventoryParsedCell[] = [];

  expectedHeaders.forEach((field, index) => {
    const columnNumber = index + 1;
    const rawValue = readCellRawValue(row.getCell(columnNumber));

    rawValues[field] = rawValue;
    cells.push(
      buildParsedCell(sheetName, rowNumber, field, columnNumber, rawValue),
    );
  });

  return {
    sheet: sheetName,
    row_number: rowNumber,
    row_key: null,
    raw_values: rawValues,
    cells,
  };
}

function buildParsedCell(
  sheetName: TreeInventoryWorksheetName,
  rowNumber: number,
  field: string,
  columnNumber: number,
  rawValue: TreeInventoryJsonValue,
): TreeInventoryParsedCell {
  return {
    sheet: sheetName,
    row_number: rowNumber,
    column: field,
    column_number: columnNumber,
    address: `${columnNumberToName(columnNumber)}${rowNumber}`,
    raw_value: rawValue,
  };
}

function getRowKey(
  rawValues: TreeInventoryRawValues,
  headerMap: Map<string, number>,
) {
  if (headerMap.has("exception_key")) {
    return toNullableString(rawValues.exception_key);
  }

  if (headerMap.has("segment_key")) {
    return toNullableString(rawValues.segment_key);
  }

  return null;
}

function hasUserEnteredRawValues(rawValues: TreeInventoryRawValues) {
  return Object.entries(rawValues).some(
    ([field, value]) => !TEMPLATE_FILLER_FIELDS.has(field) && value !== null,
  );
}

function readCellRawValue(cell: ExcelJS.Cell): TreeInventoryJsonValue {
  return toJsonValue(cell.value);
}

function toJsonValue(value: unknown): TreeInventoryJsonValue {
  if (value == null) {
    return null;
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toJsonValue);
  }

  if (typeof value === "object") {
    const result: Record<string, TreeInventoryJsonValue> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      if (nestedValue !== undefined) {
        result[key] = toJsonValue(nestedValue);
      }
    }

    return result;
  }

  return String(value);
}

function toNullableString(value: TreeInventoryJsonValue) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isMetadataField(
  value: string | null,
): value is TreeInventoryMetadataField {
  return (
    value != null &&
    TREE_INVENTORY_METADATA_FIELDS.includes(value as TreeInventoryMetadataField)
  );
}

function toBuffer(value: ParseTreeInventoryWorkbookInput["workbook"]) {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value);
  }

  return Buffer.from(value);
}

function buildWorkbookSource(
  buffer: Buffer,
  workbookName: string | null | undefined,
): TreeInventoryWorkbookSource {
  return {
    workbook_name: workbookName ?? null,
    workbook_byte_size: buffer.byteLength,
    workbook_sha256: `sha256:${createHash("sha256")
      .update(buffer)
      .digest("hex")}`,
  };
}

function createEmptyParsedWorkbook(
  workbook: TreeInventoryWorkbookSource,
  diagnostics: TreeInventoryDiagnostic[],
): TreeInventoryParsedWorkbook {
  return {
    workbook,
    is_supported_contract: false,
    metadata: { rows: [], values: {} },
    segments: [],
    exceptions: [],
    dictionaries: [],
    diagnostics,
  };
}

function columnNumberToName(columnNumber: number) {
  let value = columnNumber;
  let name = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}
