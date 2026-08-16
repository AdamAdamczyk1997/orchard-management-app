import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, type Page, type TestInfo } from "@playwright/test";
import { expectFeedback, selectOptionContaining } from "@/tests/e2e/support/app";
import { fillTreeInventoryWorkbookBuffer } from "@/tests/fixtures/tree-inventory-import/e2e-workbook-builder";
import type {
  TreeInventoryE2eSegmentRow,
  TreeInventoryE2eWorkbookFixture,
} from "@/tests/fixtures/tree-inventory-import/e2e-full-cycle";

export const TREE_INVENTORY_XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type TreeInventoryWorkbookUpload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

export async function createRowsPlot(
  page: Page,
  input: {
    plotName: string;
    plotCode?: string;
    defaultRowCount?: string;
    defaultTreesPerRow?: string;
  },
) {
  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(input.plotName);

  if (input.plotCode) {
    await page.getByLabel("Kod").fill(input.plotCode);
  }

  await page.locator("#layout_type").selectOption("rows");
  await page
    .locator("#row_numbering_scheme")
    .selectOption("left_to_right_from_entrance");
  await page.locator("#tree_numbering_scheme").selectOption("from_row_start");

  if (input.defaultRowCount) {
    await page.getByLabel("Domyslna liczba rzedow").fill(input.defaultRowCount);
  }

  if (input.defaultTreesPerRow) {
    await page
      .getByLabel("Domyslna liczba drzew w rzedzie")
      .fill(input.defaultTreesPerRow);
  }

  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expectFeedback(page, "Dzialka zostala utworzona.");
}

export async function downloadAndFillTreeInventoryTemplate(
  page: Page,
  fixture: TreeInventoryE2eWorkbookFixture,
  testInfo?: TestInfo,
) {
  const downloadPromise = page.waitForEvent("download");
  await page.getByTestId("tree-inventory-template-download").click();
  const download = await downloadPromise;
  const templatePath = path.join(
    os.tmpdir(),
    `tree-inventory-template-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.xlsx`,
  );
  await download.saveAs(templatePath);

  const uploadBuffer = await fillTreeInventoryWorkbookBuffer(
    await fs.readFile(templatePath),
    fixture,
  );
  const uploadName = path.basename(templatePath).replace(".xlsx", "-filled.xlsx");

  if (testInfo) {
    await testInfo.attach(uploadName, {
      body: uploadBuffer,
      contentType: TREE_INVENTORY_XLSX_CONTENT_TYPE,
    });
  }

  return {
    name: uploadName,
    mimeType: TREE_INVENTORY_XLSX_CONTENT_TYPE,
    buffer: uploadBuffer,
  };
}

export async function downloadAndFillTreeInventoryTemplateRows(
  page: Page,
  rows: TreeInventoryE2eSegmentRow[],
) {
  return downloadAndFillTreeInventoryTemplate(page, {
    segments: rows,
    exceptions: [],
  });
}

export async function uploadTreeInventoryWorkbook(
  page: Page,
  upload: TreeInventoryWorkbookUpload,
) {
  await page.getByTestId("tree-inventory-upload-input").setInputFiles(upload);
  await page.getByRole("button", { name: "Wgraj i pokaz preview" }).click();
}

export async function confirmTreeInventoryImport(
  page: Page,
  expectedCreatedTrees: number,
) {
  await expect(page.getByTestId("tree-inventory-confirm-button")).toBeEnabled();
  await page.getByTestId("tree-inventory-confirm-button").click();
  await expect(page.locator("body")).toContainText(
    `Import confirmed. Utworzono ${expectedCreatedTrees} drzew.`,
    { timeout: 30_000 },
  );
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "Import confirmed",
  );
  await expect(page.getByTestId("tree-inventory-confirm-report")).toContainText(
    "Created trees",
  );
  await expect(page.getByTestId("tree-inventory-confirm-report")).toContainText(
    String(expectedCreatedTrees),
  );
  await expect(page.getByTestId("tree-inventory-confirm-button")).toBeDisabled();
}

export async function expectTreesForPlot(
  page: Page,
  plotName: string,
  expectedRangeText: string,
  expectedTexts: string[],
) {
  await page.goto("/trees");
  await selectOptionContaining(page.getByLabel("Dzialka"), plotName);
  await page.getByRole("button", { name: "Zastosuj" }).click();
  await expect(page.locator("body")).toContainText(expectedRangeText, {
    timeout: 60_000,
  });

  for (const text of expectedTexts) {
    await expect(page.locator("body")).toContainText(text);
  }
}
