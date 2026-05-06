import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ACTION_ERROR_CODES } from "@/types/contracts";

const ERROR_CATALOG_PATH = path.join(
  process.cwd(),
  "documents/06_backend_and_contracts/errors_and_system_messages.md",
);

describe("error catalog documentation", () => {
  it("documents every shipped MVP ActionResult error code", async () => {
    const content = await readFile(ERROR_CATALOG_PATH, "utf8");
    const documentedCodes = Array.from(
      content.matchAll(/^\|\s*`([A-Z_]+)`\s*\|/gm),
      (match) => match[1],
    ).sort();

    expect(documentedCodes).toEqual([...ACTION_ERROR_CODES].sort());
  });
});
