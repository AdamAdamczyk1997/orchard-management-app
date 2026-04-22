import { z } from "zod";
import {
  optionalNumberInput,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

const plotStatusSchema = z.enum(["planned", "active", "archived"]);

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
  status: z.enum(["active", "planned", "archived", "all"]).optional(),
});
