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
    ],
    orchards: [
      { code: "MAIN", name: "Sad Glowny", status: "active" },
      { code: "SOUTH", name: "Sad Poludniowy", status: "active" },
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
    ],
    totals: {
      orchards: 2,
      memberships: 7,
      plots: 4,
      varieties: 5,
      trees: 11,
      activities: 6,
      activityScopes: 8,
      activityMaterials: 2,
      harvestRecords: 5,
    },
    byOrchard: {
      MAIN: {
        plots: 2,
        varieties: 3,
        trees: 8,
        activities: 4,
        harvestRecords: 3,
      },
      SOUTH: {
        plots: 2,
        varieties: 2,
        trees: 3,
        activities: 2,
        harvestRecords: 2,
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
      harvestNormalization: {
        tonneRecords: 0,
        normalizedTonneRecords: 0,
      },
    }) as BaselineQaReport;

    expect(report.ready).toBe(false);
    expect(report.nextSteps).toEqual([
      "Uruchom pnpm seed:baseline-users",
      "Po bootstrapie kont uruchom supabase/seeds/001_baseline_reference_seed.sql",
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
      "Uruchom ponownie supabase/seeds/001_baseline_reference_seed.sql",
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
      "Uruchom supabase db reset",
      "Uruchom pnpm seed:baseline-users",
      "Uruchom supabase/seeds/001_baseline_reference_seed.sql",
      "Uruchom ponownie pnpm qa:baseline-status",
    ]);
  });
});
