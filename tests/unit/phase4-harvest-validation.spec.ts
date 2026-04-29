import { describe, expect, it } from "vitest";
import {
  aggregateHarvestLocationSummary,
  aggregateHarvestSeasonSummary,
  aggregateHarvestTimeline,
  deriveHarvestSeasonYearFromDate,
  normalizeHarvestQuantityToKg,
  type HarvestLocationSourceRecord,
} from "@/lib/domain/harvests";
import {
  harvestFormSchema,
  normalizeHarvestPayload,
  resolveHarvestListFilters,
  resolveHarvestSeasonSummaryFilters,
} from "@/lib/validation/harvests";
import type { HarvestRecordSummary } from "@/types/contracts";

const VALID_PLOT_ID = "11111111-1111-4111-8111-111111111111";
const VALID_VARIETY_ID = "22222222-2222-4222-8222-222222222222";
const VALID_TREE_ID = "33333333-3333-4333-8333-333333333333";
const VALID_ACTIVITY_ID = "44444444-4444-4444-8444-444444444444";
const SECOND_PLOT_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_VARIETY_ID = "66666666-6666-4666-8666-666666666666";

function buildValidHarvestInput(overrides: Record<string, unknown> = {}) {
  return {
    plot_id: VALID_PLOT_ID,
    variety_id: "",
    tree_id: "",
    activity_id: "",
    scope_level: "plot",
    harvest_date: "2026-09-15",
    section_name: "",
    row_number: "",
    from_position: "",
    to_position: "",
    quantity_value: "125.5",
    quantity_unit: "kg",
    notes: " Pierwszy przejazd ",
    ...overrides,
  };
}

function buildHarvestRecordSummary(
  overrides: Partial<HarvestRecordSummary> = {},
): HarvestRecordSummary {
  return {
    id: `record-${Math.random().toString(36).slice(2, 10)}`,
    orchard_id: "orchard-1",
    plot_id: VALID_PLOT_ID,
    variety_id: VALID_VARIETY_ID,
    tree_id: null,
    activity_id: null,
    scope_level: "plot",
    harvest_date: "2026-09-15",
    season_year: 2026,
    section_name: null,
    row_number: null,
    from_position: null,
    to_position: null,
    quantity_value: 100,
    quantity_unit: "kg",
    quantity_kg: 100,
    notes: null,
    plot_name: "Kwatera A",
    variety_name: "Gala",
    variety_species: "apple",
    tree_display_name: null,
    activity_title: null,
    created_by_display: "Jan",
    created_at: "2026-09-15T08:00:00Z",
    updated_at: "2026-09-15T08:00:00Z",
    ...overrides,
  };
}

function buildHarvestLocationSourceRecord(
  overrides: Partial<HarvestLocationSourceRecord> = {},
): HarvestLocationSourceRecord {
  return {
    id: `location-${Math.random().toString(36).slice(2, 10)}`,
    scope_level: "location_range",
    harvest_date: "2026-09-15",
    quantity_kg: 100,
    plot_id: VALID_PLOT_ID,
    plot_name: "Kwatera A",
    plot_status: "active",
    section_name: "North",
    row_number: 1,
    from_position: 1,
    to_position: 3,
    ...overrides,
  };
}

