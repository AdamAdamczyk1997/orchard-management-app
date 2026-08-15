import { performance } from "node:perf_hooks";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  getPlotTreeScaleProfileForOrchard,
  getPlotVisualRowDetailForOrchard,
} from "@/lib/orchard-data/trees";
import { confirmTreeInventoryImportForOrchard } from "@/lib/tree-inventory-import/confirm.server";
import { normalizeTreeInventoryParsedWorkbook } from "@/lib/tree-inventory-import/normalizer";
import { parseTreeInventoryWorkbook } from "@/lib/tree-inventory-import/parser.server";
import { stageTreeInventoryPreviewForOrchard } from "@/lib/tree-inventory-import/preview.server";
import { generateTreeInventoryTemplateBuffer } from "@/lib/tree-inventory-import/template-generator.server";
import {
  cleanupTestUsers,
  createOrchardAsUser,
  createPlotAsUser,
  createTestUser,
  createVarietyAsUser,
  signInTestUser,
} from "@/tests/helpers/test-data";
import type { SupabaseClient } from "@supabase/supabase-js";

type PerfCase = {
  label: "1k";
  treeCount: number;
  timeoutMs: number;
  totalBudgetMs: number;
};

type PerfContext = {
  client: SupabaseClient<any>;
  userId: string;
  orchard: {
    orchard_id: string;
    orchard_name: string;
  };
  variety: {
    id: string;
    name: string;
    species: string;
  };
};

type Timings = Record<string, number>;

const importMetaEnv = (import.meta as unknown as { env?: { MODE?: string } }).env;
const isExplicitPerformanceRun =
  importMetaEnv?.MODE === "tree-inventory-perf";
const shouldEmitPerformanceOutput =
  process.env.RUN_TREE_INVENTORY_PERF === "1" || isExplicitPerformanceRun;
const runPerformanceSuite =
  shouldEmitPerformanceOutput ? describe : describe.skip;

const PERF_CASES: PerfCase[] = [
  {
    label: "1k",
    treeCount: 1_000,
    timeoutMs: 180_000,
    totalBudgetMs: 120_000,
  },
];

runPerformanceSuite("tree_inventory_v1 import performance", () => {
  for (const perfCase of PERF_CASES) {
    it(
      `imports ${perfCase.label} tree positions through preview and confirm`,
      async () => {
        const context = await createPerfContext(perfCase);

        try {
          const result = await measureImportCase(context, perfCase);

          expect(result.createdTrees).toBe(perfCase.treeCount);
          expect(result.confirmedTreeCount).toBe(perfCase.treeCount);
          expect(result.treeScaleTotal).toBe(perfCase.treeCount);
          expect(result.rowDetailTotal).toBe(perfCase.treeCount);
          expect(result.timings.total).toBeLessThan(perfCase.totalBudgetMs);

          process.stdout.write(
            `[tree_inventory_v1 perf] ${JSON.stringify(result, null, 2)}\n`,
          );
        } finally {
          await cleanupTestUsers([context.userId]);
        }
      },
      perfCase.timeoutMs,
    );
  }
});

async function createPerfContext(perfCase: PerfCase): Promise<PerfContext> {
  const owner = await createTestUser(`tree-inventory-perf-${perfCase.label}`);
  const session = await signInTestUser(owner.email, owner.password);
  const orchard = await createOrchardAsUser(session.client, {
    name: `Performance Orchard ${perfCase.label}`,
    code: `PERF-IMPORT-${perfCase.label}`,
  });
  const variety = await createVarietyAsUser(session.client, {
    orchardId: orchard.orchard_id,
    species: "Apple",
    name: "Perf Szampion",
  });

  return {
    client: session.client,
    userId: owner.user.id,
    orchard,
    variety,
  };
}

