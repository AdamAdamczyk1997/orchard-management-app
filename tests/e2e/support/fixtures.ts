export const SEEDED_USERS = {
  superAdmin: {
    email: "admin@orchardlog.local",
    password: process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!",
  },
  owner: {
    email: "jan.owner@orchardlog.local",
    password: process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!",
    primaryOrchardName: "Sad Glowny",
    secondaryOrchardLabel: "Sad Poludniowy (Pracownik)",
  },
  worker: {
    email: "pawel.worker@orchardlog.local",
    password: process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!",
    orchardName: "Sad Glowny",
  },
  outsider: {
    email: "outsider@orchardlog.local",
    password: process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!",
  },
} as const;

export function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniqueName(prefix: string) {
  return `${prefix}-${uniqueSuffix()}`;
}

export function uniqueEmail(prefix: string) {
  return `${prefix}-${uniqueSuffix()}@orchardlog.local`;
}
