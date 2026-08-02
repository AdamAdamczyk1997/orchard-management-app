import { describe, expect, it } from "vitest";
// @ts-expect-error -- tooling helper is implemented as plain ESM script and verified at runtime
import * as largePlotFixture from "../../scripts/shared/large-plot-fixture.mjs";

const {
  LARGE_PLOT_FIXTURE_EXPECTED_COUNTS,
  LARGE_PLOT_FIXTURE_ORCHARD,
  LARGE_PLOT_FIXTURE_PLOTS,
  LARGE_PLOT_FIXTURE_SQL_SEED_FILE,
} = largePlotFixture;

describe("large plot performance fixture metadata", () => {
  it("keeps the performance fixture outside canonical baseline orchards", () => {
    expect(LARGE_PLOT_FIXTURE_ORCHARD.code).toBe("PERF");
    expect(LARGE_PLOT_FIXTURE_ORCHARD.id).toMatch(/^90000000-/);
    expect(LARGE_PLOT_FIXTURE_SQL_SEED_FILE).toBe(
      "supabase/seeds/010_large_plot_performance_fixture.sql",
    );
  });

  it("defines deterministic medium, large and mixed plots", () => {
    expect(LARGE_PLOT_FIXTURE_PLOTS).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PERF-500",
          layoutType: "rows",
          rowCount: 10,
          treesPerRow: 50,
          expectedTrees: 500,
        }),
        expect.objectContaining({
          code: "PERF-1500",
          layoutType: "rows",
          rowCount: 30,
          treesPerRow: 50,
          expectedTrees: 1500,
        }),
        expect.objectContaining({
          code: "PERF-MIX",
          layoutType: "mixed",
          expectedTrees: 126,
        }),
      ]),
    );
    expect(LARGE_PLOT_FIXTURE_EXPECTED_COUNTS).toMatchObject({
      orchards: 1,
      memberships: 2,
      plots: 3,
      varieties: 6,
      trees: 2126,
    });
  });
});
