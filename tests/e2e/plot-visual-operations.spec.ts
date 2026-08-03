import { expect, test, type Page } from "@playwright/test";
import {
  loginWithPassword,
  pinActiveOrchardCookie,
  switchActiveOrchard,
  waitForDashboard,
} from "./support/app";
import {
  LARGE_PLOT_FIXTURE_ORCHARD,
  LARGE_PLOT_FIXTURE_PLOTS,
  SEEDED_USERS,
  uniqueName,
} from "./support/fixtures";

async function openPlot(page: Page, plotName: string) {
  await page.goto("/plots");
  const plotCard = page.getByTestId("plot-card").filter({ hasText: plotName }).first();

  await expect(plotCard).toBeVisible();
  await plotCard.getByTestId("plot-open-link").click();
  await expect(page.getByRole("heading", { name: plotName })).toBeVisible();
  await expect(page.getByTestId("plot-visual-filters")).toBeVisible();
}

async function openActivityPrefill(page: Page) {
  const plotId = "20000000-0000-4000-8000-000000000001";
  const treeId = "40000000-0000-4000-8000-000000000001";
  const multiRangeSearchParams = new URLSearchParams({
    plot_id: plotId,
    scopes: JSON.stringify([
      {
        scope_order: 1,
        scope_level: "location_range",
        section_name: "A",
        row_number: 1,
        from_position: 1,
        to_position: 3,
      },
    ]),
  });

  await page.goto(`/activities/new?${multiRangeSearchParams.toString()}`);
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(plotId);
  await expect(page.getByTestId("activity-scope-0")).toBeVisible();
  await expect(page.locator("#scope_level_0")).toHaveValue("location_range");
  await expect(page.locator("#scope_row_number_0")).toHaveValue("1");
  await expect(page.locator("#scope_from_position_0")).toHaveValue("1");
  await expect(page.locator("#scope_to_position_0")).toHaveValue("3");

  const singleTreeSearchParams = new URLSearchParams({
    plot_id: plotId,
    tree_id: treeId,
  });

  await page.goto(`/activities/new?${singleTreeSearchParams.toString()}`);
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(plotId);
  await expect(page.locator("#tree_id")).toHaveValue(treeId);
  await expect(page.locator("#scope_level_0")).toHaveValue("tree");
  await expect(page.locator("#scope_tree_id_0")).toHaveValue(treeId);
}

async function createPlotWithGapForPlantNew(page: Page) {
  const plotName = uniqueName("PVO plant plot");
  const leftTreeCode = `${plotName}-T1`;
  const rightTreeCode = `${plotName}-T3`;

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.locator("#layout_type").selectOption("rows");
  await page
    .locator("#row_numbering_scheme")
    .selectOption("left_to_right_from_entrance");
  await page.locator("#tree_numbering_scheme").selectOption("from_row_start");
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expect(page.getByTestId("feedback-banner")).toContainText(
    "Dzialka zostala utworzona.",
  );

  for (const tree of [
    { code: leftTreeCode, name: "Plant gap left", position: "1" },
    { code: rightTreeCode, name: "Plant gap right", position: "3" },
  ]) {
    await page.goto("/trees/new");
    await page.getByLabel("Gatunek").fill("apple");
    await page.getByLabel("Kod drzewa").fill(tree.code);
    await page.getByLabel("Nazwa wyswietlana").fill(tree.name);
    await page.getByLabel("Dzialka").selectOption({ label: plotName });
    await page.getByLabel("Sekcja").fill("A");
    await page.getByLabel("Numer rzedu").fill("1");
    await page.getByLabel("Pozycja w rzedzie").fill(tree.position);
    await page.getByRole("button", { name: "Utworz drzewo" }).click();
    await expect(page.getByTestId("feedback-banner")).toContainText(
      "Drzewo zostalo utworzone.",
    );
  }

  return plotName;
}