describe("phase 4 harvest validation", () => {
  it("derives season year and normalizes supported units", () => {
    expect(deriveHarvestSeasonYearFromDate("2026-09-15")).toBe(2026);
    expect(normalizeHarvestQuantityToKg(125.5, "kg")).toBe(125.5);
    expect(normalizeHarvestQuantityToKg(1.25, "t")).toBe(1250);
  });

  it("requires full location range for location_range scope", () => {
    const parsed = harvestFormSchema.safeParse(
      buildValidHarvestInput({
        scope_level: "location_range",
        row_number: "3",
        from_position: "10",
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.to_position).toContain(
      "Podaj pozycje koncowa.",
    );
  });

  it("requires tree_id for tree scope", () => {
    const parsed = harvestFormSchema.safeParse(
      buildValidHarvestInput({
        scope_level: "tree",
        plot_id: "",
      }),
    );

    expect(parsed.success).toBe(false);
    expect(parsed.error?.flatten().fieldErrors.tree_id).toContain(
      "Wybierz drzewo dla tego wpisu.",
    );
  });

  it("normalizes payload and clears incompatible fields per scope", () => {
    const parsed = harvestFormSchema.parse(
      buildValidHarvestInput({
        scope_level: "plot",
        variety_id: VALID_VARIETY_ID,
        activity_id: VALID_ACTIVITY_ID,
      }),
    );

    const normalized = normalizeHarvestPayload(parsed);

    expect(normalized).toEqual({
      plot_id: VALID_PLOT_ID,
      variety_id: null,
      tree_id: null,
      activity_id: VALID_ACTIVITY_ID,
      scope_level: "plot",
      harvest_date: "2026-09-15",
      season_year: 2026,
      section_name: null,
      row_number: null,
      from_position: null,
      to_position: null,
      quantity_value: 125.5,
      quantity_unit: "kg",
      notes: "Pierwszy przejazd",
    });
  });

  it("keeps tree scope payload and derives season year from date", () => {
    const parsed = harvestFormSchema.parse(
      buildValidHarvestInput({
        plot_id: "",
        variety_id: "",
        tree_id: VALID_TREE_ID,
        scope_level: "tree",
        quantity_value: "1.2",
        quantity_unit: "t",
      }),
    );

    const normalized = normalizeHarvestPayload(parsed);

    expect(normalized).toMatchObject({
      plot_id: null,
      variety_id: null,
      tree_id: VALID_TREE_ID,
      scope_level: "tree",
      season_year: 2026,
      quantity_value: 1.2,
      quantity_unit: "t",
    });
  });

  it("resolves list filters with current year defaults", () => {
    const filters = resolveHarvestListFilters({}, 2026);

    expect(filters).toEqual({
      season_year: 2026,
      date_from: undefined,
      date_to: undefined,
      plot_id: undefined,
      variety_id: undefined,
    });
  });

  it("keeps valid list filters and ignores invalid ids", () => {
    const filters = resolveHarvestListFilters(
      {
        season_year: "2025",
        date_from: "2025-09-01",
        date_to: "2025-09-30",
        plot_id: VALID_PLOT_ID,
        variety_id: "invalid-value",
      },
      2026,
    );

    expect(filters).toEqual({
      season_year: 2025,
      date_from: "2025-09-01",
      date_to: "2025-09-30",
      plot_id: VALID_PLOT_ID,
      variety_id: undefined,
    });
  });

  it("resolves season summary filters with current year defaults", () => {
    const filters = resolveHarvestSeasonSummaryFilters({}, 2026);

    expect(filters).toEqual({
      season_year: 2026,
      plot_id: undefined,
      variety_id: undefined,
    });
  });

  it("keeps valid season summary filters and ignores invalid ids", () => {
    const filters = resolveHarvestSeasonSummaryFilters(
      {
        season_year: "2025",
        plot_id: VALID_PLOT_ID,
        variety_id: "invalid-value",
      },
      2026,
    );

    expect(filters).toEqual({
      season_year: 2025,
      plot_id: VALID_PLOT_ID,
      variety_id: undefined,
    });
  });

  it("aggregates harvest season summary and omits records without variety or plot from breakdowns", () => {
    const records = [
      buildHarvestRecordSummary({
        id: "record-a",
        harvest_date: "2026-09-01",
        quantity_kg: 100,
        quantity_value: 100,
        plot_id: null,
        plot_name: null,
        variety_id: null,
        variety_name: null,
        scope_level: "orchard",
      }),
      buildHarvestRecordSummary({
        id: "record-b",
        harvest_date: "2026-09-02",
        quantity_kg: 200,
        quantity_value: 200,
      }),
      buildHarvestRecordSummary({
        id: "record-c",
        harvest_date: "2026-09-02",
        quantity_kg: 50,
        quantity_value: 50,
      }),
      buildHarvestRecordSummary({
        id: "record-d",
        harvest_date: "2026-09-03",
        quantity_kg: 1100,
        quantity_value: 1.1,
        quantity_unit: "t",
        plot_id: SECOND_PLOT_ID,
        plot_name: "Kwatera B",
        variety_id: SECOND_VARIETY_ID,
        variety_name: "Ligol",
      }),
      buildHarvestRecordSummary({
        id: "record-e",
        harvest_date: "2026-09-03",
        quantity_kg: 70,
        quantity_value: 70,
        variety_id: null,
        variety_name: null,
      }),
    ];

    const summary = aggregateHarvestSeasonSummary(records, 2026);

    expect(summary).toEqual({
      season_year: 2026,
      total_quantity_kg: 1520,
      record_count: 5,
      by_variety: [
        {
          variety_id: SECOND_VARIETY_ID,
          variety_name: "Ligol",
          total_quantity_kg: 1100,
          record_count: 1,
        },
        {
          variety_id: VALID_VARIETY_ID,
          variety_name: "Gala",
          total_quantity_kg: 250,
          record_count: 2,
        },
      ],
      by_plot: [
        {
          plot_id: SECOND_PLOT_ID,
          plot_name: "Kwatera B",
          total_quantity_kg: 1100,
          record_count: 1,
        },
        {
          plot_id: VALID_PLOT_ID,
          plot_name: "Kwatera A",
          total_quantity_kg: 320,
          record_count: 3,
        },
      ],
    });
  });

  it("aggregates harvest timeline by day in chronological order", () => {
    const records = [
      buildHarvestRecordSummary({
        id: "record-a",
        harvest_date: "2026-09-03",
        quantity_kg: 70,
        quantity_value: 70,
      }),
      buildHarvestRecordSummary({
        id: "record-b",
        harvest_date: "2026-09-01",
        quantity_kg: 100,
        quantity_value: 100,
      }),
      buildHarvestRecordSummary({
        id: "record-c",
        harvest_date: "2026-09-03",
        quantity_kg: 30,
        quantity_value: 30,
      }),
    ];

    const timeline = aggregateHarvestTimeline(records);

    expect(timeline).toEqual([
      {
        harvest_date: "2026-09-01",
        total_quantity_kg: 100,
        record_count: 1,
      },
      {
        harvest_date: "2026-09-03",
        total_quantity_kg: 100,
        record_count: 2,
      },
    ]);
  });

  it("aggregates harvest locations by plot, row, and range while keeping unresolved totals", () => {
    const records = [
      buildHarvestLocationSourceRecord({
        id: "range-a",
        quantity_kg: 200,
        from_position: 1,
        to_position: 3,
      }),
      buildHarvestLocationSourceRecord({
        id: "tree-a",
        scope_level: "tree",
        quantity_kg: 25,
        from_position: 4,
        to_position: 4,
      }),
      buildHarvestLocationSourceRecord({
        id: "plot-a",
        scope_level: "plot",
        quantity_kg: 50,
        row_number: null,
        from_position: null,
        to_position: null,
      }),
      buildHarvestLocationSourceRecord({
        id: "orchard-a",
        scope_level: "orchard",
        quantity_kg: 100,
        plot_id: null,
        plot_name: null,
        plot_status: null,
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
      }),
      buildHarvestLocationSourceRecord({
        id: "range-b",
        quantity_kg: 300,
        plot_id: SECOND_PLOT_ID,
        plot_name: "Kwatera B",
        section_name: "South",
        row_number: 2,
        from_position: 10,
        to_position: 12,
      }),
    ];

    const summary = aggregateHarvestLocationSummary(records, 2026);

    expect(summary).toEqual({
      season_year: 2026,
      total_quantity_kg: 675,
      record_count: 5,
      precisely_located_quantity_kg: 525,
      precisely_located_record_count: 3,
      unresolved_quantity_kg: 150,
      unresolved_record_count: 2,
      orchard_level_quantity_kg: 100,
      orchard_level_record_count: 1,
      plots: [
        {
          plot_id: VALID_PLOT_ID,
          plot_name: "Kwatera A",
          plot_status: "active",
          total_quantity_kg: 275,
          record_count: 3,
          precisely_located_quantity_kg: 225,
          precisely_located_record_count: 2,
          unresolved_quantity_kg: 50,
          unresolved_record_count: 1,
          rows: [
            {
              section_name: "North",
              row_number: 1,
              total_quantity_kg: 225,
              record_count: 2,
              ranges: [
                {
                  from_position: 1,
                  to_position: 3,
                  total_quantity_kg: 200,
                  record_count: 1,
                },
                {
                  from_position: 4,
                  to_position: 4,
                  total_quantity_kg: 25,
                  record_count: 1,
                },
              ],
            },
          ],
        },
        {
          plot_id: SECOND_PLOT_ID,
          plot_name: "Kwatera B",
          plot_status: "active",
          total_quantity_kg: 300,
          record_count: 1,
          precisely_located_quantity_kg: 300,
          precisely_located_record_count: 1,
          unresolved_quantity_kg: 0,
          unresolved_record_count: 0,
          rows: [
            {
              section_name: "South",
              row_number: 2,
              total_quantity_kg: 300,
              record_count: 1,
              ranges: [
                {
                  from_position: 10,
                  to_position: 12,
                  total_quantity_kg: 300,
                  record_count: 1,
                },
              ],
            },
          ],
        },
      ],
    });
  });
});
