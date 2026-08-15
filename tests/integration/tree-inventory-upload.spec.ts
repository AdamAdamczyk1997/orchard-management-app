import { beforeEach, describe, expect, it, vi } from "vitest";
import { TREE_INVENTORY_IMPORT_LIMITS } from "@/lib/tree-inventory-import/limits";

const requireActiveOrchardMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const parseTreeInventoryWorkbookMock = vi.fn();
const normalizeTreeInventoryParsedWorkbookMock = vi.fn();
const stageTreeInventoryPreviewForOrchardMock = vi.fn();
const revalidatePathMock = vi.fn();

vi.mock("@/lib/orchard-context/require-active-orchard", () => ({
  requireActiveOrchard: requireActiveOrchardMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("@/lib/tree-inventory-import/parser.server", () => ({
  parseTreeInventoryWorkbook: parseTreeInventoryWorkbookMock,
}));

vi.mock("@/lib/tree-inventory-import/normalizer", () => ({
  normalizeTreeInventoryParsedWorkbook: normalizeTreeInventoryParsedWorkbookMock,
}));

vi.mock("@/lib/tree-inventory-import/preview.server", () => ({
  stageTreeInventoryPreviewForOrchard: stageTreeInventoryPreviewForOrchardMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function buildSummary(overrides: Record<string, unknown> = {}) {
  return {
    total_positions: 1,
    planned_tree_records: 1,
    missing_positions: 0,
    active_conflicts: 0,
    inactive_contexts: 0,
    known_variety_positions: 0,
    new_candidate_positions: 1,
    uncertain_variety_positions: 0,
    unknown_variety_positions: 0,
    grouped_variety_candidates: 1,
    unresolved_variety_candidates: 1,
    suggested_variety_candidates: 0,
    diagnostics: {
      errors: 0,
      warnings: 0,
      info: 0,
      returned: 0,
    },
    ...overrides,
  };
}

function createWorkbookFile(name = "tree_inventory_v1.xlsx", body = "xlsx") {
  return new File([body], name, { type: XLSX_CONTENT_TYPE });
}

function createSupabaseMock() {
  const sourceRows = [
    {
      id: "source-row-1",
      row_kind: "segment",
      sheet_name: "NASADZENIA",
      source_row_number: 2,
      source_row_key: "S1",
    },
  ];
  const candidates = [
    {
      id: "candidate-1",
      candidate_key: "apple:new_candidate:phase8",
      species: "Apple",
      raw_name: "Phase8",
      normalized_name: "phase8",
      source_status: "new_candidate",
      resolution_status: "unresolved",
      resolution_action: null,
      suggested_variety_id: null,
      resolved_variety_id: null,
      positions_count: 1,
      source_row_ids: ["source-row-1"],
      diagnostics_json: [],
    },
  ];
  const conflicts: unknown[] = [];
  const rowsByTable: Record<string, unknown[]> = {
    inventory_import_source_rows: sourceRows,
    inventory_import_variety_candidates: candidates,
    inventory_import_positions: conflicts,
  };

  return {
    from: vi.fn((table: string) => createQuery(rowsByTable[table] ?? [])),
  };
}

function createQuery(data: unknown[]) {
  const result = { data, error: null };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => Promise.resolve(result)),
    then: (
      resolve: (value: typeof result) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };

  return query;
}

describe("tree inventory upload preview action", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireActiveOrchardMock.mockResolvedValue({
      orchard: {
        id: "orchard-1",
        name: "Sad testowy",
      },
      membership: {
        role: "owner",
      },
    });
    parseTreeInventoryWorkbookMock.mockResolvedValue({
      workbook: {
        workbook_name: "tree_inventory_v1.xlsx",
        workbook_byte_size: 4,
        workbook_sha256: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      },
      diagnostics: [],
    });
    normalizeTreeInventoryParsedWorkbookMock.mockReturnValue({
      canonical: {
        file_hash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        diagnostics: [],
      },
      diagnostics: [],
    });
    stageTreeInventoryPreviewForOrchardMock.mockResolvedValue({
      import_id: "import-1",
      status: "awaiting_variety_resolution",
      summary: buildSummary(),
      diagnostics: [],
      confirm_version: 1,
      confirm_token: "server-only-token",
    });
    createSupabaseServerClientMock.mockResolvedValue(createSupabaseMock());
  });

  it("rejects missing files before resolving active orchard", async () => {
    const { submitTreeInventoryImportPreview } = await import(
      "@/server/actions/tree-inventory-import"
    );
    const result = await submitTreeInventoryImportPreview(
      { success: false },
      new FormData(),
    );

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("VALIDATION_ERROR");
    expect(result.field_errors?.workbook).toBe("Wybierz plik XLSX.");
    expect(requireActiveOrchardMock).not.toHaveBeenCalled();
    expect(parseTreeInventoryWorkbookMock).not.toHaveBeenCalled();
  });

  it("rejects oversized XLSX files before parsing", async () => {
    const { submitTreeInventoryImportPreview } = await import(
      "@/server/actions/tree-inventory-import"
    );
    const formData = new FormData();
    formData.set(
      "workbook",
      new File(
        [new Uint8Array(TREE_INVENTORY_IMPORT_LIMITS.max_workbook_bytes + 1)],
        "too-large.xlsx",
        { type: XLSX_CONTENT_TYPE },
      ),
    );
    const result = await submitTreeInventoryImportPreview(
      { success: false },
      formData,
    );

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("VALIDATION_ERROR");
    expect(result.field_errors?.workbook).toContain("maksymalnie");
    expect(requireActiveOrchardMock).not.toHaveBeenCalled();
    expect(parseTreeInventoryWorkbookMock).not.toHaveBeenCalled();
  });

  it("parses, normalizes, stages and returns preview DTO details", async () => {
    const { submitTreeInventoryImportPreview } = await import(
      "@/server/actions/tree-inventory-import"
    );
    const formData = new FormData();
    formData.set("workbook", createWorkbookFile());
    const result = await submitTreeInventoryImportPreview(
      { success: false },
      formData,
    );

    expect(result.success).toBe(true);
    expect(result.data?.import_id).toBe("import-1");
    expect(result.data?.confirm_version).toBe(1);
    expect(result.data?.confirm_token).toBe("server-only-token");
    expect(result.data?.can_confirm).toBe(false);
    expect(result.data?.confirm_result).toBeNull();
    expect(result.data?.candidates).toEqual([
      expect.objectContaining({
        candidate_key: "apple:new_candidate:phase8",
        positions_count: 1,
        source_rows: [
          expect.objectContaining({
            sheet_name: "NASADZENIA",
            source_row_number: 2,
          }),
        ],
      }),
    ]);
    expect(parseTreeInventoryWorkbookMock).toHaveBeenCalledWith(
      expect.objectContaining({ workbook_name: "tree_inventory_v1.xlsx" }),
    );
    expect(stageTreeInventoryPreviewForOrchardMock).toHaveBeenCalledWith(
      "orchard-1",
      expect.objectContaining({
        canonical: expect.any(Object),
        file: expect.objectContaining({
          file_name: "tree_inventory_v1.xlsx",
          file_size_bytes: 4,
        }),
      }),
      expect.any(Object),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/trees/import");
  });

  it("returns parser diagnostics in a data error when preview cannot be staged", async () => {
    const diagnostic = {
      code: "INVALID_REQUIRED_VALUE",
      severity: "error",
      source: { workbook: { workbook_name: "bad.xlsx" } },
      message: "Workbook could not be read as a valid XLSX file.",
    };
    stageTreeInventoryPreviewForOrchardMock.mockResolvedValue({
      import_id: null,
      status: "failed",
      summary: buildSummary({
        diagnostics: {
          errors: 1,
          warnings: 0,
          info: 0,
          returned: 1,
        },
      }),
      diagnostics: [diagnostic],
      confirm_version: null,
      confirm_token: null,
    });

    const { submitTreeInventoryImportPreview } = await import(
      "@/server/actions/tree-inventory-import"
    );
    const formData = new FormData();
    formData.set("workbook", createWorkbookFile("bad.xlsx"));
    const result = await submitTreeInventoryImportPreview(
      { success: false },
      formData,
    );

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("VALIDATION_ERROR");
    expect(result.data?.status).toBe("failed");
    expect(result.data?.diagnostics).toEqual([diagnostic]);
    expect(result.data?.candidates).toEqual([]);
    expect(result.data?.conflicts).toEqual([]);
  });
});
