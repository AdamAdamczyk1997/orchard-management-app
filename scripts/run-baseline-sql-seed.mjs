import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASELINE_QA_STATUS_COMMAND,
  BASELINE_SQL_SEED_COMMAND,
  BASELINE_SQL_SEED_FILE,
  BASELINE_USERS_COMMAND,
} from "./shared/baseline-workflow.mjs";
import { runSqlFileInLocalDbContainer } from "./shared/sql-file-runner.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, "..");

export async function runBaselineSqlSeed() {
  console.log("Running baseline SQL seed against local Supabase...");
  console.log(`- source file: ${BASELINE_SQL_SEED_FILE}`);
  console.log("- executor: docker exec ... psql inside the local Supabase DB container");
  console.log("");

  await runSqlFileInLocalDbContainer(BASELINE_SQL_SEED_FILE, { projectRoot });

  console.log("");
  console.log("Baseline SQL seed completed.");
  console.log("Next step:");
  console.log(`- run ${BASELINE_QA_STATUS_COMMAND}`);
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedFilePath = process.argv[1] ? path.resolve(process.argv[1]) : "";

if (invokedFilePath === currentFilePath) {
  runBaselineSqlSeed().catch((error) => {
    console.error("");
    console.error("Failed to run baseline SQL seed.");
    console.error(
      `If the seed complained about missing auth.users, run ${BASELINE_USERS_COMMAND} first and then rerun ${BASELINE_SQL_SEED_COMMAND}.`,
    );
    console.error(
      "This command requires a running local Supabase DB container and Docker access for the current user.",
    );
    console.error("");
    console.error(error);
    process.exitCode = 1;
  });
}