test("owner can inspect seeded plot visual operations across rows, mixed, and irregular layouts", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await openActivityPrefill(page);

  await openPlot(page, "Kwatera Polnocna");
  await expect(page.getByTestId("plot-visual-grid")).toBeVisible();
  await expect(page.getByText("Schemat rzedow")).toBeVisible();
  await expect(page.getByTestId("plot-visual-filter-count")).toContainText(
    "Pokazano 22 z 22 drzew",
  );

  await page.getByTestId("plot-visual-mode-select").click();
  await page.getByLabel(/Ligol R1\/P1/).click();
  await expect(page.getByTestId("plot-selection-summary")).toContainText(
    "Wybrano 1 drzewo",
  );
  await expect(page.getByTestId("plot-selection-action-state")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.getByTestId("plot-selection-add-activity")).toHaveAttribute(
    "href",
    /\/activities\/new\?plot_id=20000000-0000-4000-8000-000000000001.*tree_id=40000000-0000-4000-8000-000000000001/,
  );
  await page.getByTestId("plot-selection-add-activity").click();
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(
    "20000000-0000-4000-8000-000000000001",
  );
  await expect(page.locator("#tree_id")).toHaveValue(
    "40000000-0000-4000-8000-000000000001",
  );
  await expect(page.locator("#scope_level_0")).toHaveValue("tree");
  await expect(page.locator("#scope_tree_id_0")).toHaveValue(
    "40000000-0000-4000-8000-000000000001",
  );

  await openPlot(page, "Kwatera Polnocna");
  await page.getByTestId("plot-visual-mode-select").click();
  await page.getByLabel(/Ligol R1\/P1/).click();
  await page
    .getByTestId("plot-selection-summary")
    .getByRole("button", { name: "Wyczysc" })
    .click();
  await expect(page.getByTestId("plot-selection-action-state")).toHaveAttribute(
    "data-state",
    "empty",
  );
  await expect(page.getByTestId("plot-selection-add-activity")).toBeDisabled();
  await expect(page.getByTestId("plot-selection-bulk-deactivate")).toBeDisabled();
  await page.getByTestId("plot-selection-range-start").click();
  await expect(page.getByTestId("plot-selection-range-status")).toContainText(
    "Wybierz poczatek zakresu",
  );
  await page.getByLabel(/Ligol R1\/P1/).click();
  await expect(page.getByTestId("plot-selection-range-status")).toContainText(
    "Poczatek zakresu",
  );
  await page.getByLabel(/Ligol R1\/P3/).click();
  await expect(page.getByTestId("plot-selection-summary")).toContainText(
    "Wybrano 3 drzewa",
  );
  await expect(page.getByTestId("plot-selection-scope-summary")).toContainText(
    "Sekcja A, Rzad 1, pozycje 1-3",
  );
  await expect(page.getByTestId("plot-selection-action-state")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.getByTestId("plot-selection-bulk-deactivate-state")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.getByTestId("plot-selection-bulk-deactivate")).toHaveAttribute(
    "href",
    /\/trees\/batch\/deactivate\?plot_id=20000000-0000-4000-8000-000000000001.*row_number=1.*from_position=1.*to_position=3/,
  );
  await page.getByTestId("plot-selection-bulk-deactivate").click();
  await expect(page.getByTestId("bulk-tree-deactivate-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(
    "20000000-0000-4000-8000-000000000001",
  );
  await expect(page.locator("#row_number")).toHaveValue("1");
  await expect(page.locator("#from_position")).toHaveValue("1");
  await expect(page.locator("#to_position")).toHaveValue("3");
  await page.getByTestId("bulk-tree-deactivate-preview-button").click();
  await expect(page.getByTestId("bulk-tree-deactivate-preview")).toContainText(
    "Aktywne drzewa do zmiany:",
  );
  await expect(page.getByTestId("bulk-tree-deactivate-preview")).toContainText("3");

  await openPlot(page, "Kwatera Polnocna");
  await page.getByTestId("plot-visual-mode-select").click();
  await page.getByTestId("plot-selection-range-start").click();
  await page.getByLabel(/Ligol R1\/P1/).click();
  await page.getByLabel(/Ligol R1\/P3/).click();
  await expect(page.getByTestId("plot-selection-action-state")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.getByTestId("plot-selection-add-activity").click();
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(
    "20000000-0000-4000-8000-000000000001",
  );
  await expect(page.locator("#tree_id")).toHaveValue("");
  await expect(page.locator("#scope_level_0")).toHaveValue("location_range");
  await expect(page.locator("#scope_row_number_0")).toHaveValue("1");
  await expect(page.locator("#scope_from_position_0")).toHaveValue("1");
  await expect(page.locator("#scope_to_position_0")).toHaveValue("3");

  await openPlot(page, "Kwatera Polnocna");
  await expect(page.getByTestId("plot-tree-detail-panel")).toHaveCount(0);

  await page.locator("#plot_visual_condition").selectOption("warning");
  await expect(page.getByTestId("plot-visual-filter-count")).toContainText(
    "Pokazano 2 z 22 drzew",
  );
  const warningMarker = page.getByLabel(/Ligol R1\/P3/);

  await expect(warningMarker).toBeVisible();
  await expect(page.getByTestId("plot-visual-marker-active-tree")).toHaveCount(2);
  await warningMarker.click();

  const detailPanel = page.getByTestId("plot-tree-detail-panel");

  await expect(detailPanel).toBeVisible();
  await expect(detailPanel).toContainText("Ligol R1/P3");
  await expect(detailPanel).toContainText("MAIN-N-R1-P3");
  await expect(detailPanel).toContainText("Apple - Ligol");
  await expect(detailPanel.getByTestId("plot-tree-detail-edit-link")).toHaveAttribute(
    "href",
    /\/trees\/40000000-0000-4000-8000-000000000003\/edit$/,
  );
  await expect(
    detailPanel.getByTestId("plot-tree-detail-add-activity"),
  ).toHaveAttribute(
    "href",
    /\/activities\/new\?plot_id=20000000-0000-4000-8000-000000000001.*tree_id=40000000-0000-4000-8000-000000000003/,
  );
  await expect(detailPanel.getByTestId("plot-tree-detail-close")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("plot-tree-detail-panel")).toHaveCount(0);
  await expect(warningMarker).toBeFocused();
  await warningMarker.click();
  await page.getByTestId("plot-tree-detail-add-activity").click();
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#tree_id")).toHaveValue(
    "40000000-0000-4000-8000-000000000003",
  );
  await expect(page.locator("#scope_level_0")).toHaveValue("tree");
  await expect(page.locator("#scope_tree_id_0")).toHaveValue(
    "40000000-0000-4000-8000-000000000003",
  );

  await openPlot(page, "Kwatera Polnocna");
  await page.locator("#plot_visual_location_verified").selectOption("unverified");
  await expect(page.getByTestId("plot-visual-filter-count")).toContainText(
    "Pokazano 1 z 22 drzew",
  );
  await expect(page.getByTestId("plot-visual-fallback")).toBeVisible();
  await expect(page.getByText("Young Apple Block")).toBeVisible();

  await openPlot(page, "Kwatera Poludniowa");
  await expect(page.getByTestId("plot-visual-grid")).toBeVisible();
  await expect(
    page.getByTestId("plot-visual-warning-MIXED_PARTIAL_COVERAGE"),
  ).toBeVisible();
  await expect(page.getByTestId("plot-visual-marker-removed-tree")).toBeVisible();
  await page.getByTestId("plot-visual-marker-removed-tree").click();
  await expect(page.getByTestId("plot-tree-detail-panel")).toContainText(
    "Removed Ligol example",
  );
  await expect(page.getByTestId("plot-tree-detail-panel")).toContainText(
    "Historyczne",
  );
  await expect(
    page
      .getByTestId("plot-tree-detail-panel")
      .getByTestId("plot-tree-detail-edit-link"),
  ).toHaveAttribute(
    "href",
    /\/trees\/40000000-0000-4000-8000-000000000008\/edit$/,
  );
  await expect(
    page
      .getByTestId("plot-tree-detail-panel")
      .getByTestId("plot-tree-detail-add-activity"),
  ).toBeDisabled();
  await page.getByTestId("plot-tree-detail-close").click();
  await expect(page.getByTestId("plot-tree-detail-panel")).toHaveCount(0);
  await page.getByTestId("plot-visual-mode-select").click();
  await expect(page.getByTestId("plot-visual-marker-removed-tree")).toBeDisabled();
  await page.getByTestId("plot-visual-mode-browse").click();

  await page.locator("#plot_visual_lifecycle").selectOption("active");
  await expect(page.getByTestId("plot-visual-filter-count")).toContainText(
    "Pokazano 11 z 12 drzew",
  );
  await expect(page.getByTestId("plot-visual-marker-removed-tree")).toHaveCount(0);
  await expect(page.getByText("Removed Ligol example")).toHaveCount(0);

  await switchActiveOrchard(
    page,
    SEEDED_USERS.owner.secondaryOrchardLabel,
    "Sad Poludniowy",
  );
  await openPlot(page, "Dolny Taras");
  await expect(page.getByTestId("plot-visual-fallback")).toBeVisible();
  await expect(page.getByText("President Block B")).toBeVisible();
  await expect(page.getByTestId("plot-visual-grid")).toHaveCount(0);
  await expect(page.getByText("Schemat rzedow")).toHaveCount(0);
});

