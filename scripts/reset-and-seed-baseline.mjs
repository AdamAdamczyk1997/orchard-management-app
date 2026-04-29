import path from "node:path";
import { fileURLToPath } from "node:url";
import { upsertBaselineUsers } from "./bootstrap-baseline-seed-users.mjs";
import { runCommand } from "./shared/command-runner.mjs";
import {
  BASELINE_QA_STATUS_COMMAND,
  BASELINE_RESET_COMMAND,
} from "./shared/baseline-workflow.mjs";
import { runBaselineSqlSeed } from "./run-baseline-sql-seed.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

export async function resetAndSeedBaseline() {
  console.log("Step 1/3: resetting local database schema...");
  await runCommand(
    "supabase",
    ["db", "reset", "--local", "--no-seed", "--yes", "--workdir", projectRoot],
    { cwd: projectRoot },
  );

  console.log("");
  console.log("Step 2/3: bootstrapping baseline auth users...");
  await upsertBaselineUsers();

  console.log("");
  console.log("Step 3/3: running baseline SQL seed...");
  await runBaselineSqlSeed();

  console.log("");
  console.log("Baseline reset workflow completed.");
  console.log("Recommended verification:");
  console.log(`- run ${BASELINE_QA_STATUS_COMMAND}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  resetAndSeedBaseline().catch((error) => {
    console.error("");
    console.error("Failed to rebuild the local baseline dataset.");
    console.error(
      `Retry ${BASELINE_RESET_COMMAND} after making sure local Supabase is running and .env.local contains NEXT_PUBLIC_SUPABASE_URL plus SUPABASE_SECRET_KEY.`,
    );
    console.error("");
    console.error(error);
    process.exitCode = 1;
  });
}
