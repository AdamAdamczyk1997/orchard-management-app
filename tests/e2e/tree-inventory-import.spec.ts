import os from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { expect, test, type Page } from "@playwright/test";
import {
  expectFeedback,
  loginWithPassword,
  selectOptionContaining,
  waitForOnboarding,
  waitForDashboard,
} from "./support/app";
import {
  BASELINE_PLOTS,
  BASELINE_VARIETIES,
  SEEDED_USERS,
  uniqueName,
} from "./support/fixtures";

const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type WorkbookUpload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

type TemplateRowInput = {
  segment_key?: string;
  row_number: number;
  from_position: number;
  to_position: number;
  species: string;
  variety_id: string | null;
  variety_name: string | null;
  variety_confidence: "known" | "unknown" | "uncertain" | "new_candidate";
};

test("owner downloads template, uploads a valid one-row workbook and sees preview", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const plotName = uniqueName("PW import plot");
  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);
  await createRowsPlot(page, plotName);

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTemplate(page, {
    row_number: 41,
    from_position: 1,
    to_position: 1,
    species: BASELINE_VARIETIES.ligol.species,
    variety_id: BASELINE_VARIETIES.ligol.id,
    variety_name: BASELINE_VARIETIES.ligol.name,
    variety_confidence: "known",
  });

  await uploadWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-preview")).toContainText(
    "Known varieties",
  );
  await expect(page.getByTestId("tree-inventory-confirm-disabled")).toContainText(
    "Owner confirm pozostaje wylaczony",
  );
});

test("owner on empty orchard sees grouped new variety candidates", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const plotName = uniqueName("PW empty import plot");
  const candidateName = uniqueName("PW Empty Candidate");
  await loginWithPassword(
    page,
    SEEDED_USERS.ownerEmpty.email,
    SEEDED_USERS.ownerEmpty.password,
  );
  await waitForDashboard(page, SEEDED_USERS.ownerEmpty.orchardName);
  await createRowsPlot(page, plotName);

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTemplate(page, {
    row_number: 3,
    from_position: 1,
    to_position: 2,
    species: "Apple",
    variety_id: null,
    variety_name: candidateName,
    variety_confidence: "new_candidate",
  });

  await uploadWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    candidateName,
  );
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    "2 planned trees",
  );
  await expect(page.getByTestId("tree-inventory-confirm-disabled")).toContainText(
    "rozstrzygnac blocking candidate groups",
  );
});

test("owner resolves first-import empty-orchard variety candidates before confirm gate", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const plotName = uniqueName("PW resolve import plot");
  const candidateA = uniqueName("PW Resolve A");
  const candidateB = uniqueName("PW Resolve B");
  const candidateC = uniqueName("PW Resolve C");
  await loginWithPassword(
    page,
    SEEDED_USERS.ownerEmpty.email,
    SEEDED_USERS.ownerEmpty.password,
  );
  await waitForDashboard(page, SEEDED_USERS.ownerEmpty.orchardName);
  await createRowsPlot(page, plotName);

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTemplateRows(page, [
    {
      segment_key: "S1",
      row_number: 11,
      from_position: 1,
      to_position: 1,
      species: "Apple",
      variety_id: null,
      variety_name: candidateA,
      variety_confidence: "new_candidate",
    },
    {
      segment_key: "S2",
      row_number: 12,
      from_position: 1,
      to_position: 1,
      species: "Apple",
      variety_id: null,
      variety_name: candidateB,
      variety_confidence: "new_candidate",
    },
    {
      segment_key: "S3",
      row_number: 13,
      from_position: 1,
      to_position: 1,
      species: "Pear",
      variety_id: null,
      variety_name: candidateC,
      variety_confidence: "new_candidate",
    },
    {
      segment_key: "S4",
      row_number: 14,
      from_position: 1,
      to_position: 1,
      species: "Apple",
      variety_id: null,
      variety_name: null,
      variety_confidence: "unknown",
    },
  ]);

  await uploadWorkbook(page, upload);

  const candidatesPanel = page.getByTestId("tree-inventory-variety-candidates");
  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(candidatesPanel).toContainText("Unresolved groups: 3");
  await expect(candidatesPanel).toContainText(candidateA);
  await expect(candidatesPanel).toContainText(candidateB);
  await expect(candidatesPanel).toContainText(candidateC);
  await expect(candidatesPanel).toContainText("unknown variety");
  await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(3);

  for (const remaining of [2, 1, 0]) {
    await page.getByTestId("tree-inventory-resolve-create-new").first().click();
    await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(
      remaining,
      { timeout: 60_000 },
    );
  }

  await expect(candidatesPanel).toContainText("Unresolved groups: 0");
  await expect(candidatesPanel).toContainText("accepted_unknown");
  await expect(page.getByTestId("tree-inventory-preview")).toContainText(
    "Gotowy do confirm",
  );
  await expect(page.getByTestId("tree-inventory-confirm-disabled")).toContainText(
    "Owner confirm pozostaje wylaczony",
  );
});

