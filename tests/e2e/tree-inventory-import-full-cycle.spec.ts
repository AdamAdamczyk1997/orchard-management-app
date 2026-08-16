import { expect, test, type Locator, type Page } from "@playwright/test";
import { buildTreeInventoryFullCycleFixture } from "@/tests/fixtures/tree-inventory-import/e2e-full-cycle";
import {
  registerFreshUser,
  selectOptionContaining,
  waitForDashboard,
  waitForOnboarding,
} from "./support/app";
import {
  confirmTreeInventoryImport,
  createRowsPlot,
  downloadAndFillTreeInventoryTemplate,
  expectTreesForPlot,
  uploadTreeInventoryWorkbook,
} from "./support/tree-inventory-import";
import { uniqueEmail, uniqueName, uniqueSuffix } from "./support/fixtures";

test("fresh orchard can be populated from XLSX import and verified in final reports", async ({
  page,
}) => {
  test.setTimeout(240_000);

  const suffix = uniqueSuffix();
  const shortSuffix = suffix.replaceAll("-", "").slice(-10).toUpperCase();
  const fixture = buildTreeInventoryFullCycleFixture(shortSuffix);
  const orchardName = uniqueName("PW Excel Orchard");
  const plotName = uniqueName("PW Excel Rows");

  // The full-cycle acceptance path owns its data through a fresh account and
  // unique orchard/plot/variety names, so it does not rely on seeded orchards.
  await registerFreshUser(page, {
    displayName: uniqueName("PW Excel Owner"),
    email: uniqueEmail("playwright-excel-full-cycle"),
    password: "Playwright123!",
  });

  await waitForOnboarding(page);

  await page.getByLabel("Nazwa sadu").fill(orchardName);
  await page.getByLabel("Kod").fill(`XLSX-${shortSuffix.slice(0, 8)}`);
  await page
    .getByLabel("Opis")
    .fill("Playwright full-cycle orchard for tree inventory XLSX import.");
  await page.getByRole("button", { name: "Utworz sad" }).click();

  await waitForDashboard(page, orchardName);
  await expect(page.getByText("Sad jest jeszcze pusty")).toBeVisible();

  await createRowsPlot(page, {
    plotName,
    plotCode: `P-${shortSuffix.slice(0, 8)}`,
    defaultRowCount: "3",
    defaultTreesPerRow: "3",
  });

  await page.goto("/trees/import");
  await selectOptionContaining(
    page.getByTestId("tree-inventory-template-plot-select"),
    plotName,
  );

  const upload = await downloadAndFillTreeInventoryTemplate(
    page,
    fixture.workbook,
    test.info(),
  );
  await uploadTreeInventoryWorkbook(page, upload);

  await expect(page.getByTestId("tree-inventory-preview")).toBeVisible({
    timeout: 60_000,
  });
  await expectPreviewValue(page, "total-positions", fixture.expected.preview.totalPositions);
  await expectPreviewValue(page, "planned-records", fixture.expected.preview.plannedRecords);
  await expectPreviewValue(
    page,
    "missing-positions",
    fixture.expected.preview.missingPositions,
  );
  await expectPreviewValue(page, "active-conflicts", fixture.expected.preview.activeConflicts);
  await expectPreviewValue(
    page,
    "new-candidates",
    fixture.expected.preview.newCandidatePositions,
  );
  await expectPreviewValue(page, "unknown", fixture.expected.preview.unknownVarietyPositions);
  await expectPreviewValue(
    page,
    "grouped-candidates",
    fixture.expected.preview.groupedCandidates,
  );
  await expectPreviewValue(
    page,
    "unresolved",
    fixture.expected.preview.unresolvedCandidates,
  );
  await expectPreviewValue(page, "diagnostics", fixture.expected.preview.diagnostics);

  const candidatesPanel = page.getByTestId("tree-inventory-variety-candidates");
  await expect(candidatesPanel).toContainText(
    `Unresolved groups: ${fixture.expected.preview.unresolvedCandidates}`,
  );
  await expect(candidatesPanel).toContainText(
    `All groups: ${fixture.expected.preview.groupedCandidates}`,
  );
  await expect(candidatesPanel).toContainText(fixture.candidateAName);
  await expect(candidatesPanel).toContainText(fixture.candidateBName);
  await expect(candidatesPanel).toContainText("unknown variety");
  await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(2);

  for (const remaining of [1, 0]) {
    await page.getByTestId("tree-inventory-resolve-create-new").first().click();
    await expect(page.getByTestId("tree-inventory-resolve-create-new")).toHaveCount(
      remaining,
      { timeout: 60_000 },
    );
  }

  await expect(candidatesPanel).toContainText("Unresolved groups: 0");
  await expect(candidatesPanel).toContainText("accepted_unknown");
  await expectPreviewValue(page, "unresolved", 0);
  await expect(page.getByTestId("tree-inventory-preview")).toContainText(
    "Gotowy do confirm",
  );
  await expect(page.getByTestId("tree-inventory-confirm-panel")).toContainText(
    "Owner moze zatwierdzic import",
  );

  await confirmTreeInventoryImport(page, fixture.expected.confirm.createdTrees);
  await expectConfirmValue(page, "created-trees", fixture.expected.confirm.createdTrees);
  await expectConfirmValue(
    page,
    "new-varieties",
    fixture.expected.confirm.createdVarieties,
  );
  await expectConfirmValue(
    page,
    "unknown-variety",
    fixture.expected.confirm.unknownVarietyTrees,
  );
  await expectConfirmValue(
    page,
    "missing-positions",
    fixture.expected.confirm.missingPositions,
  );

  await expectTreesForPlot(
    page,
    plotName,
    fixture.expected.treeList.rangeText,
    fixture.expected.treeList.visibleTexts,
  );

  for (const hiddenText of fixture.expected.treeList.hiddenTexts) {
    await expect(page.locator("body")).not.toContainText(hiddenText);
  }

  await expectPlotVisualEvidence(page, plotName, fixture.expected.plotVisual);

  for (const report of fixture.expected.varietyReports) {
    await expectVarietyLocationReport(page, plotName, report);
  }
});

