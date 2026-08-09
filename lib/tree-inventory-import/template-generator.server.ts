import ExcelJS from "exceljs";
import { SPECIES_PRESETS } from "@/lib/domain/species";
import {
  TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
  TREE_INVENTORY_CONFLICT_STRATEGIES,
  TREE_INVENTORY_EXCEPTION_FIELDS,
  TREE_INVENTORY_EXCEPTION_TYPES,
  TREE_INVENTORY_IMPORT_MODES,
  TREE_INVENTORY_METADATA_FIELDS,
  TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES,
  TREE_INVENTORY_REQUIRED_WORKSHEETS,
  TREE_INVENTORY_SEGMENT_FIELDS,
  TREE_INVENTORY_TREE_CONDITION_STATUSES,
  TREE_INVENTORY_VARIETY_CONFIDENCES,
  TREE_INVENTORY_XLSX_CONTRACT_VERSION,
  type TreeInventoryExceptionField,
  type TreeInventoryMetadataField,
  type TreeInventorySegmentField,
} from "@/lib/tree-inventory-import/contracts";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";
import type { PlotLayoutType, PlotStatus } from "@/types/contracts";

export type TreeInventoryTemplateOrchard = {
  id: string;
  name: string;
};

export type TreeInventoryTemplatePlot = {
  id: string;
  orchard_id: string;
  name: string;
  code?: string | null;
  status?: PlotStatus;
  layout_type: PlotLayoutType;
};

export type TreeInventoryTemplateVariety = {
  id: string;
  orchard_id?: string | null;
  species: string;
  name: string;
};

export type GenerateTreeInventoryTemplateInput = {
  orchard: TreeInventoryTemplateOrchard;
  plot: TreeInventoryTemplatePlot;
  varieties: TreeInventoryTemplateVariety[];
  generated_at: string;
  generated_by_profile_id: string;
};

export const TREE_INVENTORY_TEMPLATE_FILE_EXTENSION = "xlsx" as const;
export const TREE_INVENTORY_TEMPLATE_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" as const;

const TEMPLATE_PROTECTION_PASSWORD = "tree_inventory_v1";
const SEGMENT_TEMPLATE_ROWS =
  TREE_INVENTORY_IMPORT_LIMITS.max_segment_rows;
const EXCEPTION_TEMPLATE_ROWS =
  TREE_INVENTORY_IMPORT_LIMITS.max_exception_rows;

const instructionRows = [
  ["Sadownik+ - import inwentaryzacji nasadzen"],
  [
    "Ten plik dotyczy jednego active orchard i jednego plot. Nie zmieniaj ukrytych arkuszy ani kolumn technicznych.",
  ],
  [
    "W arkuszu NASADZENIA wpisuj ciagle segmenty rzedow. Braki pojedynczych stanowisk wpisuj w WYJATKI jako missing_tree.",
  ],
  [
    "Import mode MVP to incremental_create, a conflict strategy to reject. Plik nie usuwa istniejacych drzew.",
  ],
  [
    "Ukryte ID sa tylko pomoca techniczna. Backend i tak ponownie sprawdzi active orchard, plot, varieties i konflikty.",
  ],
] as const;

const segmentWidths = {
  segment_key: 16,
  plot_code: 18,
  section_name: 18,
  row_number: 12,
  from_position: 14,
  to_position: 14,
  species: 16,
  variety_id: 38,
  variety_name: 24,
  variety_confidence: 20,
  condition_status: 18,
  planted_at: 16,
  planted_year: 16,
  planted_year_from: 20,
  planted_year_to: 18,
  rootstock: 18,
  pollinator_info: 24,
  location_verified: 18,
  notes: 32,
} satisfies Record<TreeInventorySegmentField, number>;

const exceptionWidths = {
  exception_key: 16,
  segment_key: 16,
  plot_code: 18,
  section_name: 18,
  row_number: 12,
  position_in_row: 16,
  exception_type: 22,
  species: 16,
  variety_id: 38,
  variety_name: 24,
  variety_confidence: 20,
  condition_status: 18,
  planted_at: 16,
  planted_year: 16,
  planted_year_from: 20,
  planted_year_to: 18,
  rootstock: 18,
  pollinator_info: 24,
  location_verified: 18,
  notes: 32,
} satisfies Record<TreeInventoryExceptionField, number>;

