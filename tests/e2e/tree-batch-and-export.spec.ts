import { expect, test } from "@playwright/test";
import {
  expectFeedback,
  loginWithPassword,
  waitForDashboard,
} from "./support/app";
import { SEEDED_USERS, uniqueName } from "./support/fixtures";

test("owner can preview and confirm batch tree create plus bulk deactivate", async ({
  page,
}) => {
  test.setTimeout(180_000);

  const plotName = uniqueName("PW batch plot");
  const varietyName = uniqueName("PW batch variety");
  const treePattern = `PWB-${Date.now().toString().slice(-4)}-T{{n}}`;
  const treeSearchCode = treePattern.replace("{{n}}", "20");

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.locator("#layout_type").selectOption("rows");
  await page
    .locator("#row_numbering_scheme")
    .selectOption("left_to_right_from_entrance");
  await page.locator("#tree_numbering_scheme").selectOption("from_row_start");
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expectFeedback(page, "Dzialka zostala utworzona.");

  await page.goto("/varieties/new");
  await page.getByLabel("Gatunek").fill("apple");
  await page.getByLabel("Nazwa odmiany").fill(varietyName);
  await page.getByRole("button", { name: "Utworz odmiane" }).click();

  await expectFeedback(page, "Odmiana zostala utworzona.");

  await page.goto("/trees/batch/new");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Gatunek").fill("apple");
  await page.getByLabel("Odmiana").selectOption({
    label: `apple - ${varietyName}`,
  });
  await page.getByLabel("Sekcja").fill("North");
  await page.getByLabel("Numer rzedu").fill("7");
  await page.getByLabel("Od pozycji").fill("20");
  await page.getByLabel("Do pozycji").fill("22");
  await page.getByLabel("Wzorzec kodu drzewa").fill(treePattern);
  await page
    .getByTestId("bulk-tree-batch-preview-button")
    .click();

  await expect(page.getByTestId("bulk-tree-batch-preview")).toContainText(
    "Planowanych pozycji:",
  );
  await expect(page.getByTestId("bulk-tree-batch-preview")).toContainText("3");
  await page.getByTestId("bulk-tree-batch-confirm-button").click();

  await expectFeedback(page, "Zakres drzew zostal utworzony.");
  await page.getByLabel("Szukaj").fill(treeSearchCode);
  await page.getByRole("button", { name: "Zastosuj" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: treeSearchCode, exact: true }),
  ).toBeVisible();

  await page.goto("/trees/batch/deactivate");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Numer rzedu").fill("7");
  await page.getByLabel("Od pozycji").fill("20");
  await page.getByLabel("Do pozycji").fill("22");
  await page.getByLabel("Powod wycofania").fill("Playwright deactivation.");
  await page
    .getByTestId("bulk-tree-deactivate-preview-button")
    .click();

  await expect(page.getByTestId("bulk-tree-deactivate-preview")).toContainText(
    "Aktywne drzewa do zmiany:",
  );
  await expect(page.getByTestId("bulk-tree-deactivate-preview")).toContainText("3");
  await page.getByTestId("bulk-tree-deactivate-confirm-button").click();

  await expectFeedback(page, "Wybrane drzewa zostaly oznaczone jako usuniete.");
  await page.getByLabel("Szukaj").fill(treeSearchCode);
  await page.getByLabel("Kondycja").selectOption("removed");
  await page.getByLabel("Aktywnosc").selectOption("false");
  await page.getByRole("button", { name: "Zastosuj" }).click();
  const inactiveTreeHeading = page.getByRole("heading", {
    level: 2,
    name: treeSearchCode,
    exact: true,
  });
  await expect(inactiveTreeHeading).toBeVisible();
  await expect(
    inactiveTreeHeading.locator("xpath=ancestor::div[contains(@class, 'grid')][1]"),
  ).toContainText("Nieaktywne");
});
