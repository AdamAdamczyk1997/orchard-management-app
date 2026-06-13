export const DEFAULT_BASELINE_PASSWORD = "Orchard123!";

export const BASELINE_USERS = [
  {
    email: "admin@orchardlog.local",
    displayName: "Anna Admin",
  },
  {
    email: "jan.owner@orchardlog.local",
    displayName: "Jan Sadownik",
  },
  {
    email: "maria.owner@orchardlog.local",
    displayName: "Maria Sadowniczka",
  },
  {
    email: "pawel.worker@orchardlog.local",
    displayName: "Pawel Pracownik",
  },
  {
    email: "ewa.worker@orchardlog.local",
    displayName: "Ewa Pracowniczka",
  },
  {
    email: "outsider@orchardlog.local",
    displayName: "Karolina Outsider",
  },
  {
    email: "empty.owner@orchardlog.local",
    displayName: "Emilia Empty Owner",
  },
];

export const BASELINE_USER_EMAILS = BASELINE_USERS.map((user) =>
  user.email.toLowerCase(),
);

export const BASELINE_ORCHARDS = [
  {
    code: "MAIN",
    name: "Sad Glowny",
    status: "active",
  },
  {
    code: "SOUTH",
    name: "Sad Poludniowy",
    status: "active",
  },
  {
    code: "EMPTY",
    name: "Sad Pusty",
    status: "active",
  },
];

export const BASELINE_EXPECTED_MEMBERSHIPS = [
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
];

export const BASELINE_EXPECTED_TOTAL_COUNTS = {
  orchards: 3,
  memberships: 8,
  plots: 5,
  varieties: 6,
  trees: 13,
  activities: 8,
  activityScopes: 10,
  activityMaterials: 2,
  harvestRecords: 7,
};

export const BASELINE_EXPECTED_COUNTS_BY_ORCHARD = {
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
};

export const BASELINE_EMPTY_ORCHARD_CODE = "EMPTY";

export const BASELINE_PVO_GAP_PLOT = {
  orchardCode: "MAIN",
  plotId: "20000000-0000-4000-8000-000000000005",
  name: "Kwatera Luki PVO",
  rowNumber: 1,
  occupiedPositions: [1, 3],
  emptyPositions: [2],
};

export const BASELINE_EXPECTED_ACTIVITY_STATUSES = [
  "planned",
  "done",
  "skipped",
  "cancelled",
];

export const BASELINE_EXPECTED_HARVEST_SEASONS = [2025, 2026];

export const BASELINE_EXPECTED_HARVEST_UNITS = ["kg", "t"];

export const BASELINE_QA_PERSONAS = [
  {
    email: "jan.owner@orchardlog.local",
    summary: "owner w Sad Glowny, worker w Sad Poludniowy",
    focus: "switcher, owner-only settings, activities i harvest reporting",
  },
  {
    email: "pawel.worker@orchardlog.local",
    summary: "worker w Sad Glowny, invited w Sad Poludniowy",
    focus: "operacyjny dostep workera i brak dostepu do owner-only settings",
  },
  {
    email: "outsider@orchardlog.local",
    summary: "brak membership",
    focus: "onboarding albo brak danych orchard po zalogowaniu",
  },
  {
    email: "empty.owner@orchardlog.local",
    summary: "owner w Sad Pusty bez danych domenowych",
    focus: "empty states bez mutowania glownego baseline",
  },
];
