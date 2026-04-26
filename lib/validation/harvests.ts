import { z } from "zod";
import {
  HARVEST_QUANTITY_UNITS,
  HARVEST_SCOPE_LEVELS,
  deriveHarvestSeasonYearFromDate,
} from "@/lib/domain/harvests";
import {
  optionalDateInput,
  optionalNumberInput,
  optionalTrimmedString,
  optionalUuidString,
} from "@/lib/validation/shared";

const harvestScopeLevelSchema = z.enum(HARVEST_SCOPE_LEVELS);
const harvestQuantityUnitSchema = z.enum(HARVEST_QUANTITY_UNITS);

const requiredPositiveNumberInput = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed === "") {
      return undefined;
    }

    const parsed = Number(trimmed);

    return Number.isNaN(parsed) ? value : parsed;
  }

  return value;
}, z.number().positive("Ilosc musi byc dodatnia liczba."));

const seasonYearSchema = z.preprocess((value) => {
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

type HarvestListSearchInput = {
  season_year?: unknown;
  date_from?: unknown;
  date_to?: unknown;
  plot_id?: unknown;
  variety_id?: unknown;
};

type HarvestSeasonSummarySearchInput = {
  season_year?: unknown;
  plot_id?: unknown;
  variety_id?: unknown;
};

export const harvestFormSchema = z
  .object({
    plot_id: optionalUuidString("Wybierz poprawna dzialke."),
    variety_id: optionalUuidString("Wybierz poprawna odmiane."),
    tree_id: optionalUuidString("Wybierz poprawne drzewo."),
    activity_id: optionalUuidString("Wybierz poprawna aktywnosc."),
    scope_level: harvestScopeLevelSchema,
    harvest_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj poprawna date."),
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
    quantity_value: requiredPositiveNumberInput,
    quantity_unit: harvestQuantityUnitSchema,
    notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 1500,
      "Notatki moga miec maksymalnie 1500 znakow.",
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
      case "orchard":
        if (
          value.plot_id ||
          value.variety_id ||
          value.tree_id ||
          value.section_name ||
          value.row_number !== undefined ||
          value.from_position !== undefined ||
          value.to_position !== undefined
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zakres sadu nie powinien zawierac dodatkowych pol lokalizacji.",
            path: ["scope_level"],
          });
        }
        break;
      case "plot":
        if (!value.plot_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wybierz dzialke dla tego wpisu.",
            path: ["plot_id"],
          });
        }

        if (
          value.tree_id ||
          value.section_name ||
          value.row_number !== undefined ||
          value.from_position !== undefined ||
          value.to_position !== undefined
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zakres dzialki nie powinien zawierac szczegolowej lokalizacji.",
            path: ["scope_level"],
          });
        }
        break;
      case "variety":
        if (!value.variety_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wybierz odmiane dla tego wpisu.",
            path: ["variety_id"],
          });
        }

        if (
          value.tree_id ||
          value.section_name ||
          value.row_number !== undefined ||
          value.from_position !== undefined ||
          value.to_position !== undefined
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zakres odmiany nie powinien zawierac szczegolowej lokalizacji.",
            path: ["scope_level"],
          });
        }
        break;
      case "location_range":
        if (!value.plot_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wybierz dzialke dla zakresu lokalizacji.",
            path: ["plot_id"],
          });
        }

        if (value.row_number === undefined) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Podaj numer rzedu.",
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

        if (value.tree_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Zakres lokalizacji nie moze wskazywac pojedynczego drzewa.",
            path: ["tree_id"],
          });
        }
        break;
      case "tree":
        if (!value.tree_id) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wybierz drzewo dla tego wpisu.",
            path: ["tree_id"],
          });
        }

        if (
          value.section_name ||
          value.row_number !== undefined ||
          value.from_position !== undefined ||
          value.to_position !== undefined
        ) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Wpis dla jednego drzewa nie powinien zawierac zakresu pozycji.",
            path: ["scope_level"],
          });
        }
        break;
      default:
        break;
    }
  });

export const createHarvestRecordSchema = harvestFormSchema;

export const updateHarvestRecordSchema = harvestFormSchema.safeExtend({
  harvest_record_id: z.string().uuid("Wybierz poprawny wpis zbioru."),
});

export const deleteHarvestRecordActionSchema = z.object({
  harvest_record_id: z.string().uuid("Wybierz poprawny wpis zbioru."),
  redirect_to: optionalTrimmedString(),
});

export const harvestListFiltersSchema = z
  .object({
    season_year: seasonYearSchema,
    date_from: optionalDateInput(),
    date_to: optionalDateInput(),
    plot_id: optionalUuidString("Wybierz poprawna dzialke."),
    variety_id: optionalUuidString("Wybierz poprawna odmiane."),
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

export function resolveHarvestListFilters(
  input: HarvestListSearchInput,
  currentYear = new Date().getFullYear(),
) {
  return {
    season_year: parseOptionalField(seasonYearSchema, input.season_year) ?? currentYear,
    date_from: parseOptionalField(optionalDateInput(), input.date_from),
    date_to: parseOptionalField(optionalDateInput(), input.date_to),
    plot_id: parseOptionalField(
      optionalUuidString("Wybierz poprawna dzialke."),
      input.plot_id,
    ),
    variety_id: parseOptionalField(
      optionalUuidString("Wybierz poprawna odmiane."),
      input.variety_id,
    ),
  };
}

export function resolveHarvestSeasonSummaryFilters(
  input: HarvestSeasonSummarySearchInput,
  currentYear = new Date().getFullYear(),
) {
  return {
    season_year: parseOptionalField(seasonYearSchema, input.season_year) ?? currentYear,
    plot_id: parseOptionalField(
      optionalUuidString("Wybierz poprawna dzialke."),
      input.plot_id,
    ),
    variety_id: parseOptionalField(
      optionalUuidString("Wybierz poprawna odmiane."),
      input.variety_id,
    ),
  };
}

export function normalizeHarvestPayload(input: z.infer<typeof harvestFormSchema>) {
  const basePayload = {
    plot_id: input.plot_id ?? null,
    variety_id: input.variety_id ?? null,
    tree_id: input.tree_id ?? null,
    activity_id: input.activity_id ?? null,
    scope_level: input.scope_level,
    harvest_date: input.harvest_date,
    season_year: deriveHarvestSeasonYearFromDate(input.harvest_date),
    section_name: input.section_name ?? null,
    row_number: input.row_number ?? null,
    from_position: input.from_position ?? null,
    to_position: input.to_position ?? null,
    quantity_value: input.quantity_value,
    quantity_unit: input.quantity_unit,
    notes: input.notes ?? null,
  };

  switch (input.scope_level) {
    case "orchard":
      return {
        ...basePayload,
        plot_id: null,
        variety_id: null,
        tree_id: null,
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
      };
    case "plot":
      return {
        ...basePayload,
        variety_id: null,
        tree_id: null,
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
      };
    case "variety":
      return {
        ...basePayload,
        tree_id: null,
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
      };
    case "location_range":
      return {
        ...basePayload,
        tree_id: null,
      };
    case "tree":
      return {
        ...basePayload,
        section_name: null,
        row_number: null,
        from_position: null,
        to_position: null,
      };
    default:
      return basePayload;
  }
}
