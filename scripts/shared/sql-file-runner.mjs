import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { resolveLocalSupabaseDbContainerName } from "./local-supabase.mjs";

export function runSqlFileInLocalDbContainer(sqlFilePath, options = {}) {
  const projectRoot = options.projectRoot ?? process.cwd();
  const absoluteSqlFilePath = path.isAbsolute(sqlFilePath)
    ? sqlFilePath
    : path.join(projectRoot, sqlFilePath);

  if (!fs.existsSync(absoluteSqlFilePath)) {
    throw new Error(`SQL file not found: ${absoluteSqlFilePath}`);
  }

  const sqlContents = fs.readFileSync(absoluteSqlFilePath);
  const containerName = resolveLocalSupabaseDbContainerName(projectRoot);

  return new Promise((resolve, reject) => {
    const child = spawn(
      "docker",
      [
        "exec",
        "-i",
        containerName,
        "psql",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "-f",
        "-",
      ],
      {
        cwd: projectRoot,
        env: options.env ?? process.env,
        stdio: ["pipe", "inherit", "inherit"],
      },
    );

    child.on("error", (error) => {
      reject(error);
    });

    child.stdin.on("error", () => {
      // Ignore downstream EPIPE and surface the child exit error instead.
    });
    child.stdin.end(sqlContents);

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      const exitReason =
        signal != null ? `signal ${signal}` : `exit code ${code ?? "unknown"}`;
      reject(
        new Error(
          `docker exec ${containerName} psql -U postgres -d postgres -f - failed with ${exitReason}`,
        ),
      );
    });
  });
}