test("owner can prefill batch create from an inferred empty plot position", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  const plotName = await createPlotWithGapForPlantNew(page);

  await openPlot(page, plotName);
  await page.getByTestId("plot-visual-mode-select").click();
  await expect(page.getByTestId("plot-selection-plant-new-state")).toHaveAttribute(
    "data-state",
    "empty",
  );

  const emptyPosition = page.getByLabel(/Puste miejsce, sekcja A, rzad 1, pozycja 2/);

  await emptyPosition.click();
  await expect(page.getByTestId("plot-selection-plant-new-state")).toHaveAttribute(
    "data-state",
    "selecting",
  );
  await emptyPosition.click();
  await expect(page.getByTestId("plot-selection-plant-new-state")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await expect(page.getByTestId("plot-selection-plant-new")).toHaveAttribute(
    "href",
    /\/trees\/batch\/new\?plot_id=.*section_name=A.*row_number=1.*from_position=2.*to_position=2/,
  );

  await page.getByTestId("plot-selection-plant-new").click();
  await expect(page.getByTestId("bulk-tree-batch-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#row_number")).toHaveValue("1");
  await expect(page.locator("#from_position")).toHaveValue("2");
  await expect(page.locator("#to_position")).toHaveValue("2");
  await expect(page.locator("#section_name")).toHaveValue("A");

  await page.getByLabel("Gatunek").fill("apple");
  await page.getByTestId("bulk-tree-batch-preview-button").click();
  await expect(page.getByTestId("bulk-tree-batch-preview")).toContainText(
    "Planowanych pozycji:",
  );
  await expect(page.getByTestId("bulk-tree-batch-preview")).toContainText("1");
});