const hiddenSegmentFields = new Set<TreeInventorySegmentField>(["variety_id"]);
const hiddenExceptionFields = new Set<TreeInventoryExceptionField>(["variety_id"]);
const lockedSegmentFields = new Set<TreeInventorySegmentField>([
  "plot_code",
  "variety_id",
]);
const lockedExceptionFields = new Set<TreeInventoryExceptionField>([
  "plot_code",
  "variety_id",
]);
const segmentColumnNumbers = buildColumnNumberMap(TREE_INVENTORY_SEGMENT_FIELDS);
const exceptionColumnNumbers = buildColumnNumberMap(
  TREE_INVENTORY_EXCEPTION_FIELDS,
);

export type TreeInventoryTemplateGenerationErrorCode =
  | "PLOT_ORCHARD_MISMATCH"
  | "VARIETY_ORCHARD_MISMATCH"
  | "PLOT_LAYOUT_UNSUPPORTED";

export class TreeInventoryTemplateGenerationError extends Error {
  constructor(
    public readonly code: TreeInventoryTemplateGenerationErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "TreeInventoryTemplateGenerationError";
  }
}

type DictionaryRanges = {
  species: string;
  varieties: string;
  variety_confidences: string;
  condition_statuses: string;
  exception_types: string;
  plot_codes: string;
  booleans: string;
};

export async function generateTreeInventoryTemplateWorkbook(
  input: GenerateTreeInventoryTemplateInput,
) {
  assertTemplateInput(input);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "OrchardLog";
  workbook.created = new Date(input.generated_at);
  workbook.modified = new Date(input.generated_at);

  const worksheets = createWorksheets(workbook);
  buildInstructionSheet(worksheets.instruction);
  buildMetadataSheet(worksheets.metadata, input);
  const dictionaryRanges = buildDictionarySheet(worksheets.dictionaries, input);
  await buildSegmentsSheet(worksheets.segments, input, dictionaryRanges);
  await buildExceptionsSheet(worksheets.exceptions, input, dictionaryRanges);

  await worksheets.metadata.protect(TEMPLATE_PROTECTION_PASSWORD, {
    selectLockedCells: false,
    selectUnlockedCells: false,
  });
  await worksheets.dictionaries.protect(TEMPLATE_PROTECTION_PASSWORD, {
    selectLockedCells: false,
    selectUnlockedCells: false,
  });
  await worksheets.instruction.protect(TEMPLATE_PROTECTION_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });

  return workbook;
}

export async function generateTreeInventoryTemplateBuffer(
  input: GenerateTreeInventoryTemplateInput,
) {
  const workbook = await generateTreeInventoryTemplateWorkbook(input);
  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
}

export function buildTreeInventoryTemplateFileName(input: {
  plot_code?: string | null;
  plot_name: string;
  generated_at: string;
}) {
  const datePart = input.generated_at.slice(0, 10);
  const plotPart = slugifyTemplateFileNamePart(
    input.plot_code || input.plot_name,
  );

  return `tree_inventory_v1_${plotPart}_${datePart}.${TREE_INVENTORY_TEMPLATE_FILE_EXTENSION}`;
}

function assertTemplateInput(input: GenerateTreeInventoryTemplateInput) {
  if (input.plot.orchard_id !== input.orchard.id) {
    throw new TreeInventoryTemplateGenerationError(
      "PLOT_ORCHARD_MISMATCH",
      "Template plot must belong to the active orchard context.",
    );
  }

  if (
    input.plot.layout_type !== TREE_INVENTORY_MVP_SUPPORTED_PLOT_LAYOUT_TYPES[0]
  ) {
    throw new TreeInventoryTemplateGenerationError(
      "PLOT_LAYOUT_UNSUPPORTED",
      "tree_inventory_v1 template generation supports rows layout only.",
    );
  }

  const foreignVariety = input.varieties.find(
    (variety) =>
      variety.orchard_id != null && variety.orchard_id !== input.orchard.id,
  );

  if (foreignVariety) {
    throw new TreeInventoryTemplateGenerationError(
      "VARIETY_ORCHARD_MISMATCH",
      "Template dictionaries must not include varieties from another orchard.",
    );
  }
}