async function expectPreviewValue(page: Page, key: string, expected: number) {
  await expectCardValue(page.getByTestId(`tree-inventory-summary-${key}`), expected);
}

async function expectConfirmValue(page: Page, key: string, expected: number) {
  await expectCardValue(page.getByTestId(`tree-inventory-confirm-${key}`), expected);
}

async function expectCardValue(card: Locator, expected: number) {
  await expect(card.getByText(String(expected), { exact: true })).toBeVisible();
}

async function expectPlotVisualEvidence(
  page: Page,
  plotName: string,
  expected: {
    activeMarkers: number;
    emptyMarkers: number;
  },
) {
  await page.goto("/plots");
  const plotCard = page.getByTestId("plot-card").filter({ hasText: plotName });
  await expect(plotCard).toBeVisible();
  await expect(plotCard.getByTestId("plot-active-tree-count")).toHaveText(
    String(expected.activeMarkers),
  );
  await plotCard.getByTestId("plot-open-link").click();

  await expect(page.getByRole("heading", { name: plotName })).toBeVisible();
  await expect(page.getByTestId("plot-visual-grid")).toBeVisible();
  await expect(page.getByTestId("plot-visual-marker-active-tree")).toHaveCount(
    expected.activeMarkers,
  );
  await expect(page.getByTestId("plot-visual-marker-empty-inferred")).toHaveCount(
    expected.emptyMarkers,
  );

  await page.getByTestId("plot-visual-marker-active-tree").first().click();
  await expect(page.getByTestId("plot-tree-detail-panel")).toBeVisible();
}

async function expectVarietyLocationReport(
  page: Page,
  plotName: string,
  report: {
    varietyName: string;
    activeTrees: number;
    locatedTrees: number;
    groupRow: number;
    ranges: string[];
    hiddenGroupRows: number[];
  },
) {
  await page.goto("/reports/variety-locations");
  await selectOptionContaining(page.locator('select[name="variety_id"]'), report.varietyName);
  await page.getByRole("button", { name: "Pokaz raport" }).click();

  await expect(
    page.getByRole("heading", { name: `Apple - ${report.varietyName}` }),
  ).toBeVisible({ timeout: 60_000 });
  await expectCardValue(
    page.getByTestId("variety-locations-summary-active-trees"),
    report.activeTrees,
  );
  await expectCardValue(
    page.getByTestId("variety-locations-summary-located-trees"),
    report.locatedTrees,
  );

  const group = page
    .getByTestId("variety-locations-group")
    .filter({ hasText: `${plotName} - Rzad ${report.groupRow}` });
  await expect(group).toBeVisible();

  for (const range of report.ranges) {
    await expect(group.getByTestId("variety-locations-range").filter({ hasText: range }))
      .toBeVisible();
  }

  for (const rowNumber of report.hiddenGroupRows) {
    await expect(page.getByText(`${plotName} - Rzad ${rowNumber}`)).toHaveCount(0);
  }
}