async function measureImportCase(context: PerfContext, perfCase: PerfCase) {
  const timings: Timings = {};
  const plot = await createPlotAsUser(context.client, {
    orchardId: context.orchard.orchard_id,
    name: `Performance Plot ${perfCase.label}`,
    code: `PERF-${perfCase.label}`,
    layoutType: "rows",
    defaultRowCount: 1,
    defaultTreesPerRow: perfCase.treeCount,
  });
  const startedAt = performance.now();

  const workbookBuffer = await measure(timings, "template_ms", () =>
    buildWorkbookBuffer(context, plot, perfCase.treeCount),
  );
  const parsed = await measure(timings, "parse_ms", () =>
    parseTreeInventoryWorkbook({
      workbook: workbookBuffer,
      workbook_name: `tree_inventory_v1_perf_${perfCase.label}.xlsx`,
    }),
  );
  const normalized = await measure(timings, "normalize_ms", async () =>
    normalizeTreeInventoryParsedWorkbook(parsed),
  );

  expect(normalized.diagnostics.filter((item) => item.severity === "error")).toEqual(
    [],
  );
  expect(normalized.canonical.expanded_positions).toHaveLength(
    perfCase.treeCount,
  );

  const preview = await measure(timings, "stage_preview_ms", () =>
    stageTreeInventoryPreviewForOrchard(
      context.orchard.orchard_id,
      {
        canonical: normalized.canonical,
        file: {
          file_name: `tree_inventory_v1_perf_${perfCase.label}.xlsx`,
          file_size_bytes: workbookBuffer.byteLength,
          file_hash: normalized.canonical.file_hash,
          normalized_hash: normalized.canonical.file_hash,
        },
      },
      context.client,
    ),
  );

  expect(preview.status).toBe("ready_for_owner_confirm");
  expect(preview.import_id).toEqual(expect.any(String));
  expect(preview.confirm_token).toEqual(expect.any(String));
  expect(preview.confirm_version).toBe(1);
  expect(preview.summary.planned_tree_records).toBe(perfCase.treeCount);

  const confirmed = await measure(timings, "confirm_ms", () =>
    confirmTreeInventoryImportForOrchard(
      context.orchard.orchard_id,
      {
        import_id: preview.import_id ?? "",
        confirm_token: preview.confirm_token ?? "",
        confirm_version: preview.confirm_version ?? 0,
      },
      context.client,
    ),
  );

  if (!confirmed.success) {
    throw new Error(
      `confirm returned ${confirmed.error_code}: ${confirmed.message}`,
    );
  }

  const confirmedTreeCount = await measure(timings, "read_tree_count_ms", () =>
    readConfirmedTreeCount(context, plot.id),
  );
  const treeScaleTotal = await measure(timings, "read_tree_scale_ms", () =>
    readTreeScaleTotal(context, plot.id),
  );
  const rowDetail = await measure(timings, "read_row_detail_ms", () =>
    readRowDetail(context, plot.id),
  );
  timings.total = Math.round(performance.now() - startedAt);

  return {
    case: perfCase.label,
    targetTreeCount: perfCase.treeCount,
    workbookBytes: workbookBuffer.byteLength,
    createdTrees: confirmed.data.created_trees_count,
    createdVarieties: confirmed.data.created_varieties_count,
    confirmedTreeCount,
    treeScaleTotal,
    rowDetailTotal: rowDetail.rowDetailTotal,
    rowDetailTruncated: rowDetail.rowDetailTruncated,
    timings,
  };
}

async function buildWorkbookBuffer(
  context: PerfContext,
  plot: {
    id: string;
    orchard_id: string;
    name: string;
    code: string | null;
    status: "planned" | "active" | "archived";
    layout_type: "rows" | "mixed" | "irregular";
  },
  treeCount: number,
) {
  const buffer = await generateTreeInventoryTemplateBuffer({
    orchard: {
      id: context.orchard.orchard_id,
      name: context.orchard.orchard_name,
    },
    plot,
    varieties: [
      {
        id: context.variety.id,
        orchard_id: context.orchard.orchard_id,
        species: context.variety.species,
        name: context.variety.name,
      },
    ],
    generated_at: "2026-08-14T08:00:00.000Z",
    generated_by_profile_id: context.userId,
  });
  const workbook = new ExcelJS.Workbook();

  await workbook.xlsx.load(
    buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );

  const segments = workbook.getWorksheet("NASADZENIA");

  if (!segments) {
    throw new Error("Missing NASADZENIA worksheet in generated template.");
  }

  segments.getCell("A2").value = "PERF-1";
  segments.getCell("D2").value = 1;
  segments.getCell("E2").value = 1;
  segments.getCell("F2").value = treeCount;
  segments.getCell("G2").value = context.variety.species;
  segments.getCell("H2").value = context.variety.id;
  segments.getCell("I2").value = context.variety.name;
  segments.getCell("J2").value = "known";
  segments.getCell("K2").value = "good";
  segments.getCell("R2").value = true;

  const output = await workbook.xlsx.writeBuffer();

  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

async function readConfirmedTreeCount(
  context: PerfContext,
  plotId: string,
) {
  const { count, error } = await context.client
    .from("trees")
    .select("id", { count: "exact", head: true })
    .eq("orchard_id", context.orchard.orchard_id)
    .eq("plot_id", plotId);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function readTreeScaleTotal(
  context: PerfContext,
  plotId: string,
) {
  const treeScale = await getPlotTreeScaleProfileForOrchard(
    context.orchard.orchard_id,
    plotId,
    context.client,
  );

  return treeScale.total_trees;
}

async function readRowDetail(
  context: PerfContext,
  plotId: string,
) {
  const rowDetail = await getPlotVisualRowDetailForOrchard(
    context.orchard.orchard_id,
    plotId,
    {
      section_name: null,
      row_number: 1,
      lifecycle: "all",
      variety_id: "all",
      condition_status: "all",
      location_verified: "all",
    },
    context.client,
  );

  return {
    rowDetailTotal: rowDetail.row_tree_count,
    rowDetailTruncated: rowDetail.row_trees_truncated,
  };
}

async function measure<T>(
  timings: Timings,
  key: string,
  operation: () => Promise<T>,
) {
  const startedAt = performance.now();
  try {
    const result = await operation();
    timings[key] = Math.round(performance.now() - startedAt);
    emitPerformanceStage(key, timings[key]);

    return result;
  } catch (error) {
    timings[key] = Math.round(performance.now() - startedAt);
    emitPerformanceStage(key, timings[key]);

    if (error instanceof Error) {
      error.message = `${key}: ${error.message}`;
      throw error;
    }

    throw new Error(`${key}: ${formatThrownValue(error)}`);
  }
}

function formatThrownValue(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    const message = "message" in error ? error.message : null;

    if (typeof message === "string") {
      return message;
    }

    return JSON.stringify(error);
  }

  return String(error);
}

function emitPerformanceStage(key: string, elapsedMs: number) {
  if (!shouldEmitPerformanceOutput) {
    return;
  }

  process.stdout.write(`[tree_inventory_v1 perf-stage] ${key}=${elapsedMs}ms\n`);
}