function createWorksheets(workbook: ExcelJS.Workbook) {
  const instruction = workbook.addWorksheet("INSTRUKCJA");
  const metadata = workbook.addWorksheet("METADANE", { state: "hidden" });
  const segments = workbook.addWorksheet("NASADZENIA");
  const exceptions = workbook.addWorksheet("WYJATKI");
  const dictionaries = workbook.addWorksheet("SLOWNIKI", {
    state: "veryHidden",
  });

  const created = [
    instruction,
    metadata,
    segments,
    exceptions,
    dictionaries,
  ].map((worksheet) => worksheet.name);

  if (created.join("|") !== TREE_INVENTORY_REQUIRED_WORKSHEETS.join("|")) {
    throw new Error("Tree inventory template worksheet order drifted.");
  }

  return {
    instruction,
    metadata,
    segments,
    exceptions,
    dictionaries,
  };
}

function buildInstructionSheet(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [{ key: "instruction", width: 110 }];

  instructionRows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true, size: 14 };
  worksheet.getColumn(1).alignment = { wrapText: true, vertical: "top" };
}

function buildMetadataSheet(
  worksheet: ExcelJS.Worksheet,
  input: GenerateTreeInventoryTemplateInput,
) {
  worksheet.columns = [
    { header: "field", key: "field", width: 32 },
    { header: "value", key: "value", width: 54 },
  ];

  const metadataValues = {
    xlsx_contract_version: TREE_INVENTORY_XLSX_CONTRACT_VERSION,
    canonical_contract_version: TREE_INVENTORY_CANONICAL_CONTRACT_VERSION,
    generated_at: input.generated_at,
    generated_by_profile_id: input.generated_by_profile_id,
    orchard_id: input.orchard.id,
    orchard_name: input.orchard.name,
    plot_id: input.plot.id,
    plot_code: input.plot.code ?? null,
    plot_name: input.plot.name,
    plot_layout_type: input.plot.layout_type,
    import_mode: TREE_INVENTORY_IMPORT_MODES[0],
    allow_new_varieties: false,
    conflict_strategy: TREE_INVENTORY_CONFLICT_STRATEGIES[0],
  } satisfies Record<TreeInventoryMetadataField, string | boolean | null>;

  for (const field of TREE_INVENTORY_METADATA_FIELDS) {
    const row = worksheet.addRow({
      field,
      value: metadataValues[field],
    });

    row.hidden = isTechnicalMetadataField(field);
  }

  worksheet.getRow(1).font = { bold: true };
}

