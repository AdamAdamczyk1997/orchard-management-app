import { expect, test } from "@playwright/test";
import { registerFreshUser, waitForDashboard, waitForOnboarding } from "./support/app";
import { uniqueEmail, uniqueName } from "./support/fixtures";

test("fresh user registers, reaches onboarding, and creates the first orchard", async ({
  page,
}) => {
  test.setTimeout(120_000);

  const suffix = uniqueName("playwright-owner");
  const orchardName = uniqueName("Playwright Orchard");
  const orchardCode = `PW-${Date.now().toString().slice(-4)}`;
  const email = uniqueEmail("playwright-onboarding");

  await registerFreshUser(page, {
    displayName: suffix,
    email,
    password: "Playwright123!",
  });

  await waitForOnboarding(page);

  await page.getByLabel("Nazwa sadu").fill(orchardName);
  await page.getByLabel("Kod").fill(orchardCode);
  await page.getByLabel("Opis").fill("Playwright onboarding orchard.");
  await page.getByRole("button", { name: "Utworz sad" }).click();

  await waitForDashboard(page, orchardName);
  await expect(page.getByText("Sad jest jeszcze pusty")).toBeVisible();
  await expect(page.getByRole("link", { name: "Dodaj dzialke" }).first()).toBeVisible();

  await page.goto("/plots");
  await expect(page.getByText("Brak dzialek")).toBeVisible();
  await expect(page.getByRole("link", { name: "Utworz dzialke" }).first()).toBeVisible();

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(uniqueName("Onboarding dzialka"));
  await page.getByLabel("Kod").fill(`OB-${Date.now().toString().slice(-4)}`);
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await page.goto("/plots?status=archived");
  await expect(
    page.getByRole("heading", { name: "Brak wynikow dla wybranych filtrow" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Wyczysc filtry" }).last().click();
  await expect(page).toHaveURL(/\/plots$/);
  await expect(page.getByText("Brak dzialek")).toHaveCount(0);

  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Nadchodzace aktywnosci" }),
  ).toBeVisible();
  await expect(
    page.getByText("Nie ma jeszcze zaplanowanych aktywnosci od dzis wzwyz."),
  ).toBeVisible();
});
