import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOrchardMock = vi.fn();
const readPlotByIdForOrchardMock = vi.fn();
const readVarietyByIdForOrchardMock = vi.fn();
const readTreeByIdForOrchardMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/orchard-context/require-active-orchard", () => ({
  requireActiveOrchard: requireActiveOrchardMock,
}));

vi.mock("@/lib/orchard-data/plots", () => ({
  readPlotByIdForOrchard: readPlotByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/varieties", () => ({
  readVarietyByIdForOrchard: readVarietyByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/trees", () => ({
  readTreeByIdForOrchard: readTreeByIdForOrchardMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: createSupabaseServerClientMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

describe("tree server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireActiveOrchardMock.mockResolvedValue({
      orchard: {
        id: "orchard-1",
        name: "Test orchard",
      },
    });
  });

  it("rejects creating a tree on an archived plot before hitting the database", async () => {
    readPlotByIdForOrchardMock.mockResolvedValue({
      id: "plot-1",
      orchard_id: "orchard-1",
      name: "Archived plot",
      status: "archived",
    });

    const { createTree } = await import("@/server/actions/trees");
    const formData = new FormData();
    formData.set("plot_id", "11111111-1111-4111-8111-111111111111");
    formData.set("species", "apple");
    formData.set("condition_status", "good");

    const result = await createTree({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("PLOT_ARCHIVED");
    expect(result.field_errors?.plot_id).toBe("Wybierz aktywna dzialke.");
    expect(readVarietyByIdForOrchardMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects a variety that does not belong to the active orchard", async () => {
    readPlotByIdForOrchardMock.mockResolvedValue({
      id: "plot-1",
      orchard_id: "orchard-1",
      name: "North plot",
      status: "active",
    });
    readVarietyByIdForOrchardMock.mockResolvedValue(null);

    const { createTree } = await import("@/server/actions/trees");
    const formData = new FormData();
    formData.set("plot_id", "11111111-1111-4111-8111-111111111111");
    formData.set("variety_id", "22222222-2222-4222-8222-222222222222");
    formData.set("species", "apple");
    formData.set("condition_status", "good");

    const result = await createTree({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("VALIDATION_ERROR");
    expect(result.field_errors?.variety_id).toBe("Wybierz poprawna odmiane.");
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
