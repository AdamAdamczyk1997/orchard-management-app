const BASELINE_PASSWORD = process.env.BASELINE_SEED_USER_PASSWORD ?? "Orchard123!";

export const BASELINE_PERSONAS = {
  owner_primary: {
    email: "jan.owner@orchardlog.local",
    password: BASELINE_PASSWORD,
    primaryOrchardName: "Sad Glowny",
    secondaryOrchardLabel: "Sad Poludniowy (Pracownik)",
  },
  owner_secondary: {
    email: "maria.owner@orchardlog.local",
    password: BASELINE_PASSWORD,
    orchardName: "Sad Poludniowy",
  },
  worker_primary: {
    email: "pawel.worker@orchardlog.local",
    password: BASELINE_PASSWORD,
    orchardName: "Sad Glowny",
  },
  worker_revoked: {
    email: "ewa.worker@orchardlog.local",
    password: BASELINE_PASSWORD,
    activeOrchardName: "Sad Poludniowy",
    revokedOrchardName: "Sad Glowny",
  },
  outsider: {
    email: "outsider@orchardlog.local",
    password: BASELINE_PASSWORD,
  },
  super_admin: {
    email: "admin@orchardlog.local",
    password: BASELINE_PASSWORD,
  },
  owner_empty: {
    email: "empty.owner@orchardlog.local",
    password: BASELINE_PASSWORD,
    orchardName: "Sad Pusty",
  },
} as const;

export const BASELINE_ORCHARDS = {
  MAIN: {
    id: "10000000-0000-4000-8000-000000000001",
    code: "MAIN",
    name: "Sad Glowny",
  },
  SOUTH: {
    id: "10000000-0000-4000-8000-000000000002",
    code: "SOUTH",
    name: "Sad Poludniowy",
  },
  EMPTY: {
    id: "10000000-0000-4000-8000-000000000003",
    code: "EMPTY",
    name: "Sad Pusty",
  },
} as const;

export const BASELINE_PLOTS = {
  plot_main_north: {
    id: "20000000-0000-4000-8000-000000000001",
    orchard: BASELINE_ORCHARDS.MAIN,
    name: "Kwatera Polnocna",
    code: "MAIN-N",
    layoutType: "rows",
  },
  plot_main_south: {
    id: "20000000-0000-4000-8000-000000000002",
    orchard: BASELINE_ORCHARDS.MAIN,
    name: "Kwatera Poludniowa",
    code: "MAIN-S",
    layoutType: "mixed",
  },
  plot_main_gap_rows: {
    id: "20000000-0000-4000-8000-000000000005",
    orchard: BASELINE_ORCHARDS.MAIN,
    name: "Kwatera Luki PVO",
    layoutType: "rows",
    rowNumber: 1,
    occupiedPositions: [1, 3],
    emptyPositions: [2],
  },
} as const;

export const BASELINE_VARIETIES = {
  ligol: {
    id: "30000000-0000-4000-8000-000000000001",
    orchard: BASELINE_ORCHARDS.MAIN,
    species: "Apple",
    name: "Ligol",
    optionLabel: "Apple - Ligol",
  },
  szampion: {
    id: "30000000-0000-4000-8000-000000000002",
    orchard: BASELINE_ORCHARDS.MAIN,
    species: "Apple",
    name: "Szampion",
    optionLabel: "Apple - Szampion",
  },
  conference: {
    id: "30000000-0000-4000-8000-000000000003",
    orchard: BASELINE_ORCHARDS.MAIN,
    species: "Pear",
    name: "Conference",
    optionLabel: "Pear - Conference",
  },
  gala_report: {
    id: "30000000-0000-4000-8000-000000000006",
    orchard: BASELINE_ORCHARDS.MAIN,
    species: "Apple",
    name: "Gala Report",
    optionLabel: "Apple - Gala Report",
  },
} as const;

export const SEEDED_USERS = {
  superAdmin: BASELINE_PERSONAS.super_admin,
  owner: BASELINE_PERSONAS.owner_primary,
  worker: BASELINE_PERSONAS.worker_primary,
  outsider: BASELINE_PERSONAS.outsider,
  ownerEmpty: BASELINE_PERSONAS.owner_empty,
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
