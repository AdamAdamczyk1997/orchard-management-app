import { expect, test } from "@playwright/test";
import {
  expectFeedback,
  loginWithPassword,
  selectOptionContaining,
  waitForDashboard,
} from "./support/app";
import { SEEDED_USERS, uniqueName } from "./support/fixtures";

test("owner can complete the core orchard, activity, and harvest flow", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const plotName = uniqueName("PW dzialka");
  const varietyName = uniqueName("Ligol PW");
  const treeDisplayName = uniqueName("Tree PW");
  const treeCode = `PW-T-${Date.now().toString().slice(-4)}`;
  const pruningTitle = uniqueName("Pruning PW");
  const sprayingTitle = uniqueName("Spraying PW");
  const mowingTitle = uniqueName("Mowing PW");

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.getByLabel("Kod").fill(`PLOT-${Date.now().toString().slice(-4)}`);
  await page.getByLabel("Opis lokalizacji").fill("Playwright field block.");
  await page.locator("#layout_type").selectOption("rows");
  await page
    .locator("#row_numbering_scheme")
    .selectOption("left_to_right_from_entrance");
  await page.locator("#tree_numbering_scheme").selectOption("from_row_start");
  await page.getByLabel("Punkt odniesienia").fill("Wjazd zachodni");
  await page.getByLabel("Domyslna liczba rzedow").fill("12");
  await page.getByLabel("Domyslna liczba drzew w rzedzie").fill("24");
  await page.getByLabel("Notatki o ukladzie").fill("Playwright rows layout.");
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expectFeedback(page, "Dzialka zostala utworzona.");
  await expect(page.getByText(plotName)).toBeVisible();

  await page.goto("/varieties/new");
  await page.getByLabel("Gatunek").fill("apple");
  await page.getByLabel("Nazwa odmiany").fill(varietyName);
  await page.getByLabel("Opis").fill("Playwright variety.");
  await page.getByRole("button", { name: "Utworz odmiane" }).click();

  await expectFeedback(page, "Odmiana zostala utworzona.");
  await expect(page.getByText(varietyName)).toBeVisible();

  await page.goto("/trees/new");
  await page.getByLabel("Gatunek").fill("apple");
  await page.getByLabel("Kod drzewa").fill(treeCode);
  await page.getByLabel("Nazwa wyswietlana").fill(treeDisplayName);
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Odmiana").selectOption({
    label: `apple - ${varietyName}`,
  });
  await page.getByLabel("Sekcja").fill("North");
  await page.getByLabel("Numer rzedu").fill("2");
  await page.getByLabel("Pozycja w rzedzie").fill("5");
  await page.getByRole("button", { name: "Utworz drzewo" }).click();

  await expectFeedback(page, "Drzewo zostalo utworzone.");
  await expect(page.getByText(treeDisplayName)).toBeVisible();

  await page.goto("/activities/new");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Typ aktywnosci").selectOption("pruning");
  await page.getByLabel("Podtyp ciecia").selectOption("winter_pruning");
  await page.getByLabel("Data").fill("2026-02-14");
  await page.getByLabel("Tytul wpisu").fill(pruningTitle);
  await page.locator("#description").fill("Playwright winter pruning.");
  await page.getByRole("button", { name: "Zapisz aktywnosc" }).click();

  await expectFeedback(page, "Aktywnosc zostala utworzona.");
  await page.getByRole("link", { name: pruningTitle }).click();
  await expect(page.getByText(pruningTitle)).toBeVisible();

  await page.goto("/activities");
  const activitySummaryFilters = page.getByTestId("activity-season-summary-filters");
  await activitySummaryFilters.getByLabel("Dzialka do coverage").selectOption({
    label: plotName,
  });
  await activitySummaryFilters
    .getByRole("button", { name: "Pokaz podsumowanie" })
    .click();
  await expect(page.getByTestId("activity-season-summary")).toContainText(plotName);
  await expect(page.getByTestId("activity-season-coverage")).toContainText(
    "Szczegoly wpisu",
  );

  await page.goto("/activities/new");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Typ aktywnosci").selectOption("spraying");
  await page.getByLabel("Data").fill("2026-04-20");
  await page.getByLabel("Tytul wpisu").fill(sprayingTitle);
  await page.locator("#description").fill("Playwright multi-scope spraying.");
  await page.locator("#scope_level_0").selectOption("location_range");
  await page.locator("#scope_row_number_0").fill("2");
  await page.locator("#scope_from_position_0").fill("4");
  await page.locator("#scope_to_position_0").fill("6");
  await page.getByTestId("activity-add-scope").click();
  await page.locator("#scope_level_1").selectOption("tree");
  await selectOptionContaining(page.locator("#scope_tree_id_1"), treeDisplayName);
  await page.locator("#material_name_0").fill("Copper Mix");
  await page.locator("#material_quantity_0").fill("1.2");
  await page.locator("#material_unit_0").fill("l");
  await page.getByRole("button", { name: "Zapisz aktywnosc" }).click();

  await expectFeedback(page, "Aktywnosc zostala utworzona.");
  await expect(page.getByRole("link", { name: sprayingTitle })).toBeVisible();

  await page.goto("/activities/new");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Typ aktywnosci").selectOption("mowing");
  await page.getByLabel("Data").fill("2026-05-02");
  await page.getByLabel("Tytul wpisu").fill(mowingTitle);
  await page.locator("#scope_level_0").selectOption("row");
  await page.locator("#scope_row_number_0").fill("3");
  await page.getByRole("button", { name: "Zapisz aktywnosc" }).click();

  await expectFeedback(page, "Aktywnosc zostala utworzona.");
  await expect(page.getByRole("link", { name: mowingTitle })).toBeVisible();

  await page.goto("/harvests/new");
  await page.getByLabel("Poziom szczegolowosci").selectOption("variety");
  await page.getByLabel("Data zbioru").fill("2026-09-15");
  await page.getByLabel("Ilosc").fill("250");
  await page.locator("#plot_id").selectOption({ label: plotName });
  await page.locator("#variety_id").selectOption({
    label: `apple - ${varietyName}`,
  });
  await page.getByLabel("Notatki").fill("Playwright harvest.");
  await page.getByRole("button", { name: "Zapisz wpis zbioru" }).click();

  await expectFeedback(page, "Wpis zbioru zostal utworzony.");
  await page.goto("/reports/season-summary");
  const harvestSummaryFilters = page.getByTestId("harvest-season-summary-filters");
  await harvestSummaryFilters.getByLabel("Dzialka").selectOption({ label: plotName });
  await harvestSummaryFilters.getByLabel("Odmiana").selectOption({
    label: `apple - ${varietyName}`,
  });
  await harvestSummaryFilters
    .getByRole("button", { name: "Pokaz raport" })
    .click();

  const harvestSummary = page.getByTestId("harvest-season-summary");
  await expect(harvestSummary).toContainText(plotName);
  await expect(harvestSummary).toContainText(varietyName);
  await expect(page.getByText("250 kg", { exact: true }).first()).toBeVisible();
});
