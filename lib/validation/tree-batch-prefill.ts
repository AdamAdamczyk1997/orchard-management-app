import { z } from "zod";
import {
  BULK_DEACTIVATE_PREFILL_QUERY_PARAMS,
  BULK_TREE_BATCH_PREFILL_QUERY_PARAMS,
  type BulkTreeBatchPrefill,
  type BulkDeactivateTreesPrefill,
} from "@/lib/domain/tree-batch-prefill";
import { supportsRowRangeWorkflows } from "@/lib/domain/plots";
import { getSingleSearchParam, type NextSearchParams } from "@/lib/utils/search-params";
import type { PlotOption } from "@/types/contracts";

export type BulkDeactivatePrefillParseResult =
  | {
      status: "none";
      prefill: null;
      message: null;
    }
  | {
      status: "applied";
      prefill: BulkDeactivateTreesPrefill;
      message: string;
    }
  | {
      status: "invalid";
      prefill: null;
      message: string;
    };

export type BulkTreeBatchPrefillParseResult =
  | {
      status: "none";
      prefill: null;
      message: null;
    }
  | {
      status: "applied";
      prefill: BulkTreeBatchPrefill;
      message: string;
    }
  | {
      status: "invalid";
      prefill: null;
      message: string;
    };

type ResolveBulkDeactivatePrefillOptions = {
  plotOptions: PlotOption[];
};

type ResolveBulkTreeBatchPrefillOptions = {
  plotOptions: PlotOption[];
};

const uuidParamSchema = z.string().uuid();
const positiveIntegerParamSchema = z.coerce.number().int().positive();
const sectionNameParamSchema = z.string().trim().max(80);

function none(): BulkDeactivatePrefillParseResult {
  return {
    status: "none",
    prefill: null,
    message: null,
  };
}

function invalid(message: string): BulkDeactivatePrefillParseResult {
  return {
    status: "invalid",
    prefill: null,
    message,
  };
}

function noneBatch(): BulkTreeBatchPrefillParseResult {
  return {
    status: "none",
    prefill: null,
    message: null,
  };
}

function invalidBatch(message: string): BulkTreeBatchPrefillParseResult {
  return {
    status: "invalid",
    prefill: null,
    message,
  };
}

function applied(prefill: BulkDeactivateTreesPrefill): BulkDeactivatePrefillParseResult {
  return {
    status: "applied",
    prefill,
    message: "Zastosowano zakres z widoku dzialki.",
  };
}

function appliedBatch(prefill: BulkTreeBatchPrefill): BulkTreeBatchPrefillParseResult {
  return {
    status: "applied",
    prefill,
    message: "Zastosowano zakres sadzenia z widoku dzialki.",
  };
}

export function resolveBulkDeactivatePrefillFromSearchParams(
  searchParams: NextSearchParams,
  options: ResolveBulkDeactivatePrefillOptions,
): BulkDeactivatePrefillParseResult {
  const plotIdParam = getSingleSearchParam(
    searchParams[BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.plot_id],
  );
  const rowNumberParam = getSingleSearchParam(
    searchParams[BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.row_number],
  );
  const fromPositionParam = getSingleSearchParam(
    searchParams[BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.from_position],
  );
  const toPositionParam = getSingleSearchParam(
    searchParams[BULK_DEACTIVATE_PREFILL_QUERY_PARAMS.to_position],
  );

  if (!plotIdParam && !rowNumberParam && !fromPositionParam && !toPositionParam) {
    return none();
  }

  if (!plotIdParam || !rowNumberParam || !fromPositionParam || !toPositionParam) {
    return invalid("Link prefill nie zawiera pelnego zakresu bulk deactivate.");
  }

  const parsedPlotId = uuidParamSchema.safeParse(plotIdParam);
  const parsedRowNumber = positiveIntegerParamSchema.safeParse(rowNumberParam);
  const parsedFromPosition = positiveIntegerParamSchema.safeParse(fromPositionParam);
  const parsedToPosition = positiveIntegerParamSchema.safeParse(toPositionParam);

  if (!parsedPlotId.success) {
    return invalid("Nie udalo sie odczytac dzialki z linku prefill.");
  }

  if (
    !parsedRowNumber.success ||
    !parsedFromPosition.success ||
    !parsedToPosition.success
  ) {
    return invalid("Zakres z linku prefill musi uzywac dodatnich liczb calkowitych.");
  }

  if (parsedFromPosition.data > parsedToPosition.data) {
    return invalid("Pozycja poczatkowa w linku prefill nie moze byc wieksza od koncowej.");
  }

  const plot = options.plotOptions.find((option) => option.id === parsedPlotId.data);

  if (!plot) {
    return invalid("Dzialka z linku prefill nie nalezy do aktywnego sadu albo jest zarchiwizowana.");
  }

  if (!supportsRowRangeWorkflows(plot.layout_type)) {
    return invalid("Bulk deactivate z mapy jest dostepny tylko dla dzialek rows albo mixed.");
  }

  return applied({
    plot_id: parsedPlotId.data,
    row_number: parsedRowNumber.data,
    from_position: parsedFromPosition.data,
    to_position: parsedToPosition.data,
  });
}

