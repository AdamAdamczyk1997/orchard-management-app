import { z } from "zod";
import {
  ACTIVITY_PRUNING_SUBTYPES,
  ACTIVITY_SCOPE_REQUIRED_TYPES,
  ACTIVITY_SCOPE_LEVELS,
  ACTIVITY_STATUSES,
  ACTIVITY_TYPES,
  activityTypeRequiresScope,
  deriveSeasonPhaseFromDate,
  deriveSeasonYearFromDate,
} from "@/lib/domain/activities";
import {
  optionalDateInput,
  optionalNumberInput,
  optionalTrimmedString,
  optionalUuidString,
  trimmedString,
} from "@/lib/validation/shared";

function parseJsonArrayInput(value: unknown) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") {
      return [];
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  if (value == null) {
    return [];
  }

  return value;
}

const activityTypeSchema = z.enum(ACTIVITY_TYPES);
const activityStatusSchema = z.enum(ACTIVITY_STATUSES);
const activityScopeLevelSchema = z.enum(ACTIVITY_SCOPE_LEVELS);
const activityPruningSubtypeSchema = z.enum(ACTIVITY_PRUNING_SUBTYPES);
const summaryActivityTypeSchema = z.enum(ACTIVITY_SCOPE_REQUIRED_TYPES);

export const activityScopeSchema = z
  .object({
    scope_order: optionalNumberInput("Kolejnosc zakresu musi byc liczba.").refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Kolejnosc zakresu musi byc dodatnia liczba calkowita.",
    ),
    scope_level: activityScopeLevelSchema,
    section_name: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Sekcja moze miec maksymalnie 120 znakow.",
    ),
    row_number: optionalNumberInput("Numer rzedu musi byc liczba.").refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Numer rzedu musi byc dodatnia liczba calkowita.",
    ),
    from_position: optionalNumberInput("Pozycja poczatkowa musi byc liczba.").refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Pozycja poczatkowa musi byc dodatnia liczba calkowita.",
    ),
    to_position: optionalNumberInput("Pozycja koncowa musi byc liczba.").refine(
      (value) => value === undefined || (Number.isInteger(value) && value > 0),
      "Pozycja koncowa musi byc dodatnia liczba calkowita.",
    ),
    tree_id: optionalUuidString("Wybierz poprawne drzewo."),
    notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 500,
      "Notatki do zakresu moga miec maksymalnie 500 znakow.",
    ),
  })
  .superRefine((value, context) => {
    if (
      typeof value.from_position === "number" &&
      typeof value.to_position === "number" &&
      value.to_position < value.from_position
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Pozycja koncowa nie moze byc mniejsza niz poczatkowa.",
        path: ["to_position"],
      });
    }

    switch (value.scope_level) {
      case "plot":
        if (
          value.section_name ||
          value.row_number !== undefined ||
          value.from_position !== undefined ||
          value.to_position !== undefined ||
          value.tree_id
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zakres `cala dzialka` nie powinien zawierac dodatkowych pol lokalizacji.",
            path: ["scope_level"],
          });
        }
        break;
      case "section":
        if (!value.section_name) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj nazwe sekcji dla tego zakresu.",
            path: ["section_name"],
          });
        }
        break;
      case "row":
        if (value.row_number === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj numer rzedu dla tego zakresu.",
            path: ["row_number"],
          });
        }
        break;
      case "location_range":
        if (value.row_number === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj numer rzedu dla zakresu lokalizacji.",
            path: ["row_number"],
          });
        }

        if (value.from_position === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj pozycje poczatkowa.",
            path: ["from_position"],
          });
        }

        if (value.to_position === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj pozycje koncowa.",
            path: ["to_position"],
          });
        }
        break;
      case "tree":
        if (!value.tree_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wybierz drzewo dla tego zakresu.",
            path: ["tree_id"],
          });
        }
        break;
      default:
        break;
    }
  });

export const activityMaterialSchema = z.object({
  name: trimmedString()
    .min(1, "Podaj nazwe materialu.")
    .max(160, "Nazwa materialu moze miec maksymalnie 160 znakow."),
  category: optionalTrimmedString().refine(
    (value) => !value || value.length <= 80,
    "Kategoria moze miec maksymalnie 80 znakow.",
  ),
  quantity: optionalNumberInput("Ilosc musi byc liczba.").refine(
    (value) => value === undefined || value >= 0,
    "Ilosc nie moze byc ujemna.",
  ),
  unit: optionalTrimmedString().refine(
    (value) => !value || value.length <= 32,
    "Jednostka moze miec maksymalnie 32 znaki.",
  ),
  notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Notatki do materialu moga miec maksymalnie 500 znakow.",
  ),
});