test("worker uploads and sees preview without confirm access", async ({ page }) => {
  test.setTimeout(180_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.worker.email,
    SEEDED_USERS.worker.password,
  );
  await waitForDashboard(page, SEEDED_USERS.worker.orchardName);

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    BASELINE_PLOTS.plot_main_north.name,
  );
  const upload = await downloadAndFillTemplate(page, {
    row_number: 99,
    from_position: 1,
    to_position: 1,
    species: "Apple",
    variety_id: null,
    variety_name: uniqueName("PW Worker Candidate"),
    variety_confidence: "new_candidate",
  });

  await uploadWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    "Unresolved groups: 1",
  );
  await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(0);
  await expect(page.getByTestId("tree-inventory-confirm-disabled")).toContainText(
    "Worker moze przygotowac preview",
  );
});

test("invalid workbook upload shows parser diagnostics", async ({ page }) => {
  test.setTimeout(120_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);
  await page.goto("/trees/import");

  await uploadWorkbook(page, {
    name: `tree-inventory-invalid-${Date.now()}.xlsx`,
    mimeType: XLSX_CONTENT_TYPE,
    buffer: Buffer.from("not a valid xlsx workbook"),
  });

  await expect(page.getByTestId("tree-inventory-diagnostics")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-diagnostics")).toContainText(
    "INVALID_REQUIRED_VALUE",
  );
});

test("outsider cannot open tree inventory import page", async ({ page }) => {
  await loginWithPassword(
    page,
    SEEDED_USERS.outsider.email,
    SEEDED_USERS.outsider.password,
  );
  await waitForOnboarding(page);

  await page.goto("/trees/import");
  await waitForOnboarding(page);
});

async function createRowsPlot(page: Page, plotName: string) {
  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.locator("#layout_type").selectOption("rows");
  await page
    .locator("#row_numbering_scheme")
    .selectOption("left_to_right_from_entrance");
  await page.locator("#tree_numbering_scheme").selectOption("from_row_start");
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expectFeedback(page, "Dzialka zostala utworzona.");
}

async function downloadAndFillTemplate(
  page: Page,
  input: TemplateRowInput,
) {
  return downloadAndFillTemplateRows(page, [input]);
}

async function downloadAndFillTemplateRows(
  page: Page,
  rows: TemplateRowInput[],
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

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(templatePath);
  const worksheet = workbook.getWorksheet("NASADZENIA");

  if (!worksheet) {
    throw new Error("Downloaded workbook does not contain NASADZENIA sheet.");
  }

  rows.forEach((input, index) => {
    const rowNumber = index + 2;

    worksheet.getCell(`A${rowNumber}`).value = input.segment_key ?? `S${index + 1}`;
    worksheet.getCell(`D${rowNumber}`).value = input.row_number;
    worksheet.getCell(`E${rowNumber}`).value = input.from_position;
    worksheet.getCell(`F${rowNumber}`).value = input.to_position;
    worksheet.getCell(`G${rowNumber}`).value = input.species;
    worksheet.getCell(`H${rowNumber}`).value = input.variety_id;
    worksheet.getCell(`I${rowNumber}`).value = input.variety_name;
    worksheet.getCell(`J${rowNumber}`).value = input.variety_confidence;
    worksheet.getCell(`K${rowNumber}`).value = "good";
  });

  const uploadBuffer = await workbook.xlsx.writeBuffer();

  return {
    name: path.basename(templatePath).replace(".xlsx", "-filled.xlsx"),
    mimeType: XLSX_CONTENT_TYPE,
    buffer: Buffer.isBuffer(uploadBuffer) ? uploadBuffer : Buffer.from(uploadBuffer),
  };
}

async function uploadWorkbook(page: Page, upload: WorkbookUpload) {
  await page.getByTestId("tree-inventory-upload-input").setInputFiles(upload);
  await page.getByRole("button", { name: "Wgraj i pokaz preview" }).click();
}