function buildDictionarySheet(
  worksheet: ExcelJS.Worksheet,
  input: GenerateTreeInventoryTemplateInput,
): DictionaryRanges {
  const species = buildSpeciesList(input.varieties);
  const varieties = [...input.varieties].sort(compareVarieties);
  const plotCode = getTemplatePlotCode(input.plot);

  worksheet.columns = [
    { header: "species", key: "species", width: 18 },
    { header: "variety_confidence", key: "variety_confidence", width: 22 },
    { header: "condition_status", key: "condition_status", width: 20 },
    { header: "exception_type", key: "exception_type", width: 24 },
    { header: "boolean", key: "boolean", width: 12 },
    { header: "variety_id", key: "variety_id", width: 38, hidden: true },
    { header: "variety_species", key: "variety_species", width: 18 },
    { header: "variety_name", key: "variety_name", width: 24 },
    { header: "plot_id", key: "plot_id", width: 38, hidden: true },
    { header: "plot_code", key: "plot_code", width: 18 },
    { header: "plot_name", key: "plot_name", width: 24 },
    { header: "plot_layout_type", key: "plot_layout_type", width: 18 },
    { header: "plot_status", key: "plot_status", width: 16 },
  ];

  fillColumnValues(worksheet, 1, species);
  fillColumnValues(worksheet, 2, TREE_INVENTORY_VARIETY_CONFIDENCES);
  fillColumnValues(worksheet, 3, TREE_INVENTORY_TREE_CONDITION_STATUSES);
  fillColumnValues(worksheet, 4, TREE_INVENTORY_EXCEPTION_TYPES);
  fillColumnValues(worksheet, 5, ["true", "false"]);

  varieties.forEach((variety, index) => {
    const rowNumber = index + 2;
    worksheet.getCell(rowNumber, 6).value = variety.id;
    worksheet.getCell(rowNumber, 7).value = variety.species;
    worksheet.getCell(rowNumber, 8).value = variety.name;
  });

  worksheet.getCell(2, 9).value = input.plot.id;
  worksheet.getCell(2, 10).value = plotCode;
  worksheet.getCell(2, 11).value = input.plot.name;
  worksheet.getCell(2, 12).value = input.plot.layout_type;
  worksheet.getCell(2, 13).value = input.plot.status ?? "active";
  worksheet.getRow(1).font = { bold: true };

  return {
    species: buildListFormula("SLOWNIKI", "A", 2, species.length),
    variety_confidences: buildListFormula(
      "SLOWNIKI",
      "B",
      2,
      TREE_INVENTORY_VARIETY_CONFIDENCES.length,
    ),
    condition_statuses: buildListFormula(
      "SLOWNIKI",
      "C",
      2,
      TREE_INVENTORY_TREE_CONDITION_STATUSES.length,
    ),
    exception_types: buildListFormula(
      "SLOWNIKI",
      "D",
      2,
      TREE_INVENTORY_EXCEPTION_TYPES.length,
    ),
    booleans: buildListFormula("SLOWNIKI", "E", 2, 2),
    varieties: buildListFormula("SLOWNIKI", "H", 2, varieties.length || 1),
    plot_codes: buildListFormula("SLOWNIKI", "J", 2, 1),
  };
}

async function buildSegmentsSheet(
  worksheet: ExcelJS.Worksheet,
  input: GenerateTreeInventoryTemplateInput,
  ranges: DictionaryRanges,
) {
  configureContractColumns(worksheet, TREE_INVENTORY_SEGMENT_FIELDS, {
    widths: segmentWidths,
    hidden: hiddenSegmentFields,
  });

  const plotCode = getTemplatePlotCode(input.plot);
  const editableFields = TREE_INVENTORY_SEGMENT_FIELDS.filter(
    (field) => !lockedSegmentFields.has(field),
  );

  for (
    let rowNumber = 2;
    rowNumber <= SEGMENT_TEMPLATE_ROWS + 1;
    rowNumber += 1
  ) {
    worksheet.getCell(rowNumber, segmentColumnNumbers.plot_code).value = plotCode;
    unlockEditableCells(
      worksheet,
      rowNumber,
      editableFields,
      segmentColumnNumbers,
    );
    applySegmentRowValidations(worksheet, rowNumber, ranges);
  }

  configureHeaderRow(worksheet);
  await worksheet.protect(TEMPLATE_PROTECTION_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });
}

async function buildExceptionsSheet(
  worksheet: ExcelJS.Worksheet,
  input: GenerateTreeInventoryTemplateInput,
  ranges: DictionaryRanges,
) {
  configureContractColumns(worksheet, TREE_INVENTORY_EXCEPTION_FIELDS, {
    widths: exceptionWidths,
    hidden: hiddenExceptionFields,
  });

  const plotCode = getTemplatePlotCode(input.plot);
  const editableFields = TREE_INVENTORY_EXCEPTION_FIELDS.filter(
    (field) => !lockedExceptionFields.has(field),
  );

  for (
    let rowNumber = 2;
    rowNumber <= EXCEPTION_TEMPLATE_ROWS + 1;
    rowNumber += 1
  ) {
    worksheet.getCell(rowNumber, exceptionColumnNumbers.plot_code).value =
      plotCode;
    unlockEditableCells(
      worksheet,
      rowNumber,
      editableFields,
      exceptionColumnNumbers,
    );
    applyExceptionRowValidations(worksheet, rowNumber, ranges);
  }

  configureHeaderRow(worksheet);
  await worksheet.protect(TEMPLATE_PROTECTION_PASSWORD, {
    selectLockedCells: true,
    selectUnlockedCells: true,
  });
}

