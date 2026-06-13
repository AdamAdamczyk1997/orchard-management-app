import { describe, expect, it } from "vitest";
// @ts-expect-error -- tooling helper is implemented as plain ESM script and verified at runtime
import { evaluateBaselineQaReadiness, formatBaselineQaReport } from "../../scripts/shared/baseline-qa.mjs";

type BaselineQaCheck = {
  id: string;
  status: "pass" | "fail";
};

type BaselineQaReport = {
  ready: boolean;
  checks: BaselineQaCheck[];
  nextSteps: string[];
};

function createReadySnapshot() {
  return {
    authUsers: [
      "admin@orchardlog.local",
      "jan.owner@orchardlog.local",
      "maria.owner@orchardlog.local",
      "pawel.worker@orchardlog.local",
      "ewa.worker@orchardlog.local",
      "outsider@orchardlog.local",
      "empty.owner@orchardlog.local",
    ],
    profiles: [
      {
        email: "admin@orchardlog.local",
        system_role: "super_admin",
        orchard_onboarding_dismissed_at: "2026-01-10T08:00:00Z",
      },
      {
        email: "jan.owner@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: "2026-01-10T08:00:00Z",
      },
      {
        email: "maria.owner@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: "2026-01-10T08:00:00Z",
      },
      {
        email: "pawel.worker@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: "2026-01-10T08:00:00Z",
      },
      {
        email: "ewa.worker@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: "2026-01-10T08:00:00Z",
      },
      {
        email: "outsider@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: null,
      },
      {
        email: "empty.owner@orchardlog.local",
        system_role: "user",
        orchard_onboarding_dismissed_at: "2026-01-20T08:00:00Z",
      },
    ],
    orchards: [
      { code: "MAIN", name: "Sad Glowny", status: "active" },
      { code: "SOUTH", name: "Sad Poludniowy", status: "active" },
      { code: "EMPTY", name: "Sad Pusty", status: "active" },
    ],
    memberships: [
      {
        email: "jan.owner@orchardlog.local",
        orchardCode: "MAIN",
        role: "owner",
        status: "active",
      },
      {
        email: "pawel.worker@orchardlog.local",
        orchardCode: "MAIN",
        role: "worker",
        status: "active",
      },
      {
        email: "ewa.worker@orchardlog.local",
        orchardCode: "MAIN",
        role: "worker",
        status: "revoked",
      },
      {
        email: "maria.owner@orchardlog.local",
        orchardCode: "SOUTH",
        role: "owner",
        status: "active",
      },
      {
        email: "ewa.worker@orchardlog.local",
        orchardCode: "SOUTH",
        role: "worker",
        status: "active",
      },
      {
        email: "jan.owner@orchardlog.local",
        orchardCode: "SOUTH",
        role: "worker",
        status: "active",
      },
      {
        email: "pawel.worker@orchardlog.local",
        orchardCode: "SOUTH",
        role: "worker",
        status: "invited",
      },
      {
        email: "empty.owner@orchardlog.local",
        orchardCode: "EMPTY",
        role: "owner",
        status: "active",
      },
    ],
    plots: [
      {
        id: "20000000-0000-4000-8000-000000000005",
        orchardCode: "MAIN",
        name: "Kwatera Luki PVO",
        layoutType: "rows",
      },
    ],
    trees: [
      {
        id: "40000000-0000-4000-8000-000000000012",
        orchardCode: "MAIN",
        plotId: "20000000-0000-4000-8000-000000000005",
        rowNumber: 1,
        positionInRow: 1,
        isActive: true,
      },
      {
        id: "40000000-0000-4000-8000-000000000013",
        orchardCode: "MAIN",
        plotId: "20000000-0000-4000-8000-000000000005",
        rowNumber: 1,
        positionInRow: 3,
        isActive: true,
      },
    ],
    activities: [
      { orchardCode: "MAIN", status: "done" },
      { orchardCode: "SOUTH", status: "planned" },
      { orchardCode: "MAIN", status: "skipped" },
      { orchardCode: "MAIN", status: "cancelled" },
    ],
    harvestRecords: [
      {
        orchardCode: "MAIN",
        seasonYear: 2025,
        quantityValue: 680,
        quantityUnit: "kg",
        quantityKg: 680,
      },
      {
        orchardCode: "MAIN",
        seasonYear: 2026,
        quantityValue: 1.2,
        quantityUnit: "t",
        quantityKg: 1200,
      },
    ],
    totals: {
      orchards: 3,
      memberships: 8,
      plots: 5,
      varieties: 6,
      trees: 13,
      activities: 8,
      activityScopes: 10,
      activityMaterials: 2,
      harvestRecords: 7,
    },
    byOrchard: {
      MAIN: {
        plots: 3,
        varieties: 4,
        trees: 10,
        activities: 6,
        harvestRecords: 5,
      },
      SOUTH: {
        plots: 2,
        varieties: 2,
        trees: 3,
        activities: 2,
        harvestRecords: 2,
      },
      EMPTY: {
        plots: 0,
        varieties: 0,
        trees: 0,
        activities: 0,
        harvestRecords: 0,
      },
    },
    harvestNormalization: {
      tonneRecords: 1,
      normalizedTonneRecords: 1,
    },
  };
}

