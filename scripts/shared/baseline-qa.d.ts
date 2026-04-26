export type BaselineQaCheckStatus = "pass" | "fail";

export type BaselineQaCheck = {
  id: string;
  status: BaselineQaCheckStatus;
  summary: string;
  details?: string[];
};

export type BaselineQaPersona = {
  email: string;
  summary: string;
  focus: string;
};

export type BaselineQaSnapshot = {
  authUsers?: string[];
  profiles?: Array<{
    email: string;
    system_role: string | null;
    orchard_onboarding_dismissed_at: string | null;
  }>;
  orchards?: Array<{
    code: string;
    name: string;
    status: string;
  }>;
  memberships?: Array<{
    email: string;
    orchardCode: string;
    role: string;
    status: string;
  }>;
  totals?: {
    orchards?: number;
    memberships?: number;
    plots?: number;
    varieties?: number;
    trees?: number;
    activities?: number;
    activityScopes?: number;
    activityMaterials?: number;
    harvestRecords?: number;
  };
  byOrchard?: Record<
    string,
    {
      plots?: number;
      varieties?: number;
      trees?: number;
      activities?: number;
      harvestRecords?: number;
    }
  >;
  harvestNormalization?: {
    tonneRecords?: number;
    normalizedTonneRecords?: number;
  };
};

export type BaselineQaReport = {
  ready: boolean;
  checks: BaselineQaCheck[];
  nextSteps: string[];
  personas: BaselineQaPersona[];
  passwordHint: string;
};

export function evaluateBaselineQaReadiness(
  snapshot: BaselineQaSnapshot,
): BaselineQaReport;

export function formatBaselineQaReport(report: BaselineQaReport): string;
