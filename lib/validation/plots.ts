import { z } from "zod";
import {
  optionalNumberInput,
  optionalTrimmedString,
  trimmedString,
} from "@/lib/validation/shared";

const plotStatusSchema = z.enum(["planned", "active", "archived"]);

export const plotFormSchema = z.object({
  name: trimmedString()
    .min(2, "Plot name must have at least 2 characters.")
    .max(120, "Plot name must have at most 120 characters."),
  code: optionalTrimmedString().refine(
    (value) => !value || value.length <= 32,
    "Code must have at most 32 characters.",
  ),
  description: optionalTrimmedString().refine(
    (value) => !value || value.length <= 500,
    "Description must have at most 500 characters.",
  ),
  location_name: optionalTrimmedString().refine(
    (value) => !value || value.length <= 160,
    "Location must have at most 160 characters.",
  ),
  area_m2: optionalNumberInput("Area must be a number.").refine(
    (value) => value === undefined || value > 0,
    "Area must be greater than 0.",
  ),
  soil_type: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Soil type must have at most 120 characters.",
  ),
  irrigation_type: optionalTrimmedString().refine(
    (value) => !value || value.length <= 120,
    "Irrigation type must have at most 120 characters.",
  ),
  status: plotStatusSchema,
});

export const createPlotSchema = plotFormSchema;

export const updatePlotSchema = plotFormSchema.extend({
  plot_id: trimmedString().uuid("Choose a valid plot."),
});

export const plotStatusActionSchema = z.object({
  plot_id: trimmedString().uuid("Choose a valid plot."),
  redirect_to: optionalTrimmedString(),
});

export const plotListFiltersSchema = z.object({
  status: z.enum(["active", "planned", "archived", "all"]).optional(),
});
