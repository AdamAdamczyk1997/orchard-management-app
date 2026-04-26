import { describe, expect, it } from "vitest";
import {
  deriveSeasonPhaseFromDate,
  deriveSeasonYearFromDate,
} from "@/lib/domain/activities";
import {
  activityFormSchema,
  normalizeActivityPayload,
  resolveActivitySummaryFilters,
} from "@/lib/validation/activities";

const VALID_PLOT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_TREE_ID = "22222222-2222-4222-8222-222222222222";
const VALID_PROFILE_ID = "33333333-3333-4333-8333-333333333333";

function buildValidActivityInput(overrides: Record<string, unknown> = {}) {
  return {
    plot_id: VALID_PLOT_ID,
    tree_id: "",
    activity_type: "inspection",
    activity_subtype: "",
    activity_date: "2026-04-19",
    title: " Wiosenny obchod ",
    description: " Kontrola stanu drzew ",
    status: "done",
    work_duration_minutes: "35",
    cost_amount: "12.50",
    weather_notes: " Slonecznie ",
    result_notes: " Brak krytycznych uwag ",
    performed_by_profile_id: VALID_PROFILE_ID,
    performed_by: " Adam ",
    season_phase: "",
    scopes: JSON.stringify([]),
    materials: JSON.stringify([]),
    ...overrides,
  };
}

describe("phase 3 activities validation", () => {
  it("maps activity date to season year and season phase", () => {
    expect(deriveSeasonYearFromDate("2026-04-19")).toBe(2026);
    expect(deriveSeasonPhaseFromDate("2026-04-19")).toBe("wiosna");
    expect(deriveSeasonPhaseFromDate("2026-07-02")).toBe("lato");
    expect(deriveSeasonPhaseFromDate("2026-10-15")).toBe("jesien");
    expect(deriveSeasonPhaseFromDate("2026-12-05")).toBe("zima");
  });

  it("requires pruning subtype for pruning activities", () => {
    const parsed = activityFormSchema.safeParse(
      buildValidActivityInput({
        activity_type: "pruning",
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.activity_subtype).toContain(
      "Wybierz podtyp ciecia.",
    );
  });

  it("validates scope shape for location ranges", () => {
    const parsed = activityFormSchema.safeParse(
      buildValidActivityInput({
        activity_type: "spraying",
        scopes: JSON.stringify([
          {
            scope_level: "location_range",
            row_number: 4,
            from_position: 8,
          },
        ]),
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.scopes).toContain(
      "Podaj pozycje koncowa.",
    );
  });

  it("requires at least one scope for seasonal flows when no top-level tree is selected", () => {
    const parsed = activityFormSchema.safeParse(
      buildValidActivityInput({
        activity_type: "mowing",
        scopes: JSON.stringify([]),
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.scopes).toContain(
      "Dodaj co najmniej jeden zakres wykonania tej aktywnosci.",
    );
  });

  it("parses JSON payloads for scopes and materials and normalizes tree scope mirroring", () => {
    const parsed = activityFormSchema.parse(
      buildValidActivityInput({
        activity_type: "spraying",
        tree_id: VALID_TREE_ID,
        scopes: JSON.stringify([]),
        materials: JSON.stringify([
          {
            name: " Miedzian 50 WP ",
            category: " spray ",
            quantity: 0.3,
            unit: " kg ",
          },
        ]),
      }),
    );

    const normalized = normalizeActivityPayload(parsed);

    expect(normalized).toMatchObject({
      plot_id: VALID_PLOT_ID,
      tree_id: VALID_TREE_ID,
      activity_type: "spraying",
      title: "Wiosenny obchod",
      performed_by: "Adam",
      season_year: 2026,
      season_phase: "wiosna",
    });
    expect(normalized.scopes).toEqual([
      {
        scope_order: 1,
        scope_level: "tree",
        tree_id: VALID_TREE_ID,
      },
    ]);
    expect(normalized.materials).toEqual([
      {
        name: "Miedzian 50 WP",
        category: "spray",
        quantity: 0.3,
        unit: "kg",
      },
    ]);
  });

  it("resolves summary filters with current year defaults and seasonal type guard", () => {
    const filters = resolveActivitySummaryFilters({}, 2026);

    expect(filters).toEqual({
      season_year: 2026,
      activity_type: "pruning",
      activity_subtype: undefined,
      plot_id: undefined,
      performed_by_profile_id: undefined,
    });
  });

  it("ignores pruning subtype outside pruning and keeps valid summary params", () => {
    const filters = resolveActivitySummaryFilters(
      {
        summary_season_year: "2025",
        summary_plot_id: VALID_PLOT_ID,
        summary_activity_type: "mowing",
        summary_activity_subtype: "winter_pruning",
        summary_performed_by_profile_id: VALID_PROFILE_ID,
      },
      2026,
    );

    expect(filters).toEqual({
      season_year: 2025,
      activity_type: "mowing",
      activity_subtype: undefined,
      plot_id: VALID_PLOT_ID,
      performed_by_profile_id: VALID_PROFILE_ID,
    });
  });
});
