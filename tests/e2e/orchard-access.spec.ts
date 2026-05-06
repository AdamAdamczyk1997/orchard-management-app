import { expect, test } from "@playwright/test";
import {
  expectNoHorizontalOverflow,
  expectFeedback,
  loginWithPassword,
  switchActiveOrchard,
  waitForDashboard,
  waitForOnboarding,
} from "./support/app";
import { SEEDED_USERS, uniqueName } from "./support/fixtures";

function isoDateFromToday(offsetDays: number) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

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
  await expect(page).toHaveURL(/\/plots(?:\?|$)/);
  await expect(
    page.getByRole("heading", { name: "Dzialki w sadzie Sad Poludniowy" }),
  ).toBeVisible();
  await expect(page.getByText(plotName)).toHaveCount(0);

  await switchActiveOrchard(
    page,
    "Sad Glowny (Wlasciciel)",
    SEEDED_USERS.owner.primaryOrchardName,
  );
  await expect(page).toHaveURL(/\/plots(?:\?|$)/);
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
  await expect(page.getByTestId("orchard-switcher-select")).toBeDisabled();
  await expect(page.getByTestId("orchard-switcher-hint")).toContainText(
    "Masz teraz dostep tylko do jednego sadu",
  );

  await page.goto("/settings/members");
  await expect(page.getByText("Brak dostepu do tego obszaru")).toBeVisible();
  await expect(
    page.getByText("Tylko wlasciciel sadu moze przegladac i zarzadzac czlonkami sadu."),
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

test("super admin can access profile settings and export account data", async ({
  page,
}) => {
  await loginWithPassword(
    page,
    SEEDED_USERS.superAdmin.email,
    SEEDED_USERS.superAdmin.password,
  );

  await expect(page).not.toHaveURL(/\/login$/, { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/orchards\/new$/);
  await page.goto("/settings/profile");
  await expect(page).toHaveURL(/\/settings\/profile$/);
  await expect(page.getByRole("heading", { name: "Profil", exact: true })).toBeVisible();
  await expect(page.getByTestId("profile-export-card")).toBeVisible();
  await expect(
    page.getByText("Utworz sad, ktory odblokuje Twoj kontekst pracy."),
  ).toHaveCount(0);

  const response = await page.request.get("/settings/profile/export");
  expect(response.status()).toBe(200);
  const payload = JSON.parse(await response.text()) as {
    orchards: Array<{ orchard: { id: string } }>;
    profile: { email: string };
  };

  expect(payload.profile.email).toBe(SEEDED_USERS.superAdmin.email);
  expect(payload.orchards.length).toBeGreaterThan(0);
});

test("owner sees planned upcoming activities on the dashboard", async ({
  page,
}) => {
  const plotName = uniqueName("PW upcoming dzialka");
  const futureActivityTitle = uniqueName("PW upcoming aktywnosc");

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await page.goto("/plots/new");
  await page.getByLabel("Nazwa dzialki").fill(plotName);
  await page.getByLabel("Kod").fill(`UP-${Date.now().toString().slice(-4)}`);
  await page.getByRole("button", { name: "Utworz dzialke" }).click();
  await expectFeedback(page, "Dzialka zostala utworzona.");

  await page.goto("/activities/new");
  await page.getByLabel("Dzialka").selectOption({ label: plotName });
  await page.getByLabel("Typ aktywnosci").selectOption("inspection");
  await page.getByLabel("Data").fill(isoDateFromToday(3));
  await page.getByLabel("Status").selectOption("planned");
  await page.getByLabel("Tytul wpisu").fill(futureActivityTitle);
  await page.getByRole("button", { name: "Zapisz aktywnosc" }).click();
  await expectFeedback(page, "Aktywnosc zostala utworzona.");

  await page.goto("/dashboard");
  const upcomingCard = page.getByTestId("dashboard-upcoming-card");
  await expect(
    upcomingCard.getByRole("heading", { name: "Nadchodzace aktywnosci" }),
  ).toBeVisible();
  await expect(upcomingCard.getByText(futureActivityTitle)).toBeVisible();
  await expect(upcomingCard.getByText(plotName)).toBeVisible();
});

test("owner sees record-not-found recovery on missing activity details", async ({
  page,
}) => {
  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);

  await page.goto("/activities/00000000-0000-0000-0000-000000000000");
  await expect(
    page.getByRole("heading", { name: "Nie znaleziono aktywnosci" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Ten wpis aktywnosci nie istnieje w aktywnym sadzie albo nie jest juz dostepny.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Wroc do listy" }).click();
  await expect(page).toHaveURL(/\/activities$/);
});

test("mobile shell and activity form stay readable without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await loginWithPassword(
    page,
    SEEDED_USERS.owner.email,
    SEEDED_USERS.owner.password,
  );
  await waitForDashboard(page, SEEDED_USERS.owner.primaryOrchardName);
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId("orchard-switcher-form")).toBeVisible();

  await page.goto("/activities/new");
  await expect(page.getByTestId("activity-form")).toBeVisible();
  await expect(page.getByRole("button", { name: "Zapisz aktywnosc" })).toBeVisible();
  await expectNoHorizontalOverflow(page);
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
