import { expect, test, type Page } from "@playwright/test";
import { loginWithPassword, waitForDashboard } from "./support/app";
import {
  BASELINE_ORCHARDS,
  BASELINE_PERSONAS,
  BASELINE_PLOTS,
  BASELINE_VARIETIES,
} from "./support/fixtures";

async function expectNoReportError(page: Page) {
  await expect(page).not.toHaveURL(/\/bootstrap-error|\/onboarding/);
  await expect(page.getByText("Blad przygotowania profilu")).toHaveCount(0);
  await expect(page.getByText(/Application error|Unhandled Runtime Error/)).toHaveCount(
    0,
  );
}

function reportPath(path: string, search: Record<string, string>) {
  return `${path}?${new URLSearchParams(search).toString()}`;
}

async function openReport(
  page: Page,
  path: string,
  heading: string,
  search: Record<string, string>,
) {
  await page.goto(reportPath(path, search));
  await expectNoReportError(page);
  await expect(page.locator("header h1")).toHaveText(BASELINE_ORCHARDS.MAIN.name);
  await expect(page.getByRole("heading", { name: heading })).toBeVisible();
}

async function expectSelectedHarvestFilters(
  page: Page,
  filters: {
    seasonYear: string;
    plotId?: string;
    varietyId?: string;
  },
) {
  await expect(page.locator('input[name="season_year"]')).toHaveValue(
    filters.seasonYear,
  );

  if (filters.plotId) {
    await expect(page.locator('select[name="plot_id"]')).toHaveValue(filters.plotId);
  }

  if (filters.varietyId) {
    await expect(page.locator('select[name="variety_id"]')).toHaveValue(
      filters.varietyId,
    );
  }
}

test("owner can inspect baseline harvest reports without mutating canonical records", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const persona = BASELINE_PERSONAS.owner_primary;
  const mainNorth = BASELINE_PLOTS.plot_main_north;
  const gapPlot = BASELINE_PLOTS.plot_main_gap_rows;
  const galaReport = BASELINE_VARIETIES.gala_report;
  const szampion = BASELINE_VARIETIES.szampion;

  await loginWithPassword(page, persona.email, persona.password);
  await waitForDashboard(page, BASELINE_ORCHARDS.MAIN.name);

  await openReport(page, "/reports/season-summary", "Podsumowanie sezonu zbiorow", {
    season_year: "2026",
    plot_id: gapPlot.id,
    variety_id: galaReport.id,
  });
  await expectSelectedHarvestFilters(page, {
    seasonYear: "2026",
    plotId: gapPlot.id,
    varietyId: galaReport.id,
  });
  await expect(
    page.getByRole("heading", { name: "Brak danych w tym sezonie" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Suma per odmiana" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Suma per dzialka" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Historia w czasie" })).toBeVisible();
  await expect(page.locator("p", { hasText: galaReport.name }).first()).toBeVisible();
  await expect(page.locator("p", { hasText: gapPlot.name }).first()).toBeVisible();
  await expect(page.getByText("35 kg", { exact: true }).first()).toBeVisible();

  await openReport(page, "/reports/season-summary", "Podsumowanie sezonu zbiorow", {
    season_year: "2025",
    plot_id: gapPlot.id,
    variety_id: galaReport.id,
  });
  await expectSelectedHarvestFilters(page, {
    seasonYear: "2025",
    plotId: gapPlot.id,
    varietyId: galaReport.id,
  });
  await expect(
    page.getByRole("heading", { name: "Brak danych w tym sezonie" }),
  ).toHaveCount(0);
  await expect(page.locator("p", { hasText: galaReport.name }).first()).toBeVisible();
  await expect(page.locator("p", { hasText: gapPlot.name }).first()).toBeVisible();
  await expect(page.getByText("680 kg", { exact: true }).first()).toBeVisible();

  await openReport(page, "/reports/season-summary", "Podsumowanie sezonu zbiorow", {
    season_year: "2026",
    plot_id: mainNorth.id,
    variety_id: szampion.id,
  });
  await expectSelectedHarvestFilters(page, {
    seasonYear: "2026",
    plotId: mainNorth.id,
    varietyId: szampion.id,
  });
  await expect(
    page.getByRole("heading", { name: "Brak danych w tym sezonie" }),
  ).toHaveCount(0);
  await expect(page.locator("p", { hasText: szampion.name }).first()).toBeVisible();
  await expect(page.locator("p", { hasText: mainNorth.name }).first()).toBeVisible();
  await expect(page.getByText("1200 kg", { exact: true }).first()).toBeVisible();

  await openReport(page, "/reports/harvest-locations", "Zbiory po lokalizacji", {
    season_year: "2026",
  });
  await expectSelectedHarvestFilters(page, { seasonYear: "2026" });
  await expect(
    page.getByRole("heading", { name: "Brak danych dla tej kombinacji filtrow" }),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: mainNorth.name })).toBeVisible();
  await expect(page.getByRole("heading", { name: gapPlot.name })).toBeVisible();
  await expect(page.getByText("Sekcja A - Rzad 1")).toBeVisible();
  await expect(page.getByText("Pozycje 1-3")).toBeVisible();
  await expect(page.getByText("Sekcja Gap - Rzad 1")).toBeVisible();
  await expect(page.getByText("Pozycja 1", { exact: true }).first()).toBeVisible();
  await expect(
    page.locator("p", { hasText: "Bez precyzyjnej lokalizacji: 1200 kg" }),
  ).toBeVisible();

  await page.goto(
    reportPath("/reports/variety-locations", {
      variety_id: galaReport.id,
    }),
  );
  await expectNoReportError(page);
  await expect(page.locator("header h1")).toHaveText(BASELINE_ORCHARDS.MAIN.name);
  await expect(
    page.getByRole("heading", { name: "Raport lokalizacji odmiany" }),
  ).toBeVisible();
  await expect(page.locator('select[name="variety_id"]')).toHaveValue(galaReport.id);
  await expect(
    page.getByRole("heading", { name: "Wybierz odmiane do raportu" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Brak aktywnych drzew dla tej odmiany" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Brak drzew z raportowalna lokalizacja" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: galaReport.optionLabel }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Aktywne drzewa" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Zakresy lokalizacji" })).toBeVisible();
  await expect(page.getByText("Kwatera Luki PVO - Gap - Rzad 1")).toBeVisible();
  await expect(page.getByText("Pozycja 1", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pozycja 3", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Liczba drzew w zakresie: 1").first()).toBeVisible();
});
