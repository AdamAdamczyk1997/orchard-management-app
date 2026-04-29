import { z } from "zod";
import { normalizeSpeciesInput } from "@/lib/domain/species";
import {
  optionalUuidString,
  checkboxBoolean,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

export const varietyFormSchema = z.object({
  species: z.preprocess(
    normalizeSpeciesInput,
    trimmedString()
      .min(2, "Gatunek musi miec co najmniej 2 znaki.")
      .max(120, "Gatunek moze miec maksymalnie 120 znakow."),
  ),
  name: trimmedString()
    .min(2, "Nazwa odmiany musi miec co najmniej 2 znaki.")
    .max(120, "Nazwa odmiany moze miec maksymalnie 120 znakow."),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Opis moze miec maksymalnie 500 znakow.",
  ),
  care_notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Notatki pielegnacyjne moga miec maksymalnie 800 znakow.",
  ),
  characteristics: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Cechy odmiany moga miec maksymalnie 800 znakow.",
  ),
  ripening_period: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Okres dojrzewania moze miec maksymalnie 120 znakow.",
  ),
  resistance_notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Notatki o odpornosci moga miec maksymalnie 800 znakow.",
  ),
  origin_country: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Kraj pochodzenia moze miec maksymalnie 120 znakow.",
  ),
  is_favorite: checkboxBoolean,
});

export const createVarietySchema = varietyFormSchema;

export const updateVarietySchema = varietyFormSchema.extend({
  variety_id: trimmedString().uuid("Wybierz poprawna odmiane."),
});

export const varietyListFiltersSchema = z.object({
  q: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Fraza wyszukiwania moze miec maksymalnie 120 znakow.",
  ),
});

export const varietyLocationsReportFiltersSchema = z.object({
  variety_id: optionalUuidString("Wybierz poprawna odmiane."),
});
