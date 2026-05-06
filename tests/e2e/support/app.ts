import { expect, type Locator, type Page } from "@playwright/test";

export async function loginWithPassword(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Haslo").fill(password);
  await page.getByRole("button", { name: "Zaloguj sie" }).click();
}

export async function registerFreshUser(
  page: Page,
  input: {
    displayName: string;
    email: string;
    password: string;
  },
) {
  await page.goto("/register");
  await page.getByLabel("Nazwa wyswietlana").fill(input.displayName);
  await page.getByLabel("Email").fill(input.email);
  await page.getByLabel("Haslo").fill(input.password);
  await page.getByRole("button", { name: "Utworz konto" }).click();
}

export async function waitForDashboard(page: Page, orchardName?: string) {
  if (orchardName) {
    await expect(page.locator("header h1")).toHaveText(orchardName, {
      timeout: 30_000,
    });
    return;
  }

  await expect(page.locator("header h1")).toBeVisible({ timeout: 30_000 });
}

export async function waitForOnboarding(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: "Utworz sad, ktory odblokuje Twoj kontekst pracy.",
    }),
  ).toBeVisible();
}

export async function switchActiveOrchard(
  page: Page,
  optionLabel: string,
  expectedOrchardName: string,
) {
  await page.getByTestId("orchard-switcher-select").selectOption({
    label: optionLabel,
  });
  await expect(page.locator("header h1")).toHaveText(expectedOrchardName);
}

export async function expectFeedback(page: Page, message: string) {
  await expect(page.getByTestId("feedback-banner")).toContainText(message, {
    timeout: 30_000,
  });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    const tolerance = 1;
    return (
      document.documentElement.scrollWidth > window.innerWidth + tolerance ||
      document.body.scrollWidth > window.innerWidth + tolerance
    );
  });

  expect(hasOverflow).toBe(false);
}

export async function selectOptionContaining(
  select: Locator,
  partialLabel: string,
) {
  const matchingOption = select.locator("option").filter({ hasText: partialLabel }).first();
  const optionValue = await matchingOption.getAttribute("value");

  if (!optionValue) {
    throw new Error(`No option containing "${partialLabel}" was found.`);
  }

  await select.selectOption(optionValue);
}
