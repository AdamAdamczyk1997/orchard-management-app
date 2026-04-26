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
];

export const BASELINE_EXPECTED_TOTAL_COUNTS = {
  orchards: 2,
  memberships: 7,
  plots: 4,
  varieties: 5,
  trees: 11,
  activities: 6,
  activityScopes: 8,
  activityMaterials: 2,
  harvestRecords: 5,
};

export const BASELINE_EXPECTED_COUNTS_BY_ORCHARD = {
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
};

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
];
