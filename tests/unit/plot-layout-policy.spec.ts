import { describe, expect, it } from "vitest";
import {
  formatPlotDefaultGridLabel,
  getPlotOperationalLocationGuidance,
  getPlotRowRangeWorkflowGuidance,
  getPlotTreeLocationGuidance,
  supportsActivityScopeLevelForPlotLayout,
  supportsHarvestScopeLevelForPlotLayout,
  supportsRowRangeWorkflows,
  validateActivityScopesForPlotLayout,
  validateHarvestScopeForPlotLayout,
  validateTreeLocationForPlotLayout,
} from "@/lib/domain/plots";

describe("plot layout policy", () => {
  it("formats default plot grid summaries", () => {
    expect(
      formatPlotDefaultGridLabel({
        default_row_count: 8,
        default_trees_per_row: 180,
      }),
    ).toBe("8 rzedow x 180 drzew");
    expect(
      formatPlotDefaultGridLabel({
        default_row_count: 8,
        default_trees_per_row: null,
      }),
    ).toBe("8 rzedow");
    expect(
      formatPlotDefaultGridLabel({
        default_row_count: null,
        default_trees_per_row: 180,
      }),
    ).toBe("180 drzew w rzedzie");
  });

  it("distinguishes row-range support by plot layout type", () => {
    expect(supportsRowRangeWorkflows("rows")).toBe(true);
    expect(supportsRowRangeWorkflows("mixed")).toBe(true);
    expect(supportsRowRangeWorkflows("irregular")).toBe(false);
    expect(getPlotRowRangeWorkflowGuidance("irregular")).toContain(
      "nie sa tu wspierane",
    );
    expect(getPlotOperationalLocationGuidance("mixed")).toContain("sekcji albo pojedynczych drzew");
  });

  it("requires row coordinates for row-based plots", () => {
    const validation = validateTreeLocationForPlotLayout(
      { layout_type: "rows" },
      {
        tree_code: "TREE-1",
      },
    );

    expect(validation).toEqual({
      message:
        "Wybrana dzialka ma uklad rzedowy. Podaj numer rzedu i pozycje w rzedzie.",
      field_errors: {
        row_number: "Ta dzialka wymaga numeru rzedu.",
        position_in_row: "Ta dzialka wymaga pozycji w rzedzie.",
      },
    });
    expect(getPlotTreeLocationGuidance("rows")).toContain("wymagane");
  });

  it("requires at least one location hint for mixed and irregular plots", () => {
    const mixedValidation = validateTreeLocationForPlotLayout(
      { layout_type: "mixed" },
      {},
    );
    const irregularValidation = validateTreeLocationForPlotLayout(
      { layout_type: "irregular" },
      {},
    );

    expect(mixedValidation?.field_errors.section_name).toContain(
      "sekcje, kod drzewa albo lokalizacje rzedowa",
    );
    expect(irregularValidation?.field_errors.section_name).toContain(
      "sekcje, etykiete albo kod terenowy",
    );
  });

  it("accepts matching location data for each layout type", () => {
    expect(
      validateTreeLocationForPlotLayout(
        { layout_type: "rows" },
        {
          row_number: 4,
          position_in_row: 12,
        },
      ),
    ).toBeNull();
    expect(
      validateTreeLocationForPlotLayout(
        { layout_type: "mixed" },
        {
          section_name: "North",
        },
      ),
    ).toBeNull();
    expect(
      validateTreeLocationForPlotLayout(
        { layout_type: "irregular" },
        {
          tree_code: "IRR-7",
        },
      ),
    ).toBeNull();
  });

  it("allows only row-capable activity scopes on row-aware plots", () => {
    expect(supportsActivityScopeLevelForPlotLayout("rows", "row")).toBe(true);
    expect(supportsActivityScopeLevelForPlotLayout("mixed", "location_range")).toBe(true);
    expect(supportsActivityScopeLevelForPlotLayout("irregular", "section")).toBe(true);
    expect(supportsActivityScopeLevelForPlotLayout("irregular", "row")).toBe(false);
  });

  it("rejects row-based activity scopes for irregular plots", () => {
    const validation = validateActivityScopesForPlotLayout(
      { layout_type: "irregular" },
      [
        { scope_level: "section" },
        { scope_level: "location_range" },
      ],
    );

    expect(validation).toEqual({
      message:
        "Wybrana dzialka ma uklad nieregularny. Zakresy `rzad` i `zakres lokalizacji` nie sa dla niej wspierane.",
      field_errors: {
        scopes:
          "Dla tej dzialki uzyj calej dzialki, sekcji albo pojedynczych drzew zamiast zakresow po rzedach.",
      },
    });
  });

  it("allows harvest location ranges only on row-capable plots", () => {
    expect(supportsHarvestScopeLevelForPlotLayout("rows", "location_range")).toBe(true);
    expect(supportsHarvestScopeLevelForPlotLayout("mixed", "location_range")).toBe(true);
    expect(supportsHarvestScopeLevelForPlotLayout("irregular", "location_range")).toBe(false);
    expect(supportsHarvestScopeLevelForPlotLayout("irregular", "tree")).toBe(true);
  });

  it("rejects irregular plots for harvest location ranges", () => {
    const validation = validateHarvestScopeForPlotLayout(
      { layout_type: "irregular" },
      "location_range",
    );

    expect(validation).toEqual({
      message:
        "Wybrana dzialka ma uklad nieregularny. Zbior w zakresie po rzedach i pozycjach nie jest dla niej wspierany.",
      field_errors: {
        plot_id:
          "Dla tej dzialki uzyj calej dzialki, odmiany albo pojedynczych drzew zamiast zakresu po rzedach.",
      },
    });
  });
});
