import { z } from "zod";
import { normalizeSpeciesInput } from "@/lib/domain/species";
import {
  checkboxBoolean,
  optionalDateInput,
  optionalNumberInput,
  optionalTrimmedString,
  optionalUuidString,
  trimmedString,
} from "@/lib/validation/shared";

const treeConditionStatusSchema = z.enum([
  "new",
  "good",
  "warning",
  "critical",
  "removed",
]);

export const treeFormSchema = z
  .object({
    plot_id: trimmedString().uuid("Wybierz poprawna dzialke."),
    variety_id: optionalUuidString("Wybierz poprawna odmiane."),
    species: z.preprocess(
      normalizeSpeciesInput,
      trimmedString()
        .min(2, "Gatunek musi miec co najmniej 2 znaki.")
        .max(120, "Gatunek moze miec maksymalnie 120 znakow."),
    ),
    tree_code: optionalTrimmedString().refine(
      (value) => !value || value.length <= 64,
      "Kod drzewa moze miec maksymalnie 64 znaki.",
    ),
    display_name: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Nazwa wyswietlana moze miec maksymalnie 120 znakow.",
    ),
    section_name: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Sekcja moze miec maksymalnie 80 znakow.",
    ),
    row_number: optionalNumberInput("Numer rzedu musi byc liczba.").refine(
      (value) => value === undefined || value > 0,
      "Numer rzedu musi byc wiekszy od 0.",
    ),
    position_in_row: optionalNumberInput(
      "Pozycja w rzedzie musi byc liczba.",
    ).refine(
      (value) => value === undefined || value > 0,
      "Pozycja w rzedzie musi byc wieksza od 0.",
    ),
    row_label: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Etykieta rzedu moze miec maksymalnie 80 znakow.",
    ),
    position_label: optionalTrimmedString().refine(
      (value) => !value || value.length <= 80,
      "Etykieta pozycji moze miec maksymalnie 80 znakow.",
    ),
    planted_at: optionalDateInput(),
    acquired_at: optionalDateInput(),
    rootstock: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Podkladka moze miec maksymalnie 120 znakow.",
    ),
    pollinator_info: optionalTrimmedString().refine(
      (value) => !value || value.length <= 200,
      "Informacje o zapylaczu moga miec maksymalnie 200 znakow.",
    ),
    condition_status: treeConditionStatusSchema,
    health_status: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Stan zdrowotny moze miec maksymalnie 120 znakow.",
    ),
    development_stage: optionalTrimmedString().refine(
      (value) => !value || value.length <= 120,
      "Etap rozwoju moze miec maksymalnie 120 znakow.",
    ),
    last_harvest_at: optionalDateInput(),
    notes: optionalTrimmedString().refine(
      (value) => !value || value.length <= 1000,
      "Notatki moga miec maksymalnie 1000 znakow.",
    ),
    location_verified: checkboxBoolean,
  })
  .superRefine((value, context) => {
    const hasRowNumber = typeof value.row_number === "number";
    const hasPosition = typeof value.position_in_row === "number";

    if (hasRowNumber !== hasPosition) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Numer rzedu i pozycja w rzedzie musza byc podane razem.",
        path: hasRowNumber ? ["position_in_row"] : ["row_number"],
      });
    }
  });

export const createTreeSchema = treeFormSchema;

export const updateTreeSchema = treeFormSchema.safeExtend({
  tree_id: trimmedString().uuid("Wybierz poprawne drzewo."),
});

export const treeListFiltersSchema = z.object({
  q: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Fraza wyszukiwania moze miec maksymalnie 120 znakow.",
  ),
  plot_id: optionalUuidString("Wybierz poprawna dzialke."),
  variety_id: optionalUuidString("Wybierz poprawna odmiane."),
  species: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Filtr gatunku moze miec maksymalnie 120 znakow.",
  ),
  condition_status: z
    .enum(["new", "good", "warning", "critical", "removed", "all"])
    .optional(),
  is_active: z.enum(["true", "false", "all"]).optional(),
});
