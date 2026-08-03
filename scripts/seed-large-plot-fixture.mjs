import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LARGE_PLOT_FIXTURE_CLEANUP_COMMAND,
  LARGE_PLOT_FIXTURE_COMMAND,
  LARGE_PLOT_FIXTURE_EXPECTED_COUNTS,
  LARGE_PLOT_FIXTURE_ORCHARD,
  LARGE_PLOT_FIXTURE_PLOTS,
  LARGE_PLOT_FIXTURE_SQL_SEED_FILE,
} from "./shared/large-plot-fixture.mjs";
import { BASELINE_RESET_COMMAND } from "./shared/baseline-workflow.mjs";
import { runSqlFileInLocalDbContainer } from "./shared/sql-file-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

function formatPlotSummary() {
  return LARGE_PLOT_FIXTURE_PLOTS.map(
    (plot) =>
      `- ${plot.name} (${plot.code}): ${plot.expectedTrees} trees, ${plot.layoutType}`,
  ).join("\n");
}

export async function seedLargePlotFixture() {
  console.log("Running large plot performance fixture against local Supabase...");
  console.log(`- source file: ${LARGE_PLOT_FIXTURE_SQL_SEED_FILE}`);
  console.log(`- fixture orchard: ${LARGE_PLOT_FIXTURE_ORCHARD.name} (${LARGE_PLOT_FIXTURE_ORCHARD.code})`);
  console.log(`- expected trees: ${LARGE_PLOT_FIXTURE_EXPECTED_COUNTS.trees}`);
  console.log("");

  await runSqlFileInLocalDbContainer(LARGE_PLOT_FIXTURE_SQL_SEED_FILE, {
    projectRoot,
  });

  console.log("");
  console.log("Large plot performance fixture completed.");
  console.log("");
  console.log("Created deterministic local-only fixture data:");
  console.log(formatPlotSummary());
  console.log("");
  console.log("Suggested measurement entry points:");
  console.log("- /trees?is_active=true");
  console.log("- /activities/new");
  console.log("- /harvests/new");
  console.log(
    "- /plots/[plotId] for PERF-500, PERF-1500, PERF-MIX and PERF-LONG-ROW plots",
  );
  console.log("- /reports/variety-locations");
  console.log("- /reports/harvest-locations");
  console.log("");
  console.log("Cleanup:");
  console.log(`- run ${LARGE_PLOT_FIXTURE_CLEANUP_COMMAND}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  seedLargePlotFixture().catch((error) => {
    console.error("");
    console.error("Failed to run the large plot performance fixture.");
    console.error(
      `Run ${BASELINE_RESET_COMMAND} first, make sure local Supabase is running, then retry ${LARGE_PLOT_FIXTURE_COMMAND}.`,
    );
    console.error("");
    console.error(error);
    process.exitCode = 1;
  });
}
