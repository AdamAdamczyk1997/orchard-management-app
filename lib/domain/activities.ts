import type {
  ActivityPruningSubtype,
  ActivityScopeLevel,
  ActivityStatus,
  ActivityType,
} from "@/types/contracts";

export const ACTIVITY_TYPES = [
  "watering",
  "fertilizing",
  "spraying",
  "pruning",
  "inspection",
  "planting",
  "harvest",
  "mowing",
  "weeding",
  "disease_observation",
  "pest_observation",
  "other",
] as const;

export const ACTIVITY_STATUSES = [
  "planned",
  "done",
  "skipped",
  "cancelled",
] as const;

export const ACTIVITY_SCOPE_LEVELS = [
  "plot",
  "section",
  "row",
  "location_range",
  "tree",
] as const;

export const ACTIVITY_PRUNING_SUBTYPES = [
  "winter_pruning",
  "summer_pruning",
] as const;

export const ACTIVITY_SCOPE_REQUIRED_TYPES = [
  "pruning",
  "mowing",
  "spraying",
] as const satisfies readonly ActivityType[];

const activityTypeLabels: Record<ActivityType, string> = {
  watering: "Podlewanie",
  fertilizing: "Nawozenie",
  spraying: "Oprysk",
  pruning: "Ciecie",
  inspection: "Inspekcja",
  planting: "Sadzenie",
  harvest: "Zbior",
  mowing: "Koszenie",
  weeding: "Odchwaszczanie",
  disease_observation: "Obserwacja chorob",
  pest_observation: "Obserwacja szkodnikow",
  other: "Inna aktywnosc",
};

const activityStatusLabels: Record<ActivityStatus, string> = {
  planned: "Planowana",
  done: "Wykonana",
  skipped: "Pominieta",
  cancelled: "Anulowana",
};

const activityScopeLevelLabels: Record<ActivityScopeLevel, string> = {
  plot: "Cala dzialka",
  section: "Sekcja",
  row: "Rzad",
  location_range: "Zakres lokalizacji",
  tree: "Jedno drzewo",
};

const activityPruningSubtypeLabels: Record<ActivityPruningSubtype, string> = {
  winter_pruning: "Ciecie zimowe",
  summer_pruning: "Ciecie letnie",
};
const activityScopeRequiredTypeSet = new Set<string>(ACTIVITY_SCOPE_REQUIRED_TYPES);

export function getActivityTypeLabel(activityType: ActivityType) {
  return activityTypeLabels[activityType];
}

export function getActivityStatusLabel(status: ActivityStatus) {
  return activityStatusLabels[status];
}

export function getActivityScopeLevelLabel(scopeLevel: ActivityScopeLevel) {
  return activityScopeLevelLabels[scopeLevel];
}

export function getActivityPruningSubtypeLabel(
  subtype: ActivityPruningSubtype,
) {
  return activityPruningSubtypeLabels[subtype];
}

export function activityTypeRequiresScope(activityType: ActivityType) {
  return activityScopeRequiredTypeSet.has(activityType);
}

export function deriveSeasonYearFromDate(activityDate: string) {
  const [yearPart] = activityDate.split("-");
  const parsedYear = Number(yearPart);

  return Number.isInteger(parsedYear) ? parsedYear : Number.NaN;
}

export function deriveSeasonPhaseFromDate(activityDate: string) {
  const [, monthPart] = activityDate.split("-");
  const month = Number(monthPart);

  if (month >= 3 && month <= 5) {
    return "wiosna";
  }

  if (month >= 6 && month <= 8) {
    return "lato";
  }

  if (month >= 9 && month <= 11) {
    return "jesien";
  }

  return "zima";
}
