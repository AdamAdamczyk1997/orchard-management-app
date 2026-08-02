export const LARGE_PLOT_FIXTURE_SQL_SEED_FILE =
  "supabase/seeds/010_large_plot_performance_fixture.sql";

export const LARGE_PLOT_FIXTURE_COMMAND = "pnpm seed:large-plot-fixture";
export const LARGE_PLOT_FIXTURE_CLEANUP_COMMAND = "pnpm seed:baseline-reset";

export const LARGE_PLOT_FIXTURE_ORCHARD = {
  id: "90000000-0000-4000-8000-000000000001",
  code: "PERF",
  name: "Sad Performance Fixture",
  ownerEmail: "jan.owner@orchardlog.local",
  workerEmail: "pawel.worker@orchardlog.local",
};

export const LARGE_PLOT_FIXTURE_PLOTS = [
  {
    id: "92000000-0000-4000-8000-000000000001",
    code: "PERF-500",
    name: "Performance Rows 500",
    layoutType: "rows",
    rowCount: 10,
    treesPerRow: 50,
    expectedTrees: 500,
  },
  {
    id: "92000000-0000-4000-8000-000000000002",
    code: "PERF-1500",
    name: "Performance Rows 1500",
    layoutType: "rows",
    rowCount: 30,
    treesPerRow: 50,
    expectedTrees: 1500,
  },
  {
    id: "92000000-0000-4000-8000-000000000003",
    code: "PERF-MIX",
    name: "Performance Mixed Partial",
    layoutType: "mixed",
    rowCount: 6,
    treesPerRow: 24,
    expectedTrees: 126,
  },
];

export const LARGE_PLOT_FIXTURE_VARIETY_COUNT = 6;

export const LARGE_PLOT_FIXTURE_EXPECTED_COUNTS = {
  orchards: 1,
  memberships: 2,
  plots: LARGE_PLOT_FIXTURE_PLOTS.length,
  varieties: LARGE_PLOT_FIXTURE_VARIETY_COUNT,
  trees: LARGE_PLOT_FIXTURE_PLOTS.reduce(
    (total, plot) => total + plot.expectedTrees,
    0,
  ),
};
