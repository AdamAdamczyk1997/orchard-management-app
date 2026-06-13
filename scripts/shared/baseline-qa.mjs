import {
  BASELINE_EMPTY_ORCHARD_CODE,
  BASELINE_EXPECTED_ACTIVITY_STATUSES,
  BASELINE_EXPECTED_COUNTS_BY_ORCHARD,
  BASELINE_EXPECTED_HARVEST_SEASONS,
  BASELINE_EXPECTED_HARVEST_UNITS,
  BASELINE_EXPECTED_MEMBERSHIPS,
  BASELINE_EXPECTED_TOTAL_COUNTS,
  BASELINE_ORCHARDS,
  BASELINE_PVO_GAP_PLOT,
  BASELINE_QA_PERSONAS,
  BASELINE_USER_EMAILS,
} from "./baseline-seed.mjs";
import {
  BASELINE_QA_STATUS_COMMAND,
  BASELINE_RESET_COMMAND,
  BASELINE_SQL_SEED_COMMAND,
  BASELINE_USERS_COMMAND,
} from "./baseline-workflow.mjs";

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

function formatCheckStatus(status) {
  return status === "pass" ? "[pass]" : "[fail]";
}

function orchardDisplayName(orchardCode) {
  const orchard = BASELINE_ORCHARDS.find((item) => item.code === orchardCode);

  return orchard ? `${orchard.name} (${orchardCode})` : orchardCode;
}

function buildCountSummary(expectedCounts, actualCounts) {
  return Object.keys(expectedCounts)
    .map((key) => `${key}: ${actualCounts[key] ?? 0}/${expectedCounts[key]}`)
    .join(", ");
}

function missingExpectedValues(actualValues, expectedValues) {
  const actualSet = new Set(actualValues.map((value) => String(value)));

  return expectedValues.filter((expectedValue) => !actualSet.has(String(expectedValue)));
}

function hasExactMembership(memberships, expectedMembership) {
  return memberships.some(
    (membership) =>
      normalizeEmail(membership.email) === normalizeEmail(expectedMembership.email) &&
      membership.orchardCode === expectedMembership.orchardCode &&
      membership.role === expectedMembership.role &&
      membership.status === expectedMembership.status,
  );
}

