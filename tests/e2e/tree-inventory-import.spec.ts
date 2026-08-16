import { expect, test } from "@playwright/test";
import {
  loginWithPassword,
  selectOptionContaining,
  waitForOnboarding,
  waitForDashboard,
} from "./support/app";
import {
  confirmTreeInventoryImport,
  createRowsPlot,
  downloadAndFillTreeInventoryTemplateRows,
  expectTreesForPlot,
  TREE_INVENTORY_XLSX_CONTENT_TYPE,
  uploadTreeInventoryWorkbook,
} from "./support/tree-inventory-import";
import {
  BASELINE_PLOTS,
  BASELINE_VARIETIES,
  SEEDED_USERS,
  uniqueName,
} from "./support/fixtures";

test("owner downloads template, uploads a valid one-row workbook and confirms import", async ({
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
  await createRowsPlot(page, { plotName });

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTreeInventoryTemplateRows(page, [{
    row_number: 41,
    from_position: 1,
    to_position: 1,
    species: BASELINE_VARIETIES.ligol.species,
    variety_id: BASELINE_VARIETIES.ligol.id,
    variety_name: BASELINE_VARIETIES.ligol.name,
    variety_confidence: "known",
    condition_status: "good",
    segment_key: "S1",
  }]);

  await uploadTreeInventoryWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-preview")).toContainText(
    "Known varieties",
  );
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "Owner moze zatwierdzic import",
  );
  await confirmTreeInventoryImport(page, 1);
  await expectTreesForPlot(page, plotName, "Pokazano 1-1 z 1 drzew", [
    BASELINE_VARIETIES.ligol.name,
    "Row 41, pos 1",
  ]);
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
  await createRowsPlot(page, { plotName });

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTreeInventoryTemplateRows(page, [{
    row_number: 3,
    from_position: 1,
    to_position: 2,
    species: "Apple",
    variety_id: null,
    variety_name: candidateName,
    variety_confidence: "new_candidate",
    condition_status: "good",
    segment_key: "S1",
  }]);

  await uploadTreeInventoryWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    candidateName,
  );
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    "2 planned trees",
  );
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "rozstrzygnac blocking candidate groups",
  );
  await expect(page.getByTestId("tree-inventory-confirm-button")).toBeDisabled();
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
  await createRowsPlot(page, { plotName });

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );
  const upload = await downloadAndFillTreeInventoryTemplateRows(page, [
    {
      segment_key: "S1",
      row_number: 11,
      from_position: 1,
      to_position: 1,
      species: "Apple",
      variety_id: null,
      variety_name: candidateA,
      variety_confidence: "new_candidate",
      condition_status: "good",
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
      condition_status: "good",
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
      condition_status: "good",
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
      condition_status: "good",
    },
  ]);

  await uploadTreeInventoryWorkbook(page, upload);

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
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "Owner moze zatwierdzic import",
  );
  await confirmTreeInventoryImport(page, 4);
  await expect(page.getByTestId("tree-inventory-confirm-report")).toContainText(
    "New varieties",
  );
  await expectTreesForPlot(page, plotName, "Pokazano 1-4 z 4 drzew", [
    candidateA,
    candidateB,
    candidateC,
    "Row 14, pos 1",
  ]);
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
  const upload = await downloadAndFillTreeInventoryTemplateRows(page, [{
    row_number: 99,
    from_position: 1,
    to_position: 1,
    species: "Apple",
    variety_id: null,
    variety_name: uniqueName("PW Worker Candidate"),
    variety_confidence: "new_candidate",
    condition_status: "good",
    segment_key: "S1",
  }]);

  await uploadTreeInventoryWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("tree-inventory-variety-candidates")).toContainText(
    "Unresolved groups: 1",
  );
  await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(0);
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "Worker moze przygotowac preview",
  );
  await expect(page.getByTestId("tree-inventory-confirm-button")).toBeDisabled();
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

  await uploadTreeInventoryWorkbook(page, {
    name: `tree-inventory-invalid-${Date.now()}.xlsx`,
    mimeType: TREE_INVENTORY_XLSX_CONTENT_TYPE,
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