describe("baseline QA readiness", () => {
  it("marks the reference dataset as ready for seeded smoke testing", () => {
    const report = evaluateBaselineQaReadiness(createReadySnapshot()) as BaselineQaReport;

    expect(report.ready).toBe(true);
    expect(report.checks.every((check: BaselineQaCheck) => check.status === "pass")).toBe(
      true,
    );
    expect(report.nextSteps).toEqual(
      expect.arrayContaining([
        "Zaloguj sie jako jan.owner@orchardlog.local i wykonaj owner smoke pass",
        "Zaloguj sie jako pawel.worker@orchardlog.local i wykonaj worker smoke pass",
        "Zaloguj sie jako outsider@orchardlog.local i sprawdz onboarding / brak danych orchard",
      ]),
    );

    const formatted = formatBaselineQaReport(report);

    expect(formatted).toContain("Baseline QA status: READY");
    expect(formatted).toContain("jan.owner@orchardlog.local");
    expect(formatted).not.toContain("Orchard123!");
  });

  it("suggests bootstrapping auth users before rerunning the SQL seed", () => {
    const report = evaluateBaselineQaReadiness({
      ...createReadySnapshot(),
      authUsers: ["jan.owner@orchardlog.local"],
      profiles: [],
      orchards: [],
      memberships: [],
      totals: {
        orchards: 0,
        memberships: 0,
        plots: 0,
        varieties: 0,
        trees: 0,
        activities: 0,
        activityScopes: 0,
        activityMaterials: 0,
        harvestRecords: 0,
      },
      byOrchard: {},
      plots: [],
      trees: [],
      activities: [],
      harvestRecords: [],
      harvestNormalization: {
        tonneRecords: 0,
        normalizedTonneRecords: 0,
      },
    }) as BaselineQaReport;

    expect(report.ready).toBe(false);
    expect(report.nextSteps).toEqual([
      "Uruchom pnpm seed:baseline-users",
      "Po bootstrapie kont uruchom pnpm seed:baseline-sql",
      "Uruchom ponownie pnpm qa:baseline-status",
    ]);
  });

  it("flags partial seed drift and recommends rerunning only the SQL seed", () => {
    const readySnapshot = createReadySnapshot();
    const report = evaluateBaselineQaReadiness({
      ...readySnapshot,
      memberships: readySnapshot.memberships.filter(
        (membership) =>
          !(
            membership.email === "pawel.worker@orchardlog.local" &&
            membership.orchardCode === "SOUTH" &&
            membership.status === "invited"
          ),
      ),
      harvestNormalization: {
        tonneRecords: 1,
        normalizedTonneRecords: 0,
      },
    }) as BaselineQaReport;

    expect(report.ready).toBe(false);
    expect(report.nextSteps).toEqual([
      "Uruchom ponownie pnpm seed:baseline-sql",
      "Uruchom ponownie pnpm qa:baseline-status",
    ]);
    expect(
      report.checks.find((check: BaselineQaCheck) => check.id === "memberships")?.status,
    ).toBe("fail");
    expect(
      report.checks.find(
        (check: BaselineQaCheck) => check.id === "harvest-normalization",
      )?.status,
    ).toBe("fail");
  });

  it("recommends a full reset when the local database contains extra non-baseline data", () => {
    const readySnapshot = createReadySnapshot();
    const report = evaluateBaselineQaReadiness({
      ...readySnapshot,
      totals: {
        ...readySnapshot.totals,
        orchards: 14,
        memberships: 21,
        plots: 21,
        activities: 57,
        activityScopes: 55,
        activityMaterials: 16,
      },
      byOrchard: {
        MAIN: {
          plots: 5,
          varieties: 3,
          trees: 8,
          activities: 20,
          harvestRecords: 3,
        },
        SOUTH: {
          plots: 6,
          varieties: 2,
          trees: 3,
          activities: 11,
          harvestRecords: 2,
        },
      },
      harvestNormalization: {
        tonneRecords: 0,
        normalizedTonneRecords: 0,
      },
    }) as BaselineQaReport;

    expect(report.ready).toBe(false);
    expect(report.nextSteps).toEqual([
      "Uruchom pnpm seed:baseline-reset",
      "Uruchom ponownie pnpm qa:baseline-status",
    ]);
  });
});
