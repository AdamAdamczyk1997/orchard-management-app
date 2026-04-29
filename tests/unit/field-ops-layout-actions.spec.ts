import { beforeEach, describe, expect, it, vi } from "vitest";

const requireActiveOrchardMock = vi.fn();
const readPlotByIdForOrchardMock = vi.fn();
const listTreeOptionsForOrchardMock = vi.fn();
const listActiveMemberOptionsForOrchardMock = vi.fn();
const readVarietyByIdForOrchardMock = vi.fn();
const readTreeByIdForOrchardMock = vi.fn();
const readActivityByIdForOrchardMock = vi.fn();
const createSupabaseServerClientMock = vi.fn();
const revalidatePathMock = vi.fn();
const redirectMock = vi.fn();

vi.mock("@/lib/orchard-context/require-active-orchard", () => ({
  requireActiveOrchard: requireActiveOrchardMock,
}));

vi.mock("@/lib/orchard-data/plots", () => ({
  readPlotByIdForOrchard: readPlotByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/activities", () => ({
  listTreeOptionsForOrchard: listTreeOptionsForOrchardMock,
  listActiveMemberOptionsForOrchard: listActiveMemberOptionsForOrchardMock,
  readActivityByIdForOrchard: readActivityByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/varieties", () => ({
  readVarietyByIdForOrchard: readVarietyByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/trees", () => ({
  readTreeByIdForOrchard: readTreeByIdForOrchardMock,
}));

vi.mock("@/lib/orchard-data/harvests", () => ({
  readHarvestRecordByIdForOrchard: vi.fn(),
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

describe("plot-aware field operation server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireActiveOrchardMock.mockResolvedValue({
      orchard: {
        id: "orchard-1",
        name: "Test orchard",
      },
      profile: {
        id: "profile-1",
        email: "owner@example.com",
        display_name: "Owner",
      },
    });
  });

  it("rejects row-based activity scopes on irregular plots before hitting the RPC", async () => {
    readPlotByIdForOrchardMock.mockResolvedValue({
      id: "plot-1",
      orchard_id: "orchard-1",
      name: "Irregular plot",
      status: "active",
      layout_type: "irregular",
    });

    const { createActivity } = await import("@/server/actions/activities");
    const formData = new FormData();
    formData.set("plot_id", "11111111-1111-4111-8111-111111111111");
    formData.set("tree_id", "");
    formData.set("activity_type", "mowing");
    formData.set("activity_subtype", "");
    formData.set("activity_date", "2026-05-10");
    formData.set("title", "Koszenie skarpy");
    formData.set("description", "");
    formData.set("status", "done");
    formData.set("work_duration_minutes", "");
    formData.set("cost_amount", "");
    formData.set("weather_notes", "");
    formData.set("result_notes", "");
    formData.set("performed_by_profile_id", "");
    formData.set("performed_by", "");
    formData.set("season_phase", "");
    formData.set(
      "scopes",
      JSON.stringify([
        {
          scope_level: "row",
          row_number: 3,
        },
      ]),
    );
    formData.set("materials", JSON.stringify([]));

    const result = await createActivity({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("ACTIVITY_SCOPE_INVALID");
    expect(result.field_errors?.scopes).toContain("calej dzialki, sekcji albo pojedynczych drzew");
    expect(listTreeOptionsForOrchardMock).not.toHaveBeenCalled();
    expect(listActiveMemberOptionsForOrchardMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("rejects harvest location ranges on irregular plots before hitting the database", async () => {
    readPlotByIdForOrchardMock.mockResolvedValue({
      id: "plot-1",
      orchard_id: "orchard-1",
      name: "Irregular plot",
      status: "active",
      layout_type: "irregular",
    });

    const { createHarvestRecord } = await import("@/server/actions/harvests");
    const formData = new FormData();
    formData.set("plot_id", "11111111-1111-4111-8111-111111111111");
    formData.set("variety_id", "");
    formData.set("tree_id", "");
    formData.set("activity_id", "");
    formData.set("scope_level", "location_range");
    formData.set("harvest_date", "2026-09-15");
    formData.set("section_name", "Poludnie");
    formData.set("row_number", "2");
    formData.set("from_position", "10");
    formData.set("to_position", "12");
    formData.set("quantity_value", "150");
    formData.set("quantity_unit", "kg");
    formData.set("notes", "");

    const result = await createHarvestRecord({ success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error_code).toBe("HARVEST_SCOPE_INVALID");
    expect(result.field_errors?.plot_id).toContain("calej dzialki, odmiany albo pojedynczych drzew");
    expect(readVarietyByIdForOrchardMock).not.toHaveBeenCalled();
    expect(readTreeByIdForOrchardMock).not.toHaveBeenCalled();
    expect(readActivityByIdForOrchardMock).not.toHaveBeenCalled();
    expect(createSupabaseServerClientMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