test("owner can focus one row from the large plot scale overview", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  const performanceOrchardOption = page
    .getByTestId("orchard-switcher-select")
    .locator("option")
    .filter({ hasText: LARGE_PLOT_FIXTURE_ORCHARD.ownerLabel });

  test.skip(
    (await performanceOrchardOption.count()) === 0,
    "Requires pnpm seed:large-plot-fixture local PERF orchard.",
  );

  await pinActiveOrchardCookie(page, LARGE_PLOT_FIXTURE_ORCHARD.id);

  await page.goto(`/plots/${LARGE_PLOT_FIXTURE_PLOTS.rows1500.id}`);
  await expect(page.locator("header h1")).toHaveText(
    LARGE_PLOT_FIXTURE_ORCHARD.name,
  );
  await expect(
    page.getByRole("heading", { name: LARGE_PLOT_FIXTURE_PLOTS.rows1500.name }),
  ).toBeVisible();
  await expect(page.getByTestId("plot-tree-scale-overview")).toBeVisible();
  await expect(page.getByTestId("plot-visual-row-detail")).toHaveCount(0);
  await expect(page.getByTestId("plot-visual-grid")).toHaveCount(0);
  await expect(page.locator("[data-testid^='plot-visual-marker-']")).toHaveCount(0);

  const firstRow = page
    .locator("tbody tr")
    .filter({ hasText: "Sekcja A, rzad 1" })
    .first();
  await expect(firstRow).toContainText("50");
  await firstRow.getByRole("link", { name: "Otworz" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/plots/${LARGE_PLOT_FIXTURE_PLOTS.rows1500.id}\\?row=1&section=A$`),
  );
  await expect(page.getByTestId("plot-visual-row-detail")).toBeVisible();
  await expect(page.getByTestId("plot-tree-scale-overview")).toHaveCount(0);
  await expect(page.getByTestId("plot-visual-grid")).toBeVisible();
  await expect(page.getByText("Fokus rzedu: Sekcja A, rzad 1")).toBeVisible();
  await expect(page.getByText("50 drzew w tym rzedzie")).toBeVisible();
  await expect(page.locator("[data-testid^='plot-visual-marker-']")).toHaveCount(50);
  await expect(page.getByTestId("plot-visual-grid").getByText("Rzad 1")).toBeVisible();
  await expect(page.getByTestId("plot-visual-grid").getByText("Rzad 2")).toHaveCount(0);
});

test("owner can use range actions when a focused row is too long for markers", async ({
  page,
}) => {
  test.setTimeout(120_000);

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  const performanceOrchardOption = page
    .getByTestId("orchard-switcher-select")
    .locator("option")
    .filter({ hasText: LARGE_PLOT_FIXTURE_ORCHARD.ownerLabel });

  test.skip(
    (await performanceOrchardOption.count()) === 0,
    "Requires pnpm seed:large-plot-fixture local PERF orchard.",
  );

  await pinActiveOrchardCookie(page, LARGE_PLOT_FIXTURE_ORCHARD.id);

  await page.goto(
    `/plots/${LARGE_PLOT_FIXTURE_PLOTS.longRow350.id}?section=A&row=1`,
  );
  await expect(
    page.getByRole("heading", {
      name: LARGE_PLOT_FIXTURE_PLOTS.longRow350.name,
    }),
  ).toBeVisible();
  await expect(page.getByTestId("plot-visual-row-detail")).toBeVisible();
  await expect(page.getByTestId("plot-visual-grid")).toHaveCount(0);
  await expect(page.locator("[data-testid^='plot-visual-marker-']")).toHaveCount(0);
  await expect(page.getByText("350 drzew w tym rzedzie")).toBeVisible();
  await expect(page.getByText("Tabela rzedu")).toBeVisible();

  const rangeActions = page.getByTestId("plot-visual-row-range-actions");
  await expect(rangeActions).toBeVisible();
  await expect(rangeActions.getByLabel("Od pozycji")).toHaveValue("1");
  await expect(rangeActions.getByLabel("Do pozycji")).toHaveValue("50");

  await rangeActions.getByRole("link", { name: "Dodaj aktywnosc" }).click();

  await expect(page).toHaveURL(/\/activities\/new\?/);
  await expect(page.getByTestId("activity-prefill-message")).toContainText(
    "Zakres zostal uzupelniony",
  );
  await expect(page.locator("#plot_id")).toHaveValue(
    LARGE_PLOT_FIXTURE_PLOTS.longRow350.id,
  );
  await expect(page.locator("#scope_level_0")).toHaveValue("location_range");
  await expect(page.locator("#scope_row_number_0")).toHaveValue("1");
  await expect(page.locator("#scope_from_position_0")).toHaveValue("1");
  await expect(page.locator("#scope_to_position_0")).toHaveValue("50");
});