function configureContractColumns<TField extends string>(
  worksheet: ExcelJS.Worksheet,
  fields: readonly TField[],
  options: {
    widths: Record<TField, number>;
    hidden: ReadonlySet<TField>;
  },
) {
  worksheet.columns = fields.map((field) => ({
    header: field,
    key: field,
    width: options.widths[field],
    hidden: options.hidden.has(field),
  }));
}

function configureHeaderRow(worksheet: ExcelJS.Worksheet) {
  const header = worksheet.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: "middle", wrapText: true };
  header.protection = { locked: true };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
}

function unlockEditableCells(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  fields: readonly string[],
  columnNumbers: Record<string, number>,
) {
  for (const field of fields) {
    worksheet.getCell(rowNumber, columnNumbers[field]).protection = {
      locked: false,
    };
  }
}

function applySegmentRowValidations(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  ranges: DictionaryRanges,
) {
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.plot_code,
    ranges.plot_codes,
  );
  applyPositiveIntegerValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.row_number,
  );
  applyPositiveIntegerValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.from_position,
  );
  applyPositiveIntegerValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.to_position,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.species,
    ranges.species,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.variety_name,
    ranges.varieties,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.variety_confidence,
    ranges.variety_confidences,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.condition_status,
    ranges.condition_statuses,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    segmentColumnNumbers.location_verified,
    ranges.booleans,
  );
}

function applyExceptionRowValidations(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  ranges: DictionaryRanges,
) {
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.plot_code,
    ranges.plot_codes,
  );
  applyPositiveIntegerValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.row_number,
  );
  applyPositiveIntegerValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.position_in_row,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.exception_type,
    ranges.exception_types,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.species,
    ranges.species,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.variety_name,
    ranges.varieties,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.variety_confidence,
    ranges.variety_confidences,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.condition_status,
    ranges.condition_statuses,
  );
  applyListValidation(
    worksheet,
    rowNumber,
    exceptionColumnNumbers.location_verified,
    ranges.booleans,
  );
}

function applyListValidation(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  columnNumber: number,
  formula: string,
) {
  worksheet.getCell(rowNumber, columnNumber).dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [formula],
  };
}

function applyPositiveIntegerValidation(
  worksheet: ExcelJS.Worksheet,
  rowNumber: number,
  columnNumber: number,
) {
  worksheet.getCell(rowNumber, columnNumber).dataValidation = {
    type: "whole",
    operator: "greaterThanOrEqual",
    allowBlank: true,
    formulae: [1],
  };
}

function fillColumnValues(
  worksheet: ExcelJS.Worksheet,
  columnNumber: number,
  values: readonly string[],
) {
  values.forEach((value, index) => {
    worksheet.getCell(index + 2, columnNumber).value = value;
  });
}

function buildSpeciesList(varieties: TreeInventoryTemplateVariety[]) {
  const values = new Set<string>(SPECIES_PRESETS);
  const extras = varieties
    .map((variety) => variety.species.trim())
    .filter((species) => species.length > 0)
    .filter((species) => !values.has(species))
    .sort(compareStrings);

  extras.forEach((species) => values.add(species));

  return [...values];
}

function compareVarieties(
  first: TreeInventoryTemplateVariety,
  second: TreeInventoryTemplateVariety,
) {
  return (
    compareStrings(first.species, second.species) ||
    compareStrings(first.name, second.name) ||
    compareStrings(first.id, second.id)
  );
}

function compareStrings(first: string, second: string) {
  if (first < second) {
    return -1;
  }

  if (first > second) {
    return 1;
  }

  return 0;
}

function buildListFormula(
  sheetName: string,
  column: string,
  startRow: number,
  itemCount: number,
) {
  const endRow = startRow + Math.max(itemCount, 1) - 1;

  return `'${sheetName}'!$${column}$${startRow}:$${column}$${endRow}`;
}

function buildColumnNumberMap<const TField extends string>(
  fields: readonly TField[],
) {
  return Object.fromEntries(
    fields.map((field, index) => [field, index + 1]),
  ) as Record<TField, number>;
}

function getTemplatePlotCode(plot: TreeInventoryTemplatePlot) {
  return plot.code || plot.name;
}

function isTechnicalMetadataField(field: TreeInventoryMetadataField) {
  return field.endsWith("_id");
}

function slugifyTemplateFileNamePart(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "plot";
}
