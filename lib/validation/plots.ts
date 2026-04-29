import { z } from "zod";
import {
  PLOT_LAYOUT_TYPES,
  PLOT_STATUSES,
  ROW_NUMBERING_SCHEMES,
  TREE_NUMBERING_SCHEMES,
} from "@/lib/domain/plots";
import {
  optionalNumberInput,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

const plotStatusSchema = z.enum(PLOT_STATUSES);
const plotLayoutTypeSchema = z.enum(PLOT_LAYOUT_TYPES);
const rowNumberingSchemeSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed === "" ? undefined : trimmed;
  }

  return value;
}, z.enum(ROW_NUMBERING_SCHEMES).optional());
const treeNumberingSchemeSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();

    return trimmed === "" ? undefined : trimmed;
  }

  return value;
}, z.enum(TREE_NUMBERING_SCHEMES).optional());

export const plotFormSchema = z.object({
  name: trimmedString()
    .min(2, "Nazwa dzialki musi miec co najmniej 2 znaki.")
    .max(120, "Nazwa dzialki moze miec maksymalnie 120 znakow."),
  code: optionalTrimmedString().refine(
    (value) => !value || value.length <= 32,
    "Kod moze miec maksymalnie 32 znaki.",
  ),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Opis moze miec maksymalnie 500 znakow.",
  ),
  location_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 160,
    "Opis lokalizacji moze miec maksymalnie 160 znakow.",
  ),
  area_m2: optionalNumberInput("Powierzchnia musi byc liczba.").refine(
    (value) => value === undefined || value > 0,
    "Powierzchnia musi byc wieksza od 0.",
  ),
  soil_type: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Typ gleby moze miec maksymalnie 120 znakow.",
  ),
  irrigation_type: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Typ nawadniania moze miec maksymalnie 120 znakow.",
  ),
  layout_type: plotLayoutTypeSchema,
  row_numbering_scheme: rowNumberingSchemeSchema,
  tree_numbering_scheme: treeNumberingSchemeSchema,
  entrance_description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 200,
    "Opis wejscia moze miec maksymalnie 200 znakow.",
  ),
  layout_notes: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Notatki o ukladzie moga miec maksymalnie 500 znakow.",
  ),
  default_row_count: optionalNumberInput("Liczba rzedow musi byc liczba.").refine(
    (value) => value === undefined || (Number.isInteger(value) && value > 0),
    "Liczba rzedow musi byc dodatnia liczba calkowita.",
  ),
  default_trees_per_row: optionalNumberInput(
    "Liczba drzew w rzedzie musi byc liczba.",
  ).refine(
    (value) => value === undefined || (Number.isInteger(value) && value > 0),
    "Liczba drzew w rzedzie musi byc dodatnia liczba calkowita.",
  ),
  status: plotStatusSchema,
});

export const createPlotSchema = plotFormSchema;

export const updatePlotSchema = plotFormSchema.extend({
  plot_id: trimmedString().uuid("Wybierz poprawna dzialke."),
});

export const plotStatusActionSchema = z.object({
  plot_id: trimmedString().uuid("Wybierz poprawna dzialke."),
  redirect_to: optionalTrimmedString(),
});

export const plotListFiltersSchema = z.object({
  status: z.enum([...PLOT_STATUSES, "all"]).optional(),
});
