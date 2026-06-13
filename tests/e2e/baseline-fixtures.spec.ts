import { expect, test, type Page } from "@playwright/test";
import { loginWithPassword, waitForDashboard } from "./support/app";
import {
  BASELINE_ORCHARDS,
  BASELINE_PERSONAS,
  BASELINE_PLOTS,
} from "./support/fixtures";

const GAP_TREE_LEFT_ID = "40000000-0000-4000-8000-000000000012";
const GAP_TREE_LEFT_LABEL = /Gala Gap R1\/P1/;
const GAP_TREE_RIGHT_LABEL = /Gala Gap R1\/P3/;

async function expectNoBootstrapError(page: Page) {
  await expect(page).not.toHaveURL(/\/bootstrap-error/);
  await expect(page.getByText("Blad przygotowania profilu")).toHaveCount(0);
  await expect(page.getByText(/Application error|Unhandled Runtime Error/)).toHaveCount(
    0,
  );
}

async function expectEmptyListRoute(
  page: Page,
  input: {
    path: string;
    heading: string;
    emptyHeading: string;
    createLink: string;
  },
) {
  await page.goto(input.path);
  await expectNoBootstrapError(page);
  await expect(page.locator("header h1")).toHaveText(BASELINE_ORCHARDS.EMPTY.name);
  await expect(page.getByRole("heading", { name: input.heading })).toBeVisible();
  await expect(page.getByRole("heading", { name: input.emptyHeading })).toBeVisible();
  await expect(page.getByRole("link", { name: input.createLink }).first()).toBeVisible();
}

async function expectGapPlotMarkers(page: Page) {
  const gapPlot = BASELINE_PLOTS.plot_main_gap_rows;

  await expect(page.getByTestId("plot-visual-grid")).toBeVisible();
  await expect(page.getByTestId("plot-visual-filter-count")).toContainText(
    "Pokazano 2 z 2 drzew",
  );
  await expect(page.getByTestId("plot-visual-marker-active-tree")).toHaveCount(2);
  await expect(page.getByTestId("plot-visual-marker-empty-inferred")).toHaveCount(1);
  await expect(page.getByLabel(GAP_TREE_LEFT_LABEL)).toBeVisible();
  await expect(page.getByLabel(GAP_TREE_RIGHT_LABEL)).toBeVisible();
  await expect(
    page.getByLabel(
      new RegExp(
        `Puste miejsce, sekcja Gap, rzad ${gapPlot.rowNumber}, pozycja ${gapPlot.emptyPositions[0]}`,
      ),
    ),
  ).toBeVisible();
}

test("owner_empty can browse EMPTY orchard empty states without creating records", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const persona = BASELINE_PERSONAS.owner_empty;
  const orchard = BASELINE_ORCHARDS.EMPTY;

  await loginWithPassword(page, persona.email, persona.password);
  await waitForDashboard(page, orchard.name);
  await expectNoBootstrapError(page);
  await expect(page.getByText(persona.email)).toBeVisible();
  await expect(page.getByTestId("orchard-switcher-select")).toBeDisabled();
  await expect(page.getByTestId("orchard-switcher-select")).toContainText(
    orchard.name,
  );
  await expect(page.getByRole("heading", { name: "Sad jest jeszcze pusty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dodaj dzialke" }).first()).toBeVisible();

  await expectEmptyListRoute(page, {
    path: "/plots",
    heading: `Dzialki w sadzie ${orchard.name}`,
    emptyHeading: "Brak dzialek",
    createLink: "Utworz dzialke",
  });
  await expect(page.getByTestId("plot-card")).toHaveCount(0);

  await expectEmptyListRoute(page, {
    path: "/varieties",
    heading: `Biblioteka odmian w sadzie ${orchard.name}`,
    emptyHeading: "Brak odmian",
    createLink: "Utworz odmiane",
  });

  await expectEmptyListRoute(page, {
    path: "/trees",
    heading: `Struktura drzew w sadzie ${orchard.name}`,
    emptyHeading: "Brak drzew",
    createLink: "Utworz drzewo",
  });

  await expectEmptyListRoute(page, {
    path: "/activities",
    heading: `Aktywnosci w sadzie ${orchard.name}`,
    emptyHeading: "Brak aktywnosci",
    createLink: "Nowa aktywnosc",
  });

  await expectEmptyListRoute(page, {
    path: "/harvests",
    heading: `Wpisy zbioru w sadzie ${orchard.name}`,
    emptyHeading: "Brak wpisow zbioru",
    createLink: "Nowy wpis zbioru",
  });

  await page.goto("/reports/season-summary");
  await expectNoBootstrapError(page);
  await expect(page.getByRole("heading", { name: "Podsumowanie sezonu zbiorow" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Brak danych w tym sezonie" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Dodaj wpis zbioru" })).toBeVisible();

  await page.goto("/reports/harvest-locations");
  await expectNoBootstrapError(page);
  await expect(page.getByRole("heading", { name: "Zbiory po lokalizacji" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Brak danych dla tej kombinacji filtrow" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Dodaj wpis zbioru" })).toBeVisible();

  await page.goto("/reports/variety-locations");
  await expectNoBootstrapError(page);
  await expect(page.getByRole("heading", { name: "Raport lokalizacji odmiany" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Najpierw dodaj odmiane" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Utworz odmiane" })).toBeVisible();
});

test("owner can inspect the read-only PVO gap fixture without mutating it", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const persona = BASELINE_PERSONAS.owner_primary;
  const gapPlot = BASELINE_PLOTS.plot_main_gap_rows;

  await loginWithPassword(page, persona.email, persona.password);
  await waitForDashboard(page, BASELINE_ORCHARDS.MAIN.name);

  await page.goto(`/plots/${gapPlot.id}`);
  await expectNoBootstrapError(page);
  await expect(page.getByRole("heading", { name: gapPlot.name })).toBeVisible();
  await expectGapPlotMarkers(page);

  await page.getByLabel(GAP_TREE_LEFT_LABEL).click();
  const detailPanel = page.getByTestId("plot-tree-detail-panel");

  await expect(detailPanel).toBeVisible();
  await expect(detailPanel).toContainText("Gala Gap R1/P1");
  await expect(detailPanel).toContainText("MAIN-GAP-R1-P1");
  await expect(detailPanel).toContainText("Apple - Gala Report");
  await expect(detailPanel.getByTestId("plot-tree-detail-add-activity")).toHaveAttribute(
    "href",
    new RegExp(
      `/activities/new\\?plot_id=${gapPlot.id}.*tree_id=${GAP_TREE_LEFT_ID}`,
    ),
  );
  await detailPanel.getByTestId("plot-tree-detail-close").click();
  await expect(page.getByTestId("plot-tree-detail-panel")).toHaveCount(0);

  await page.getByTestId("plot-visual-mode-select").click();
  await expect(page.getByTestId("plot-selection-plant-new-state")).toHaveAttribute(
    "data-state",
    "empty",
  );

  const emptyPosition = page.getByLabel(
    new RegExp(
      `Puste miejsce, sekcja Gap, rzad ${gapPlot.rowNumber}, pozycja ${gapPlot.emptyPositions[0]}`,
    ),
  );

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
    new RegExp(
      `/trees/batch/new\\?plot_id=${gapPlot.id}.*row_number=${gapPlot.rowNumber}.*from_position=${gapPlot.emptyPositions[0]}.*to_position=${gapPlot.emptyPositions[0]}`,
    ),
  );
  await expect(page.getByTestId("feedback-banner")).toHaveCount(0);

  await page.goto(`/plots/${gapPlot.id}`);
  await expectGapPlotMarkers(page);
});