export function evaluateBaselineQaReadiness(snapshot) {
  const authEmails = new Set((snapshot.authUsers ?? []).map(normalizeEmail));
  const profiles = snapshot.profiles ?? [];
  const orchards = snapshot.orchards ?? [];
  const memberships = snapshot.memberships ?? [];
  const plots = snapshot.plots ?? [];
  const trees = snapshot.trees ?? [];
  const activities = snapshot.activities ?? [];
  const harvestRecords = snapshot.harvestRecords ?? [];
  const totals = snapshot.totals ?? {};
  const byOrchard = snapshot.byOrchard ?? {};
  const harvestNormalization = snapshot.harvestNormalization ?? {
    tonneRecords: 0,
    normalizedTonneRecords: 0,
  };

  const profileByEmail = new Map(
    profiles.map((profile) => [normalizeEmail(profile.email), profile]),
  );
  const orchardByCode = new Map(orchards.map((orchard) => [orchard.code, orchard]));
  const checks = [];

  const missingAuthUsers = BASELINE_USER_EMAILS.filter((email) => !authEmails.has(email));
  checks.push({
    id: "auth-users",
    status: missingAuthUsers.length === 0 ? "pass" : "fail",
    summary:
      missingAuthUsers.length === 0
        ? "Wszystkie wymagane konta auth.users sa gotowe."
        : "Brakuje wymaganych kont auth.users do baseline seedu.",
    details:
      missingAuthUsers.length === 0
        ? [`Obecne: ${BASELINE_USER_EMAILS.length}/${BASELINE_USER_EMAILS.length}`]
        : missingAuthUsers.map((email) => `Brak auth user: ${email}`),
  });

  const missingProfiles = BASELINE_USER_EMAILS.filter((email) => !profileByEmail.has(email));
  const adminProfile = profileByEmail.get("admin@orchardlog.local");
  const adminRoleReady = adminProfile?.system_role === "super_admin";
  const outsiderProfile = profileByEmail.get("outsider@orchardlog.local");
  const outsiderHasOnboardingDismissed =
    outsiderProfile?.orchard_onboarding_dismissed_at != null;
  const outsiderMemberships = memberships.filter(
    (membership) => normalizeEmail(membership.email) === "outsider@orchardlog.local",
  );
  const profilesReady =
    missingProfiles.length === 0 &&
    adminRoleReady &&
    outsiderMemberships.length === 0 &&
    !outsiderHasOnboardingDismissed;

  checks.push({
    id: "profiles",
    status: profilesReady ? "pass" : "fail",
    summary:
      profilesReady
        ? "Profile seedowe i persony QA sa spojne."
        : "Profile seedowe albo persony QA nie sa jeszcze spojne.",
    details: [
      ...missingProfiles.map((email) => `Brak profilu: ${email}`),
      ...(adminRoleReady ? [] : ["admin@orchardlog.local nie ma system_role = super_admin"]),
      ...(outsiderMemberships.length === 0
        ? []
        : ["outsider@orchardlog.local nie powinien miec membership"]),
      ...(!outsiderHasOnboardingDismissed
        ? []
        : ["outsider@orchardlog.local nie powinien miec dismissowanego onboardingu"]),
    ],
  });

  const missingOrchards = BASELINE_ORCHARDS.filter((expectedOrchard) => {
    const actualOrchard = orchardByCode.get(expectedOrchard.code);

    if (!actualOrchard) {
      return true;
    }

    return (
      actualOrchard.name !== expectedOrchard.name ||
      actualOrchard.status !== expectedOrchard.status
    );
  });

  checks.push({
    id: "orchards",
    status: missingOrchards.length === 0 ? "pass" : "fail",
    summary:
      missingOrchards.length === 0
        ? "Referencyjne sady sa gotowe do seeded QA."
        : "Brakuje referencyjnych sadow albo ich status nie zgadza sie z baseline.",
    details: missingOrchards.map(
      (orchard) => `Brak albo niespojny orchard: ${orchard.name} (${orchard.code})`,
    ),
  });

  const missingMemberships = BASELINE_EXPECTED_MEMBERSHIPS.filter(
    (expectedMembership) => !hasExactMembership(memberships, expectedMembership),
  );

  checks.push({
    id: "memberships",
    status: missingMemberships.length === 0 ? "pass" : "fail",
    summary:
      missingMemberships.length === 0
        ? "Macierz owner/worker/invited/revoked jest gotowa."
        : "Macierz membership nie zgadza sie z referencyjnym baseline.",
    details: missingMemberships.map(
      (membership) =>
        `Brak membership: ${membership.email} -> ${orchardDisplayName(membership.orchardCode)} (${membership.role}, ${membership.status})`,
    ),
  });

  const totalCountMismatch =
    Object.entries(BASELINE_EXPECTED_TOTAL_COUNTS).some(
      ([key, expectedValue]) => (totals[key] ?? 0) !== expectedValue,
    ) || (totals.orchards ?? orchards.length) !== BASELINE_EXPECTED_TOTAL_COUNTS.orchards;
  const actualTotalCounts = {
    ...totals,
    orchards: totals.orchards ?? orchards.length,
  };

  checks.push({
    id: "total-counts",
    status: totalCountMismatch ? "fail" : "pass",
    summary:
      totalCountMismatch
        ? "Liczba rekordow baseline nie zgadza sie z referencyjnym seedem."
        : "Liczby rekordow baseline zgadzaja sie z seedem.",
    details: [
      buildCountSummary(
        BASELINE_EXPECTED_TOTAL_COUNTS,
        actualTotalCounts,
      ),
    ],
  });

  const orchardCountMismatch = Object.entries(BASELINE_EXPECTED_COUNTS_BY_ORCHARD).flatMap(
    ([orchardCode, expectedCounts]) => {
      const actualCounts = byOrchard[orchardCode] ?? {};

      if (
        Object.entries(expectedCounts).every(
          ([key, expectedValue]) => (actualCounts[key] ?? 0) === expectedValue,
        )
      ) {
        return [];
      }

      return [
        `${orchardDisplayName(orchardCode)} -> ${buildCountSummary(expectedCounts, actualCounts)}`,
      ];
    },
  );

  checks.push({
    id: "orchard-counts",
    status: orchardCountMismatch.length === 0 ? "pass" : "fail",
    summary:
      orchardCountMismatch.length === 0
        ? "Oba orchardy maja oczekiwane rozklady danych."
        : "Rozklad danych per orchard nie zgadza sie z baseline.",
    details: orchardCountMismatch,
  });

  const emptyCounts = byOrchard[BASELINE_EMPTY_ORCHARD_CODE] ?? {};
  const emptyOrchardReady =
    orchardByCode.has(BASELINE_EMPTY_ORCHARD_CODE) &&
    ["plots", "varieties", "trees", "activities", "harvestRecords"].every(
      (key) => (emptyCounts[key] ?? 0) === 0,
    );

  checks.push({
    id: "empty-orchard",
    status: emptyOrchardReady ? "pass" : "fail",
    summary:
      emptyOrchardReady
        ? "Sad Pusty jest gotowy i nie ma danych domenowych."
        : "Sad Pusty nie istnieje albo nie jest prawdziwie pusty.",
    details: [
      `orchard exists: ${orchardByCode.has(BASELINE_EMPTY_ORCHARD_CODE)}`,
      buildCountSummary(
        {
          plots: 0,
          varieties: 0,
          trees: 0,
          activities: 0,
          harvestRecords: 0,
        },
        emptyCounts,
      ),
    ],
  });

  const gapPlot = plots.find(
    (plot) =>
      plot.id === BASELINE_PVO_GAP_PLOT.plotId ||
      (plot.orchardCode === BASELINE_PVO_GAP_PLOT.orchardCode &&
        plot.name === BASELINE_PVO_GAP_PLOT.name),
  );
  const gapPlotId = gapPlot?.id ?? BASELINE_PVO_GAP_PLOT.plotId;
  const activeGapTrees = trees.filter(
    (tree) =>
      tree.plotId === gapPlotId &&
      tree.rowNumber === BASELINE_PVO_GAP_PLOT.rowNumber &&
      tree.isActive !== false,
  );
  const activeGapPositions = activeGapTrees.map((tree) => tree.positionInRow);
  const missingOccupiedGapPositions = BASELINE_PVO_GAP_PLOT.occupiedPositions.filter(
    (position) => !activeGapPositions.includes(position),
  );
  const unexpectedlyFilledGapPositions = BASELINE_PVO_GAP_PLOT.emptyPositions.filter(
    (position) => activeGapPositions.includes(position),
  );
  const gapPlotReady =
    gapPlot != null &&
    missingOccupiedGapPositions.length === 0 &&
    unexpectedlyFilledGapPositions.length === 0;

  checks.push({
    id: "pvo-gap-plot",
    status: gapPlotReady ? "pass" : "fail",
    summary:
      gapPlotReady
        ? "PVO gap fixture ma drzewa na pozycjach 1 i 3 oraz pusta pozycje 2."
        : "PVO gap fixture nie zgadza sie z referencyjnym ukladem.",
    details: [
      `plot: ${gapPlot ? `${gapPlot.name} (${gapPlot.id})` : "missing"}`,
      `active row ${BASELINE_PVO_GAP_PLOT.rowNumber} positions: ${activeGapPositions.join(", ") || "none"}`,
      ...missingOccupiedGapPositions.map(
        (position) => `Brak aktywnego drzewa na pozycji ${position}`,
      ),
      ...unexpectedlyFilledGapPositions.map(
        (position) => `Pozycja ${position} powinna pozostac pusta`,
      ),
    ],
  });

  const activityStatuses = activities.map((activity) => activity.status).filter(Boolean);
  const missingActivityStatuses = missingExpectedValues(
    activityStatuses,
    BASELINE_EXPECTED_ACTIVITY_STATUSES,
  );

  checks.push({
    id: "activity-statuses",
    status: missingActivityStatuses.length === 0 ? "pass" : "fail",
    summary:
      missingActivityStatuses.length === 0
        ? "Baseline zawiera wymagane statusy aktywnosci."
        : "Baseline nie zawiera wszystkich wymaganych statusow aktywnosci.",
    details:
      missingActivityStatuses.length === 0
        ? [`Obecne statusy: ${[...new Set(activityStatuses)].sort().join(", ")}`]
        : missingActivityStatuses.map((status) => `Brak statusu aktywnosci: ${status}`),
  });

  const harvestSeasons = harvestRecords
    .map((record) => record.seasonYear)
    .filter((seasonYear) => seasonYear != null);
  const harvestUnits = harvestRecords
    .map((record) => record.quantityUnit)
    .filter(Boolean);
  const missingHarvestSeasons = missingExpectedValues(
    harvestSeasons,
    BASELINE_EXPECTED_HARVEST_SEASONS,
  );
  const missingHarvestUnits = missingExpectedValues(
    harvestUnits,
    BASELINE_EXPECTED_HARVEST_UNITS,
  );

  const likelyDirtyLocalDataset =
    Object.entries(BASELINE_EXPECTED_TOTAL_COUNTS).some(
      ([key, expectedValue]) => (actualTotalCounts[key] ?? 0) > expectedValue,
    ) ||
    Object.entries(BASELINE_EXPECTED_COUNTS_BY_ORCHARD).some(
      ([orchardCode, expectedCounts]) =>
        Object.entries(expectedCounts).some(
          ([key, expectedValue]) =>
            ((byOrchard[orchardCode] ?? {})[key] ?? 0) > expectedValue,
        ),
    );

  const harvestNormalizationReady =
    harvestNormalization.tonneRecords >= 1 &&
    harvestNormalization.normalizedTonneRecords === harvestNormalization.tonneRecords;

  checks.push({
    id: "harvest-normalization",
    status: harvestNormalizationReady ? "pass" : "fail",
    summary:
      harvestNormalizationReady
        ? "Referencyjne rekordy harvest w tonach sa poprawnie znormalizowane do quantity_kg."
        : "Rekordy harvest w tonach nie sa gotowe do seeded QA albo quantity_kg nie zgadza sie z triggerem.",
    details: [
      `tonne records: ${harvestNormalization.tonneRecords}`,
      `normalized tonne records: ${harvestNormalization.normalizedTonneRecords}`,
    ],
  });

  const harvestCoverageReady =
    missingHarvestSeasons.length === 0 && missingHarvestUnits.length === 0;

  checks.push({
    id: "harvest-coverage",
    status: harvestCoverageReady ? "pass" : "fail",
    summary:
      harvestCoverageReady
        ? "Baseline harvest pokrywa wymagane sezony i jednostki."
        : "Baseline harvest nie pokrywa wymaganych sezonow albo jednostek.",
    details: [
      ...(missingHarvestSeasons.length === 0
        ? [`Obecne sezony: ${[...new Set(harvestSeasons)].sort().join(", ")}`]
        : missingHarvestSeasons.map((season) => `Brak sezonu harvest: ${season}`)),
      ...(missingHarvestUnits.length === 0
        ? [`Obecne jednostki: ${[...new Set(harvestUnits)].sort().join(", ")}`]
        : missingHarvestUnits.map((unit) => `Brak jednostki harvest: ${unit}`)),
    ],
  });

  const ready = checks.every((check) => check.status === "pass");
  const nextSteps = [];

  if (missingAuthUsers.length > 0) {
    nextSteps.push(`Uruchom ${BASELINE_USERS_COMMAND}`);
    nextSteps.push(`Po bootstrapie kont uruchom ${BASELINE_SQL_SEED_COMMAND}`);
  } else if (!ready) {
    if (likelyDirtyLocalDataset) {
      nextSteps.push(`Uruchom ${BASELINE_RESET_COMMAND}`);
    } else {
      nextSteps.push(`Uruchom ponownie ${BASELINE_SQL_SEED_COMMAND}`);
    }
  }

  if (!ready) {
    nextSteps.push(`Uruchom ponownie ${BASELINE_QA_STATUS_COMMAND}`);
  }

  if (ready) {
    nextSteps.push("Zaloguj sie jako jan.owner@orchardlog.local i wykonaj owner smoke pass");
    nextSteps.push("Zaloguj sie jako pawel.worker@orchardlog.local i wykonaj worker smoke pass");
    nextSteps.push("Zaloguj sie jako outsider@orchardlog.local i sprawdz onboarding / brak danych orchard");
  }

  return {
    ready,
    checks,
    nextSteps,
    personas: BASELINE_QA_PERSONAS,
    passwordHint:
      "Haslo baseline jest pobierane z BASELINE_SEED_USER_PASSWORD albo lokalnego baseline defaultu; wartosc nie jest wypisywana w raporcie.",
  };
}

export function formatBaselineQaReport(report) {
  const lines = [];

  lines.push(`Baseline QA status: ${report.ready ? "READY" : "NOT READY"}`);
  lines.push("");

  for (const check of report.checks) {
    lines.push(`${formatCheckStatus(check.status)} ${check.summary}`);

    for (const detail of check.details ?? []) {
      lines.push(`  - ${detail}`);
    }
  }

  lines.push("");
  lines.push("Password hint:");
  lines.push(`- ${report.passwordHint}`);
  lines.push("");

  lines.push("Suggested smoke accounts:");
  for (const persona of report.personas) {
    lines.push(`- ${persona.email}: ${persona.summary}; focus: ${persona.focus}`);
  }

  if (report.nextSteps.length > 0) {
    lines.push("");
    lines.push("Next steps:");
    for (const step of report.nextSteps) {
      lines.push(`- ${step}`);
    }
  }

  return lines.join("\n");
}