export function resolveBulkTreeBatchPrefillFromSearchParams(
  searchParams: NextSearchParams,
  options: ResolveBulkTreeBatchPrefillOptions,
): BulkTreeBatchPrefillParseResult {
  const plotIdParam = getSingleSearchParam(
    searchParams[BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.plot_id],
  );
  const sectionNameParam = getSingleSearchParam(
    searchParams[BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.section_name],
  );
  const rowNumberParam = getSingleSearchParam(
    searchParams[BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.row_number],
  );
  const fromPositionParam = getSingleSearchParam(
    searchParams[BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.from_position],
  );
  const toPositionParam = getSingleSearchParam(
    searchParams[BULK_TREE_BATCH_PREFILL_QUERY_PARAMS.to_position],
  );

  if (
    !plotIdParam &&
    !sectionNameParam &&
    !rowNumberParam &&
    !fromPositionParam &&
    !toPositionParam
  ) {
    return noneBatch();
  }

  if (!plotIdParam || !rowNumberParam || !fromPositionParam || !toPositionParam) {
    return invalidBatch("Link prefill nie zawiera pelnego zakresu batch create.");
  }

  const parsedPlotId = uuidParamSchema.safeParse(plotIdParam);
  const parsedSectionName = sectionNameParam
    ? sectionNameParamSchema.safeParse(sectionNameParam)
    : null;
  const parsedRowNumber = positiveIntegerParamSchema.safeParse(rowNumberParam);
  const parsedFromPosition = positiveIntegerParamSchema.safeParse(fromPositionParam);
  const parsedToPosition = positiveIntegerParamSchema.safeParse(toPositionParam);

  if (!parsedPlotId.success) {
    return invalidBatch("Nie udalo sie odczytac dzialki z linku prefill.");
  }

  if (parsedSectionName && !parsedSectionName.success) {
    return invalidBatch("Sekcja z linku prefill jest niepoprawna.");
  }

  if (
    !parsedRowNumber.success ||
    !parsedFromPosition.success ||
    !parsedToPosition.success
  ) {
    return invalidBatch("Zakres z linku prefill musi uzywac dodatnich liczb calkowitych.");
  }

  if (parsedFromPosition.data > parsedToPosition.data) {
    return invalidBatch("Pozycja poczatkowa w linku prefill nie moze byc wieksza od koncowej.");
  }

  const plot = options.plotOptions.find((option) => option.id === parsedPlotId.data);

  if (!plot) {
    return invalidBatch("Dzialka z linku prefill nie nalezy do aktywnego sadu albo jest zarchiwizowana.");
  }

  if (!supportsRowRangeWorkflows(plot.layout_type)) {
    return invalidBatch("Batch create z mapy jest dostepny tylko dla dzialek rows albo mixed.");
  }

  return appliedBatch({
    plot_id: parsedPlotId.data,
    section_name: parsedSectionName?.data ?? null,
    row_number: parsedRowNumber.data,
    from_position: parsedFromPosition.data,
    to_position: parsedToPosition.data,
  });
}
