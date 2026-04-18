import { z } from "zod";
import {
  checkboxBoolean,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

export const varietyFormSchema = z.object({
  species: trimmedString()
    .min(2, "Species must have at least 2 characters.")
    .max(120, "Species must have at most 120 characters."),
  name: trimmedString()
    .min(2, "Variety name must have at least 2 characters.")
    .max(120, "Variety name must have at most 120 characters."),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Description must have at most 500 characters.",
  ),
  care_notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Care notes must have at most 800 characters.",
  ),
  characteristics: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Characteristics must have at most 800 characters.",
  ),
  ripening_period: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Ripening period must have at most 120 characters.",
  ),
  resistance_notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 800,
    "Resistance notes must have at most 800 characters.",
  ),
  origin_country: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Origin country must have at most 120 characters.",
  ),
  is_favorite: checkboxBoolean,
});

export const createVarietySchema = varietyFormSchema;

export const updateVarietySchema = varietyFormSchema.extend({
  variety_id: trimmedString().uuid("Choose a valid variety."),
});

export const varietyListFiltersSchema = z.object({
  q: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Search must have at most 120 characters.",
  ),
});