export const activityFormSchema = z
  .object({
    plot_id: trimmedString().uuid("Wybierz poprawna dzialke."),
    tree_id: optionalUuidString("Wybierz poprawne drzewo."),
    activity_type: activityTypeSchema,
    activity_subtype: z.preprocess((value) => {
      if (typeof value === "string") {
        const trimmed = value.trim();

        return trimmed === "" ? undefined : trimmed;
      }

      return value;
    }, activityPruningSubtypeSchema.optional()),
    activity_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj poprawna date."),
    title: trimmedString()
      .min(3, "Tytul musi miec co najmniej 3 znaki.")
      .max(160, "Tytul moze miec maksymalnie 160 znakow."),
    description: optionalTrimmedString().refine(
      (value) => !value || value.length <= 2000,
      "Opis moze miec maksymalnie 2000 znakow.",
    ),
    status: activityStatusSchema,
    work_duration_minutes: optionalNumberInput(
      "Czas pracy musi byc liczba.",
    ).refine(
      (value) => value === undefined || (Number.isInteger(value) && value >= 0),
      "Czas pracy musi byc nieujemna liczba calkowita.",
    ),
    cost_amount: optionalNumberInput("Koszt musi byc liczba.").refine(
      (value) => value === undefined || value >= 0,
      "Koszt nie moze byc ujemny.",
    ),
    weather_notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 1000,
      "Uwagi pogodowe moga miec maksymalnie 1000 znakow.",
    ),
    result_notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 1500,
      "Opis efektu moze miec maksymalnie 1500 znakow.",
    ),
    performed_by_profile_id: optionalUuidString("Wybierz poprawnego wykonawce."),
    performed_by: optionalTrimmedString().refine(
      (value) => !value || value.length <= 160,
      "Pole wykonawcy moze miec maksymalnie 160 znakow.",
    ),
    season_phase: optionalTrimmedString().refine(
      (value) => !value || value.length <= 32,
      "Faza sezonu moze miec maksymalnie 32 znaki.",
    ),
    scopes: z
      .preprocess(parseJsonArrayInput, z.array(activityScopeSchema).optional())
      .transform((value) => value ?? []),
    materials: z
      .preprocess(parseJsonArrayInput, z.array(activityMaterialSchema).optional())
      .transform((value) => value ?? []),
  })
  .superRefine((value, context) => {
    const requiresScope = activityTypeRequiresScope(value.activity_type);

    if (value.activity_type === "pruning" && !value.activity_subtype) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Wybierz podtyp ciecia.",
        path: ["activity_subtype"],
      });
    }

    if (value.activity_type !== "pruning" && value.activity_subtype) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Podtyp aktywnosci jest wspierany tylko dla ciecia.",
        path: ["activity_subtype"],
      });
    }

    if (requiresScope && value.scopes.length === 0 && !value.tree_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dodaj co najmniej jeden zakres wykonania tej aktywnosci.",
        path: ["scopes"],
      });
    }

    if (value.tree_id && value.scopes.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dla wielu zakresow pole pojedynczego drzewa na gorze formularza musi pozostac puste.",
        path: ["tree_id"],
      });
    }

    if (value.tree_id && value.scopes.length === 1) {
      const [scope] = value.scopes;

      if (scope && scope.scope_level !== "tree") {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Pole pojedynczego drzewa mozna laczyc tylko z jednym zakresem typu `drzewo`.",
          path: ["tree_id"],
        });
      }

      if (
        scope &&
        scope.scope_level === "tree" &&
        scope.tree_id &&
        scope.tree_id !== value.tree_id
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Drzewo glowne i drzewo w zakresie musza wskazywac ten sam rekord.",
          path: ["tree_id"],
        });
      }
    }
  });

export const createActivitySchema = activityFormSchema;

export const updateActivitySchema = activityFormSchema.safeExtend({
  activity_id: trimmedString().uuid("Wybierz poprawna aktywnosc."),
});

