import { expect, test } from "@playwright/test";
import {
  expectFeedback,
  loginWithPassword,
  switchActiveOrchard,
  waitForDashboard,
  waitForOnboarding,
} from "./support/app";
import { SEEDED_USERS, uniqueName } from "./support/fixtures";

test("owner can switch orchard context without leaking orchard-specific structure", async ({
  page,
}) => {
  const plotName = uniqueName("PW izolacja dzialka");

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.getByLabel("Kod").fill(`ISO-${Date.now().toString().slice(-4)}`);
  await page.getByRole("button", { name: "Utworz dzialke" }).click();

  await expectFeedback(page, "Dzialka zostala utworzona.");
  await expect(page.getByText(plotName)).toBeVisible();

  await switchActiveOrchard(
    page,
    SEEDED_USERS.owner.secondaryOrchardLabel,
    "Sad Poludniowy",
  );
  await page.goto("/plots");
  await expect(
    page.getByRole("heading", { name: "Dzialki w sadzie Sad Poludniowy" }),
  ).toBeVisible();
  await expect(page.getByText(plotName)).toHaveCount(0);

  await switchActiveOrchard(
    page,
    "Sad Glowny (Wlasciciel)",
    SEEDED_USERS.owner.primaryOrchardName,
  );
  await page.goto("/plots");
  await expect(
    page.getByRole("heading", { name: "Dzialki w sadzie Sad Glowny" }),
  ).toBeVisible();
  await expect(page.getByText(plotName)).toBeVisible();
});

test("worker sees membership restriction and gets HTTP 403 on account export", async ({
  page,
}) => {
  await loginWithPassword(
    page,
    SEEDED_USERS.worker.email,
    SEEDED_USERS.worker.password,
  );
  await waitForDashboard(page, SEEDED_USERS.worker.orchardName);

  await page.goto("/settings/members");
  await expect(page.getByText("Brak dostepu do tego obszaru")).toBeVisible();
  await expect(
    page.getByText("Tylko wlasciciel sadu moze przegladac i zarzadzac czlonkami orchard."),
  ).toBeVisible();

  await page.goto("/settings/profile");
  await expect(page.getByTestId("profile-export-forbidden")).toBeVisible();
  await expect(
    page.getByText("Eksport konta jest teraz zablokowany"),
  ).toBeVisible();
  await expect(page.getByTestId("profile-export-download")).toHaveCount(0);

  const response = await page.request.get("/settings/profile/export");
  expect(response.status()).toBe(403);
  const payload = await response.text();
  expect(payload).toContain("EXPORT_NOT_ALLOWED_FOR_ROLE");
  expect(payload).toContain("wlasciciela");
});

test("outsider is redirected to orchard onboarding instead of operational reports", async ({
  page,
}) => {
  await loginWithPassword(
    page,
    SEEDED_USERS.outsider.email,
    SEEDED_USERS.outsider.password,
  );
  await waitForOnboarding(page);

  await page.goto("/reports/season-summary");
  await waitForOnboarding(page);
  await expect(page.getByText("Podsumowanie sezonu zbiorow")).toHaveCount(0);
});