export const activityStatusActionSchema = z.object({
  activity_id: trimmedString().uuid("Wybierz poprawna aktywnosc."),
  status: activityStatusSchema,
  redirect_to: optionalTrimmedString(),
});

export const deleteActivityActionSchema = z.object({
  activity_id: trimmedString().uuid("Wybierz poprawna aktywnosc."),
  redirect_to: optionalTrimmedString(),
});

export const activityListFiltersSchema = z
  .object({
    date_from: optionalDateInput(),
    date_to: optionalDateInput(),
    plot_id: optionalUuidString("Wybierz poprawna dzialke."),
    tree_id: optionalUuidString("Wybierz poprawne drzewo."),
    activity_type: z.enum([...ACTIVITY_TYPES, "all"]).optional(),
    status: z.enum([...ACTIVITY_STATUSES, "all"]).optional(),
    performed_by_profile_id: optionalUuidString("Wybierz poprawnego wykonawce."),
  })
  .superRefine((value, context) => {
    if (value.date_from && value.date_to && value.date_to < value.date_from) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Data koncowa nie moze byc wczesniejsza niz data poczatkowa.",
        path: ["date_to"],
      });
    }
  });

const summarySeasonYearSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") {
      return undefined;
    }

    const parsed = Number(trimmed);

    return Number.isInteger(parsed) ? parsed : value;
  }

  return value;
}, z.number().int("Rok sezonu musi byc liczba calkowita.").min(2000).max(9999).optional());

function parseOptionalField<T>(schema: z.ZodType<T>, value: unknown) {
  const parsed = schema.safeParse(value);

  return parsed.success ? parsed.data : undefined;
}

type ActivitySummarySearchInput = {
  summary_season_year?: unknown;
  summary_plot_id?: unknown;
  summary_activity_type?: unknown;
  summary_activity_subtype?: unknown;
  summary_performed_by_profile_id?: unknown;
};

export function resolveActivitySummaryFilters(
  input: ActivitySummarySearchInput,
  currentYear = new Date().getFullYear(),
) {
  const seasonYear =
    parseOptionalField(summarySeasonYearSchema, input.summary_season_year) ??
    currentYear;
  const activityType =
    parseOptionalField(summaryActivityTypeSchema, input.summary_activity_type) ??
    "pruning";
  const plotId = parseOptionalField(
    optionalUuidString("Wybierz poprawna dzialke."),
    input.summary_plot_id,
  );
  const performedByProfileId = parseOptionalField(
    optionalUuidString("Wybierz poprawnego wykonawce."),
    input.summary_performed_by_profile_id,
  );
  const activitySubtype =
    activityType === "pruning"
      ? parseOptionalField(
          activityPruningSubtypeSchema.optional(),
          typeof input.summary_activity_subtype === "string"
            ? input.summary_activity_subtype.trim() || undefined
            : input.summary_activity_subtype,
        )
      : undefined;

  return {
    season_year: seasonYear,
    plot_id: plotId,
    activity_type: activityType,
    activity_subtype: activitySubtype,
    performed_by_profile_id: performedByProfileId,
  };
}

export function normalizeActivityPayload(
  input: z.infer<typeof activityFormSchema>,
) {
  const normalizedScopes = input.scopes.map((scope, index) => ({
    ...scope,
    scope_order: scope.scope_order ?? index + 1,
  }));

  if (
    input.tree_id &&
    normalizedScopes.length === 0 &&
    activityTypeRequiresScope(input.activity_type)
  ) {
    normalizedScopes.push({
      scope_order: 1,
      scope_level: "tree",
      tree_id: input.tree_id,
    });
  }

  if (normalizedScopes.length === 1 && normalizedScopes[0]?.scope_level === "tree") {
    const [scope] = normalizedScopes;

    if (scope && input.tree_id && !scope.tree_id) {
      scope.tree_id = input.tree_id;
    }

    if (scope?.tree_id && !input.tree_id) {
      input.tree_id = scope.tree_id;
    }
  }

  return {
    ...input,
    tree_id: input.tree_id ?? null,
    performed_by_profile_id: input.performed_by_profile_id ?? null,
    season_year: deriveSeasonYearFromDate(input.activity_date),
    season_phase: input.season_phase ?? deriveSeasonPhaseFromDate(input.activity_date),
    scopes: normalizedScopes,
    materials: input.materials,
  };
}
